import React, { useState, useEffect } from 'react';
import { Download, Search, Eye, Phone, Mail, Globe, MapPin, Building2, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Button, Card, Pill, Spinner, exportToCSV, ConfirmModal } from '../components/ui';

export default function ClientsView({ setActiveTab }) {
  const { profile, role, ability } = useAuth();
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [clientToDelete, setClientToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const load = async () => {
      let query = supabase.from('clients').select('*, projects(id, product, status, assigned_am, assigned_pm)').order('created_at', { ascending: false });
      
      if (['ceo', 'qa'].includes(role)) {
       // CEO and QA see everything
    } else if (role === 'manager') {
       // Manager sees everything in their team
       query = query.eq('team', profile.team);
    } else if (role === 'am' || role === 'pm') {
       // Filter by assigned projects
       const { data: userProjects } = await supabase.from('projects')
         .select('client_id')
         .eq(role === 'am' ? 'assigned_am' : 'assigned_pm', profile.full_name);
       
       if (userProjects && userProjects.length > 0) {
         query = query.in('id', userProjects.map(p => p.client_id));
       } else {
         query = query.eq('id', '00000000-0000-0000-0000-000000000000'); // Force empty
       }
    }else if (role === 'sales') {
        // For sales, we show clients they have submitted sales for
        // Since we joined projects, we can check if any project is linked to one of their submissions
        // But simpler: just show all clients they've created
        query = query.eq('created_by', profile.id);
      }

      const { data } = await query;
      
      // Filter out inactive clients (those with 0 projects that are 'active' or 'at_risk')
      // These clients are managed in the Reactivation Center.
      const activeClients = (data || []).filter(c => {
        const projs = c.projects || [];
        return projs.some(p => p.status === 'active' || p.status === 'at_risk');
      });

      setClients(activeClients);
      setLoading(false);
    };
    load();
  }, [profile, role]);

  const executeDelete = async () => {
    if (!clientToDelete) return;
    setIsDeleting(true);
    const id = clientToDelete;
    
    try {
      // Unlink submissions first
      await supabase.from('submissions').update({ client_id: null }).eq('client_id', id);

      const { error } = await supabase.from('clients').delete().eq('id', id);
      if (error) {
        alert('Could not delete: ' + error.message + '. Please delete all associated projects first.');
      } else {
        setClients(prev => prev.filter(c => c.id !== id));
        setClientToDelete(null);
      }
    } catch (err) {
      console.error('Delete error:', err);
      alert('An unexpected error occurred.');
    } finally {
      setIsDeleting(false);
    }
  };

  const filtered = clients.filter(c =>
    c.client_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.business_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Client Directory</h1>
          <p className="page-subtitle">{clients.length} total clients</p>
        </div>
        <Button variant="outline" onClick={() => exportToCSV(clients.map(c => ({ business: c.business_name, client: c.client_name, phone: c.phone, email: c.email, country: c.country })), 'Clients')}>
          <Download size={14} /> Export
        </Button>
      </div>

      <div className="search-wrapper">
        <Search size={15} className="search-icon" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search clients..."
          className="input search-input"
        />
      </div>

      <Card flush>
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Contact</th>
                <th>Country</th>
                <th>Projects</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={5} style={{ textAlign:'center', padding:'48px 0' }}><Spinner size="lg" /></td></tr>
              : filtered.length === 0 ? <tr><td colSpan={5} style={{ textAlign:'center', padding:'48px 0', color:'var(--text-3)' }}>No clients found</td></tr>
              : filtered.map(c => (
                <tr key={c.id} className="clickable" onClick={() => setActiveTab(`client-${c.id}`)}>
                  <td>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{c.client_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{c.business_name}</div>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}><Phone size={11} /> {c.phone || '—'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 4 }}><Mail size={11} /> {c.email || '—'}</div>
                  </td>
                  <td style={{ fontSize: '0.875rem', color: 'var(--text-2)' }}>{c.country || '—'}</td>
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {(c.projects || []).map((p, i) => <Pill key={i} status={p.status} label={p.product} />)}
                      {!(c.projects || []).length && <span style={{ color: 'var(--text-3)', fontSize: '0.75rem' }}>—</span>}
                    </div>
                  </td>
                  <td style={{ textAlign: 'right', display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                    <Button variant="outline" size="sm" onClick={e => { e.stopPropagation(); setActiveTab(`client-${c.id}`); }}>
                      View <Eye size={12} />
                    </Button>
                    {ability('delete_clients') && (
                        <div onClick={e => { e.stopPropagation(); setClientToDelete(c.id); }} style={{ cursor: 'pointer', opacity: 0.5, padding: 4 }} onMouseEnter={e => e.currentTarget.style.opacity=1} onMouseLeave={e => e.currentTarget.style.opacity=0.5}>
                           <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="2.5"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                        </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      {clientToDelete && (
        <ConfirmModal
          title="Delete Client"
          message="Are you sure you want to delete this client? Note: Clients with active projects cannot be deleted until those projects are removed."
          onConfirm={executeDelete}
          onCancel={() => setClientToDelete(null)}
          danger
          loading={isDeleting}
        />
      )}
    </div>
  );
}
