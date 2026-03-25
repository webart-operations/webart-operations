import React, { useState, useEffect } from 'react';
import { ShieldCheck, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { triggerGHLWebhook } from '../lib/ghl';
import { useAuth } from '../context/AuthContext';
import { notifyPaymentLogged } from '../lib/notifications';
import { convertToUSD, formatUSD } from '../lib/currency';
import { Button, Card, Select, Field, LOGO_URL } from '../components/ui';

// TileChooser removed in favor of standard Select dropdowns for consistency

export default function LogPaymentView({ appSettings, setActiveTab }) {
  const { profile } = useAuth();
  
  const [projects, setProjects] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Form State
  const [projectId, setProjectId] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [clientName, setClientName] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [amount, setAmount] = useState('');
  const [paymentType, setPaymentType] = useState('Upsell');
  const [product, setProduct] = useState('');
  const [productSpecify, setProductSpecify] = useState('');
  const [installment, setInstallment] = useState('Other');
  const [otherPayment, setOtherPayment] = useState('');
  const [paidThrough, setPaidThrough] = useState('');
  const [collectedBy, setCollectedBy] = useState('');
  const [remarks, setRemarks] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);

  const [staff, setStaff] = useState({ ams: [], pms: [] });

  useEffect(() => {
    supabase.from('projects').select('id, client_name, product, assigned_am, assigned_pm, team').order('client_name')
      .then(({ data }) => setProjects(data || []));
      
    supabase.from('profiles').select('full_name, role').in('role', ['am', 'pm']).eq('status', 'active')
      .then(({ data }) => {
        if (data) setStaff({
          ams: data.filter(d => d.role === 'am').map(d => d.full_name),
          pms: data.filter(d => d.role === 'pm').map(d => d.full_name)
        });
      });
  }, []);

  useEffect(() => {
    if (projectId) {
      supabase.from('project_services').select('id, service_name, status').eq('project_id', projectId)
        .then(({ data }) => setServices(data || []));
      
      const p = projects.find(x => x.id === projectId);
      if (p) {
        setClientName(p.client_name);
        setCollectedBy(p.assigned_am || p.assigned_pm || '');
      }
    } else {
      setServices([]);
      setSelectedServiceId('');
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
    const selectedProj = projects.find(x => x.id === projectId);

    const entry = {
      project_id: projectId,
      service_id: selectedServiceId || null,
      client_name: clientName,
      logged_by: profile.full_name, 
      logged_by_id: profile.id,
      collected_by: collectedBy,
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
       // Automatically restore status to active if it was on_hold, delivered, dead, or closed
       if (selectedProj) {
         await supabase.from('projects').update({ status: 'active' }).eq('id', projectId).neq('status', 'active');
       }

       await triggerGHLWebhook('payment_collection_logged', entry);
       await notifyPaymentLogged({ 
          clientName, amountFormatted: formatUSD(usd), 
          amName: selectedProj?.assigned_am, pmName: selectedProj?.assigned_pm, 
          loggerName: profile.full_name, teamName: selectedProj?.team 
       });
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
        
        <Select label="Project Container *" value={projectId} onChange={e => setProjectId(e.target.value)} required>
          <option value="">Select Project</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.client_name}</option>)}
        </Select>

        <Select label="Linked Service (Optional)" value={selectedServiceId} onChange={e => setSelectedServiceId(e.target.value)}>
          <option value="">No specific service</option>
          {services.map(s => <option key={s.id} value={s.id}>{s.service_name} ({s.status})</option>)}
        </Select>

        <Field label="Client Name *" value={clientName} onChange={e => setClientName(e.target.value)} required placeholder="Client Name" />
        
        <Select label="Currency *" value={currency} onChange={e => setCurrency(e.target.value)} required>
          {appSettings?.currencies?.map(c => <option key={c} value={c}>{c}</option>)}
        </Select>

        <Field label="Amount *" type="number" step="0.01" required value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
        
        <Select label="Type Of Payment *" value={paymentType} onChange={e => setPaymentType(e.target.value)} required>
          <option value="Upsell">Upsell</option>
          <option value="Collection">Collection</option>
        </Select>

        <Select label="Product / Service Category *" value={product} onChange={e => setProduct(e.target.value)} required>
          <option value="">Select a category...</option>
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

        <Select label="Payment Collected By (AM/PM) *" value={collectedBy} onChange={e => setCollectedBy(e.target.value)} required>
          <option value="">Select Staff</option>
          <optgroup label="Account Managers">
            {staff.ams.map(s => <option key={s} value={s}>{s}</option>)}
          </optgroup>
          <optgroup label="Project Managers">
            {staff.pms.map(s => <option key={s} value={s}>{s}</option>)}
          </optgroup>
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
