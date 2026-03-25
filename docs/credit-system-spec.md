# Maketaa 크레딧 시스템 개발 명세서

## 1. 개요

Maketaa의 모든 AI 기능에 크레딧 소모를 적용하고, 토스페이먼츠를 통한 크레딧 충전(단건 결제)을 구현한다.

---

## 2. 데이터베이스 설계 (Supabase PostgreSQL)

### 2.1 테이블: `credit_balances`

사용자별 크레딧 잔액. 단일 행으로 관리.

```sql
CREATE TABLE credit_balances (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  total_purchased INTEGER NOT NULL DEFAULT 0,   -- 누적 구매 크레딧
  total_consumed  INTEGER NOT NULL DEFAULT 0,   -- 누적 소모 크레딧
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE credit_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own balance"
  ON credit_balances FOR SELECT
  USING (auth.uid() = user_id);

-- balance 변경은 RPC만 허용, 직접 UPDATE 불가
CREATE POLICY "No direct update"
  ON credit_balances FOR UPDATE
  USING (false);
```

### 2.2 테이블: `credit_transactions`

모든 크레딧 변동 이력. 충전과 소모 모두 기록.

```sql
CREATE TYPE credit_tx_type AS ENUM ('charge', 'consume', 'refund', 'admin_grant');

CREATE TABLE credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type credit_tx_type NOT NULL,
  amount INTEGER NOT NULL,                    -- 양수: 충전, 음수: 소모
  balance_after INTEGER NOT NULL,             -- 트랜잭션 후 잔액
  description TEXT,                           -- "이미지 생성 (Gemini)", "스타터 패키지 충전" 등
  metadata JSONB DEFAULT '{}',                -- 기능별 상세 (api, model, asset_id 등)
  payment_id UUID REFERENCES credit_payments(id), -- 충전인 경우 결제 참조
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_credit_tx_user ON credit_transactions(user_id, created_at DESC);
CREATE INDEX idx_credit_tx_type ON credit_transactions(user_id, type);

ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own transactions"
  ON credit_transactions FOR SELECT
  USING (auth.uid() = user_id);
```

### 2.3 테이블: `credit_payments`

토스페이먼츠 결제 기록.

```sql
CREATE TYPE payment_status AS ENUM ('pending', 'confirmed', 'failed', 'cancelled');

CREATE TABLE credit_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- 토스페이먼츠 필드
  order_id TEXT NOT NULL UNIQUE,              -- 주문 ID (클라이언트 생성)
  payment_key TEXT UNIQUE,                    -- 토스 paymentKey (승인 후)
  status payment_status NOT NULL DEFAULT 'pending',
  -- 결제 내용
  package_id TEXT NOT NULL,                   -- 'starter' | 'business' | 'pro' | 'enterprise'
  amount INTEGER NOT NULL,                    -- 결제 금액 (원)
  credits INTEGER NOT NULL,                   -- 지급 크레딧
  -- 타임스탬프
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  failure_reason TEXT
);

CREATE INDEX idx_payments_user ON credit_payments(user_id, created_at DESC);
CREATE INDEX idx_payments_order ON credit_payments(order_id);

ALTER TABLE credit_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own payments"
  ON credit_payments FOR SELECT
  USING (auth.uid() = user_id);
```

### 2.4 RPC 함수: `consume_credits`

크레딧 소모를 원자적으로 처리. 잔액 부족 시 실패.

```sql
CREATE OR REPLACE FUNCTION consume_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_description TEXT,
  p_metadata JSONB DEFAULT '{}'
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_balance INTEGER;
  v_new_balance INTEGER;
  v_tx_id UUID;
BEGIN
  -- 잔액 조회 (행 잠금)
  SELECT balance INTO v_balance
  FROM credit_balances
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_balance IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'NO_BALANCE_RECORD');
  END IF;

  IF v_balance < p_amount THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INSUFFICIENT_CREDITS',
      'balance', v_balance,
      'required', p_amount
    );
  END IF;

  v_new_balance := v_balance - p_amount;

  -- 잔액 차감
  UPDATE credit_balances
  SET balance = v_new_balance,
      total_consumed = total_consumed + p_amount,
      updated_at = now()
  WHERE user_id = p_user_id;

  -- 트랜잭션 기록
  INSERT INTO credit_transactions (user_id, type, amount, balance_after, description, metadata)
  VALUES (p_user_id, 'consume', -p_amount, v_new_balance, p_description, p_metadata)
  RETURNING id INTO v_tx_id;

  RETURN jsonb_build_object(
    'success', true,
    'balance', v_new_balance,
    'transaction_id', v_tx_id
  );
END;
$$;
```

