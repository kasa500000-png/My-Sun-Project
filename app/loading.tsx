export default function Loading() {
  return (
    <main className="mysun-loading-page" role="status" aria-live="polite" aria-busy="true">
      <p className="mysun-visually-hidden">마이썬 운동일지와 최근 운동 기록을 불러오는 중입니다.</p>

      <div className="mysun-loading-shell" aria-hidden="true">
        <div className="mysun-loading-header">
          <span className="mysun-skeleton mysun-loading-logo" />
          <span className="mysun-skeleton mysun-loading-action" />
        </div>

        <section className="mysun-loading-hero">
          <span className="mysun-skeleton mysun-loading-kicker" />
          <span className="mysun-skeleton mysun-loading-title" />
          <span className="mysun-skeleton mysun-loading-copy" />
          <span className="mysun-skeleton mysun-loading-button" />
        </section>

        <div className="mysun-loading-grid">
          <section className="mysun-loading-card">
            <span className="mysun-skeleton mysun-loading-card-label" />
            <span className="mysun-skeleton mysun-loading-card-value" />
            <span className="mysun-skeleton mysun-loading-card-copy" />
          </section>
          <section className="mysun-loading-card">
            <span className="mysun-skeleton mysun-loading-card-label" />
            <span className="mysun-skeleton mysun-loading-card-value" />
            <span className="mysun-skeleton mysun-loading-card-copy" />
          </section>
        </div>
      </div>

      <div className="mysun-loading-caption" aria-hidden="true">
        <span className="mysun-loading-spinner" />
        기록을 준비하고 있어요
      </div>
    </main>
  );
}
