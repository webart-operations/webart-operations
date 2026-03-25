import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, User, Building2, Phone, Mail, Globe, MapPin, Flag, FileText, Upload, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Button, Card, Pill, Spinner, HealthDot, countBusinessDays, ConfirmModal } from '../components/ui';

export default function ClientDetailView({ clientId, setActiveTab }) {
  const { profile, ability } = useAuth();
  const [client, setClient] = useState(null);
  const [projects, setProjects] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingDoc, setDeletingDoc] = useState(null);
  const fileRef = useRef();

  const [summary, setSummary] = useState(null);

  const loadData = async () => {
    const [
      { data: c }, 
      { data: p },
      { data: s }
    ] = await Promise.all([
      supabase.from('clients').select('*').eq('id', clientId).single(),
      supabase.from('projects').select('*').eq('client_id', clientId),
      supabase.from('client_financial_summaries').select('*').eq('client_id', clientId).maybeSingle()
    ]);
    setClient(c);
    setProjects(p || []);
    setSummary(s);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [clientId]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);

    const fileName = `${clientId}_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(fileName, file);

    if (uploadError) {
      alert('Upload failed: ' + uploadError.message);
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(fileName);

    await supabase.from('project_documents').insert({
      client_id: clientId,
      uploaded_by: profile.id,
      file_name: file.name,
      file_url: publicUrl,
      file_type: file.type || 'unknown'
    });

    setUploading(false);
    loadData();
    e.target.value = null; // reset
  };

  const handleDeleteDoc = async () => {
    if (!deletingDoc) return;
    // Extract filename from URL
    const urlParts = deletingDoc.file_url.split('/');
    const fileName = urlParts[urlParts.length - 1];

    await supabase.storage.from('documents').remove([fileName]);
    await supabase.from('project_documents').delete().eq('id', deletingDoc.id);

    setDeletingDoc(null);
    loadData();
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}><Spinner size="lg" /></div>;
  if (!client) return <div className="empty"><p className="empty-title">Client not found</p></div>;

  return (
    <div className="space-y-6" style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <button onClick={() => setActiveTab('clients')} className="btn btn-ghost btn-sm" style={{ padding: 8 }}>
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="page-title">{client.client_name}</h1>
          <p className="page-subtitle">{client.business_name}</p>
        </div>
      </div>

      <div className="grid-2">
        <Card title="Contact Information">
          <div className="space-y-4">
            {[
              { Icon: User, label: 'Full Name', value: client.client_name },
              { Icon: Building2, label: 'Business', value: client.business_name },
              { Icon: Phone, label: 'Phone', value: client.phone },
              { Icon: Mail, label: 'Email', value: client.email },
              { Icon: Globe, label: 'Website', value: client.website },
              { Icon: MapPin, label: 'Address', value: client.address },
              { Icon: Flag, label: 'Country', value: client.country },
            ].map(({ Icon, label, value }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <Icon size={14} style={{ color: 'var(--text-3)', marginTop: 2, flexShrink: 0 }} />
                <div>
                  <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</p>
                  <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text)' }}>{value || '—'}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-6">
          <Card title="Financial Summary (LTV)">
             <div style={{ padding: '4px 0' }}>
                <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Total Client Net (LTV)</p>
                <h2 style={{ fontSize: '2rem', fontWeight: 950, color: 'var(--blue)', letterSpacing: '-0.02em' }}>
                   USD {Number(summary?.total_client_net || 0).toLocaleString()}
                </h2>
                <div style={{ display: 'flex', gap: 16, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                   <div>
                      <p style={{ fontSize: '0.625rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase' }}>Gross Value</p>
                      <p style={{ fontWeight: 700, fontSize: '1rem' }}>${Number(summary?.total_client_gross || 0).toLocaleString()}</p>
                   </div>
                   <div>
                      <p style={{ fontSize: '0.625rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase' }}>Total Services</p>
                      <p style={{ fontWeight: 700, fontSize: '1rem' }}>{summary?.total_service_count || 0}</p>
                   </div>
                </div>
             </div>
          </Card>

          <Card
            title={`Active Projects (${projects.length})`}
          >
            <div className="space-y-4">
              {projects.length === 0
                ? <p className="text-muted" style={{ textAlign: 'center', padding: '16px 0', fontSize: '0.875rem' }}>No projects yet</p>
                : projects.map(p => {
                    const days = countBusinessDays(p.last_communication_date || p.created_at);
                    return (
                      <div key={p.id} onClick={() => setActiveTab(`project-${p.id}`)}
                        style={{ padding: 16, border: '1.5px solid var(--border)', borderRadius: 'var(--radius)', cursor: 'pointer', transition: 'all 0.2s', background: 'var(--surface)' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--blue)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none'; }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                          <div>
                             <div style={{ fontSize: '0.625rem', fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: 2 }}>Project Container</div>
                             <div style={{ fontWeight: 800, fontSize: '1rem' }}>{p.client_name}</div>
                          </div>
                          <Pill status={p.status} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-2)' }}>
                           <span>AM: {p.assigned_am || '—'}</span>
                           <HealthDot days={days} status={p.status} />
                        </div>
                      </div>
                    );
                  })
              }
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
