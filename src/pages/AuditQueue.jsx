import React, { useState, useEffect } from 'react';
import { Search, ShieldAlert, CheckCircle2, ShieldCheck, Upload, Trash2, FileText, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { triggerGHLWebhook } from '../lib/ghl';
import { useAuth } from '../context/AuthContext';
import { 
  notifyQAPassed, notifyQAFailed, 
  notifyOnboardingPassed, notifyOnboardingFailed 
} from '../lib/notifications';
import { Button, Card, Pill, Spinner, Select, Field } from '../components/ui';
export default function AuditQueueView({ appSettings }) {
  const { profile } = useAuth();
  const [queue, setQueue] = useState([]);
  const [completed, setCompleted] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState('pending');
  const [staff, setStaff] = useState({ ams: [], pms: [], qas: [] });
  // Modal states
  const [auditModal, setAuditModal] = useState(null);
  const loadData = async () => {
    setLoading(true);
    const { data: pendingData } = await supabase.from('submissions').select('*').eq('status', 'pending').order('created_at');
    const { data: completedData } = await supabase.from('submissions').select('*').in('status', ['passed', 'failed']).order('created_at', { ascending: false }).limit(50);
    setQueue(pendingData || []);
    setCompleted(completedData || []);
    setLoading(false);
  };
  useEffect(() => {
    loadData();
    supabase.from('profiles').select('full_name, role, team').eq('status', 'active')
      .then(({ data }) => {
        if (data) setStaff({ 
          ams: data.filter(d => ['am', 'manager'].includes(d.role)).map(d => ({ name: d.full_name, team: d.team })), 
          pms: data.filter(d => d.role === 'pm').map(d => ({ name: d.full_name, team: d.team })),
          qas: data.filter(d => d.role === 'qa').map(d => d.full_name)
        });
      });
  }, []);
  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Audit & Validation</h1>
          <p className="page-subtitle">Process incoming sales/onboardings and review historical records.</p>
        </div>
      </div>
      <div className="tabs">
        <button className={`tab ${activeSubTab === 'pending' ? 'active' : ''}`} onClick={() => setActiveSubTab('pending')}>
          Pending Queue ({queue.length})
        </button>
        <button className={`tab ${activeSubTab === 'completed' ? 'active' : ''}`} onClick={() => setActiveSubTab('completed')}>
          Completed Audits
        </button>
      </div>
      <Card flush>
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Submitted</th>
                <th>Client</th>
                <th>Product & Rep</th>
                <th>Financials</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: '48px 0' }}><Spinner size="lg" /></td></tr>
              : (activeSubTab === 'pending' ? queue : completed).length === 0 ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-3)' }}>No records found in this view 🎉</td></tr>
              : (activeSubTab === 'pending' ? queue : completed).map(s => (
                <tr key={s.id}>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: '0.8125rem' }}>{new Date(s.created_at).toLocaleString()}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{s.sale_date}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{s.client_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{s.business_name}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: '0.8125rem' }}>{s.product}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-2)' }}>Rep: {s.rep}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 800, fontSize: '0.875rem' }}>{s.currency} {Number(s.gross || 0).toLocaleString()}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>Net: {s.currency} {Number(s.net || 0).toLocaleString()}</div>
                  </td>
                  <td>
                    <Pill status={s.status} />
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {s.status === 'pending' ? 
                      <Button variant="primary" size="sm" onClick={() => setAuditModal(s)}>Begin Audit</Button>
                    : 
                      <Button variant="outline" size="sm" onClick={() => setAuditModal(s)}>View Details</Button>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      {auditModal && (
        <AuditFormModal 
          submission={auditModal} 
          onClose={() => setAuditModal(null)} 
          staff={staff} 
          profile={profile}
          onComplete={() => { setAuditModal(null); loadData(); }}
        />
      )}
    </div>
  );
}
function AuditFormModal({ submission, onClose, staff, profile, onComplete }) {
  const isReadOnly = submission.status !== 'pending';
  const [actioning, setActioning] = useState(false);
  
  const [auditor, setAuditor] = useState(profile?.full_name || '');
  const [qaDate, setQaDate] = useState(new Date().toISOString().split('T')[0]);
  const [score, setScore] = useState('');
  const [commitments, setCommitments] = useState('');
  const [notes, setNotes] = useState(submission.audit_notes || '');
  const [reportUrl, setReportUrl] = useState('');
  const [recording, setRecording] = useState('');
  const [decision, setDecision] = useState('');
  
  const [am, setAm] = useState('');
  const [pm, setPm] = useState('');
  
  const [auditData, setAuditData] = useState(null);
  useEffect(() => {
    if (isReadOnly) {
       supabase.from('qa_audits').select('*').eq('submission_id', submission.id).maybeSingle()
         .then(({ data }) => setAuditData(data));
    }
  }, [isReadOnly, submission.id]);
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (actioning) return;
    setActioning(true);
    const { data: currentSub } = await supabase.from('submissions').select('status, client_id').eq('id', submission.id).single();
    if (currentSub?.status !== 'pending') {
      alert("This submission has already been processed.");
      setActioning(false);
      return onComplete();
    }
    const isPassing = decision === 'Pass';
    const finalStatus = isPassing ? 'passed' : 'failed';
    const businessName = submission.business_name || submission.client_name;
    const { error: subErr } = await supabase.from('submissions').update({
      status: finalStatus
    }).eq('id', submission.id);
    await supabase.from('qa_audits').insert({
      submission_id: submission.id,
      auditor_id: profile.id,
      auditor_name: auditor,
      qa_date: qaDate,
      score: score,
      commitments_verified: commitments === 'Yes',
      notes: notes,
      audit_report_url: reportUrl,
      recording_url: recording,
      decision: decision,
      assigned_am: am,
      assigned_pm: pm
    });
    if (finalStatus === 'failed') {
      if (submission.is_onboarding) {
        await notifyOnboardingFailed({ clientName: businessName, amPmName: submission.collected_by });
      } else {
        await notifyQAFailed({ clientName: businessName, repName: submission.rep, closerName: submission.closer });
      }
      await triggerGHLWebhook('sale_failed_audit', { ...submission, audited_by: auditor });
    }
    if (finalStatus === 'passed') {
      let mClientId = currentSub.client_id;
      const assignedTeam = staff.ams.find(a => a.name === am)?.team || staff.pms.find(p => p.name === pm)?.team || 'N/A';
      if (!mClientId) {
          const { data: existingC } = await supabase.from('clients')
            .select('id')
            .or(`email.eq.${submission.email},business_name.eq.${businessName}`)
            .maybeSingle();
          if (existingC) {
             mClientId = existingC.id;
          } else {
            const { data: newC, error: clientErr } = await supabase.from('clients').insert({
              client_name: submission.client_name, 
              business_name: businessName,
              phone: submission.phone, 
              email: submission.email, 
              website: submission.website,
              address: submission.address, 
              country: submission.country, 
              source: submission.is_onboarding ? 'onboarding' : 'sales',
              team: assignedTeam
            }).select().single();
            if (newC) mClientId = newC.id;
          }
      }
      
      let mProjectId = null;
      const { data: existingProj } = await supabase.from('projects').select('id').eq('submission_id', submission.id).maybeSingle();
        
      if (existingProj) {
        mProjectId = existingProj.id;
      } else {
        const { data: newProj, error: projErr } = await supabase.from('projects').insert({
            client_id: mClientId, 
            client_name: businessName,
            assigned_am: am, 
            assigned_pm: pm,
            status: 'active',
            team: assignedTeam,
            submission_id: submission.id
        }).select().single();
        
        if (projErr && projErr.code === '23505') {
            const { data: retryProj } = await supabase.from('projects').select('id').eq('submission_id', submission.id).maybeSingle();
            if (retryProj) mProjectId = retryProj.id;
        } else if (newProj) {
            mProjectId = newProj.id;
        }
      }
      let newServiceId = null;
      const { data: newService } = await supabase.from('project_services').insert({
          project_id: mProjectId,
          service_name: submission.product,
          gross_value: submission.gross,
          net_value: submission.net,
          currency: submission.currency || 'USD',
          status: 'active'
      }).select().single();
      if (newService) newServiceId = newService.id;
      if (mProjectId) await supabase.from('submissions').update({ project_id: mProjectId, client_id: mClientId }).eq('id', submission.id);
      if (submission.is_onboarding) {
        const { error: revErr } = await supabase.from('revenue_ledger').insert({
            project_id: mProjectId,
            service_id: newServiceId,
            client_name: businessName,
            amount_usd: submission.usd_net || submission.net,
            original_amount: submission.net,
            currency: submission.currency,
            logged_by: profile.full_name,
            logged_by_id: profile.id,
            collected_by: submission.collected_by,
            payment_date: new Date().toISOString().split('T')[0],
            payment_type: 'Onboarding',
            product: submission.product,
            locked: true
        });
        if (revErr) {
           console.error("Onboarding Revenue Error:", revErr);
           alert("CRITICAL ERROR: Failed to log revenue. Please contact admin. " + revErr.message);
        }
      }
      const notifyPayload = { clientName: businessName, repName: submission.rep, closerName: submission.closer, amName: am, pmName: pm, teamName: assignedTeam, projectId: mProjectId };
      
      if (submission.is_onboarding) {
        await notifyOnboardingPassed({ clientName: businessName, amPmName: submission.collected_by, teamName: assignedTeam });
      } else {
        await notifyQAPassed(notifyPayload);
      }
      await triggerGHLWebhook('sale_passed_audit', notifyPayload);
    }
    setActioning(false);
    onComplete();
  };
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 840 }}>
        <div className="modal-header">
          <h2 className="modal-title">{isReadOnly ? 'Post-Audit Quality Report' : 'QA Quality Audit Form'}</h2>
          <button onClick={onClose} className="btn btn-ghost btn-sm">Close</button>
        </div>
        <div className="modal-body" style={{ background: '#fafafa', padding: '32px 40px' }}>
          
          {isReadOnly ? (
             auditData ? (
              <div className="space-y-6">
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '24px 32px', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border)' }}>
                    <div>
                       <h3 style={{ fontSize: '1.25rem', fontWeight: 900, marginBottom: 4 }}>{submission.business_name || submission.client_name}</h3>
                       <div style={{ color: 'var(--text-3)', fontSize: '0.875rem' }}>Audited by {auditData.auditor_name} on {new Date(auditData.qa_date).toLocaleDateString()}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                       <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-3)', marginBottom: 4 }}>Final Status</div>
                       <Pill status={auditData.decision === 'Pass' ? 'passed' : 'failed'} />
                    </div>
                 </div>
                 <div className="grid-2">
                    <Card title="Sales Context">
                       <div className="space-y-3" style={{ fontSize: '0.875rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-3)' }}>Product</span> <strong>{submission.product}</strong></div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-3)' }}>Representative</span> <strong>{submission.rep}</strong></div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-3)' }}>Gross</span> <strong>{submission.currency} {submission.gross}</strong></div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-3)' }}>Report Link</span> {auditData.audit_report_url ? <a href={auditData.audit_report_url} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>View Document</a> : '—'}</div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-3)' }}>Recording</span> {auditData.recording_url ? <a href={auditData.recording_url} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>Listen to Call</a> : '—'}</div>
                          <hr style={{ margin: '12px 0', border: 'none', borderTop: '1px solid var(--border)' }} />
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-3)' }}>Assigned AM</span> <strong>{auditData.assigned_am || '—'}</strong></div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-3)' }}>Assigned PM</span> <strong>{auditData.assigned_pm || '—'}</strong></div>
                       </div>
                    </Card>
                    
                    <Card title="Diagnostics" style={{ background: auditData.decision === 'Pass' ? 'var(--green-glow)' : 'var(--red-glow)', borderColor: auditData.decision === 'Pass' ? 'var(--green)' : 'var(--red)' }}>
                       <div className="space-y-4" style={{ fontSize: '0.875rem' }}>
                          <div style={{ background: '#fff', padding: '12px 16px', borderRadius: 8, border: '1px solid var(--border)' }}>
                             <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginBottom: 2 }}>Score</div>
                             <div style={{ fontWeight: 800 }}>{auditData.score}</div>
                          </div>
                          <div style={{ background: '#fff', padding: '12px 16px', borderRadius: 8, border: '1px solid var(--border)' }}>
                             <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginBottom: 2 }}>Verified</div>
                             <div style={{ fontWeight: 800 }}>{auditData.commitments_verified ? 'Yes' : 'No'}</div>
                          </div>
                       </div>
                    </Card>
                 </div>
                 <Card title="Notes">
                    <div style={{ fontSize: '0.875rem', whiteSpace: 'pre-wrap' }}>{auditData.notes || 'No notes.'}</div>
                 </Card>
              </div>
             ) : <Spinner />
          ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div style={{ padding: 16, background: 'var(--surface-2)', borderRadius: 8, border: '1px solid var(--border)', fontSize: '0.875rem' }}>
              <div className="grid-2">
                <div><strong>Product:</strong> {submission.product}</div>
                <div><strong>Rep/Collector:</strong> {submission.rep}</div>
              </div>
            </div>
            <Field label="Client Name" value={submission.client_name} disabled />
            
            <div className="grid-2">
              <Select label="Auditor *" value={auditor} onChange={e => setAuditor(e.target.value)} required>
                <option value="">Select Auditor</option>
                {staff.qas.map(s => <option key={s} value={s}>{s}</option>)}
              </Select>
              <Field label="Date *" type="date" value={qaDate} onChange={e => setQaDate(e.target.value)} required />
            </div>
            <Select label="Score *" value={score} onChange={e => setScore(e.target.value)} required>
              <option value="">Select Score</option>
              <option value="Excellent (10/10)">Excellent (10/10)</option>
              <option value="Good (8/10)">Good (8/10)</option>
              <option value="Average (5/10)">Average (5/10)</option>
              <option value="Poor (2/10)">Poor (2/10)</option>
            </Select>
            <div className="field">
              <label className="label">Commitments Verified *</label>
              <div style={{ display: 'flex', gap: 16 }}>
                <label><input type="radio" value="Yes" checked={commitments === 'Yes'} onChange={e => setCommitments(e.target.value)} required /> Yes</label>
                <label><input type="radio" value="No" checked={commitments === 'No'} onChange={e => setCommitments(e.target.value)} required /> No</label>
              </div>
            </div>
            <Field label="QA Notes *" textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} required />
            <Field label="Audit Report Link" placeholder="Paste link to document (e.g. Google Drive)" value={reportUrl} onChange={e => setReportUrl(e.target.value)} />
            <Field label="Recording Link *" value={recording} onChange={e => setRecording(e.target.value)} required />
            
            <div className="field">
              <label className="label">Decision *</label>
              <div style={{ display: 'flex', gap: 16 }}>
                <label><input type="radio" value="Pass" checked={decision === 'Pass'} onChange={e => setDecision(e.target.value)} required /> Pass</label>
                <label><input type="radio" value="Fail" checked={decision === 'Fail'} onChange={e => setDecision(e.target.value)} required /> Fail</label>
              </div>
            </div>
            {decision === 'Pass' && (
              <div style={{ background: 'var(--green-glow)', padding: 16, borderRadius: 8 }}>
                <div className="grid-2">
                  <Select label="Assign AM *" value={am} onChange={e => { setAm(e.target.value); setPm(''); }} required>
                    <option value="">Select AM</option>
                    {staff.ams.map(s => <option key={s.name} value={s.name}>{s.name} ({s.team})</option>)}
                  </Select>
                  <Select label="Assign PM *" value={pm} onChange={e => setPm(e.target.value)} required>
                    <option value="">Select PM</option>
                    {staff.pms
                      .filter(s => {
                        if (!am) return true;
                        const selectedAm = staff.ams.find(a => a.name === am);
                        return selectedAm ? s.team === selectedAm.team : true;
                      })
                      .map(s => <option key={s.name} value={s.name}>{s.name} ({s.team})</option>)
                    }
                  </Select>
                </div>
              </div>
            )}
            <Button full variant="dark" type="submit" loading={actioning}>Finalize Audit</Button>
          </form>
          )}
        </div>
      </div>
    </div>
  );
}
