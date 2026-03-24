# Canvas Editor - 에이전트 가이드

> 이 문서는 Canvas Editor 프로젝트 작업 시 Claude Code 에이전트가 참조해야 하는 핵심 정보입니다.

---

## 프로젝트 개요

- **이름:** Canvas Editor MVP
- **기술 스택:** Next.js 14, TypeScript, Tailwind CSS, Fabric.js, Supabase, Zustand
- **배포 URL:** https://canvaseditor-mu.vercel.app

---

## 필수 참조 문서

| 우선순위 | 문서 | 설명 |
|---------|------|------|
| 1 | [work_journal/VERCEL_DEPLOYMENT_GUIDE.md](work_journal/VERCEL_DEPLOYMENT_GUIDE.md) | Vercel 배포 가이드 (필독) |
| 2 | [ARCHITECTURE.md](ARCHITECTURE.md) | 프로젝트 아키텍처 |
| 3 | [QUICK_REFERENCE.md](QUICK_REFERENCE.md) | 빠른 참조 가이드 |

---

## 개발 시 주의사항

### TypeScript 설정

현재 설정 (`tsconfig.json`):
```json
"noUnusedLocals": false,
"noUnusedParameters": false,
```

**이유:** Vercel 배포 시 미사용 변수 에러 방지

### Next.js 빌드 설정

현재 설정 (`next.config.js`):
```javascript
typescript: {
  ignoreBuildErrors: true,
},
eslint: {
  ignoreDuringBuilds: true,
},
```

**이유:** fabric.js 타입 이슈로 인한 빌드 에러 방지

---

## 배포 체크리스트

배포 전 반드시 확인:

- [ ] `npm run build` 로컬 성공
- [ ] 환경 변수 설정 확인 (`vercel env ls`)
- [ ] `vercel.json` 유효성 검증

### 배포 명령어

```bash
# 프로덕션 배포
vercel --prod --yes

# 환경 변수 추가
echo "VALUE" | vercel env add NAME production
```

---

## 알려진 이슈

### fabric.js v6 타입 문제

fabric.js v6의 타입 정의가 불완전함. 콜백 함수에 명시적 타입 필요:

```typescript
// 권장
fabric.Image.fromURL(src, (img: fabric.Image | null) => { ... });
```

### vercel.json 제한사항

다음 속성은 사용하지 마세요:
- `env` (배열 형태)
- `nodeVersion`
- `crons` (Hobby 플랜)
- `functions` (매칭 파일 없을 때)

---

## 디렉토리 구조

```
canvas_editor/
├── app/                    # Next.js App Router
│   ├── editor/[id]/       # 에디터 페이지
│   └── login/             # 로그인 페이지
├── components/            # React 컴포넌트
├── hooks/                 # Custom hooks
├── lib/                   # 유틸리티, API 클라이언트
├── stores/                # Zustand stores
├── types/                 # TypeScript 타입 정의
├── work_journal/          # 업무일지 및 가이드
└── vercel.json           # Vercel 설정
```

---

## 관련 에이전트

| 에이전트 | 역할 |
|---------|------|
| `engineer` | 코드 구현, 배포 |
| `designer` | UI/UX 설계 |
| `pm` | 요구사항 관리 |

상위 문서: [../AGENT.md](../AGENT.md)

---

*마지막 업데이트: 2026-03-09*
