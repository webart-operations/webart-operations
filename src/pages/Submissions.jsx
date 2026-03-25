import React, { useState, useEffect } from 'react';
import { Download, Search, Settings, ShieldAlert, CheckCircle2, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Button, Card, Pill, Spinner, exportToCSV, ConfirmModal } from '../components/ui';

export default function SubmissionsView({ setActiveTab }) {
  const { profile, role, ability } = useAuth();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [submissionToDelete, setSubmissionToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadSubmissions = async () => {
    let query = supabase.from('submissions').select('*').eq('is_reactivation', false).order('sale_date', { ascending: false });
    if (role === 'sales') {
      query = query.eq('submitted_by', profile.full_name);
    }
    const { data } = await query;
    setSubmissions(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadSubmissions();
    const ch = supabase.channel('submissions_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'submissions' }, loadSubmissions)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [profile, role]);

  const executeDelete = async () => {
    if (!submissionToDelete) return;
    setIsDeleting(true);
    const id = submissionToDelete;
    
    try {
      const { data: sub } = await supabase.from('submissions').select('project_id').eq('id', id).maybeSingle();
      
      if (sub?.project_id) {
        await supabase.from('project_update_logs').delete().eq('project_id', sub.project_id);
        await supabase.from('reactivation_leads').delete().eq('project_id', sub.project_id);
        await supabase.from('revenue_ledger').delete().eq('project_id', sub.project_id);
        await supabase.from('projects').delete().eq('id', sub.project_id);
      }
      
      await supabase.from('qa_audits').delete().eq('submission_id', id);
      const { error } = await supabase.from('submissions').delete().eq('id', id);
      
      if (error) {
        alert('Failed to delete: ' + error.message);
      } else {
        setSubmissions(prev => prev.filter(s => s.id !== id));
        setSubmissionToDelete(null);
      }
    } catch (err) {
      console.error('Delete error:', err);
      alert('An unexpected error occurred.');
    } finally {
      setIsDeleting(false);
    }
  };

  const filtered = submissions.filter(s =>
    s.client_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.business_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.product?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Sales Submissions</h1>
          <p className="page-subtitle">{submissions.length} total records</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="outline" onClick={() => exportToCSV(submissions, 'Submissions')}><Download size={14} /> Export</Button>
          {ability('submit_sales') && <Button variant="dark" onClick={() => setActiveTab('sales-form')}>New Sale</Button>}
        </div>
      </div>

      <div className="search-wrapper">
        <Search size={15} className="search-icon" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search submissions..." className="input search-input" />
      </div>

      <Card flush>
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Client Details</th>
                <th>Sale Info</th>
                <th>Amounts</th>
                <th>Status</th>
                {ability('delete_submissions') && <th style={{ textAlign: 'right' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={5} style={{ textAlign: 'center', padding: '48px 0' }}><Spinner size="lg" /></td></tr>
              : filtered.length === 0 ? <tr><td colSpan={5} style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-3)' }}>No submissions found</td></tr>
              : filtered.map(s => (
                <tr key={s.id}>
                  <td>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{s.client_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{s.business_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{s.email}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: '0.8125rem' }}>{s.product}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-2)' }}>Rep: {s.rep}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{s.sale_date}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 800, fontSize: '0.875rem', color: 'var(--green)' }}>{s.currency} {Number(s.gross || 0).toLocaleString()}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-2)' }}>Net: {s.currency} {Number(s.net || 0).toLocaleString()}</div>
                  </td>
                  <td><Pill status={s.status} /></td>
                  {ability('delete_submissions') && (
                    <td style={{ textAlign: 'right' }}>
                      <Button variant="danger" size="sm" onClick={() => setSubmissionToDelete(s.id)}>Delete</Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      {submissionToDelete && (
        <ConfirmModal
          title="Delete Submission"
          message="Are you sure you want to permanently delete this submission and all linked project data? This cannot be undone."
          onConfirm={executeDelete}
          onCancel={() => setSubmissionToDelete(null)}
          danger
          loading={isDeleting}
        />
      )}
    </div>
  );
}
