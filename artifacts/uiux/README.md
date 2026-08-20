# UI·UX 화면 증거

이 디렉터리는 수정 전·후·차이 화면과 접근성·성능 증거를 보관한다.

## 구조

- `before/`: 수정 전 화면
- `after/`: 수정 후 화면
- `diff/`: 동일 뷰포트 픽셀 차이
- `mobile/`: 360·390·412px 검증
- `tablet/`: 768px 검증
- `desktop/`: 1280·1440px 검증
- `accessibility/`: axe, 키보드, 대비 결과
- `performance/`: 빌드·번들·로딩 측정

## 파일명

`{screen-id}/{viewport}-{source}.png`

예: `before/AUTH-01/390x844-deployed.png`

`source`는 `deployed`, `local`, `fixture` 중 하나를 사용한다. fixture를 실제 배포 화면으로 오해할 수 있게 표기하지 않는다.
