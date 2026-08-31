"use client";

import { useEffect, useState } from "react";

type ConnectionState = "checking" | "online" | "offline";

export default function OfflineRecoveryActions() {
  const [connection, setConnection] = useState<ConnectionState>("checking");
  const [retryAttempted, setRetryAttempted] = useState(false);

  useEffect(() => {
    const updateConnection = () => {
      setConnection(navigator.onLine ? "online" : "offline");
      if (navigator.onLine) setRetryAttempted(false);
    };

    updateConnection();
    window.addEventListener("online", updateConnection);
    window.addEventListener("offline", updateConnection);
    return () => {
      window.removeEventListener("online", updateConnection);
      window.removeEventListener("offline", updateConnection);
    };
  }, []);

  function retry() {
    if (navigator.onLine) {
      window.location.assign("/");
      return;
    }
    setRetryAttempted(true);
    setConnection("offline");
  }

  const statusText = connection === "online"
    ? "연결이 복구되었습니다. 앱으로 돌아가 최신 기록을 확인할 수 있어요."
    : connection === "offline" && retryAttempted
      ? "아직 네트워크에 연결되지 않았습니다. Wi-Fi 또는 모바일 데이터를 확인해 주세요."
      : connection === "offline"
        ? "현재 기기가 오프라인 상태입니다. 연결이 돌아오면 버튼이 활성 상태로 안내됩니다."
        : "네트워크 상태를 확인하고 있습니다.";

  return (
    <div className="mysun-offline-recovery">
      <button type="button" className="mysun-primary-action" onClick={retry}>
        {connection === "online" ? "앱으로 돌아가기" : "연결 다시 확인"}
      </button>
      <p
        className="mysun-offline-status"
        data-online={connection === "online" ? "true" : "false"}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {statusText}
      </p>
    </div>
  );
}
