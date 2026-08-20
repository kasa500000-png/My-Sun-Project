"use client";

import Link from "next/link";
import AppStatePage from "@/components/ui/AppStatePage";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <AppStatePage
      eyebrow="화면 오류"
      title="기록을 불러오는 중 잠시 멈췄어요"
      icon={
        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" aria-hidden="true">
          <path d="M12 8v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <circle cx="12" cy="16.5" r="1" fill="currentColor" />
          <path d="M10.3 4.7 3.2 17a2 2 0 0 0 1.7 3h14.2a2 2 0 0 0 1.7-3L13.7 4.7a2 2 0 0 0-3.4 0Z" stroke="currentColor" strokeWidth="1.7" />
        </svg>
      }
      description={
        <>
          <p>네트워크가 불안정하거나 화면 데이터를 처리하는 중 문제가 발생했습니다.</p>
          <p>저장 버튼을 누른 직후였다면 같은 기록을 다시 입력하기 전에 홈이나 일지에서 저장 여부를 먼저 확인해 주세요.</p>
        </>
      }
      primaryAction={
        <button type="button" className="mysun-primary-action" onClick={reset}>
          화면 다시 불러오기
        </button>
      }
      secondaryAction={
        <Link className="mysun-secondary-action" href="/">
          홈으로 이동
        </Link>
      }
      details={error?.digest ? <p>고객 지원이나 오류 확인에 사용할 코드: {error.digest}</p> : undefined}
    />
  );
}
