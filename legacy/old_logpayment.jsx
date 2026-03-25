import React, { useState, useEffect } from 'react';
import { ShieldCheck, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { triggerGHLWebhook } from '../lib/ghl';
import { useAuth } from '../context/AuthContext';
import { convertToUSD } from '../lib/currency';
import { Button, Field, Select, LOGO_URL } from '../components/ui';

// TileChooser removed in favor of standard Select dropdowns for consistency

export default function LogPaymentView({ appSettings, setActiveTab }) {
  const { profile } = useAuth();
  
  const [projects, setProjects] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  // Form State
  const [projectId, setProjectId] = useState('');
  const [clientName, setClientName] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [amount, setAmount] = useState('');
  const [paymentType, setPaymentType] = useState('Upsell');
  const [product, setProduct] = useState('');
  const [productSpecify, setProductSpecify] = useState('');
  const [installment, setInstallment] = useState('Other');
  const [otherPayment, setOtherPayment] = useState('');
  const [paidThrough, setPaidThrough] = useState('');
  const [collectedBy, setCollectedBy] = useState(profile?.full_name || '');
  const [remarks, setRemarks] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    supabase.from('projects').select('id, client_name, product').order('client_name')
      .then(({ data }) => setProjects(data || []));
      
    supabase.from('profiles').select('full_name, role').in('role', ['am', 'pm', 'sales', 'ceo'])
      .then(({ data }) => setStaff(data?.map(d => d.full_name) || []));
  }, []);

  // Auto-fill client name when project is selected
  useEffect(() => {
    if (projectId) {
      const p = projects.find(x => x.id === projectId);
      if (p) {
        setClientName(p.client_name);
        if (!product && p.product) setProduct(p.product);
      }
    }
  }, [projectId, projects]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (installment === 'Other' && !otherPayment) return alert('Other Payment field is required.');
    if (!product) return alert('Please select a Product.');
    if (product === 'Others' && !productSpecify) return alert('Please specify the product.');

    setLoading(true);
    
    // Live USD conversion
    const { usd, rate } = await convertToUSD(Number(amount), currency);

    const entry = {
      project_id: projectId, 
      client_name: clientName,
      logged_by: collectedBy, 
      logged_by_id: profile.id,
      currency, 
      original_amount: Number(amount), 
      exchange_rate: rate, 
      amount_usd: usd,
      payment_date: paymentDate, 
      payment_type: paymentType,
      product: product === 'Others' ? `Other: ${productSpecify}` : product,
      installment: installment === 'Other' ? otherPayment : installment,
      paid_through: paidThrough,
      notes: remarks, 
      locked: true,
    };
    
    const { error } = await supabase.from('revenue_ledger').insert(entry);
    if (!error) { 
       await triggerGHLWebhook('payment_collection_logged', entry);
       setSubmitted(true);
       window.scrollTo(0, 0);
    } else {
       console.error('Payment Error:', error);
       alert('Error logging payment: ' + (error.message || 'Check database connectivity.'));
    }
    setLoading(false);
  };

  if (submitted) return (
    <div className="empty" style={{ paddingTop: 80 }}>
      <CheckCircle2 size={64} style={{ color: 'var(--green)' }} />
      <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Payment Collected</h2>
      <p className="empty-subtitle">Revenue has been logged successfully and conversion locked.</p>
      <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
        <Button variant="outline" onClick={() => { setSubmitted(false); setAmount(''); setOtherPayment(''); }}>Log Another</Button>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', background: '#fff', padding: '40px 60px', borderRadius: 'var(--radius-lg)', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 40 }}>
        <img src={LOGO_URL} alt="WebArt" style={{ height: 48 }} />
      </div>

      <form className="space-y-6" onSubmit={handleSubmit}>
        <Field label="Payment Date *" type="date" required value={paymentDate} onChange={e => setPaymentDate(e.target.value)} />
        
        <Select label="Project Name *" value={projectId} onChange={e => setProjectId(e.target.value)} required>
          <option value="">Select Project</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.client_name} - {p.product}</option>)}
        </Select>

        <Field label="Client Name *" value={clientName} onChange={e => setClientName(e.target.value)} required placeholder="Client Name" />
        
        <Select label="Currency *" value={currency} onChange={e => setCurrency(e.target.value)} required>
          {appSettings?.currencies?.map(c => <option key={c} value={c}>{c}</option>)}
        </Select>

        <Field label="Amount *" type="number" step="0.01" required value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
        
        <Select label="Type Of Payment *" value={paymentType} onChange={e => setPaymentType(e.target.value)} required>
          <option value="Initial Payment">Initial Payment</option>
          <option value="Upsell">Upsell</option>
          <option value="Retainer">Retainer</option>
          <option value="Milestone">Milestone</option>
          <option value="Final Payment">Final Payment</option>
        </Select>

        <Select label="Product *" value={product} onChange={e => setProduct(e.target.value)} required>
          <option value="">Select a product...</option>
          {appSettings?.products?.map(p => <option key={p} value={p}>{p}</option>)}
        </Select>

        {product === 'Others' && (
          <Field label="Please Specify Product *" value={productSpecify} onChange={e => setProductSpecify(e.target.value)} required placeholder="Describe the service..." />
        )}

        <Select label="Installment *" value={installment} onChange={e => setInstallment(e.target.value)} required>
          <option value="">Select Installment</option>
          {appSettings?.installments?.map(i => <option key={i} value={i}>{i}</option>)}
          <option value="Other">Other (Specify)</option>
        </Select>

        {installment === 'Other' && (
          <div className="field">
             <Field label="Other Payment *" value={otherPayment} onChange={e => setOtherPayment(e.target.value)} required={installment === 'Other'} placeholder="Specify installment" />
             {!otherPayment && <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: 4 }}>Other Payment is required</div>}
          </div>
        )}

        <Select label="Paid Through *" value={paidThrough} onChange={e => setPaidThrough(e.target.value)} required>
          <option value="">Select Gateway</option>
          {appSettings?.paid_through?.map(p => <option key={p} value={p}>{p}</option>)}
        </Select>

        <Select label="Payment Collected By *" value={collectedBy} onChange={e => setCollectedBy(e.target.value)} required>
          <option value="">Select Staff</option>
          {staff.map(s => <option key={s} value={s}>{s}</option>)}
        </Select>

        <Field label="Payment Done Remarks" name="remarks" textarea rows={3} value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Provide additional context..." />

        <div style={{ padding: '12px 16px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 'var(--radius)', color: '#1d4ed8', fontSize: '0.8125rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 12, marginTop: 24 }}>
          <ShieldCheck size={20} /> Amount will be securely locked to the Ledger at today's real-time USD exchange rate.
        </div>

        <Button variant="primary" size="lg" full type="submit" loading={loading} style={{ background: '#10b981', borderColor: '#059669', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 32 }}>Submit</Button>
      </form>
    </div>
  );
}
