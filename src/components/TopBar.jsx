import React, { useState, useEffect, useRef } from 'react';
import { Search, Bell, Moon, Sun, X, Menu, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';

function useDebounce(val, delay) {
  const [deb, setDeb] = useState(val);
  useEffect(() => {
    const t = setTimeout(() => setDeb(val), delay);
    return () => clearTimeout(t);
  }, [val, delay]);
  return deb;
}

export default function TopBar({ activeTab, setActiveTab, onMenuClick }) {
  const { profile } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [showNotifs, setShowNotifs] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead, getIcon } = useNotifications();
  const debouncedQ = useDebounce(query, 300);
  const searchRef = useRef();

  // Global search hotkey Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Global search
  useEffect(() => {
    if (!debouncedQ || debouncedQ.length < 2) { setResults(null); return; }
    const search = async () => {
      const q = `%${debouncedQ}%`;
      const [clients, projects, submissions] = await Promise.all([
        supabase.from('clients').select('id,client_name,business_name').ilike('client_name', q).limit(4),
        supabase.from('projects').select('id,client_name,product,status').ilike('client_name', q).limit(4),
        supabase.from('submissions').select('id,client_name,business_name,status').ilike('client_name', q).limit(3),
      ]);
      setResults({
        clients: clients.data || [],
        projects: projects.data || [],
        submissions: submissions.data || [],
      });
    };
    search();
  }, [debouncedQ]);

  return (
    <div className="app-topbar">
      <button 
        onClick={onMenuClick} 
        className="btn btn-ghost btn-sm mobile-menu-btn" 
        style={{ marginRight: 8, padding: 8, display: 'none' }}
      >
        <Menu size={20} />
      </button>
      
      {/* Search */}
      <div className="search-wrapper" style={{ flex: 1, maxWidth: 440 }}>
        <Search size={15} className="search-icon" />
        <input
          ref={searchRef}
          className="input search-input"
          placeholder="Search clients, projects, submissions… (Ctrl+K)"
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{ fontSize: '0.875rem', paddingRight: query ? 36 : 14 }}
          onKeyDown={e => e.key === 'Escape' && setQuery('')}
        />
        {query && (
          <button onClick={() => { setQuery(''); setResults(null); }} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-3)', padding:2 }}>
            <X size={14} />
          </button>
        )}
        {results && (
          <div style={{ position:'absolute', top:'calc(100% + 8px)', left:0, right:0, background:'var(--surface)', border:'1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow:'var(--shadow-lg)', zIndex:100, overflow:'hidden' }}>
            {[
              { key: 'clients', label: 'Clients', onClick: (r) => { setActiveTab(`client-${r.id}`); setQuery(''); setResults(null); }, render: r => <><strong>{r.client_name}</strong> <span style={{color:'var(--text-3)',fontSize:'0.75rem'}}>{r.business_name}</span></> },
              { key: 'projects', label: 'Projects', onClick: (r) => { setActiveTab(`project-${r.id}`); setQuery(''); setResults(null); }, render: r => <><strong>{r.client_name}</strong> <span style={{color:'var(--text-3)',fontSize:'0.75rem'}}>{r.product}</span></> },
              { key: 'submissions', label: 'Submissions', onClick: (r) => { setActiveTab('submissions'); setQuery(''); setResults(null); }, render: r => <><strong>{r.client_name}</strong> <span style={{color:'var(--text-3)',fontSize:'0.75rem'}}>{r.status}</span></> },
            ].map(({ key, label, onClick, render }) => {
              const items = results[key] || [];
              if (!items.length) return null;
              return (
                <div key={key}>
                  <div style={{ padding:'8px 14px 4px', fontSize:'0.6875rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:'var(--text-3)', background:'var(--surface-2)' }}>{label}</div>
                  {items.map(r => (
                    <button key={r.id} onClick={() => onClick(r)} style={{ width:'100%', textAlign:'left', padding:'10px 14px', fontSize:'0.875rem', display:'block', color:'var(--text)', transition:'background 0.1s' }}
                      onMouseEnter={e=>e.currentTarget.style.background='var(--bg)'}
                      onMouseLeave={e=>e.currentTarget.style.background=''}
                    >
                      {render(r)}
                    </button>
                  ))}
                </div>
              );
            })}
            {!results.clients.length && !results.projects.length && !results.submissions.length && (
              <div style={{ padding:'16px 14px', color:'var(--text-3)', fontSize:'0.875rem', textAlign:'center' }}>No results found</div>
            )}
          </div>
        )}
      </div>

      <div style={{ display:'flex', alignItems:'center', gap:8, marginLeft:'auto' }}>
        {/* User Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginRight: 16, paddingRight: 16, borderRight: '1px solid var(--border)' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text)' }}>{profile?.full_name}</div>
          </div>
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', fontWeight: 800 }}>
              {profile?.full_name?.charAt(0)}
            </div>
          )}
        </div>

        {/* Notifications */}
        <div style={{ position:'relative' }}>
          <button onClick={() => setShowNotifs(v => !v)} className="btn btn-ghost btn-sm" style={{ padding:8 }}>
            <Bell size={16} />
            {unreadCount > 0 && <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
          </button>
          {showNotifs && (
            <div style={{ position:'absolute', right:0, top:'calc(100% + 8px)', width:380, maxHeight: 400, overflowY: 'auto', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', boxShadow:'var(--shadow-lg)', zIndex:200 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 16px', borderBottom:'1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 10 }}>
                <span style={{ fontWeight:700, fontSize:'0.9375rem' }}>Notifications</span>
                {unreadCount > 0 && <button onClick={markAllAsRead} style={{ fontSize:'0.75rem', color:'var(--accent)', fontWeight:600, cursor:'pointer', background: 'none', border: 'none' }}>Mark all read</button>}
              </div>
              {notifications.length === 0
                ? <div style={{ padding:40, textAlign:'center', color:'var(--text-3)' }}><CheckCircle2 size={32} style={{ margin: '0 auto 8px auto', opacity: 0.5 }} /><div style={{fontWeight:600,color:'var(--text-2)'}}>You're all caught up! ✨</div></div>
                : notifications.map(n => (
                  <div key={n.id} onClick={() => { if(!n.is_read) markAsRead(n.id); if(n.link) setActiveTab(n.link); setShowNotifs(false); }} style={{ display:'flex', gap:12, padding:'14px 16px', borderBottom:'1px solid var(--border)', background: n.is_read ? '#fff' : 'var(--surface-2)', cursor: 'pointer', transition: 'background 0.2s', alignItems: 'flex-start' }}>
                    <div style={{ flexShrink: 0, marginTop: 2 }}>{getIcon(n.type, 18)}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                         <div style={{ fontWeight: n.is_read ? 600 : 800, fontSize:'0.875rem', color: 'var(--text)' }}>{n.title}</div>
                         <div style={{ fontSize: '0.6875rem', color: 'var(--text-3)', whiteSpace: 'nowrap', marginLeft: 8 }}>{new Date(n.created_at).toLocaleDateString()}</div>
                      </div>
                      <div style={{ color: n.is_read ? 'var(--text-3)' : 'var(--text-2)', fontSize:'0.8125rem', marginTop:2, lineHeight: 1.4 }}>{n.message}</div>
                    </div>
                    {!n.is_read && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--blue)', marginTop: 6, flexShrink: 0 }} />}
                  </div>
                ))
              }
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
