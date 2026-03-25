import React, { useState, useEffect, useMemo } from 'react';
import { Download, Plus, Globe, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { formatUSD, convertToUSD } from '../lib/currency';
import { Button, Card, Pill, Spinner, MiniBarChart, Select, exportToCSV } from '../components/ui';

export default function RevenueView({ setActiveTab, appSettings }) {
  const { profile, role, ability } = useAuth();
  const [ledger, setLedger] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('payments');

  useEffect(() => {
    const load = async () => {
      let ledQuery = supabase.from('revenue_ledger').select('*').order('payment_date', { ascending: false });
      let subQuery = supabase.from('submissions').select('*').order('sale_date', { ascending: false });

      // RBAC rules for Revenue Ledger:
      if (!ability('view_full_revenue')) {
        if (ability('view_team_revenue') && role === 'am') {
           // AM sees ledger for all projects assigned to them
           const { data: myProjects } = await supabase.from('projects').select('id').eq('assigned_am', profile.full_name);
           const pIds = myProjects?.map(p => p.id) || [];
           // Include their personal ledger entries too if any
           ledQuery = ledQuery.or(`project_id.in.(${pIds.join(',') || '00000000-0000-0000-0000-000000000000'}),logged_by_id.eq.${profile.id}`);
        } else {
           // PM, Sales see own
           ledQuery = ledQuery.eq('logged_by_id', profile.id);
        }
      }

      // RBAC for Sales Analytics Tab (Submissions)
      if (!ability('view_sales_data')) {
         subQuery = subQuery.eq('submitted_by_id', profile.id);
      }

      const [{ data: led }, { data: subs }] = await Promise.all([ledQuery, subQuery]);
      setLedger(led || []);
      setSubmissions(subs || []);
      setLoading(false);
    };
    load();
    const ch = supabase.channel('revenue-view').on('postgres_changes', { event: '*', schema: 'public', table: 'revenue_ledger' }, load).subscribe();
    return () => supabase.removeChannel(ch);
  }, [profile, role, ability]);

  const paymentTotals = useMemo(() => ledger.reduce((acc, tx) => ({
    total: acc.total + Number(tx.amount_usd),
    locked: acc.locked + (tx.locked ? Number(tx.amount_usd) : 0),
    unlocked: acc.unlocked + (!tx.locked ? Number(tx.amount_usd) : 0),
  }), { total: 0, locked: 0, unlocked: 0 }), [ledger]);

  // Sales analytics from submissions
  const passedSubs = submissions.filter(s => s.status === 'passed');
  const totalGross = passedSubs.reduce((sum, s) => sum + Number(s.gross || 0), 0);

  // By rep
  const repData = useMemo(() => {
    const map = {};
    submissions.forEach(s => {
      if (!s.rep) return;
      if (!map[s.rep]) map[s.rep] = { rep: s.rep, total: 0, passed: 0, gross: 0 };
      map[s.rep].total++;
      if (s.status === 'passed') { map[s.rep].passed++; map[s.rep].gross += Number(s.usd_gross || s.gross || 0); }
    });
    return Object.values(map).sort((a, b) => b.gross - a.gross);
  }, [submissions]);

  const monthData = useMemo(() => {
    const map = {};
    submissions.forEach(s => {
      if (!s.sale_date) return;
      const month = s.sale_date.slice(0, 7);
      if (!map[month]) map[month] = { month, count: 0, gross: 0 };
      map[month].count++;
      map[month].gross += Number(s.usd_gross || s.gross || 0);
    });
    return Object.values(map).sort((a, b) => a.month.localeCompare(b.month)).slice(-12).map(m => ({
      ...m,
      label: new Date(m.month + '-01').toLocaleDateString('en', { month: 'short', year: '2-digit' })
    }));
  }, [submissions]);

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Revenue & Sales Analytics</h1>
          <p className="page-subtitle">{ability('view_full_revenue') ? 'Global platform data' : 'Your personal data'}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="outline" onClick={() => exportToCSV(ledger, 'Revenue')}><Download size={14} /> Export</Button>
          <Button variant="dark" onClick={() => setActiveTab('log-payment')}><Plus size={14} /> Log Payment</Button>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab ${activeSection === 'payments' ? 'active' : ''}`} onClick={() => setActiveSection('payments')}>Payment Ledger</button>
        {ability('view_sales_data') && (
          <button className={`tab ${activeSection === 'sales' ? 'active' : ''}`} onClick={() => setActiveSection('sales')}>Sales Analytics</button>
        )}
      </div>

      {activeSection === 'payments' && (
        <>
          <div className="grid-stat">
            <Card flush><div style={{ padding: 16 }}><div style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-3)' }}>Total (USD)</div><h4 style={{ fontSize: '1.75rem', fontWeight: 900, fontFamily: 'var(--font-mono)' }}>{formatUSD(paymentTotals.total)}</h4></div></Card>
            <Card flush><div style={{ padding: 16 }}><div style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-3)' }}>Collected</div><h4 style={{ fontSize: '1.75rem', fontWeight: 900, fontFamily: 'var(--font-mono)', color: 'var(--green)' }}>{formatUSD(paymentTotals.locked)}</h4></div></Card>
            <Card flush><div style={{ padding: 16 }}><div style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-3)' }}>Transactions</div><h4 style={{ fontSize: '1.75rem', fontWeight: 900 }}>{ledger.length}</h4></div></Card>
          </div>
          <Card title="Payment Ledger" flush>
             <div style={{ overflowX: 'auto' }}>
                <table className="table">
                   <thead>
                     <tr>
                        <th>Date</th>
                        <th>Client</th>
                        <th>Original</th>
                        <th style={{ textAlign: 'right' }}>USD Locked</th>
                     </tr>
                   </thead>
                   <tbody>
                      {loading ? <tr><td colSpan={4} style={{ textAlign:'center', padding:'48px 0' }}><Spinner size="lg" /></td></tr>
                      : ledger.length === 0 ? <tr><td colSpan={4} style={{ textAlign:'center', padding:'48px 0', color: 'var(--text-3)' }}>No payments logged yet</td></tr>
                      : ledger.map(tx => (
                        <tr key={tx.id}>
                           <td style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{tx.payment_date}</td>
                           <td style={{ fontWeight: 600, fontSize: '0.875rem' }}>{tx.client_name}</td>
                           <td style={{ fontSize: '0.875rem', color: 'var(--text-2)' }}>{Number(tx.original_amount).toLocaleString()} {tx.currency}</td>
                           <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--green)' }}>{formatUSD(tx.amount_usd)}</td>
                        </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </Card>
        </>
      )}

      {activeSection === 'sales' && ability('view_sales_data') && (
        <>
          <div className="grid-stat">
             <Card flush><div style={{ padding: 16 }}><div style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-3)' }}>Passed Audits</div><h4 style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--green)' }}>{passedSubs.length}</h4></div></Card>
             <Card flush><div style={{ padding: 16 }}><div style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-3)' }}>Total Gross (Passed)</div><h4 style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--blue)' }}>${totalGross.toLocaleString()}</h4></div></Card>
          </div>

          <div className="grid-2">
            <Card title="Monthly Volume (Deals)">
              <MiniBarChart data={monthData} valueKey="count" labelKey="label" color="var(--accent)" />
            </Card>
            <Card title="Monthly Gross Value">
              <MiniBarChart data={monthData} valueKey="gross" labelKey="label" color="#6366f1" />
            </Card>
          </div>

          <Card title="Rep Performance" flush>
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Rep</th>
                    <th>Submissions</th>
                    <th>Passed</th>
                    <th>Rate</th>
                    <th style={{ textAlign: 'right' }}>Gross (USD)</th>
                  </tr>
                </thead>
                <tbody>
                  {repData.map((r, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{r.rep}</td>
                      <td>{r.total}</td>
                      <td style={{ color: 'var(--green)', fontWeight: 700 }}>{r.passed}</td>
                      <td>
                        <Pill status={r.passed / r.total >= 0.7 ? 'active' : r.passed / r.total >= 0.4 ? 'warning' : 'failed'} 
                              label={`${r.total > 0 ? Math.round((r.passed / r.total) * 100) : 0}%`} noDot />
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--blue)' }}>${r.gross.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
