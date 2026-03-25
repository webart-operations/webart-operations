import React, { useState, useEffect } from 'react';
import { Search, UserPlus, Briefcase, Plus, CheckCircle2, User, Building2, Globe, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { convertToUSD } from '../lib/currency';
import { triggerGHLWebhook } from '../lib/ghl';
import { notifyOnboardingSubmitted } from '../lib/notifications';
import { Card, Button, Spinner, Field, Select, Pill } from '../components/ui';

const COUNTRIES = [
  { value: 'USA', label: 'USA', flag: 'us' },
  { value: 'Canada', label: 'Canada', flag: 'ca' },
  { value: 'United Kingdom', label: 'United Kingdom', flag: 'gb' },
  { value: 'Australia', label: 'Australia', flag: 'au' },
  { value: 'India', label: 'India', flag: 'in' },
];

function CountrySelect({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const selected = COUNTRIES.find(c => c.value === value);

  return (
    <div className="field" style={{ position: 'relative' }}>
      <label className="label">Country Name *</label>
      <div 
        className="input" 
        onClick={() => setOpen(!open)} 
        style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', userSelect: 'none', background: '#fff' }}
      >
        {selected ? (
          <>
            <img src={`https://flagcdn.com/w20/${selected.flag}.png`} alt={selected.label} style={{ width: 20, borderRadius: 2 }} />
            <span>{selected.label}</span>
          </>
        ) : <span style={{ color: 'var(--text-3)' }}>Select a country...</span>}
      </div>
      
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, width: '100%', background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', marginTop: 4, boxShadow: 'var(--shadow-lg)', zIndex: 10 }}>
          {COUNTRIES.map(c => (
            <div 
              key={c.value}
              onClick={() => { onChange(c.value); setOpen(false); }}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border-2)', background: value === c.value ? 'var(--surface-2)' : '#fff' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
              onMouseLeave={e => e.currentTarget.style.background = value === c.value ? 'var(--surface-2)' : '#fff'}
            >
              <img src={`https://flagcdn.com/w20/${c.flag}.png`} alt={c.label} style={{ width: 20, borderRadius: 2 }} />
              <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{c.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ClientOnboardingView({ appSettings, setActiveTab }) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [clients, setClients] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [staff, setStaff] = useState({ ams: [], pms: [] });
  const [submitted, setSubmitted] = useState(false);

  // Form State
  const [isNewClient, setIsNewClient] = useState(false);
  const [country, setCountry] = useState('');
  const [formData, setFormData] = useState({
    client_name: '',
    business_name: '',
    email: '',
    phone: '',
    website: '',
    address: '',
    product: '',
    currency: 'USD',
    gross: '',
    net: '',
    terms: '',
    sales_remarks: '',
    collected_by: '',
    sale_date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    supabase.from('profiles').select('full_name, role').in('role', ['am', 'pm']).eq('status', 'active')
      .then(({ data }) => {
        if (data) setStaff({ 
          ams: data.filter(d => d.role === 'am').map(d => d.full_name), 
          pms: data.filter(d => d.role === 'pm').map(d => d.full_name) 
        });
      });
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    const { data } = await supabase.from('clients')
      .select('*')
      .or(`business_name.ilike.%${searchQuery}%,client_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
      .limit(5);
    setClients(data || []);
    setSearching(false);
  };

  const handleOnboardSubmit = async (e) => {
    e.preventDefault();
    if (isNewClient && !country) return alert('Please select a Country.');
    if (!formData.product) return alert('Please select a Product.');
    
    setLoading(true);

    try {
      const { usd: usd_net } = await convertToUSD(Number(formData.net), formData.currency);
      const { usd: usd_gross } = await convertToUSD(Number(formData.gross), formData.currency);

      const submissionData = {
        client_name: formData.client_name || selectedClient?.client_name,
        business_name: formData.business_name || selectedClient?.business_name,
        email: formData.email || selectedClient?.email,
        phone: formData.phone || selectedClient?.phone,
        website: formData.website || selectedClient?.website,
        address: formData.address || selectedClient?.address,
        country: isNewClient ? country : (selectedClient?.country || 'USA'),
        product: formData.product,
        currency: formData.currency,
        gross: Number(formData.gross),
        net: Number(formData.net),
        usd_gross,
        usd_net,
        terms: formData.terms,
        payment_term: formData.terms,
        sale_date: formData.sale_date,
        sales_remarks: formData.sales_remarks,
        status: 'pending',
        is_onboarding: true,
        collected_by: formData.collected_by,
        submitted_by: profile.full_name,
        submitted_by_id: profile.id,
        team: profile.team,
        client_id: selectedClient?.id || null,
        // For onboarding, the "rep" and "closer" can be the collector to bypass regular sales tracking
        rep: formData.collected_by,
        closer: formData.collected_by
      };

      const { error } = await supabase.from('submissions').insert(submissionData);
      
      if (error) throw error;

      await triggerGHLWebhook('sale_submitted', { ...submissionData, source: 'onboarding' });
      await notifyOnboardingSubmitted(submissionData.client_name, submissionData.submitted_by);
      
      setSubmitted(true);
      window.scrollTo(0, 0);
    } catch (err) {
      console.error(err);
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) return (
    <div className="empty" style={{ paddingTop: 100 }}>
      <div style={{ width: 80, height: 80, background: 'var(--green)', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', boxShadow: '0 8px 16px rgba(16, 185, 129, 0.2)' }}>
        <CheckCircle2 size={40} />
      </div>
      <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text)' }}>Submission Received</h2>
      <p className="empty-subtitle">The client onboarding request has been sent for QA Audit. Once passed, the project will be created automatically.</p>
      <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
        <Button variant="outline" onClick={() => { setSubmitted(false); setSelectedClient(null); setIsNewClient(false); }}>Onboard Another</Button>
        <Button variant="dark" onClick={() => setActiveTab('dashboard')}>Go to Dashboard</Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6" style={{ maxWidth: 900, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Client Onboarding</h1>
          <p className="page-subtitle">Onboard new accounts or add premium services to existing clients.</p>
        </div>
      </div>

      {!selectedClient && !isNewClient ? (
        <Card title="Start Onboarding" style={{ border: 'none', boxShadow: 'var(--shadow-lg)' }}>
          <div className="space-y-8" style={{ padding: '20px 0' }}>
            <div style={{ textAlign: 'center' }}>
               <div style={{ width: 64, height: 64, background: 'var(--accent-glow)', color: 'var(--accent)', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <Search size={32} />
               </div>
               <h3 style={{ fontWeight: 800, fontSize: '1.125rem' }}>Lookup Existing Client</h3>
               <p style={{ color: 'var(--text-3)', fontSize: '0.875rem' }}>Check if the client already exists in our ecosystem.</p>
            </div>

            <div className="search-wrapper" style={{ maxWidth: '100%', display: 'flex', gap: 12 }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={18} className="search-icon" />
                <input 
                  value={searchQuery} 
                  onChange={e => setSearchQuery(e.target.value)} 
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  placeholder="Business Name, Client Name or Email..." 
                  className="input search-input" 
                  style={{ height: 48 }}
                />
              </div>
              <Button onClick={handleSearch} loading={searching} variant="dark" style={{ height: 48, padding: '0 24px' }}>Search</Button>
            </div>

            {clients.length > 0 && (
              <div className="space-y-3">
                <p style={{ fontSize: '0.6875rem', fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Found {clients.length} matching records</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 12 }}>
                  {clients.map(c => (
                    <div key={c.id} onClick={() => setSelectedClient(c)} style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface)', transition: 'all 0.2s' }} onMouseEnter={e => { e.currentTarget.style.borderColor='var(--accent)'; e.currentTarget.style.boxShadow='var(--shadow)'; }} onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.boxShadow='none'; }}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)' }}>
                        <Building2 size={20} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 800, fontSize: '0.875rem' }}>{c.business_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{c.client_name} · {c.email}</div>
                      </div>
                      <Plus size={16} style={{ color: 'var(--accent)' }} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ textAlign: 'center', paddingTop: 32, borderTop: '1px solid var(--border)' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, background: 'var(--bg)', padding: '12px 24px', borderRadius: 99 }}>
                <p style={{ color: 'var(--text-2)', fontSize: '0.875rem', fontWeight: 600 }}>New client record?</p>
                <button onClick={() => setIsNewClient(true)} style={{ color: 'var(--accent)', fontWeight: 800, fontSize: '0.875rem', textDecoration: 'underline' }}>
                  Create New Record
                </button>
              </div>
            </div>
          </div>
        </Card>
      ) : (
        <Card flush style={{ border: 'none', boxShadow: 'var(--shadow-lg)' }}>
          <div style={{ background: 'linear-gradient(135deg, var(--text), #1e293b)', padding: '32px 40px', color: '#fff' }}>
             <h2 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: 4 }}>{isNewClient ? "Onboard New Account" : "Add Service Package"}</h2>
             <p style={{ opacity: 0.8, fontSize: '0.875rem', fontWeight: 500 }}>{isNewClient ? "Create a fresh client and project container." : `Registering new revenue for ${selectedClient.business_name}.`}</p>
          </div>

          <form onSubmit={handleOnboardSubmit} className="space-y-8" style={{ padding: 40 }}>
            {isNewClient ? (
              <div className="space-y-6">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                   <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--accent)', color: '#fff', fontSize: '0.75rem', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>1</div>
                   <h3 style={{ fontSize: '1rem', fontWeight: 950, letterSpacing: '-0.01em' }}>Identity & Presence</h3>
                </div>
                <div className="grid-2">
                  <Field label="Business Name *" required value={formData.business_name} onChange={e => setFormData({...formData, business_name: e.target.value})} placeholder="Company Name" />
                  <Field label="Client Name *" required value={formData.client_name} onChange={e => setFormData({...formData, client_name: e.target.value})} placeholder="Full Contact Name" />
                </div>
                <div className="grid-2">
                  <Field label="Main Work Email *" type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="client@company.com" />
                  <Field label="Contact Phone *" required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="+1 (000) 000-0000" />
                </div>
                <div className="grid-2">
                  <Field label="Website URL" value={formData.website} onChange={e => setFormData({...formData, website: e.target.value})} placeholder="https://..." />
                  <CountrySelect value={country} onChange={setCountry} />
                </div>
                <Field label="Street Address *" required value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="Full physical address" />
              </div>
            ) : (
              <div style={{ padding: 24, background: 'var(--surface-2)', borderRadius: 16, border: '1.5px dashed var(--border-2)', display: 'flex', gap: 16, alignItems: 'center' }}>
                <div style={{ width: 56, height: 56, borderRadius: 14, background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Building2 size={28} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 950, fontSize: '1.125rem' }}>{selectedClient.business_name}</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-3)', fontWeight: 600 }}>{selectedClient.client_name} · {selectedClient.email}</div>
                </div>
                <Button size="sm" variant="outline" onClick={() => setSelectedClient(null)}>Select Different</Button>
              </div>
            )}

            <div className="space-y-6">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                 <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--accent)', color: '#fff', fontSize: '0.75rem', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>2</div>
                 <h3 style={{ fontSize: '1rem', fontWeight: 950, letterSpacing: '-0.01em' }}>Commercial Package</h3>
              </div>
              
              <div className="grid-2">
                <Select label="Product / Service Category *" required value={formData.product} onChange={e => setFormData({...formData, product: e.target.value})}>
                  <option value="">Select Service...</option>
                  {appSettings.products?.map(p => <option key={p} value={p}>{p}</option>)}
                </Select>
                <Select label="Payment Cycle / Terms *" required value={formData.terms} onChange={e => setFormData({...formData, terms: e.target.value})}>
                   <option value="">Select terms...</option>
                   {appSettings.payment_terms?.map(p => <option key={p} value={p}>{p}</option>)}
                </Select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                <Field label="Gross Sale Value *" type="number" step="0.01" required value={formData.gross} onChange={e => setFormData({...formData, gross: e.target.value})} placeholder="0.00" />
                <Field label="Net Sale Value *" type="number" step="0.01" required value={formData.net} onChange={e => setFormData({...formData, net: e.target.value})} placeholder="0.00" />
                <Select label="Currency" value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})}>
                  {appSettings.currencies?.map(c => <option key={c} value={c}>{c}</option>)}
                </Select>
              </div>

              <div className="grid-2">
                <Select label="Collected By (AM/PM) *" required value={formData.collected_by} onChange={e => setFormData({...formData, collected_by: e.target.value})}>
                  <option value="">Choose individual...</option>
                  <optgroup label="Account Managers">
                    {staff.ams.map(s => <option key={s} value={s}>{s}</option>)}
                  </optgroup>
                  <optgroup label="Project Managers">
                    {staff.pms.map(s => <option key={s} value={s}>{s}</option>)}
                  </optgroup>
                </Select>
                <Field label="Date of Engagement *" type="date" required value={formData.sale_date} onChange={e => setFormData({...formData, sale_date: e.target.value})} />
              </div>

              <Field label="Detailed Deliverables / Remarks *" required textarea rows={4} value={formData.sales_remarks} onChange={e => setFormData({...formData, sales_remarks: e.target.value})} placeholder="Explain what has been promised to the client..." />
            </div>

            <div style={{ padding: '16px 20px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
               <ShieldCheck size={20} style={{ color: 'var(--green)' }} />
               <p style={{ fontSize: '0.8125rem', color: 'var(--text-3)', fontWeight: 600 }}>This submission will be routed to <strong style={{ color: 'var(--text)' }}>QA Audit</strong> for validation before any projects are created.</p>
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 24 }}>
              <Button variant="outline" size="lg" onClick={() => { setIsNewClient(false); setSelectedClient(null); }}>Discard</Button>
              <Button variant="primary" size="lg" type="submit" loading={loading} style={{ background: 'var(--green)', borderColor: 'var(--green)', padding: '0 48px' }}>
                Submit For Audit
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
