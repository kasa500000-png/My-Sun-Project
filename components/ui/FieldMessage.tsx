import type { ReactNode } from "react";

type FieldMessageProps = {
  id: string;
  children: ReactNode;
  tone?: "hint" | "error";
};

export default function FieldMessage({ id, children, tone = "hint" }: FieldMessageProps) {
  return (
    <p id={id} className={tone === "error" ? "mysun-field-error" : "mysun-field-hint"}>
      {children}
    </p>
  );
}
