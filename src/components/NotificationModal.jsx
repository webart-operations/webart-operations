import React, { useState } from 'react';
import { useNotifications } from '../context/NotificationContext';
import { X, CheckCircle2, CheckSquare } from 'lucide-react';
import { Button, Card, Empty } from './ui';

export default function NotificationModal({ onClose }) {
  const { notifications, unreadCount, markAsRead, markAllAsRead, getIcon } = useNotifications();

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ alignItems: 'flex-start', paddingTop: 64 }}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 440, marginLeft: 260, animation: 'slideInRight 0.2s ease-out forwards' }}>
        <div className="modal-header" style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 className="modal-title" style={{ fontSize: '1.125rem', margin: 0 }}>Notifications</h2>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
             {unreadCount > 0 && (
                <button onClick={markAllAsRead} style={{ background: 'none', border: 'none', fontSize: '0.75rem', color: 'var(--blue)', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                   <CheckSquare size={14} /> Mark all read
                </button>
             )}
             <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: 4 }}><X size={16} /></button>
          </div>
        </div>
        
        <div className="modal-body" style={{ padding: 0, maxHeight: '60vh', overflowY: 'auto' }}>
          {notifications.length === 0 ? (
             <div style={{ padding: '48px 24px', textAlign: 'center' }}>
                <CheckCircle2 size={32} style={{ margin: '0 auto 12px auto', color: 'var(--border-2)' }} />
                <div style={{ fontWeight: 600, color: 'var(--text-2)' }}>You're all caught up!</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-3)', marginTop: 4 }}>No new notifications.</div>
             </div>
          ) : (
             <div style={{ display: 'flex', flexDirection: 'column' }}>
                {notifications.map(n => (
                   <div 
                      key={n.id} 
                      onClick={() => !n.is_read && markAsRead(n.id)}
                      style={{ 
                         padding: '16px 24px', 
                         borderBottom: '1px solid var(--border)',
                         background: n.is_read ? '#fff' : 'var(--surface-2)',
                         cursor: n.is_read ? 'default' : 'pointer',
                         transition: 'background 0.2s',
                         display: 'flex',
                         gap: 16,
                         alignItems: 'flex-start'
                      }}
                   >
                      <div style={{ flexShrink: 0, marginTop: 4 }}>
                         {getIcon(n.type, 20)}
                      </div>
                      <div style={{ flex: 1 }}>
                         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <div style={{ fontWeight: n.is_read ? 600 : 800, fontSize: '0.875rem', color: 'var(--text)' }}>{n.title}</div>
                            <div style={{ fontSize: '0.6875rem', color: 'var(--text-3)' }}>{new Date(n.created_at).toLocaleDateString()}</div>
                         </div>
                         <div style={{ fontSize: '0.8125rem', color: n.is_read ? 'var(--text-3)' : 'var(--text-2)', lineHeight: 1.5 }}>
                            {n.message}
                         </div>
                      </div>
                      {!n.is_read && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--blue)', marginTop: 8, flexShrink: 0 }} />}
                   </div>
                ))}
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
