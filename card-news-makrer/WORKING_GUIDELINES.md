# 작업 가이드라인 (Working Guidelines)

## 사용자 피드백 기반 규칙

### 1. 인증(Auth) 이슈 처리 원칙 (2026-03-09)

> **복잡한 우회 시도 금지. 사용자에게 간단히 요청할 것.**

- 배포, API 토큰, 비밀번호 입력 등 인증이 필요한 상황에서 막히면:
  - ❌ 브라우저 자동화로 토큰 직접 생성 시도
  - ❌ 여러 단계의 우회 방법 탐색
  - ✅ **사용자에게 무엇이 필요한지 명확히 설명하고 직접 처리를 요청**
- 예시: "GitHub Personal Access Token이 필요합니다. Settings > Developer settings > Personal access tokens에서 `repo` 권한으로 생성해 주세요."

### 2. VM 환경 제약 사항

- VM 프록시가 특정 외부 API를 차단할 수 있음 (예: api.vercel.com)
- GitHub(github.com)은 접근 가능
- 차단 확인 시 즉시 대안(브라우저 UI, 사용자 요청 등)으로 전환

---

## 기술 컨텍스트

- **Supabase 프로젝트**: `txpqctreqmxjgwjrhivn` (서울 리전)
- **GitHub 계정**: blottosicei
- **Vercel 계정**: seonggonkim-7257
- **프레임워크**: Next.js 14 + Fabric.js + Supabase + Tailwind CSS

---

*이 파일은 작업 중 축적되는 피드백과 가이드라인을 기록합니다. 새 피드백이 있을 때마다 업데이트합니다.*
