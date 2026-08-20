import type { ReactNode } from "react";

type AppStatePageProps = {
  eyebrow: string;
  title: string;
  description: ReactNode;
  icon?: ReactNode;
  primaryAction: ReactNode;
  secondaryAction?: ReactNode;
  details?: ReactNode;
  titleId?: string;
};

export default function AppStatePage({
  eyebrow,
  title,
  description,
  icon,
  primaryAction,
  secondaryAction,
  details,
  titleId = "app-state-title",
}: AppStatePageProps) {
  return (
    <main className="mysun-state-page" aria-labelledby={titleId}>
      <section className="mysun-state-card">
        <div className="mysun-state-icon" aria-hidden="true">
          {icon ?? <span>!</span>}
        </div>
        <p className="mysun-state-eyebrow">{eyebrow}</p>
        <h1 id={titleId} className="mysun-page-title">
          {title}
        </h1>
        <div className="mysun-state-description">{description}</div>
        <div className="mysun-state-actions">
          {primaryAction}
          {secondaryAction}
        </div>
        {details ? <div className="mysun-state-details">{details}</div> : null}
      </section>
    </main>
  );
}
