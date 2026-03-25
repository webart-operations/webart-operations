import React, { useState, useEffect } from 'react';
import { UserPlus, UserCog, CheckCircle2, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Button, Card, Pill, Spinner, Field, Select } from '../components/ui';

export default function TeamView() {
  const { role, profile, ability } = useAuth();
  const isAccessAdmin = ability('manage_team');
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState({ text: '', type: '' });
  const [selectedRole, setSelectedRole] = useState('sales');
  const [editingIframe, setEditingIframe] = useState(null); // { id, name, val }
  const [savingIframe, setSavingIframe] = useState(false);

  const loadStaff = async () => {
    const { data } = await supabase.from('profiles').select('*').order('created_at');
    let loaded = data || [];
    if (role === 'am') {
       loaded = loaded.filter(s => s.id === profile.id || s.reports_to === profile.full_name);
    } else if (!isAccessAdmin) {
       loaded = loaded.filter(s => s.id === profile.id);
    }
    setStaff(loaded);
    setLoading(false);
  };

  useEffect(() => { loadStaff(); }, []);

  const handleInvite = async (e) => {
    e.preventDefault();
    setInviting(true); setInviteMsg({ text: '', type: '' });
    const fd = new FormData(e.target);
    const email = fd.get('email');
    const role = fd.get('role');
    const fullName = fd.get('full_name');
    const team = fd.get('team');
    
    if (staff.find(s => s.email === email)) {
       setInviteMsg({ text: 'User already exists.', type: 'error' });
       setInviting(false); return; 
    }
    
    const { data, error } = await supabase.functions.invoke('invite-staff', { body: { email, role, full_name: fullName, team } });
    if (error || data?.error) { 
       setInviteMsg({ text: error?.message || data?.error, type: 'error' });
    } else {
       setInviteMsg({ text: `Invite sent to ${email}`, type: 'success' });
       e.target.reset(); loadStaff();
    }
    setInviting(false);
  };

  const handleRevoke = async (id) => {
    if (!confirm('Revoke access? They will no longer be able to log in.')) return;
    await supabase.from('profiles').update({ status: 'inactive' }).eq('id', id);
    loadStaff();
  };

  const handleAssignManager = async (id, amName) => {
    await supabase.from('profiles').update({ reports_to: amName || null }).eq('id', id);
    loadStaff();
  };

  const handleUpdateTeam = async (id, teamName) => {
    await supabase.from('profiles').update({ team: teamName }).eq('id', id);
    loadStaff();
  };

  const saveIframe = async (e) => {
    e.preventDefault();
    setSavingIframe(true);
    const fd = new FormData(e.target);
    const iframe = fd.get('iframe');
    await supabase.from('profiles').update({ calendar_iframe: iframe }).eq('id', editingIframe.id);
    setSavingIframe(false);
    setEditingIframe(null);
    loadStaff();
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
           <h1 className="page-title">{role === 'am' ? 'My Team' : 'Team Access Control'}</h1>
           <p className="page-subtitle">{role === 'am' ? 'Project Managers reporting to you' : 'Manage personnel and roles across the platform'}</p>
        </div>
        {isAccessAdmin && (
          <Button variant="dark" onClick={() => setShowInvite(v => !v)}>
             <UserPlus size={14} /> {showInvite ? 'Cancel' : 'Invite Staff'}
          </Button>
        )}
      </div>

      {inviteMsg.text && (
         <div style={{ padding: 16, background: inviteMsg.type === 'error' ? '#fef2f2' : '#f0fdf4', border: inviteMsg.type === 'error' ? '1px solid #fecaca' : '1px solid #bbf7d0', borderRadius: 'var(--radius)', color: inviteMsg.type === 'error' ? 'var(--red)' : 'var(--green)', fontWeight: 700, fontSize: '0.875rem' }}>
            {inviteMsg.text}
         </div>
      )}

      {showInvite && (
        <Card title="Invite New Staff Access">
          <form onSubmit={handleInvite} className="grid-4" style={{ alignItems: 'end' }}>
             <Field label="Full Name *" name="full_name" required placeholder="John Smith" />
             <Field label="Work Email *" name="email" required type="email" placeholder="staff@webart.technology" />
             <Select label="Platform Role *" name="role" value={selectedRole} onChange={e => setSelectedRole(e.target.value)} required>
                <option value="sales">Sales</option>
                <option value="qa">QA</option>
                <option value="manager">Manager</option>
                <option value="am">Account Manager (AM)</option>
                <option value="pm">Project Manager (PM)</option>
             </Select>
             {['am', 'pm', 'manager'].includes(selectedRole) ? (
               <Select label="Assign Team *" name="team" required>
                  <option value="Team A">Team A</option>
                  <option value="Team B">Team B</option>
               </Select>
             ) : (
               <input type="hidden" name="team" value="N/A" />
             )}
             <Button variant="dark" type="submit" loading={inviting} full style={{ height: 44 }}>Dispatch Email</Button>
          </form>
        </Card>
      )}

      <Card flush>
         <div style={{ overflowX: 'auto' }}>
            <table className="table">
               <thead>
                 <tr>
                    <th>Personnel</th>
                    <th>System Role</th>
                    <th>Team</th>
                    <th>Reports To (AM)</th>
                    <th>Calendar Link</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                 </tr>
               </thead>
               <tbody>
                  {loading ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: '48px 0' }}><Spinner size="lg" /></td></tr>
                  : staff.map(m => (
                    <tr key={m.id}>
                       <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                             {m.avatar_url ? <img src={m.avatar_url} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                             : <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1rem', color: 'var(--text-3)' }}>{m.full_name?.charAt(0)}</div>}
                             <div>
                                <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{m.full_name}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{m.email}</div>
                             </div>
                          </div>
                       </td>
                        <td><Pill status={m.role} /></td>
                       <td>
                          {['am', 'pm', 'manager'].includes(m.role) ? (
                            <select 
                               className="input" 
                               style={{ padding: '4px 8px', fontSize: '0.75rem', height: 'auto', background: 'transparent', maxWidth: 100 }}
                               value={m.team || 'N/A'}
                               onChange={(e) => handleUpdateTeam(m.id, e.target.value)}
                               disabled={!isAccessAdmin}
                            >
                              <option value="N/A">N/A</option>
                              <option value="Team A">Team A</option>
                              <option value="Team B">Team B</option>
                            </select>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>—</span>
                          )}
                       </td>
                       <td>
                          {m.role === 'pm' ? (
                            <select 
                               className="input" 
                               style={{ padding: '4px 8px', fontSize: '0.75rem', height: 'auto', background: 'transparent', maxWidth: 140 }}
                               value={m.reports_to || ''}
                               onChange={(e) => handleAssignManager(m.id, e.target.value)}
                               disabled={!isAccessAdmin}
                            >
                              <option value="">Unassigned</option>
                              {staff.filter(s => s.role === 'am' || s.role === 'manager' || s.role === 'ceo').map(am => (
                                <option key={am.id} value={am.full_name}>{am.full_name} ({am.team})</option>
                              ))}
                            </select>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>—</span>
                          )}
                       </td>
                       <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                             {m.calendar_iframe 
                                ? <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 4 }}><CheckCircle2 size={12} /> Connected</span> 
                                : <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>Not set</span>}
                             {isAccessAdmin && (
                                <button 
                                   onClick={() => setEditingIframe({ id: m.id, name: m.full_name, val: m.calendar_iframe })}
                                   style={{ background: 'none', border: 'none', padding: 4, borderRadius: 4, color: 'var(--accent)', cursor: 'pointer' }}
                                   title="Edit Calendar Link"
                                >
                                   <UserCog size={14} />
                                </button>
                             )}
                          </div>
                       </td>
                       <td>
                          <Pill status={m.status === 'active' ? 'active' : 'inactive'} label={m.status === 'active' ? 'Active' : 'Revoked'} noDot={m.status !== 'active'} />
                       </td>
                       <td style={{ textAlign: 'right' }}>
                          {m.role !== 'ceo' && m.status === 'active' && (
                             <Button variant="danger" size="sm" onClick={() => handleRevoke(m.id)}>Revoke Access</Button>
                          )}
                       </td>
                    </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </Card>

      {editingIframe && (
         <div className="modal-backdrop" onClick={() => setEditingIframe(null)}>
            <div className="modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
               <div className="modal-header">
                  <h2 className="modal-title">Calendar Iframe: {editingIframe.name}</h2>
                  <Button variant="ghost" size="sm" onClick={() => setEditingIframe(null)}>✕</Button>
               </div>
               <div className="modal-body">
                  <form onSubmit={saveIframe} className="space-y-4">
                     <Field 
                        label="Embed Iframe Code *" 
                        name="iframe" 
                        textarea 
                        rows={6} 
                        defaultValue={editingIframe.val} 
                        placeholder="Paste <iframe ...></iframe> here..." 
                        required 
                     />
                     <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 12 }}>
                        <Button variant="outline" onClick={() => setEditingIframe(null)}>Cancel</Button>
                        <Button variant="dark" type="submit" loading={savingIframe}>Save Changes</Button>
                     </div>
                  </form>
               </div>
            </div>
         </div>
      )}
    </div>
  );
}