### 2.5 RPC 함수: `charge_credits`

결제 확인 후 크레딧 충전. 이중 충전 방지 포함.

```sql
CREATE OR REPLACE FUNCTION charge_credits(
  p_user_id UUID,
  p_payment_id UUID,
  p_credits INTEGER,
  p_description TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_payment_status payment_status;
  v_balance INTEGER;
  v_new_balance INTEGER;
  v_tx_id UUID;
BEGIN
  -- 결제 상태 확인 (이중 충전 방지)
  SELECT status INTO v_payment_status
  FROM credit_payments
  WHERE id = p_payment_id AND user_id = p_user_id
  FOR UPDATE;

  IF v_payment_status IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'PAYMENT_NOT_FOUND');
  END IF;

  IF v_payment_status = 'confirmed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'ALREADY_CHARGED');
  END IF;

  -- 결제 상태 업데이트
  UPDATE credit_payments
  SET status = 'confirmed', confirmed_at = now()
  WHERE id = p_payment_id;

  -- 잔액 레코드 없으면 생성 (UPSERT)
  INSERT INTO credit_balances (user_id, balance, total_purchased)
  VALUES (p_user_id, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;

  -- 잔액 증가
  UPDATE credit_balances
  SET balance = balance + p_credits,
      total_purchased = total_purchased + p_credits,
      updated_at = now()
  WHERE user_id = p_user_id
  RETURNING balance INTO v_new_balance;

  -- 트랜잭션 기록
  INSERT INTO credit_transactions (user_id, type, amount, balance_after, description, payment_id)
  VALUES (p_user_id, 'charge', p_credits, v_new_balance, p_description, p_payment_id)
  RETURNING id INTO v_tx_id;

  RETURN jsonb_build_object(
    'success', true,
    'balance', v_new_balance,
    'transaction_id', v_tx_id
  );
END;
$$;
```

---

## 3. 크레딧 소모 정책

### 3.1 기능별 크레딧 단가

```typescript
// src/lib/credits/pricing.ts

export const CREDIT_COSTS = {
  // 이미지 생성
  IMAGE_GEMINI: 5,           // Gemini 텍스트→이미지 (1장)
  IMAGE_GPT: 8,              // GPT-4.1 참조 이미지 (1장)
  IMAGE_PARALLEL: 5,         // 병렬 이미지 (장당)

  // 영상 생성
  VIDEO_SEEDANCE_PRO: 20,    // SeeDance Pro 클립
  VIDEO_SEEDANCE_LITE: 12,   // SeeDance Lite 클립
  VIDEO_KLING: 20,           // Kling 클립

  // 숏폼 메이커
  SCENE_GENERATE: 3,         // 전체 씬 생성
  SCENE_REGENERATE: 2,       // 개별 씬 재생성
  NARRATION: 4,              // TTS 나레이션 (씬 1개)

  // 카드뉴스
  CARD_NEWS_GENERATE: 8,     // 카드뉴스 세트 생성
  CARD_NEWS_TOPICS: 1,       // 주제 추천

  // 인스타그램
  INSTA_CAPTION: 1,          // 캡션 생성
  INSTA_REPLY: 1,            // 댓글 답변 생성

  // GIF
  GIF_FRAME: 5,              // GIF 프레임 (장당)

  // 분석
  WEBSITE_ANALYSIS: 10,      // 웹사이트 분석 리포트
} as const;

export type CreditCostKey = keyof typeof CREDIT_COSTS;
```

### 3.2 충전 패키지

```typescript
// src/lib/credits/packages.ts

export const CREDIT_PACKAGES = {
  starter: {
    id: 'starter',
    name: '스타터',
    credits: 500,
    price: 100_000,          // 원
    pricePerCredit: 200,
    bonus: null,
  },
  business: {
    id: 'business',
    name: '비즈니스',
    credits: 1_250,
    price: 220_000,
    pricePerCredit: 176,
    bonus: '+12%',
  },
  pro: {
    id: 'pro',
    name: '프로',
    credits: 3_000,
    price: 480_000,
    pricePerCredit: 160,
    bonus: '+20%',
  },
  enterprise: {
    id: 'enterprise',
    name: '엔터프라이즈',
    credits: 7_500,
    price: 1_000_000,
    pricePerCredit: 133,
    bonus: '+33%',
  },
} as const;

export type PackageId = keyof typeof CREDIT_PACKAGES;
```

