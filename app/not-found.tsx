import Link from "next/link";
import AppStatePage from "@/components/ui/AppStatePage";

export default function NotFound() {
  return (
    <AppStatePage
      eyebrow="404"
      title="요청한 화면을 찾지 못했어요"
      icon={
        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" aria-hidden="true">
          <circle cx="10.5" cy="10.5" r="5.75" stroke="currentColor" strokeWidth="1.8" />
          <path d="m15 15 4 4M8.2 10.5h4.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      }
      description={
        <>
          <p>주소가 바뀌었거나 지금은 사용할 수 없는 화면입니다.</p>
          <p>저장된 운동·식단 데이터에는 영향을 주지 않았습니다.</p>
        </>
      }
      primaryAction={
        <Link className="mysun-primary-action" href="/">
          운동일지 홈으로 이동
        </Link>
      }
      secondaryAction={
        <Link className="mysun-secondary-action" href="/login">
          로그인 화면으로 이동
        </Link>
      }
    />
  );
}
