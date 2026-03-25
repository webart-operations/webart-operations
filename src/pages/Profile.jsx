import React, { useState, useEffect } from 'react';
import { User, Mail, Calendar, Upload, Save, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Button, Card, Field, Spinner } from '../components/ui';

export default function ProfileView() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    role: '',
    avatar_url: '',
    calendar_iframe: ''
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        email: profile.email || '',
        role: profile.role || '',
        avatar_url: profile.avatar_url || '',
        calendar_iframe: profile.calendar_iframe || ''
      });
      setLoading(false);
    }
  }, [profile]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSaving(true);
    // Use FileReader to convert to base64 data URL for instant preview
    // For permanent storage, user should upload to imgbb.com or similar and paste the URL below
    const reader = new FileReader();
    reader.onload = (ev) => {
      setFormData(prev => ({ ...prev, avatar_url: ev.target.result }));
      setSaving(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from('profiles').update({
      full_name: formData.full_name,
      calendar_iframe: formData.calendar_iframe,
      avatar_url: formData.avatar_url
    }).eq('id', profile.id);

    if (!error) {
       setSuccess(true);
       setTimeout(() => setSuccess(false), 3000);
       // We should ideally reload auth state here or force a window reload to resync UI
       window.location.reload();
    } else {
       alert('Error updating profile: ' + error.message);
    }
    setSaving(false);
  };

  if (loading) return <div style={{ display:'flex', justifyContent:'center', padding:'80px 0' }}><Spinner size="lg" /></div>;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Profile</h1>
          <p className="page-subtitle">Manage your personal settings and booking link.</p>
        </div>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
            <div style={{ width: 100, height: 100, borderRadius: '50%', background: 'var(--surface-2)', border: '2px dashed var(--border-2)', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               {formData.avatar_url ? (
                 <img src={formData.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
               ) : (
                 <User size={32} color="var(--text-3)" />
               )}
               <label style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: '0.625rem', textAlign: 'center', padding: '4px 0', cursor: 'pointer', fontWeight: 600 }}>
                 UPLOAD
                 <input type="file" style={{ display: 'none' }} accept="image/*" onChange={handleAvatarUpload} />
               </label>
            </div>
            <div>
               <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Profile Picture</h3>
               <p style={{ fontSize: '0.875rem', color: 'var(--text-3)' }}>Click "Upload" below or paste an image URL.</p>
               <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: 4 }}>Tip: host your image free at <a href="https://imgbb.com" target="_blank" rel="noreferrer" style={{ color: 'var(--blue)' }}>imgbb.com</a> and paste the Direct Link below.</p>
            </div>
          </div>

          <div className="grid-2">
            <Field label="Full Name *" name="full_name" value={formData.full_name} onChange={handleChange} required />
            <Field label="Email Address" value={formData.email} disabled hint="Contact admin to change email" />
          </div>

          <Field label="Platform Role" value={formData.role.toUpperCase()} disabled />

          <Field 
             label="Profile Image URL"
             name="avatar_url"
             value={formData.avatar_url}
             onChange={e => setFormData({ ...formData, avatar_url: e.target.value })}
             placeholder="Paste a direct image URL, or use the upload button above"
             hint="Upload a local file above for a quick preview, or paste a permanent URL from imgbb.com for best results."
          />

          <Field 
             label="Calendar iframe Link (Optional)" 
             name="calendar_iframe" 
             value={formData.calendar_iframe} 
             onChange={handleChange} 
             placeholder="https://link.gohighlevel.com/widget/booking/..." 
             hint="Paste your direct GHL booking widget URL here so teammates can book with you."
          />

          <Button type="submit" variant="dark" size="lg" loading={saving} disabled={success}>
             {success ? <><CheckCircle2 size={16} /> Saved!</> : <><Save size={16} /> Save Changes</>}
          </Button>
        </form>
      </Card>
    </div>
  );
}