---

## 4. API 설계

### 4.1 크레딧 잔액 조회

```
GET /api/credits
```

```typescript
// Response
{
  balance: number;
  totalPurchased: number;
  totalConsumed: number;
}
```

### 4.2 크레딧 사용 내역

```
GET /api/credits/transactions?page=1&limit=20&type=consume
```

```typescript
// Response
{
  transactions: CreditTransaction[];
  total: number;
  page: number;
  limit: number;
}
```

### 4.3 결제 요청 (주문 생성)

```
POST /api/credits/payments
```

```typescript
// Request
{ packageId: 'starter' | 'business' | 'pro' | 'enterprise' }

// Response
{
  orderId: string;        // "MAKETAA-{userId}-{timestamp}"
  paymentId: string;      // credit_payments.id
  amount: number;
  orderName: string;      // "Maketaa 스타터 패키지 (500 크레딧)"
}
```

### 4.4 결제 승인 (토스페이먼츠 콜백 후)

```
POST /api/credits/payments/confirm
```

```typescript
// Request (토스페이먼츠 SDK가 리다이렉트 시 전달)
{
  paymentKey: string;
  orderId: string;
  amount: number;
}

// 서버 처리 흐름:
// 1. credit_payments에서 orderId로 조회
// 2. amount 일치 여부 검증
// 3. 토스페이먼츠 승인 API 호출 (POST /v1/payments/confirm)
// 4. charge_credits RPC 호출
// 5. 결과 반환

// Response
{
  success: boolean;
  balance: number;
  credits: number;        // 이번에 충전된 크레딧
}
```

### 4.5 크레딧 소모 (내부 유틸)

API 라우트가 아닌, 각 AI API 라우트 내부에서 호출하는 서버 유틸.

```typescript
// src/lib/credits/consume.ts

import { createClient } from '@/lib/supabase/server';

interface ConsumeResult {
  success: boolean;
  balance?: number;
  error?: 'INSUFFICIENT_CREDITS' | 'NO_BALANCE_RECORD';
  required?: number;
}

export async function consumeCredits(
  userId: string,
  costKey: CreditCostKey,
  multiplier: number = 1,
  metadata?: Record<string, unknown>
): Promise<ConsumeResult> {
  const amount = CREDIT_COSTS[costKey] * multiplier;
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('consume_credits', {
    p_user_id: userId,
    p_amount: amount,
    p_description: CREDIT_DESCRIPTIONS[costKey],
    p_metadata: { costKey, multiplier, ...metadata },
  });

  if (error) throw error;
  return data;
}
```

---

## 5. 토스페이먼츠 연동

### 5.1 환경변수

```env
TOSS_CLIENT_KEY=test_ck_...          # 프론트엔드용
TOSS_SECRET_KEY=test_sk_...          # 서버 승인용
NEXT_PUBLIC_TOSS_CLIENT_KEY=test_ck_... # 클라이언트 노출용
```

### 5.2 결제 플로우

```
┌─────────┐     POST /api/credits/payments      ┌─────────┐
│ 클라이언트 │ ──────────────────────────────────► │  서버    │
│         │ ◄────── { orderId, amount }  ──────── │         │
│         │                                       │ credit_ │
│         │   TossPayments SDK                    │ payments│
│         │   requestPayment()                    │ pending │
│         │ ──────► 토스 결제창 ──────►            └─────────┘
│         │
│         │   결제 완료 → 리다이렉트
│         │   /credits/success?paymentKey=...      ┌─────────┐
│         │ ──────────────────────────────────────► │  서버    │
│ success │   POST /api/credits/payments/confirm   │         │
│  page   │ ◄────── { success, balance } ──────── │ 토스 승인│
│         │                                       │ → RPC   │
└─────────┘                                       └─────────┘
```

### 5.3 클라이언트 결제 호출

```typescript
// src/lib/credits/toss.ts

import { loadTossPayments } from '@tosspayments/tosspayments-sdk';

export async function requestCreditPayment(packageId: PackageId, userEmail: string) {
  // 1. 서버에 주문 생성
  const res = await fetch('/api/credits/payments', {
    method: 'POST',
    body: JSON.stringify({ packageId }),
  });
  const { orderId, amount, orderName, paymentId } = await res.json();

  // 2. 토스 SDK로 결제창 호출
  const toss = await loadTossPayments(process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY!);
  const payment = toss.payment({ customerKey: userEmail });

  await payment.requestPayment({
    method: 'CARD',
    amount: { currency: 'KRW', value: amount },
    orderId,
    orderName,
    successUrl: `${window.location.origin}/credits/success`,
    failUrl: `${window.location.origin}/credits/fail`,
  });
}
```

