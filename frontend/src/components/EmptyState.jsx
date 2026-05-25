import React from 'react';

export default function EmptyState({ title = 'Nothing here', description = '', actionLabel, onAction }) {
  return (
    <div className="card emptyState" style={{ textAlign: 'center', padding: 32 }}>
      <div className="emptyGraphic" aria-hidden style={{ display: 'inline-block', marginBottom: 14 }}>
        <svg width="120" height="80" viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="6" y="16" width="108" height="56" rx="6" fill="#f3f4f6" />
          <rect x="16" y="26" width="88" height="36" rx="4" fill="#fff" />
          <rect x="24" y="34" width="64" height="6" rx="3" fill="#e5e7eb">
            <animate attributeName="opacity" values="0.4;1;0.4" dur="1.6s" repeatCount="indefinite" />
          </rect>
          <rect x="24" y="44" width="44" height="6" rx="3" fill="#e5e7eb">
            <animate attributeName="opacity" values="0.4;1;0.4" dur="1.6s" begin="0.2s" repeatCount="indefinite" />
          </rect>
        </svg>
      </div>
      <h3 className="h3" style={{ margin: '6px 0' }}>{title}</h3>
      {description ? <div className="muted" style={{ marginBottom: 12 }}>{description}</div> : null}
      {actionLabel ? (
        <div>
          <button className="btn btnPrimary" onClick={onAction}>{actionLabel}</button>
        </div>
      ) : null}
    </div>
  );
}
