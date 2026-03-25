import React, { useState, useEffect } from 'react';
import { RefreshCw, User, Briefcase, History, Send, AlertCircle, CheckCircle2, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Card, Button, Pill, Spinner } from '../components/ui';

export default function ReactivationView({ appSettings }) {
  const { profile } = useAuth();
  const [tab, setTab] = useState('leads');
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [search, setSearch] = useState('');

  // Modals
  const [selectedClient, setSelectedClient] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Reactivation Leads directly from the database
      const { data: leads } = await supabase.from('clients').select('*, projects(*)').eq('status', 'reactivation_eligible');
      setClients(leads || []);

      // 3. Fetch All Reactivation Submissions
      const { data: subs } = await supabase.from('submissions')
        .select('*')
        .eq('is_reactivation', true)
        .order('sale_date', { ascending: false });
      setSubmissions(subs || []);

    } catch (err) {
      console.error("Fetch Data Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleReactivateSubmit = async (e) => {
    e.preventDefault();
    if (!selectedClient) return;
    setSubmitting(true);

    const fd = new FormData(e.target);
    const data = {
      client_name: selectedClient.client_name,
      business_name: selectedClient.business_name || selectedClient.client_name,
      email: selectedClient.email,
      phone: selectedClient.phone,
      product: fd.get('product'),
      currency: fd.get('currency'),
      gross: Number(fd.get('gross')),
      net: Number(fd.get('net')),
      sale_date: fd.get('sale_date'),
      rep: profile.full_name,
      closer: fd.get('closer'),
      status: 'pending',
      is_reactivation: true,
      submitted_by: profile.full_name,
      sales_remarks: fd.get('remarks')
    };

    const { error } = await supabase.from('submissions').insert(data);
    if (error) {
      alert("Error submitting reactivation request.");
    } else {
      setSelectedClient(null);
      fetchData();
    }
    setSubmitting(false);
  };

  const filteredClients = clients.filter(c => 
    c.client_name?.toLowerCase().includes(search.toLowerCase()) || 
    c.business_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reactivation Center</h1>
          <p className="page-subtitle">Re-engage historical clients with zero current active projects.</p>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'leads' ? 'active' : ''}`} onClick={() => setTab('leads')}>
          Eligible Clients ({clients.length})
        </button>
        <button className={`tab ${tab === 'subs' ? 'active' : ''}`} onClick={() => setTab('subs')}>
          Pending Submissions ({submissions.filter(s => s.status === 'pending').length})
        </button>
        <button className={`tab ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>
          Reactivation History
        </button>
      </div>

      {tab === 'leads' && (
        <>
          <div className="search-wrapper" style={{ maxWidth: 400 }}>
            <Search size={16} className="search-icon" />
            <input 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              placeholder="Search eligible clients..." 
              className="input search-input" 
            />
          </div>

          <div className="grid-2">
            {loading ? <Spinner />
            : filteredClients.length === 0 ? <p className="text-muted">No eligible clients for reactivation.</p>
            : filteredClients.map(c => (
              <Card key={c.id}>
                <div style={{ display: 'flex', gap: 16, alignItems: 'start' }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--accent-glow)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <User size={24} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontWeight: 800, fontSize: '1rem', marginBottom: 2 }}>{c.client_name}</h3>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginBottom: 8 }}>{c.business_name} · {c.email}</p>
                    
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                      {c.projects?.map(p => (
                        <div key={p.id} style={{ fontSize: '0.625rem', padding: '2px 8px', borderRadius: 6, background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Briefcase size={10} /> {p.product} ({p.status})
                        </div>
                      ))}
                    </div>

                    <Button variant="primary" size="sm" onClick={() => setSelectedClient(c)}>
                      <RefreshCw size={14} /> Request Reactivation
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {tab === 'subs' && (
        <Card flush>
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Product Details</th>
                  <th>Submission Info</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {submissions.filter(s => s.status === 'pending').map(s => (
                  <tr key={s.id}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{s.client_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{s.business_name}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{s.product}</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{s.currency} {s.gross} / {s.net}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>{s.rep}</div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--text-3)' }}>{s.sale_date}</div>
                    </td>
                    <td>
                      <Pill status="pending" />
                    </td>
                  </tr>
                ))}
                {submissions.filter(s => s.status === 'pending').length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: 48, color: 'var(--text-3)' }}>No pending reactivation submissions.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === 'history' && (
        <Card flush>
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Product Details</th>
                  <th>Staff Info</th>
                  <th>Audit Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {submissions.filter(s => s.status !== 'pending').map(s => (
                  <tr key={s.id}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{s.client_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{s.business_name}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{s.product}</div>
                      <div style={{ fontSize: '0.75rem' }}>{s.currency} {Number(s.net).toLocaleString()}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>Rep: {s.rep}</div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--text-3)' }}>Closer: {s.closer}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.75rem' }}>{s.audit_date || s.sale_date}</div>
                    </td>
                    <td>
                      <Pill status={['passed', 'approved'].includes(s.status) ? 'active' : 'failed'} 
                             label={s.status.toUpperCase()} />
                    </td>
                  </tr>
                ))}
                {submissions.filter(s => s.status !== 'pending').length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: 48, color: 'var(--text-3)' }}>No processed reactivation history.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Reactivation Modal */}
      {selectedClient && (
        <div className="modal-overlay" onClick={() => setSelectedClient(null)}>
          <div className="modal-content" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">New Reactivation Sale</h2>
              <p className="modal-subtitle">Log a new project for {selectedClient.client_name}</p>
            </div>
            <form onSubmit={handleReactivateSubmit} className="space-y-4">
              <div className="field">
                <label className="label">Product / Service *</label>
                <select name="product" className="select" required>
                  <option value="">Select product...</option>
                  {appSettings.products?.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              <div className="grid-2">
                <div className="field">
                  <label className="label">Currency *</label>
                  <select name="currency" className="select" required defaultValue="USD">
                    {appSettings.currencies?.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label className="label">Sale Date *</label>
                  <input name="sale_date" type="date" className="input" required defaultValue={new Date().toISOString().split('T')[0]} />
                </div>
              </div>

              <div className="grid-2">
                <div className="field">
                  <label className="label">Gross Value *</label>
                  <input name="gross" type="number" step="0.01" className="input" required placeholder="0.00" />
                </div>
                <div className="field">
                  <label className="label">Net Value *</label>
                  <input name="net" type="number" step="0.01" className="input" required placeholder="0.00" />
                </div>
              </div>

              <div className="field">
                <label className="label">Closer Name *</label>
                <select name="closer" className="select" required>
                  <option value="">Select closer...</option>
                  {appSettings.closers?.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="field">
                <label className="label">Internal Remarks</label>
                <textarea name="remarks" className="input" rows={3} placeholder="Notes about this reactivation..." />
              </div>

              <div style={{ display: 'flex', gap: 12, paddingTop: 16 }}>
                <Button full variant="outline" onClick={() => setSelectedClient(null)}>Cancel</Button>
                <Button full variant="primary" type="submit" loading={submitting}>Submit Request</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
