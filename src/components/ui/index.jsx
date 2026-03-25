import React from 'react';

// ─── SPINNER ──────────────────────────────────────────────────────────────────
export const Spinner = ({ size = 'sm' }) => (
  <div style={{ margin: '0 auto' }} className={`spinner ${size === 'lg' ? 'spinner-lg' : size === 'md' ? '' : 'spinner-sm'}`} />
);

// ─── BUTTON ───────────────────────────────────────────────────────────────────
export const Button = ({ children, variant = 'dark', className = '', loading = false, size, full, ...props }) => {
  const v = {
    primary: 'btn-primary', dark: 'btn-dark', outline: 'btn-outline',
    ghost: 'btn-ghost', danger: 'btn-danger',
  };
  return (
    <button
      className={`btn ${v[variant] || 'btn-dark'} ${size === 'sm' ? 'btn-sm' : size === 'lg' ? 'btn-lg' : ''} ${full ? 'btn-full' : ''} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? <Spinner size="sm" /> : children}
    </button>
  );
};

// ─── CARD ─────────────────────────────────────────────────────────────────────
export const Card = ({ title, children, extra, flush = false, className = '' }) => (
  <div className={`card ${className}`}>
    {(title || extra) && (
      <div className="card-header">
        {title && <p className="card-title">{title}</p>}
        {extra}
      </div>
    )}
    <div className={flush ? 'card-body-flush' : 'card-body'}>{children}</div>
  </div>
);

// ─── MODAL ────────────────────────────────────────────────────────────────────
export const Modal = ({ title, children, onClose, size = 'md' }) => (
  <div className="modal-backdrop" onClick={onClose}>
    <div
      className="modal"
      style={{ maxWidth: size === 'lg' ? 860 : size === 'sm' ? 440 : 640 }}
      onClick={e => e.stopPropagation()}
    >
      <div className="modal-header">
        <h2 className="modal-title">{title}</h2>
        <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: '6px' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>
      <div className="modal-body">{children}</div>
    </div>
  </div>
);

// ─── FORM FIELD ───────────────────────────────────────────────────────────────
export const Field = ({ label, textarea = false, hint, error, className = '', ...props }) => (
  <div className={`field ${className}`}>
    {label && <label className="label">{label}</label>}
    {textarea
      ? <textarea className={`textarea ${error ? 'border-red-400' : ''}`} {...props} />
      : <input className={`input ${error ? 'border-red-400' : ''}`} {...props} />
    }
    {hint && !error && <p style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{hint}</p>}
    {error && <p style={{ fontSize: '0.75rem', color: 'var(--red)' }}>{error}</p>}
  </div>
);

export const Select = ({ label, children, error, className = '', ...props }) => (
  <div className={`field ${className}`}>
    {label && <label className="label">{label}</label>}
    <div className="select-wrapper">
      <select className={`select ${error ? 'border-red-400' : ''}`} {...props}>{children}</select>
    </div>
    {error && <p style={{ fontSize: '0.75rem', color: 'var(--red)' }}>{error}</p>}
  </div>
);

// ─── STATUS PILL ──────────────────────────────────────────────────────────────
const DOT_GREEN  = ['active','passed','completed','healthy'];
const DOT_AMBER  = ['on_hold','warning','pending'];
const DOT_RED    = ['at_risk','failed','cancelled','critical'];

export const Pill = ({ status, label, noDot = false }) => {
  const s = status?.toLowerCase().replace(/ /g, '_');
  const dotColor = DOT_GREEN.includes(s) ? 'dot-green' : DOT_AMBER.includes(s) ? 'dot-amber' : DOT_RED.includes(s) ? 'dot-red' : 'dot-green';
  return (
    <span className={`pill pill-${s || 'pending'}`}>
      {!noDot && <span className={`pill-dot ${dotColor}`} />}
      {label || status?.replace(/_/g, ' ')}
    </span>
  );
};

// ─── HEALTH DOT ───────────────────────────────────────────────────────────────
export const getHealthStatus = (days, manualStatus) => {
  if (manualStatus === 'at_risk') return { label: 'Critical', color: 'red' };
  if (days >= 15) return { label: 'Critical', color: 'red' };
  if (days >= 7)  return { label: 'Warning',  color: 'amber' };
  return               { label: 'Healthy',  color: 'green' };
};

export const HealthDot = ({ days, status }) => {
  const h = getHealthStatus(days, status);
  const pillStatus = h.color === 'green' ? 'healthy' : h.color === 'amber' ? 'warning' : 'critical';
  return (
    <div className="health-row">
      <span className={`dot-${h.color}`} />
      <span className="font-mono" style={{ fontSize: '0.8125rem', fontWeight: 700 }}>{days}d</span>
      <Pill status={pillStatus} label={h.label} />
    </div>
  );
};

// ─── MINI BAR CHART ───────────────────────────────────────────────────────────
export const MiniBarChart = ({ data, valueKey, labelKey, color = '#19c964' }) => {
  if (!data?.length) return <p className="text-muted" style={{ textAlign:'center', padding:'16px 0', fontSize:'0.875rem' }}>No data yet</p>;
  const max = Math.max(...data.map(d => d[valueKey]), 1);
  return (
    <div>
      {data.map((d, i) => (
        <div key={i} className="bar-chart-row">
          <div className="bar-chart-label">{d[labelKey]}</div>
          <div className="bar-chart-track">
            <div
              className="bar-chart-fill"
              style={{ width: `${(d[valueKey] / max) * 100}%`, background: color }}
            >
              {d[valueKey] > 0 && (
                <span className="bar-chart-val">
                  {typeof d[valueKey] === 'number' && d[valueKey] > 1000
                    ? `$${(d[valueKey]/1000).toFixed(1)}k`
                    : d[valueKey]}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// ─── EMPTY STATE ──────────────────────────────────────────────────────────────
export const Empty = ({ icon: Icon, title, subtitle, action }) => (
  <div className="empty">
    {Icon && <div className="empty-icon"><Icon size={40} /></div>}
    <p className="empty-title">{title || 'Nothing here yet'}</p>
    {subtitle && <p className="empty-subtitle">{subtitle}</p>}
    {action}
  </div>
);

// ─── ALERT ────────────────────────────────────────────────────────────────────
export const Alert = ({ type = 'info', children }) => (
  <div className={`alert alert-${type}`}>{children}</div>
);

// ─── CONFIRM MODAL ────────────────────────────────────────────────────────────
export const ConfirmModal = ({ title, message, onConfirm, onCancel, danger = false, loading = false }) => (
  <Modal title={title} onClose={onCancel} size="sm">
    <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
      <p style={{ color:'var(--text-2)', fontSize:'0.9375rem' }}>{message}</p>
      <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button variant={danger ? 'danger' : 'dark'} onClick={onConfirm} loading={loading}>Confirm</Button>
      </div>
    </div>
  </Modal>
);

// ─── UTILITIES ────────────────────────────────────────────────────────────────
export const countBusinessDays = (startDateStr) => {
  if (!startDateStr) return 0;
  const start = new Date(startDateStr);
  const end   = new Date();
  let count = 0;
  let cur   = new Date(start);
  while (cur <= end) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return Math.max(0, count - 1);
};

export const exportToCSV = (data, filename) => {
  if (!data?.length) return;
  const headers = Object.keys(data[0]).join(',');
  const rows    = data.map(row =>
    Object.values(row).map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')
  ).join('\n');
  const blob = new Blob([`${headers}\n${rows}`], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

export const LOGO_URL = "https://webart.technology/uploads/settings/1767615762_1738831493_webart-technology-mainlogo.png";