### 5.4 서버 승인 처리

```typescript
// src/app/api/credits/payments/confirm/route.ts

export async function POST(req: Request) {
  const { paymentKey, orderId, amount } = await req.json();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 1. 주문 검증
  const { data: payment } = await supabase
    .from('credit_payments')
    .select('*')
    .eq('order_id', orderId)
    .eq('user_id', user.id)
    .single();

  if (!payment || payment.amount !== amount) {
    return NextResponse.json({ error: 'INVALID_ORDER' }, { status: 400 });
  }

  // 2. 토스페이먼츠 승인 API
  const confirmRes = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(TOSS_SECRET_KEY + ':').toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ paymentKey, orderId, amount }),
  });

  if (!confirmRes.ok) {
    // 결제 실패 처리
    await supabase
      .from('credit_payments')
      .update({ status: 'failed', failed_at: new Date().toISOString(), failure_reason: '승인 실패' })
      .eq('id', payment.id);
    return NextResponse.json({ error: 'PAYMENT_FAILED' }, { status: 400 });
  }

  // 3. paymentKey 저장 + 크레딧 충전 (RPC)
  await supabase
    .from('credit_payments')
    .update({ payment_key: paymentKey })
    .eq('id', payment.id);

  const { data: result } = await supabase.rpc('charge_credits', {
    p_user_id: user.id,
    p_payment_id: payment.id,
    p_credits: payment.credits,
    p_description: `${CREDIT_PACKAGES[payment.package_id].name} 패키지 충전`,
  });

  return NextResponse.json({
    success: true,
    balance: result.balance,
    credits: payment.credits,
  });
}
```

---

## 6. AI API 라우트 통합 패턴

기존 API 라우트에 크레딧 소모를 추가하는 패턴.

### 6.1 Before (현재)

```typescript
// src/app/api/image-gen/textToimg/route.ts
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // ... AI 호출 로직
  // ... reportUsage() 호출
}
```

### 6.2 After (크레딧 적용)

```typescript
// src/app/api/image-gen/textToimg/route.ts
import { consumeCredits } from '@/lib/credits/consume';

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // ✅ 크레딧 선차감
  const creditResult = await consumeCredits(user.id, 'IMAGE_GEMINI');
  if (!creditResult.success) {
    return NextResponse.json({
      error: 'INSUFFICIENT_CREDITS',
      balance: creditResult.balance,
      required: creditResult.required,
    }, { status: 402 });
  }

  // ... 기존 AI 호출 로직 (동일)
  // ... reportUsage() 호출 (기존 유지)
}
```

### 6.3 적용 대상 라우트 목록

| API 라우트 | costKey | 비고 |
|-----------|---------|------|
| `/api/image-gen/textToimg` | `IMAGE_GEMINI` | |
| `/api/image-gen/gpt/[id]` | `IMAGE_GPT` | |
| `/api/image-gen/gemini/[id]` | `IMAGE_GEMINI` | |
| `/api/scenes` | `SCENE_GENERATE` | |
| `/api/scenes/regenerate` | `SCENE_REGENERATE` | |
| `/api/narration` | `NARRATION` | |
| `/api/kling/clip-gen/[id]` | `VIDEO_KLING` | |
| `/api/seedance/clip-gen/[id]` | `VIDEO_SEEDANCE_PRO` | lite 분기 필요 |
| `/api/insta-caption` | `INSTA_CAPTION` | |
| `/api/insta-replies` | `INSTA_REPLY` | |
| `/api/card-news/generate` | `CARD_NEWS_GENERATE` | |
| `/api/card-news/suggest-topics` | `CARD_NEWS_TOPICS` | |
| `/api/analyze` | `WEBSITE_ANALYSIS` | |

### 6.4 병렬/다중 생성 처리

병렬 이미지, GIF 프레임 등 장수에 비례하는 기능:

```typescript
// 병렬 이미지: 요청 장수만큼 multiplier 적용
const creditResult = await consumeCredits(user.id, 'IMAGE_PARALLEL', imageCount);

// GIF: 프레임 수만큼
const creditResult = await consumeCredits(user.id, 'GIF_FRAME', frameCount);
```

