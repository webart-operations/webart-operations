import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, FileText, Users, Briefcase, DollarSign,
  Archive, UserPlus, Calendar, PlusCircle, ShieldCheck, Upload,
  Settings, UserCog, ChevronLeft, ChevronRight, LogOut, RefreshCw
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { NAV_ITEMS } from '../lib/rbac';
import { LOGO_URL } from './ui';
const ICON_MAP = {
  LayoutDashboard, FileText, Users, Briefcase, DollarSign,
  Archive, UserPlus, Calendar, PlusCircle, ShieldCheck, Upload,
  Settings, UserCog, RefreshCw
};

const SMALL_LOGO = 'https://assets.cdn.filesafe.space/2ArF3iCGkC3j4S8qpEeM/media/69bc84383147fdced86af372.png';

export default function Sidebar({ activeTab, setActiveTab, onProfileClick, isMobileOpen }) {
  const { profile, role, signOut, ability } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [counts, setCounts] = useState({ audit: 0, reactivation: 0 });

  const fetchCounts = async () => {
    if (!profile) return;
    const [auditRes, reactRes] = await Promise.all([
      supabase.from('submissions').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('submissions').select('id', { count: 'exact', head: true }).eq('status', 'pending').eq('is_reactivation', true)
    ]);
    
    // Total pending audits (for QA/Manager)
    const pendingAudits = auditRes.count || 0;
    // Total pending reactivations (for AM/PM/Manager) - actually the user might want "Leads" or "Pending Requests"
    // Let's stick to "QA Audits" as the primary alert based on user request.
    setCounts({ 
      audit: pendingAudits,
      reactivation: reactRes.count || 0 
    });
  };

  useEffect(() => {
    fetchCounts();
    const ch = supabase.channel('sidebar_counts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'submissions' }, fetchCounts)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [profile]);

  const visibleItems = NAV_ITEMS.filter(item => item.roles.includes(role));

  const isActive = (id) =>
    activeTab === id || activeTab.startsWith(`${id}-`) ||
    (id === 'audit-queue' && activeTab.startsWith('audit-'));

  return (
    <aside className={`app-sidebar ${collapsed ? 'collapsed' : ''} ${isMobileOpen ? 'mobile-open' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo" style={{ paddingLeft: 16 }}>
        <img
          src={collapsed ? SMALL_LOGO : LOGO_URL}
          alt="WebArt"
          style={{ height: 28, width: collapsed ? 28 : 'auto', objectFit: 'contain', flexShrink: 0, cursor: 'pointer' }}
          onClick={() => setActiveTab('dashboard')}
        />
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            style={{ marginLeft: 'auto', color: 'var(--text-3)', padding: 4, borderRadius: 6, flexShrink: 0 }}
            className="btn btn-ghost btn-sm"
          >
            <ChevronLeft size={16} />
          </button>
        )}
        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            style={{ position: 'absolute', top: 16, right: -14, background: '#fff', border: '1px solid var(--border)', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', cursor: 'pointer', zIndex: 10, boxShadow: 'var(--shadow-sm)' }}
          >
            <ChevronRight size={14} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {visibleItems.map(item => {
          const Icon = ICON_MAP[item.icon];
          const active = isActive(item.id);
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`sidebar-nav-item ${active ? 'active' : ''}`}
              title={collapsed ? item.label : undefined}
            >
              {Icon && <Icon size={17} className="nav-icon" />}
              <span className="nav-label">{item.label}</span>
              
              {!collapsed && item.id === 'audit-queue' && counts.audit > 0 && (
                <span style={{ background: 'var(--red)', color: '#fff', fontSize: '0.625rem', padding: '2px 6px', borderRadius: 10, fontWeight: 900, marginLeft: 'auto', marginRight: 8 }}>
                  {counts.audit}
                </span>
              )}

              {active && <span style={{ width: 3, height: 18, background: 'var(--accent)', borderRadius: 99, marginLeft: item.id === 'audit-queue' ? 0 : 'auto', flexShrink: 0 }} />}
            </button>
          );
        })}
      </nav>

      {/* Footer / User */}
      <div className="sidebar-footer">
        <div className="sidebar-user" onClick={onProfileClick}>
          {profile?.avatar_url
            ? <img src={profile.avatar_url} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
            : (
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                {profile?.full_name?.charAt(0).toUpperCase()}
              </div>
            )
          }
          {!collapsed && (
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {profile?.full_name}
              </div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
                {profile?.role}
              </div>
            </div>
          )}
        </div>
        <button
          onClick={signOut}
          className="sidebar-nav-item"
          style={{ width: '100%', marginTop: 4, color: 'rgba(255,100,100,0.7)' }}
          title={collapsed ? 'Sign Out' : undefined}
        >
          <LogOut size={16} className="nav-icon" />
          <span className="nav-label">Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
