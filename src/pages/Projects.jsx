import React, { useState, useEffect } from 'react';
import { Download, Search, Eye, Filter } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Button, Card, Pill, Spinner, HealthDot, exportToCSV, ConfirmModal } from '../components/ui';

export default function ProjectsView({ setActiveTab }) {
  const { profile, role, ability } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const load = async () => {
    let query = supabase.from('projects').select('*, clients(id, client_name)').order('created_at', { ascending: false });

    if (['ceo', 'qa'].includes(role)) {
      // CEO and QA see everything
    } else if (role === 'manager') {
      // Manager sees everything in their team
      query = query.eq('team', profile.team);
    } else if (role === 'am') {
      query = query.eq('assigned_am', profile.full_name);
    } else if (role === 'pm') {
      query = query.eq('assigned_pm', profile.full_name);
    } else if (role === 'sales') {
      // Sales doesn't usually see projects unless they submitted them
      query = query.eq('rep', profile.full_name);
    }

    const { data } = await query;
    setProjects(data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel('projects_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, load)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [profile, role]);

  const executeDelete = async () => {
    if (!projectToDelete) return;
    setIsDeleting(true);
    const id = projectToDelete;
    
    try {
      // CASCADE: Notes, Revenue, Submissions link, Reactivations, Update Logs
      await supabase.from('project_update_logs').delete().eq('project_id', id);
      await supabase.from('reactivation_leads').delete().eq('project_id', id);
      await supabase.from('revenue_ledger').delete().eq('project_id', id);
      // Sever submission links to avoid FK issues
      await supabase.from('submissions').update({ project_id: null }).eq('project_id', id);
      
      const { error } = await supabase.from('projects').delete().eq('id', id);
      if (error) {
        alert('Failed to delete: ' + error.message);
      } else {
        setProjects(prev => prev.filter(p => p.id !== id));
        setProjectToDelete(null);
      }
    } catch (err) {
      console.error('Delete error:', err);
      alert('An unexpected error occurred.');
    } finally {
      setIsDeleting(false);
    }
  };

  const filtered = projects.filter(p => {
    const matchSearch = p.client_name?.toLowerCase().includes(search.toLowerCase()) || p.clients?.client_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Project Portfolio</h1>
          <p className="page-subtitle">{projects.length} total projects</p>
        </div>
        <Button variant="outline" onClick={() => exportToCSV(projects.map(p => ({ client: p.client_name, product: p.product, status: p.status, am: p.assigned_am, pm: p.assigned_pm })), 'Projects')}>
          <Download size={14} /> Export
        </Button>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div className="search-wrapper" style={{ flex: 1, minWidth: 260 }}>
          <Search size={15} className="search-icon" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search projects..."
            className="input search-input"
          />
        </div>
        <div style={{ display: 'flex', gap: 4, background: 'var(--surface)', padding: 4, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
          {['all', 'active', 'on_hold', 'delivered', 'dead', 'closed'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              style={{
                padding: '6px 12px', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase',
                borderRadius: 6, transition: 'all 0.15s',
                ...(statusFilter === s ? { background: 'var(--text)', color: 'white' } : { color: 'var(--text-3)' })
              }}>
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <Card flush>
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Client / Project</th>
                <th>Team</th>
                <th>Status</th>
                <th>Health</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={5} style={{ textAlign: 'center', padding: '48px 0' }}><Spinner size="lg" /></td></tr>
              : filtered.length === 0 ? <tr><td colSpan={5} style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-3)' }}>No projects found</td></tr>
              : filtered.map(p => {
                const days = Math.floor((Date.now() - new Date(p.last_communication_date || p.created_at).getTime()) / (1000*3600*24));
                return (
                  <tr key={p.id} className="clickable" onClick={() => setActiveTab(`project-${p.id}`)}>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{p.client_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{p.product}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-2)' }}><span style={{ color: 'var(--text-3)' }}>AM:</span> {p.assigned_am || '—'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-2)' }}><span style={{ color: 'var(--text-3)' }}>PM:</span> {p.assigned_pm || '—'}</div>
                    </td>
                    <td><Pill status={p.status} /></td>
                    <td><HealthDot days={Math.max(0, days)} status={p.status} /></td>
                    <td style={{ textAlign: 'right', display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                      <Button variant="outline" size="sm" onClick={e => { e.stopPropagation(); setActiveTab(`project-${p.id}`); }}>
                        View <Eye size={12} />
                      </Button>
                      {ability('delete_projects') && (
                       <div onClick={e => { e.stopPropagation(); setProjectToDelete(p.id); }} style={{ cursor: 'pointer', opacity: 0.5, padding: 4 }} onMouseEnter={e => e.currentTarget.style.opacity=1} onMouseLeave={e => e.currentTarget.style.opacity=0.5}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="2.5"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                       </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
      {projectToDelete && (
        <ConfirmModal
          title="Delete Project"
          message="Are you sure you want to permanently delete this project and all its notes and revenue tracking? This cannot be undone."
          onConfirm={executeDelete}
          onCancel={() => setProjectToDelete(null)}
          danger
          loading={isDeleting}
        />
      )}
    </div>
  );
}
