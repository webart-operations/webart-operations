import React, { useState, useEffect } from 'react';
import { ArrowLeft, MessageSquare, Trash2, ShieldCheck, CheckCircle2, Plus, Building2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { notifyProjectStatusAlert, notifyProjectAssigned } from '../lib/notifications';
import { formatUSD } from '../lib/currency';
import { Button, Card, Pill, Spinner, HealthDot, Select, Field } from '../components/ui';

export default function ProjectDetailView({ projectId, setActiveTab, appSettings }) {
  const { profile, ability, role } = useAuth();
  const [project, setProject] = useState(null);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [serviceModal, setServiceModal] = useState(false);
  const [newService, setNewService] = useState({ name: '', gross: '', net: '', currency: 'USD' });
  const [serviceSaving, setServiceSaving] = useState(false);

  // ... rest of state ...
  const [saving, setSaving] = useState(false);
  const [editStatus, setEditStatus] = useState('');
  const [updateSummary, setUpdateSummary] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpsCount, setFollowUpsCount] = useState('');
  const [healthScore, setHealthScore] = useState('');
  const [commDate, setCommDate] = useState(new Date().toISOString().split('T')[0]);

  // Reassignment data
  const [staff, setStaff] = useState({ ams: [], pms: [] });
  const [editAM, setEditAM] = useState('');
  const [editPM, setEditPM] = useState('');

  const [services, setServices] = useState([]);
  const [summary, setSummary] = useState(null);

  const loadData = async () => {
    const [
      { data: p }, 
      { data: n },
      { data: srv },
      { data: sum }
    ] = await Promise.all([
      supabase.from('projects').select('*, clients(phone, email, website)').eq('id', projectId).single(),
      supabase.from('project_update_logs').select('*').eq('project_id', projectId).order('created_at', { ascending: true }),
      supabase.from('project_services').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
      supabase.from('project_financial_summaries').select('*').eq('project_id', projectId).maybeSingle()
    ]);
    
    setProject(p);
    setEditStatus(p?.status || '');
    setEditAM(p?.assigned_am || '');
    setEditPM(p?.assigned_pm || '');
    setNotes(n || []);
    setServices(srv || []);
    setSummary(sum);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    supabase.from('profiles').select('full_name, role').in('role', ['am', 'pm', 'qa', 'ceo']).eq('status', 'active')
      .then(({ data }) => {
        if (data) setStaff({ ams: data.filter(d => ['am', 'ceo', 'qa'].includes(d.role)).map(d => d.full_name), pms: data.filter(d => ['pm', 'ceo', 'qa'].includes(d.role)).map(d => d.full_name) });
      });
  }, [projectId]);

  const handleAddUpdate = async (e) => {
    e.preventDefault();
    if (!updateSummary.trim()) return;
    setSaving(true);

    await supabase.from('project_update_logs').insert({
      project_id: projectId,
      client_id: project.client_id,
      author_id: profile.id,
      author_name: profile.full_name,
      last_communication_date: commDate,
      summary: updateSummary,
      next_action: nextAction,
      status_override: editStatus
    });
    
    // Auto-update project metadata
    const updates = { 
      last_communication_date: commDate,
      status: editStatus 
    };

    if (ability('reassign_projects') || editAM || editPM) {
      if (editAM) updates.assigned_am = editAM;
      if (editPM) updates.assigned_pm = editPM;
    }

    await supabase.from('projects').update(updates).eq('id', projectId);
    
    // Broadcast notification if status changed
    if (editStatus && editStatus !== project.status) {
       await notifyProjectStatusAlert({
          clientName: project.client_name,
          status: editStatus,
          amName: updates.assigned_am || project.assigned_am,
          pmName: updates.assigned_pm || project.assigned_pm,
          teamName: project.team
       });
    }

    // Broadcast notification if reassigned
    if ((editAM && editAM !== project.assigned_am) || (editPM && editPM !== project.assigned_pm)) {
       await notifyProjectAssigned({
          clientName: project.client_name,
          amName: editAM || project.assigned_am,
          pmName: editPM || project.assigned_pm,
          assignerName: profile.full_name,
          teamName: project.team
       });
    }

    // Reset Form
    setUpdateSummary('');
    setNextAction('');
    setFollowUpDate('');
    setFollowUpsCount('');
    setHealthScore('');
    setSaving(false);
    
    loadData();
  };

  const handleDeleteNote = async (id) => {
    await supabase.from('project_update_logs').delete().eq('id', id);
    loadData();
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}><Spinner size="lg" /></div>;
  if (!project) return <div className="empty"><p className="empty-title">Project not found</p></div>;

  const days = Math.floor((Date.now() - new Date(project.last_communication_date || project.created_at).getTime()) / (1000*3600*24));
  const isAtRisk = days > 15;
  const isWarning = days > 7 && !isAtRisk;

  return (
    <div className="space-y-6" style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <button onClick={() => setActiveTab('projects')} className="btn btn-ghost btn-sm" style={{ padding: 8 }}>
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="page-title">{project.client_name}</h1>
          <p className="page-subtitle" onClick={() => setActiveTab(`client-${project.client_id}`)} style={{ cursor: 'pointer', color: 'var(--accent)', fontWeight: 600 }}>View Client Account</p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, alignItems: 'center' }}>
          {isAtRisk ? <Pill status="failed" label="AT RISK (>15 days)" /> : isWarning ? <Pill status="on_hold" label="WARNING (>7 days)" /> : <Pill status="passed" label="HEALTHY" />}
          <HealthDot days={Math.max(0, days)} status={project.status} />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', alignItems: 'start' }}>
        
        {/* Left Side - Overview & Services */}
        <div className="space-y-6">
          <div className="grid-2">
            <Card title="Project Overview">
              <div className="space-y-4">
                {[
                  { label: 'Total Project Net', value: `USD ${Number(summary?.total_project_net || 0).toLocaleString()}`, highlight: true },
                  { label: 'Services Active', value: services.filter(s => s.status === 'active').length },
                  { label: 'Platform Status', value: project.status?.toUpperCase() || 'ACTIVE' },
                  { label: 'Last Comms', value: new Date(project.last_communication_date || project.created_at).toLocaleDateString() },
                ].map(({ label, value, highlight }) => (
                  <div key={label}>
                    <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</p>
                    <p style={{ fontSize: highlight ? '1.25rem' : '0.875rem', fontWeight: highlight ? 950 : 600, color: highlight ? 'var(--blue)' : 'var(--text)', marginTop: 2 }}>{value}</p>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="Team Assignment">
               <div className="space-y-4">
                  <div>
                    <p style={{ fontSize: '0.625rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Assigned PM</p>
                    <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>{project.assigned_pm || 'Unassigned'}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.625rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Assigned AM</p>
                    <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>{project.assigned_am || 'Unassigned'}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.625rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Team</p>
                    <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>{project.team || 'N/A'}</p>
                  </div>
               </div>
            </Card>
          </div>

          <Card title="Active Services" extra={<Button size="xs" variant="outline" onClick={() => setServiceModal(true)}><Plus size={14} /> Add Service</Button>}>
             <div className="space-y-3">
                {services.length === 0 ? <p className="text-muted text-center py-4">No services logged.</p>
                : services.map(s => (
                  <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--surface-2)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.875rem' }}>{s.service_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>Added {new Date(s.created_at).toLocaleDateString()}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{s.currency} {Number(s.net_value).toLocaleString()}</div>
                      <Pill status={s.status} size="xs" />
                    </div>
                  </div>
                ))}
             </div>
          </Card>

          <Card title="Update History">
            <div className="space-y-4" style={{ maxHeight: 600, overflowY: 'auto', paddingRight: 4 }}>
              {notes.length === 0 ? <p className="text-muted" style={{ textAlign: 'center', padding: '16px 0', fontSize: '0.875rem' }}>No updates logged yet.</p>
                : notes.map(n => (
                  <div key={n.id} style={{ padding: 16, background: 'var(--surface-2)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>{n.author_name}</span>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', fontWeight: 600 }}>{new Date(n.created_at).toLocaleDateString()}</span>
                    </div>
                    <div style={{ fontSize: '0.875rem', whiteSpace: 'pre-wrap', color: 'var(--text-2)', lineHeight: 1.6 }}>
                      {n.summary}
                      {n.next_action && <><br/><br/><strong>Next Action:</strong> {n.next_action}</>}
                    </div>
                    {ability('reassign_projects') && (
                      <div style={{ textAlign: 'right', marginTop: 12 }}>
                        <button onClick={() => handleDeleteNote(n.id)} style={{ fontSize: '0.75rem', color: 'var(--red)', cursor: 'pointer', fontWeight: 600 }}>Delete Update</button>
                      </div>
                    )}
                  </div>
                ))
              }
            </div>
          </Card>
        </div>

        {/* Right Side - Project Update Form */}
        <Card title="Project Update Form" style={{ background: '#fff', boxShadow: '0 12px 24px rgba(0,0,0,0.06)' }}>
          <form onSubmit={handleAddUpdate} className="space-y-6">
            
            <div className="grid-2">
              <Select label="PM Name *" value={editPM} onChange={e => setEditPM(e.target.value)} disabled={!ability('reassign_projects')}>
                <option value="">Unassigned</option>
                {staff.pms.map(s => <option key={s} value={s}>{s}</option>)}
                {!staff.pms.includes(editPM) && editPM && <option value={editPM}>{editPM} (Current)</option>}
              </Select>
              <Select label="AM Name *" value={editAM} onChange={e => setEditAM(e.target.value)} disabled={!ability('reassign_projects')}>
                <option value="">Unassigned</option>
                {staff.ams.map(s => <option key={s} value={s}>{s}</option>)}
                {!staff.ams.includes(editAM) && editAM && <option value={editAM}>{editAM} (Current)</option>}
              </Select>
            </div>

            {!ability('reassign_projects') && (
               <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: -12 }}><ShieldCheck size={12} style={{ display: 'inline', marginBottom: 2 }} /> Only QA/CEO can reassign team members.</div>
            )}

            <Field label="Communication Date *" type="date" required value={commDate} onChange={e => setCommDate(e.target.value)} />

            <Field label="Latest Update Summary *" required textarea rows={3} value={updateSummary} onChange={e => setUpdateSummary(e.target.value)} placeholder="What happened today?" />
            <Field label="Next Planned Action *" required textarea rows={2} value={nextAction} onChange={e => setNextAction(e.target.value)} placeholder="What are the next steps?" />

            <div className="grid-2">
              <Field label="Next Follow-Up Date" type="date" value={followUpDate} onChange={e => setFollowUpDate(e.target.value)} />
              <Field label="No. Of follow-ups done" type="number" value={followUpsCount} onChange={e => setFollowUpsCount(e.target.value)} placeholder="0" />
            </div>

            <div className="grid-2">
              <Select label="Client Health Score *" value={healthScore} onChange={e => setHealthScore(e.target.value)} required>
                <option value="">Select Score</option>
                {[10,9,8,7,6,5,4,3,2,1].map(n => <option key={n} value={n}>{n}/10 {n>=8?'(Excellent)':n>=5?'(Fair)':'(Poor)'}</option>)}
              </Select>
              <Select label="Current Project Status *" value={editStatus} onChange={e => setEditStatus(e.target.value)} required>
                <option value="active">Active</option>
                <option value="on_hold">On Hold</option>
                <option value="at_risk">At Risk</option>
                <option value="delivered">Delivered</option>
              </Select>
            </div>

            <Button full variant="primary" size="lg" type="submit" loading={saving} style={{ background: '#3b82f6', borderColor: '#2563eb' }}>
              <CheckCircle2 size={16} /> Submit Update
            </Button>

          </form>
        </Card>
      </div>
    </div>
  );
}
