# 웹·PWA·네이티브 검증 범위

## 확인된 플랫폼

- Next.js 반응형 웹
- 설치 가능한 PWA
- Service Worker와 manifest

## 확인되지 않은 플랫폼

- React Native
- Expo
- Capacitor
- Android 네이티브 프로젝트
- iOS 네이티브 프로젝트

저장소에 네이티브 소스와 빌드 설정이 없으므로 웹 Playwright만 실행해도 네이티브 검증 완료라고 표시하지 않는다.

## PWA 네이티브 유사 동작 체크

- Safe Area
- 설치 아이콘·manifest
- 서비스 워커 업데이트
- 오프라인 fallback
- Android 브라우저 뒤로 가기
- 파일 선택과 키보드
- 앱 재개 후 데이터 갱신

## 현재 판정

- 코드 수준 PWA 계약: CODE_VERIFIED
- 실제 설치·업데이트: BLOCKED
- Android·iOS 실기기: NOT TESTED
- React Native·Capacitor 일치: NOT APPLICABLE
