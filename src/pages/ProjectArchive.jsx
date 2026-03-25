import React, { useState, useEffect } from 'react';
import { Search, Briefcase, User, Calendar, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Card, Button, Pill, Spinner, HealthDot } from '../components/ui';

export default function ProjectArchiveView() {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const fetchData = async () => {
    setLoading(true);
    // Fetch projects with historical/archived statuses
    const { data } = await supabase.from('projects')
      .select('*, clients(email, phone)')
      .in('status', ['on_hold', 'delivered', 'dead', 'closed'])
      .order('last_communication_date', { ascending: false });
    setProjects(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.client_name?.toLowerCase().includes(search.toLowerCase()) || 
                         p.assigned_am?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === 'all' || p.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Project Archive</h1>
          <p className="page-subtitle">View and manage historical, on-hold, or closed projects.</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <div className="search-wrapper" style={{ flex: 1, maxWidth: 400 }}>
          <Search size={16} className="search-icon" />
          <input 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            placeholder="Search by client or AM..." 
            className="input search-input" 
          />
        </div>
        <select className="select" style={{ maxWidth: 200 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="all">All Statuses</option>
          <option value="on_hold">On Hold</option>
          <option value="delivered">Delivered</option>
          <option value="dead">Dead</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      <Card flush>
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Project / Client</th>
                <th>Assigned Team</th>
                <th>Last Update</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 48 }}><Spinner /></td></tr>
              ) : filteredProjects.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 48, color: 'var(--text-3)' }}>No archived projects found matching your criteria.</td></tr>
              ) : filteredProjects.map(p => (
                <tr key={p.id}>
                  <td>
                    <div style={{ fontWeight: 800 }}>{p.client_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{p.clients?.email || 'No email'}</div>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 600 }}>AM: {p.assigned_am || '—'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>PM: {p.assigned_pm || '—'}</div>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.8125rem' }}>{new Date(p.last_communication_date || p.created_at).toLocaleDateString()}</div>
                  </td>
                  <td>
                    <Pill status={p.status} />
                  </td>
                  <td>
                    <Button size="xs" variant="ghost" onClick={() => window.location.hash = `project-${p.id}`}>
                      <ExternalLink size={14} /> View Details
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
