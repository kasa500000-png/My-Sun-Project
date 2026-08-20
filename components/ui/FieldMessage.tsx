import type { ReactNode } from "react";

type FieldMessageProps = {
  id: string;
  children: ReactNode;
  tone?: "hint" | "error";
};

export default function FieldMessage({ id, children, tone = "hint" }: FieldMessageProps) {
  const isError = tone === "error";

  return (
    <p
      id={id}
      className={isError ? "mysun-field-error" : "mysun-field-hint"}
      role={isError ? "alert" : undefined}
      aria-live={isError ? "assertive" : undefined}
    >
      {children}
    </p>
  );
}
