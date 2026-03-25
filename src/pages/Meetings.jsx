import React, { useState, useEffect } from 'react';
import { ExternalLink, CalendarDays } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Card, Pill, Spinner } from '../components/ui';

export default function MeetingsView() {
  const { profile, role } = useAuth();
  const [tab, setTab] = useState('list');
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('scheduled');
  const [staffList, setStaffList] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState(null);
  
  const isExec = role === 'ceo' || role === 'qa';

  useEffect(() => {
    const loadMeetings = async () => {
      let query = supabase.from('meetings').select('*').order('meeting_date').order('meeting_time');
      if (!isExec) query = query.eq('assigned_to', profile.full_name);
      
      const { data } = await query;
      setMeetings(data || []); 
      setLoading(false);
    };
    loadMeetings();
    const ch = supabase.channel('meetings-view').on('postgres_changes', { event: '*', schema: 'public', table: 'meetings' }, loadMeetings).subscribe();
    return () => supabase.removeChannel(ch);
  }, [profile, isExec]);

  useEffect(() => {
    const loadStaff = async () => {
      const { data } = await supabase.from('profiles').select('id, full_name, role, calendar_iframe, avatar_url, reports_to').eq('status', 'active');
      if (!data) return;
      
      if (isExec) {
         setStaffList(data.filter(s => s.id !== profile.id));
      } else { 
         const ceo = data.filter(s => s.role === 'ceo'); 
         const own = data.filter(s => s.id === profile.id); 
         let team = [];
         
         if (role === 'am') {
            team = data.filter(s => s.role === 'pm' && s.reports_to === profile.full_name);
         } else if (role === 'pm') {
            const myProfile = data.find(s => s.id === profile.id);
            if (myProfile?.reports_to) {
               team = data.filter(s => s.role === 'am' && s.full_name === myProfile.reports_to);
            }
         }
         
         const uniqueList = [...ceo, ...own, ...team].filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
         setStaffList(uniqueList); 
      }
    };
    loadStaff();
  }, [profile, isExec, role]);

  const filtered = filter === 'all' ? meetings : meetings.filter(m => m.status === filter);
  const displayStaff = isExec ? selectedStaff : (staffList.length === 1 ? staffList[0] : selectedStaff);
  
  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Meetings Engine</h1>
          <p className="page-subtitle">{isExec ? 'All staff meetings — synced from GoHighLevel' : 'Your scheduled meetings'}</p>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'list' ? 'active' : ''}`} onClick={() => setTab('list')}>Meeting List</button>
        <button className={`tab ${tab === 'schedule' ? 'active' : ''}`} onClick={() => setTab('schedule')}>
           {isExec ? 'Schedule with Staff' : 'Calendars'}
        </button>
      </div>

      {tab === 'list' && (
        <>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
            {['scheduled', 'completed', 'cancelled', 'no_show', 'all'].map(s => (
              <button key={s} onClick={() => setFilter(s)}
                 style={{ 
                    padding: '6px 14px', borderRadius: 99, fontSize: '0.6875rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em',
                    border: filter === s ? '1px solid var(--text)' : '1px solid var(--border)',
                    background: filter === s ? 'var(--text)' : 'var(--surface)',
                    color: filter === s ? '#fff' : 'var(--text-3)',
                 }}>
                 {s.replace('_', ' ')}
              </button>
            ))}
          </div>
          
          <Card flush>
             <div style={{ overflowX: 'auto' }}>
                <table className="table">
                   <thead>
                     <tr>
                        <th>Client Details</th>
                        <th>Schedule Status</th>
                        <th>Assigned</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                     </tr>
                   </thead>
                   <tbody>
                      {loading ? <tr><td colSpan={4} style={{ textAlign:'center', padding:'48px 0' }}><Spinner size="lg" /></td></tr>
                      : filtered.length === 0 ? <tr><td colSpan={4} style={{ textAlign:'center', padding:'48px 0', color: 'var(--text-3)' }}>No {filter !== 'all' ? filter : ''} meetings found</td></tr>
                      : filtered.map(m => (
                        <tr key={m.id}>
                           <td>
                              <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{m.client_name}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{m.phone} · {m.email}</div>
                           </td>
                           <td>
                              <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.8125rem' }}>{m.meeting_date} {m.meeting_time}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: 2 }}>{m.timezone}</div>
                              <div style={{ marginTop: 6 }}><Pill status={m.status} /></div>
                           </td>
                           <td>
                              <div style={{ fontWeight: 600, fontSize: '0.8125rem' }}>{m.assigned_to || '—'}</div>
                              {m.additional_notes && <div style={{ fontSize: '0.6875rem', color: 'var(--text-3)', maxWidth: 200, marginTop: 4 }}>{m.additional_notes}</div>}
                           </td>
                           <td style={{ textAlign: 'right' }}>
                              {m.meeting_link ? (
                                <a href={m.meeting_link} target="_blank" rel="noreferrer" 
                                   style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--text)', color: '#fff', padding: '6px 12px', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', fontWeight: 700 }}>
                                   Join <ExternalLink size={12} />
                                </a>
                              ) : <span style={{ color: 'var(--text-3)' }}>—</span>}
                           </td>
                        </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </Card>
        </>
      )}

      {tab === 'schedule' && (
        <div className="space-y-6 max-w-5xl mx-auto pb-12">
          {staffList.length > 0 && (
            <Card title={isExec ? "Select Staff Member to view calendar" : "Select Staff"}>
               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
                  {staffList.map(s => (
                     <div key={s.id} onClick={() => setSelectedStaff(selectedStaff?.id === s.id ? null : s)}
                        style={{ padding: 16, border: selectedStaff?.id === s.id ? '2px solid var(--accent)' : '2px solid var(--border)', borderRadius: 'var(--radius)', background: selectedStaff?.id === s.id ? 'var(--accent-glow)' : 'var(--surface)', cursor: 'pointer', textAlign: 'center', transition: 'all 0.1s' }}>
                        {s.avatar_url ? <img src={s.avatar_url} alt="" style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', margin: '0 auto 12px' }} />
                        : <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--text)', color: '#fff', fontSize: '1.25rem', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>{s.full_name?.charAt(0)}</div>}
                        <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: 4 }}>{s.full_name}</div>
                        <Pill status={s.role} />
                     </div>
                  ))}
               </div>
            </Card>
          )}

          {displayStaff ? (
             <Card title={`${displayStaff.full_name}'s Calendar — Click a slot to book`}>
                {displayStaff.calendar_iframe ? (
                  <div className="w-full overflow-hidden rounded-xl" style={{ minHeight: '750px', background: '#fff' }}
                     dangerouslySetInnerHTML={{ __html: displayStaff.calendar_iframe.replace(/<iframe/gi, '<iframe style="width:100%!important;min-height:750px!important;height:750px!important;border:none!important;display:block!important;"') }} />
                ) : (
                  <div className="empty">
                     <CalendarDays size={48} className="empty-icon" />
                     <p className="empty-title">No Calendar Found</p>
                     <p className="empty-subtitle">This user has not linked their GoHighLevel / System calendar iframe yet.</p>
                  </div>
                )}
             </Card>
          ) : (
             <div className="empty" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
                <CalendarDays size={48} className="empty-icon" />
                <p className="empty-title">Select a team member above</p>
             </div>
          )}
        </div>
      )}
    </div>
  );
}
