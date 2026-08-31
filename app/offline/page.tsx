import AppStatePage from "@/components/ui/AppStatePage";
import OfflineRecoveryActions from "@/components/ui/OfflineRecoveryActions";

export default function OfflinePage() {
  return (
    <AppStatePage
      eyebrow="오프라인"
      title="연결이 돌아오면 안전하게 이어갈 수 있어요"
      icon={
        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" aria-hidden="true">
          <path d="M4 8.8a12.3 12.3 0 0 1 16 0M7.2 12a7.6 7.6 0 0 1 9.6 0M10.3 15.2a3 3 0 0 1 3.4 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M4 4l16 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      }
      description={
        <>
          <p>네트워크가 끊겨 새 운동·식단 데이터를 불러오지 못했습니다.</p>
          <p>저장 전 입력은 이 화면에서 서버에 전송되지 않았으므로, 연결을 복구한 뒤 원래 화면에서 다시 확인해 주세요.</p>
        </>
      }
      primaryAction={<OfflineRecoveryActions />}
      details={
        <p>
          개인정보가 포함될 수 있는 인증 후 화면은 오프라인 캐시에 저장하지 않습니다. 공개 로그인·오프라인 화면과 정적 자산만 캐시합니다.
        </p>
      }
    />
  );
}
