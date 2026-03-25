import React, { useState } from 'react';
import { Send, CheckCircle2, ShieldAlert } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { triggerGHLWebhook } from '../lib/ghl';
import { convertToUSD } from '../lib/currency';
import { useAuth } from '../context/AuthContext';
import { notifySaleSubmitted } from '../lib/notifications';
import { Button, Field, Select, LOGO_URL } from '../components/ui';

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


export default function SalesFormView({ appSettings, setActiveTab }) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  

  const [country, setCountry] = useState('');
  const [product, setProduct] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [gross, setGross] = useState('');
  const [net, setNet] = useState('');

  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [expectedAnswer, setExpectedAnswer] = useState(0);
  const [captchaQuestion, setCaptchaQuestion] = useState('');

  React.useEffect(() => {
    const a = Math.floor(Math.random() * 9) + 1;
    const b = Math.floor(Math.random() * 9) + 1;
    setExpectedAnswer(a + b);
    setCaptchaQuestion(`What is ${a} + ${b}?`);
  }, [submitted]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (parseInt(captchaAnswer) !== expectedAnswer) {
      alert('Incorrect security answer. Please try again.');
      return;
    }
    if (!country) return alert('Please select a Country.');
    if (!product) return alert('Please select a Product.');

    setLoading(true);
    const fd = new FormData(e.target);
    const { usd: usd_net } = await convertToUSD(Number(net), currency);
    const { usd: usd_gross } = await convertToUSD(Number(gross), currency);
    
    const data = {
      client_name: fd.get('client_name'),
      business_name: fd.get('business_name'),
      email: fd.get('email'),
      phone: fd.get('phone'),
      website: fd.get('website'),
      address: fd.get('address'),
      country: country,
      product: product === 'Others' ? `Other: ${fd.get('product_specify')}` : product,
      rep: fd.get('rep'),
      closer: fd.get('closer'),
      terms: fd.get('terms'),
      sale_date: fd.get('sale_date'),
      
      currency,
      gross: Number(gross),
      net: Number(net),
      usd_gross: usd_gross,
      usd_net: usd_net,

      sales_remarks: fd.get('sales_remarks'),
      status: 'pending',
      
      submitted_by: profile.full_name,
      submitted_by_id: profile.id,
      payment_term: fd.get('terms'),
    };

    const { error } = await supabase.from('submissions').insert(data);
    
    if (error) {
      console.error('Submission Error:', error);
      alert('Error submitting to database. Please try again.');
    } else {
      await triggerGHLWebhook('sale_submitted', data);
      await notifySaleSubmitted(data.client_name, data.rep || data.submitted_by);
      setActiveTab('submissions');
    }
    setLoading(false);
  };

  if (submitted) {
    return (
      <div className="empty" style={{ paddingTop: 100 }}>
        <CheckCircle2 size={64} style={{ color: 'var(--green)' }} />
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Submission Received</h2>
        <p className="empty-subtitle">Your sale has been logged successfully.</p>
        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
          <Button variant="outline" onClick={() => setSubmitted(false)}>Submit Another</Button>
          <Button variant="dark" onClick={() => setActiveTab('dashboard')}>Return to Dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', background: '#fff', padding: '40px 60px', borderRadius: 'var(--radius-lg)', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 40 }}>
        <img src={LOGO_URL} alt="WebArt" style={{ height: 48 }} />
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        <CountrySelect value={country} onChange={setCountry} />

        <Field label="BUSINESS NAME *" name="business_name" required placeholder="BUSINESS NAME" />
        <Field label="Client Name *" name="client_name" required placeholder="Client Name" />
        <Field label="Phone *" name="phone" required placeholder="Phone" />
        <Field label="Email *" name="email" type="email" required placeholder="Email" />
        <Field label="Website" name="website" placeholder="Web URL goes here" />
        <Field label="Street Address *" name="address" required placeholder="Address" />
        
        <Select label="Sale Representative Name *" name="rep" required>
          <option value="">Select the Sale Rep.</option>
          {appSettings?.sales_reps?.map(r => <option key={r} value={r}>{r}</option>)}
        </Select>

        <Select label="Closer Name *" name="closer" required>
          <option value="">Select the closer.</option>
          {appSettings?.closers?.map(c => <option key={c} value={c}>{c}</option>)}
        </Select>

        <Select label="Product *" value={product} onChange={e => setProduct(e.target.value)} required>
          <option value="">Select a product...</option>
          {appSettings?.products?.map(p => <option key={p} value={p}>{p}</option>)}
        </Select>

        {product === 'Others' && (
          <Field label="Please Specify *" name="product_specify" required placeholder="Describe the product or service..." />
        )}

        <Select label="Currency *" value={currency} onChange={e => setCurrency(e.target.value)} required>
          {appSettings?.currencies?.map(c => <option key={c} value={c}>{c}</option>)}
        </Select>

        <div className="grid-2">
           <Field label="Sale Value (Gross) *" value={gross} onChange={e => setGross(e.target.value)} type="number" step="0.01" required placeholder="Enter Gross Value" />
           <Field label="Sale Value (Net) *" value={net} onChange={e => setNet(e.target.value)} type="number" step="0.01" required placeholder="Enter Net Value" />
        </div>

        <Select label="Payment Terms *" name="terms" required>
          <option value="">Select payment terms...</option>
          {appSettings?.payment_terms?.map(p => <option key={p} value={p}>{p}</option>)}
        </Select>

        <Field label="Sales Remarks *" name="sales_remarks" required textarea rows={4} placeholder="Please input detail remarks" />
        <Field label="Sale Date *" name="sale_date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} />

        <div style={{ display: 'flex', gap: 16, alignItems: 'center', background: '#fffbeb', border: '1px solid #fde68a', padding: '12px 16px', borderRadius: 'var(--radius)', marginTop: 24 }}>
          <ShieldAlert size={20} style={{ color: '#b45309' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#b45309' }}>Spam Protection</div>
            <div style={{ fontSize: '0.75rem', color: '#92400e' }}>{captchaQuestion}</div>
          </div>
          <input type="number" required value={captchaAnswer} onChange={e => setCaptchaAnswer(e.target.value)} placeholder="0" className="input" style={{ width: 60, textAlign: 'center', padding: '8px' }} />
        </div>

        <Button full variant="primary" size="lg" type="submit" loading={loading} style={{ background: '#10b981', borderColor: '#059669', marginTop: 32 }}>
          SUBMIT
        </Button>
      </form>
    </div>
  );
}
