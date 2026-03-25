import React, { useState, useEffect } from 'react';
import { Search, ShieldAlert, CheckCircle2, ShieldCheck, Upload, Trash2, FileText, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { triggerGHLWebhook } from '../lib/ghl';
import { useAuth } from '../context/AuthContext';
import { notifyQAPassed, notifyQAFailed } from '../lib/notifications';
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
          <h1 className="page-title">QA Audit & Validation</h1>
          <p className="page-subtitle">Process incoming sales and review historical audits.</p>
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

      {/* Embedded Render of the Modal */}
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
  
  // Form State matching screenshot
  const [auditor, setAuditor] = useState(profile?.full_name || '');
  const [qaDate, setQaDate] = useState(new Date().toISOString().split('T')[0]);
  const [score, setScore] = useState('');
  const [commitments, setCommitments] = useState('');
  const [notes, setNotes] = useState(submission.audit_notes || '');
  const [reportUrl, setReportUrl] = useState('');
  const [recording, setRecording] = useState('');
  const [decision, setDecision] = useState('');
  
  // Assignment State (Required if Pass)
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

    // Re-verify status to prevent race conditions
    const { data: currentSub } = await supabase.from('submissions').select('status, client_id').eq('id', submission.id).single();
    if (currentSub?.status !== 'pending') {
      alert("This submission has already been processed.");
      setActioning(false);
      return onComplete();
    }

    const isPassing = decision === 'Pass';
    const finalStatus = isPassing ? 'passed' : 'failed';

    const fullNotes = `Score: ${score}\nCommitments Verified: ${commitments}\nRecording: ${recording}\nReport: ${reportUrl}\nNotes: ${notes}`;

    const { error: subErr } = await supabase.from('submissions').update({
      status: finalStatus
    }).eq('id', submission.id);

    const { error: auditErr } = await supabase.from('qa_audits').insert({
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

    if (auditErr) console.error("Audit Insert Error:", auditErr);

    if (finalStatus === 'failed') {
      await triggerGHLWebhook('sale_failed_audit', { ...submission, audit_notes: fullNotes, audited_by: auditor });
      await notifyQAFailed({ clientName: submission.client_name, repName: submission.rep, closerName: submission.closer });
    }

    if (finalStatus === 'passed') {
      let mClientId = currentSub.client_id;
      if (!mClientId) {
          // Check if client exists by email OR phone to prevent duplicates
          const { data: existingC } = await supabase.from('clients')
            .select('id')
            .or(`email.eq.${submission.email},phone.eq.${submission.phone}`)
            .maybeSingle();

          if (existingC) {
             mClientId = existingC.id;
          } else {
            const assignedTeam = staff.ams.find(a => a.name === am)?.team || staff.pms.find(p => p.name === pm)?.team || 'N/A';
            const { data: newC, error: clientErr } = await supabase.from('clients').insert({
              client_name: submission.client_name, 
              business_name: submission.business_name,
              phone: submission.phone, 
              email: submission.email, 
              website: submission.website,
              address: submission.address, 
              country: submission.country, 
              source: submission.is_reactivation ? 'reactivation' : 'sales_form',
              team: assignedTeam
            }).select().single();
            if (clientErr) console.error("Client Creation Error:", clientErr);
            if (newC) mClientId = newC.id;
          }
      }
      
      const assignedTeam = staff.ams.find(a => a.name === am)?.team || staff.pms.find(p => p.name === pm)?.team || 'N/A';
      
      let newProjectId = null;
      // For reactivation, we don't want to create a new project IF we are just updating an old one.
      // But the user said: "Reactivation should not create new clients it should update the old ones with new projects"
      // So every reactivation IS a new project record, just linked to the same client.
      
      const { data: newProj, error: projErr } = await supabase.from('projects').insert({
          submission_id: submission.id,
          client_id: mClientId, 
          client_name: submission.client_name,
          product: submission.product, 
          gross: submission.gross, 
          net: submission.net,
          currency: submission.currency,
          sales_remarks: submission.sales_remarks,
          closer: submission.closer,
          assigned_am: am, 
          assigned_pm: pm,
          status: 'active',
          team: assignedTeam,
          is_reactivation: submission.is_reactivation || false
      }).select().single();

      if (projErr) console.error("Project Creation Error:", projErr);
      if (newProj) newProjectId = newProj.id;

      if (newProjectId) await supabase.from('submissions').update({ project_id: newProjectId, client_id: mClientId }).eq('id', submission.id);

      // Link Reactivation to Revenue Ledger
      if (submission.is_reactivation) {
        await supabase.from('revenue_ledger').insert({
          project_id: newProjectId,
          client_id: mClientId,
          client_name: submission.client_name,
          logged_by: auditor,
          logged_by_id: profile.id,
          currency: submission.currency,
          original_amount: Number(submission.net),
          amount_usd: Number(submission.net), // Assuming net is already in USD or needs conversion? 
                                             // For now we'll take it as is, consistent with submissions.
          payment_date: qaDate,
          payment_type: 'Reactivation',
          product: submission.product,
          installment: 'Initial',
          paid_through: 'Sales Form',
          notes: 'Automated entry from Reactivation Approval',
          is_reactivation: true,
          locked: true
        });
      }
      
      await triggerGHLWebhook('sale_passed_audit', { ...submission, assigned_am: am, assigned_pm: pm });
      await notifyQAPassed({
         clientName: submission.client_name,
         repName: submission.rep,
         closerName: submission.closer,
         amName: am,
         pmName: pm,
         teamName: assignedTeam,
         projectId: newProjectId
      });
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
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-3)' }}>{submission.is_reactivation ? 'Closer' : 'Representative'}</span> <strong>{submission.is_reactivation ? submission.closer : submission.rep}</strong></div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-3)' }}>Gross Value</span> <strong>{submission.currency} {submission.gross}</strong></div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-3)' }}>Report Link</span> {auditData.audit_report_url ? <a href={auditData.audit_report_url} target="_blank" rel="noreferrer" style={{ color: 'var(--blue)', textDecoration: 'underline' }}>View Document</a> : '—'}</div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-3)' }}>Recording</span> {auditData.recording_url ? <a href={auditData.recording_url} target="_blank" rel="noreferrer" style={{ color: 'var(--blue)', textDecoration: 'underline' }}>Listen to Call</a> : '—'}</div>
                       </div>
                    </Card>
                    
                    <Card title="Audit Diagnostics" style={{ background: auditData.decision === 'Pass' ? '#f0fdf4' : '#fef2f2', borderColor: auditData.decision === 'Pass' ? '#bbf7d0' : '#fecaca' }}>
                       <div className="space-y-4" style={{ fontSize: '0.875rem' }}>
                          <div style={{ background: '#fff', padding: '12px 16px', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                             <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginBottom: 2 }}>Grading Score</div>
                             <div style={{ fontWeight: 800, color: (auditData.score?.includes('10/10') || auditData.score?.includes('8/10')) ? 'var(--green)' : 'var(--red)' }}>{auditData.score}</div>
                          </div>
                          <div style={{ background: '#fff', padding: '12px 16px', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                             <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginBottom: 2 }}>Commitments Verified</div>
                             <div style={{ fontWeight: 800 }}>{auditData.commitments_verified ? '✅ Yes' : '❌ No'}</div>
                          </div>
                       </div>
                    </Card>
                 </div>
 
                 <Card title="Detailed Auditor Notes">
                    <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.875rem', lineHeight: 1.6, color: 'var(--text-2)' }}>
                       {auditData.notes || 'No extensive notes provided.'}
                    </div>
                 </Card>
              </div>
             ) : (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <Spinner size="lg" />
                <p style={{ marginTop: 16, color: 'var(--text-3)' }}>Fetching historical audit data...</p>
                <div style={{ marginTop: 24, padding: 16, background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: 8, fontSize: '0.875rem', color: '#92400e' }}>
                  If this takes more than a few seconds, it's possible this record was processed before the audit tracking system was fully online.
                </div>
              </div>
             )
           ) : (
          <form onSubmit={handleSubmit} className="space-y-6" style={{ background: '#fff', padding: 40, borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border)' }}>
            
            {/* Embedded Submission Context */}
            <div style={{ padding: 16, background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '0.875rem', marginBottom: 32 }}>
              <div style={{ fontWeight: 800, marginBottom: 8, color: 'var(--text-2)' }}>Sales Submission Context</div>
              <div className="grid-2">
                <div><strong>Product:</strong> {submission.product}</div>
                <div><strong>{submission.is_reactivation ? 'Closer' : 'Rep'}:</strong> {submission.is_reactivation ? submission.closer : submission.rep}</div>
                <div><strong>Gross:</strong> {submission.currency} {submission.gross}</div>
                <div><strong>Net:</strong> {submission.currency} {submission.net}</div>
              </div>
              <Field label="Deliverables & Remarks" textarea rows={4} value={submission.sales_remarks} readOnly />
            </div>

            <Field label="Client Name *" value={submission.client_name} disabled />
            
            <div className="grid-2">
              <Field label="Client Phone *" value={submission.phone} disabled />
              <Field label="Email *" value={submission.email} disabled />
            </div>

            <div className="grid-2">
              <Select label="QA Auditor Name *" value={auditor} onChange={e => setAuditor(e.target.value)} required disabled={isReadOnly}>
                <option value="">Select Auditor</option>
                {staff.qas.map(s => <option key={s} value={s}>{s}</option>)}
              </Select>
              <Field label="QA Date *" type="date" value={qaDate} onChange={e => setQaDate(e.target.value)} required disabled={isReadOnly} />
            </div>

            <Select label="QA Score *" value={score} onChange={e => setScore(e.target.value)} required disabled={isReadOnly}>
              <option value="">Select Score</option>
              <option value="Excellent (10/10)">Excellent (10/10)</option>
              <option value="Good (8/10)">Good (8/10)</option>
              <option value="Average (5/10)">Average (5/10)</option>
              <option value="Poor (2/10)">Poor (2/10)</option>
              <option value="Critical Failure (0/10)">Critical Failure (0/10)</option>
            </Select>

            <div className="field">
              <label className="label">Commitments Verified *</label>
              <div style={{ display: 'flex', gap: 16 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: isReadOnly ? 'default' : 'pointer' }}>
                  <input type="radio" name="commitments" value="Yes" checked={commitments === 'Yes'} onChange={e => setCommitments(e.target.value)} disabled={isReadOnly} required /> Yes
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: isReadOnly ? 'default' : 'pointer' }}>
                  <input type="radio" name="commitments" value="No" checked={commitments === 'No'} onChange={e => setCommitments(e.target.value)} disabled={isReadOnly} required /> No
                </label>
              </div>
            </div>

            <div className="field">
              <label className="label">QA Notes / Red Flags *</label>
              <textarea 
                className="textarea" 
                rows={4} 
                required 
                value={notes} 
                onChange={e => setNotes(e.target.value)} 
                disabled={isReadOnly}
                style={{ borderColor: notes ? 'var(--border-2)' : '#fca5a5' }}
              />
              {!notes && !isReadOnly && <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: 4 }}>QA Notes / Red Flags is required</div>}
            </div>

            <Field label="Audit Report Link" placeholder="Paste link to document (e.g., Google Drive)..." value={reportUrl} onChange={e => setReportUrl(e.target.value)} disabled={isReadOnly} />

            <Field label="Call Recording *" placeholder="Share the recording link" value={recording} onChange={e => setRecording(e.target.value)} required disabled={isReadOnly} />

            <div className="field">
              <label className="label">QA Decision *</label>
              <div style={{ display: 'flex', gap: 16 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: isReadOnly ? 'default' : 'pointer' }}>
                  <input type="radio" name="decision" value="Pass" checked={decision === 'Pass'} onChange={e => setDecision(e.target.value)} disabled={isReadOnly} required /> Pass
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: isReadOnly ? 'default' : 'pointer' }}>
                  <input type="radio" name="decision" value="Fail" checked={decision === 'Fail'} onChange={e => setDecision(e.target.value)} disabled={isReadOnly} required /> Fail
                </label>
              </div>
            </div>

            {decision === 'Pass' && !isReadOnly && (
              <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', padding: 24, borderRadius: 'var(--radius-sm)', marginTop: 24 }}>
                <strong style={{ color: '#047857', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}><Check size={18} /> Project Creation Config</strong>
                <div className="grid-2">
                  <Select label="Assign AM *" value={am} onChange={e => setAm(e.target.value)} required>
                    <option value="">Unassigned</option>
                    {staff.ams.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                  </Select>
                  <Select label="Assign PM *" value={pm} onChange={e => setPm(e.target.value)} required>
                    <option value="">Unassigned</option>
                    {staff.pms
                      .filter(s => {
                        if (!am) return true;
                        const selectedAm = staff.ams.find(a => a.name === am);
                        return selectedAm ? s.team === selectedAm.team : true;
                      })
                      .map(s => <option key={s.name} value={s.name}>{s.name}</option>)
                    }
                  </Select>
                </div>
              </div>
            )}

            {!isReadOnly && (
              <Button full variant="primary" size="lg" type="submit" loading={actioning} style={{ background: '#10b981', borderColor: '#059669', marginTop: 32 }}>
                Submit
              </Button>
            )}
          </form>
          )}
        </div>
      </div>
    </div>
  );
}
