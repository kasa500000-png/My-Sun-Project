import type { ReactNode } from "react";

type StatusTone = "success" | "danger" | "warning" | "info";

type StatusMessageProps = {
  children: ReactNode;
  tone?: StatusTone;
  id?: string;
  className?: string;
  live?: "off" | "polite" | "assertive";
};

export default function StatusMessage({
  children,
  tone = "info",
  id,
  className = "",
  live,
}: StatusMessageProps) {
  const ariaLive = live ?? (tone === "danger" ? "assertive" : "polite");

  return (
    <div
      id={id}
      className={`mysun-status ${className}`.trim()}
      data-tone={tone}
      role={tone === "danger" ? "alert" : "status"}
      aria-live={ariaLive}
      aria-atomic="true"
    >
      <div className="mysun-status-content">{children}</div>
    </div>
  );
}
