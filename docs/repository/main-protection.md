# `main` 보호 규칙

## 적용 시점

PR #1의 My-Sun Supabase staging smoke가 성공하고 해당 PR을 병합한 직후 적용한다.

## 필수 규칙

- 대상 패턴: `main`
- Pull request를 통한 변경만 허용
- 필수 상태 검사 통과 요구
  - `UIUX quality gate`
  - `UIUX visual validation`
  - `Supabase staging PR smoke`
  - `Vercel`
- 병합 전 최신 `main` 반영 요구
- 모든 대화 해결 요구
- Force push 차단
- 브랜치 삭제 차단
- 관리자 우회 차단

## 검증 절차

1. 임시 브랜치에서 `main` 직접 push가 거부되는지 확인한다.
2. 실패한 필수 check가 있는 PR의 Merge 버튼이 비활성화되는지 확인한다.
3. 최신 `main`보다 뒤처진 PR이 업데이트를 요구하는지 확인한다.
4. force push와 branch delete가 거부되는지 확인한다.

## 현재 connector 제약

현재 GitHub integration은 branch-protection 조회에서 `Resource not accessible by integration` 403을 반환하며 보호 규칙 쓰기 액션도 제공하지 않는다. GitHub 저장소 관리자 UI 또는 `administration:write` 권한이 있는 GitHub App/PAT로 적용한다.
