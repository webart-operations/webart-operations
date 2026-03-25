import React, { useState } from 'react';
import { Briefcase, Users, UserCheck, CreditCard, Globe, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Card, Button } from '../components/ui';

export default function FormConfigView({ appSettings }) {
  const [tab, setTab] = useState(() => localStorage.getItem('formConfigTab') || 'products');
  const [newVal, setNewVal] = useState('');

  const handleTabChange = (newTab) => {
    setTab(newTab);
    localStorage.setItem('formConfigTab', newTab);
  };

  const updateConfig = async (key, updatedList) => {
    const { error } = await supabase.from('app_settings').upsert({ key, values: updatedList }, { onConflict: 'key' });
    if (error) {
      console.error('Update Config Error:', error);
      alert('Failed to update config. Please check your permissions.');
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newVal.trim()) return;
    const list = appSettings[tab] || [];
    if (list.includes(newVal.trim())) { setNewVal(''); return; }
    
    let updated;
    if (tab === 'products') {
      const withoutOthers = list.filter(i => i !== 'Others');
      const others = list.filter(i => i === 'Others');
      updated = [...withoutOthers, newVal.trim(), ...others];
    } else {
      updated = [...list, newVal.trim()];
    }
    
    await updateConfig(tab, updated);
    setNewVal('');
  };

  const handleRemove = async (val) => {
     if (tab === 'products' && val === 'Others') {
        alert("Cannot remove the 'Others' product fallback.");
        return;
     }
     if (!window.confirm(`Are you sure you want to remove "${val}"?`)) return;
     const updatedList = (appSettings[tab] || []).filter(i => i !== val);
     await updateConfig(tab, updatedList);
  };

  const tabs = [
    { id: 'products', label: 'Products & Services', icon: Briefcase },
    { id: 'sales_reps', label: 'Sales Team', icon: Users },
    { id: 'closers', label: 'Closers', icon: UserCheck },
    { id: 'payment_terms', label: 'Payment Terms', icon: CreditCard },
    { id: 'currencies', label: 'Supported Currencies', icon: Globe },
    { id: 'paid_through', label: 'Paid Through', icon: CreditCard },
    { id: 'installments', label: 'Installments', icon: Briefcase },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-20">
      <div className="page-header">
        <div>
           <h1 className="page-title">Platform Forms Configuration</h1>
           <p className="page-subtitle">Manage dropdown data for the platform</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
         {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => handleTabChange(id)}
               style={{ 
                  display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 99, fontSize: '0.8125rem', fontWeight: 700, transition: 'all 0.15s',
                  background: tab === id ? 'var(--text)' : 'var(--surface)', color: tab === id ? '#fff' : 'var(--text-3)', border: tab === id ? '1px solid var(--text)' : '1px solid var(--border)',
                  boxShadow: tab === id ? 'var(--shadow-md)' : 'none'
               }}>
               <Icon size={14} /> {label}
            </button>
         ))}
      </div>

      <Card title={`Manage ${tab.replace('_', ' ')}`}>
         <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 300px', gap: 24, alignItems: 'start' }}>
            <div className="space-y-4">
               {(appSettings[tab] || []).length === 0 ? <p className="text-muted" style={{ fontSize: '0.875rem' }}>List is empty.</p>
               : (appSettings[tab] || []).map(item => (
                  <div key={item} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                     <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{item}</span>
                     <button onClick={() => handleRemove(item)} style={{ color: 'var(--red)', opacity: 0.6, cursor: 'pointer' }} onMouseEnter={e=>e.currentTarget.style.opacity=1} onMouseLeave={e=>e.currentTarget.style.opacity=0.6}>
                        <Trash2 size={16} />
                     </button>
                  </div>
               ))}
            </div>

            <div style={{ background: 'var(--surface-2)', padding: 16, borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', position: 'sticky', top: 20 }}>
               <h3 style={{ fontSize: '0.8125rem', fontWeight: 800, marginBottom: 12 }}>Add New Item</h3>
               <form onSubmit={handleAdd} className="space-y-4">
                  <input value={newVal} onChange={e => setNewVal(e.target.value)} className="input" placeholder="Type here..." required />
                  <Button full variant="dark" type="submit"><Plus size={14} /> Append to List</Button>
               </form>
            </div>
         </div>
      </Card>
    </div>
  );
}