---

## 7. 프론트엔드 통합

### 7.1 크레딧 스토어

```typescript
// src/lib/credits/useCreditStore.ts

interface CreditState {
  balance: number | null;
  loading: boolean;
  fetch: () => Promise<void>;
  deduct: (amount: number) => void;     // 낙관적 업데이트
  setBalance: (balance: number) => void;
}

export const useCreditStore = create<CreditState>((set) => ({
  balance: null,
  loading: true,
  fetch: async () => {
    const res = await fetch('/api/credits');
    const data = await res.json();
    set({ balance: data.balance, loading: false });
  },
  deduct: (amount) => set((s) => ({
    balance: s.balance !== null ? s.balance - amount : null,
  })),
  setBalance: (balance) => set({ balance }),
}));
```

### 7.2 잔액 부족 처리 (공통 패턴)

```typescript
// 각 AI 호출 컴포넌트에서
const res = await fetch('/api/image-gen/textToimg', { ... });

if (res.status === 402) {
  const { balance, required } = await res.json();
  // 잔액 부족 다이얼로그 → 충전 페이지로 이동
  showInsufficientCreditsDialog(balance, required);
  return;
}
```

### 7.3 잔액 표시

Sidebar 또는 TopNav에 잔액 배지 상시 표시:

```
🪙 327 크레딧
```

---

## 8. 페이지 구조

| 경로 | 용도 |
|------|------|
| `/credits` | 크레딧 대시보드 (잔액, 사용 내역, 충전 버튼) |
| `/credits/charge` | 충전 패키지 선택 → 토스 결제 |
| `/credits/success` | 결제 성공 → confirm API 호출 → 결과 표시 |
| `/credits/fail` | 결제 실패 안내 |
| `/settings` | (기존) 설정 페이지에 결제 내역 탭 추가 |

---

## 9. 구현 순서

### Phase 1: 기반 (DB + 핵심 로직)
1. Supabase 테이블 3개 + RPC 2개 생성
2. `src/lib/credits/` 모듈 (pricing, packages, consume 유틸)
3. `GET /api/credits` (잔액 조회)
4. `useCreditStore` Zustand 스토어
5. 기존 `useAuthHydration`에서 크레딧 잔액도 함께 fetch

### Phase 2: 소모 적용
6. 각 AI API 라우트에 `consumeCredits()` 추가 (13개 라우트)
7. 프론트엔드 402 핸들링 공통 유틸
8. Sidebar/TopNav에 잔액 표시

### Phase 3: 결제
9. 토스페이먼츠 SDK 설치 (`@tosspayments/tosspayments-sdk`)
10. `POST /api/credits/payments` (주문 생성)
11. `POST /api/credits/payments/confirm` (승인)
12. `/credits/charge` 페이지 (패키지 선택 UI)
13. `/credits/success`, `/credits/fail` 페이지

### Phase 4: 대시보드
14. `/credits` 대시보드 (잔액, 차트, 내역 테이블)
15. `GET /api/credits/transactions` (내역 조회)
16. 설정 페이지에 결제 내역 탭

---

## 10. 보안 고려사항

| 항목 | 대응 |
|------|------|
| 크레딧 조작 방지 | RLS로 직접 UPDATE 차단, RPC(SECURITY DEFINER)만 허용 |
| 이중 결제/충전 | `charge_credits`에서 상태 체크 + FOR UPDATE 잠금 |
| 결제 위변조 | 서버에서 amount 검증 + 토스 승인 API로 이중 확인 |
| 동시 소모 경쟁 | `consume_credits`에서 FOR UPDATE 행 잠금 |
| TOSS_SECRET_KEY 노출 | 서버 환경변수만 사용, 클라이언트에 노출 안 함 |

---

## 11. 참고: 신규 회원 초기 크레딧

신규 가입 시 체험용 크레딧 자동 지급 (선택사항):

```sql
-- auth.users에 트리거 걸기
CREATE OR REPLACE FUNCTION handle_new_user_credits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO credit_balances (user_id, balance, total_purchased)
  VALUES (NEW.id, 30, 0);  -- 체험용 30 크레딧 (이미지 6장 분량)

  INSERT INTO credit_transactions (user_id, type, amount, balance_after, description)
  VALUES (NEW.id, 'admin_grant', 30, 30, '신규 가입 체험 크레딧');

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_credits();
```
