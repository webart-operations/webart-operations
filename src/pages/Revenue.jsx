import React, { useState, useEffect, useMemo } from 'react';
import { DollarSign, TrendingUp, Filter, Download, ArrowUpRight, ArrowDownRight, CreditCard, Wallet, Search, Plus, Globe, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { formatUSD } from '../lib/currency';
import { Button, Card, Pill, Spinner, MiniBarChart, Select, exportToCSV } from '../components/ui';

export default function RevenueView({ setActiveTab, appSettings }) {
  const { profile, role, ability } = useAuth();
  const [payments, setPayments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeSection, setActiveSection] = useState('payments');

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      
      let ledQuery = supabase.from('revenue_ledger').select('*, projects(client_name, product)').order('payment_date', { ascending: false });
      let subQuery = supabase.from('submissions').select('*').order('sale_date', { ascending: false });

      if (!ability('view_full_revenue')) {
        if (ability('view_team_revenue') && role === 'am') {
           const { data: myProjects } = await supabase.from('projects').select('id').eq('assigned_am', profile.full_name);
           const pIds = myProjects?.map(p => p.id) || [];
           ledQuery = ledQuery.or(`project_id.in.(${pIds.join(',') || '00000000-0000-0000-0000-000000000000'}),logged_by_id.eq.${profile.id}`);
        } else {
           ledQuery = ledQuery.eq('logged_by_id', profile.id);
        }
      }

      if (!ability('view_sales_data')) {
         subQuery = subQuery.eq('rep', profile.full_name);
      }

      const [{ data: led }, { data: subs }] = await Promise.all([ledQuery, subQuery]);
      
      // Filter subs for sales logic if needed
      const filteredSubs = (!ability('view_sales_data') && role === 'sales')
         ? (subs || []).filter(s => s.rep === profile.full_name)
         : (subs || []);

      setPayments(led || []);
      setSubmissions(filteredSubs || []);
      setLoading(false);
    };

    loadData();
    const ch = supabase.channel('revenue-view')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'revenue_ledger' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'submissions' }, loadData)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [profile, role, ability]);

  const stats = useMemo(() => {
    const paid = payments.reduce((sum, p) => sum + Number(p.amount_usd || 0), 0);
    return { total_paid: paid, balance: 0, count: payments.length };
  }, [payments]);

  // Sales analytics from submissions
  const passedSubs = submissions.filter(s => s.status === 'passed');
  const totalNetValue = passedSubs.reduce((sum, s) => sum + Number(s.usd_net || s.net || 0), 0);

  // By rep
  const repData = useMemo(() => {
    const map = {};
    submissions.forEach(s => {
      // Exclude AM/PM reactivations
      if (s.is_reactivation && !(appSettings?.sales_reps || []).includes(s.closer)) return;
      
      const effRep = s.is_reactivation ? s.closer : s.rep;
      if (!effRep) return;

      if (!map[effRep]) map[effRep] = { rep: effRep, total: 0, passed: 0, net: 0 };
      map[effRep].total++;
      if (s.status === 'passed') { map[effRep].passed++; map[effRep].net += Number(s.usd_net || s.net || 0); }
    });
    return Object.values(map).sort((a, b) => b.net - a.net);
  }, [submissions, appSettings]);

  const monthData = useMemo(() => {
    const map = {};
    submissions.forEach(s => {
      if (!s.sale_date) return;
      const month = s.sale_date.slice(0, 7);
      if (!map[month]) map[month] = { month, count: 0, net: 0 };
      map[month].count++;
      if (s.status === 'passed') {
        map[month].net += Number(s.usd_net || s.net || 0);
      }
    });
    return Object.values(map).sort((a, b) => a.month.localeCompare(b.month)).slice(-12).map(m => ({
      ...m,
      label: new Date(m.month + '-01').toLocaleDateString('en', { month: 'short', year: '2-digit' })
    }));
  }, [submissions]);

  const filteredPayments = payments.filter(p => 
    p.projects?.client_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Revenue & Sales Analytics</h1>
          <p className="page-subtitle">{ability('view_full_revenue') ? 'Global platform data' : 'Your personal data'}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="outline" onClick={() => exportToCSV(activeSection === 'payments' ? payments : submissions, 'Data_Export')}><Download size={14} /> Export</Button>
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
          <div className="grid-3">
            <Card title="Total Collected" icon={<Wallet className="text-blue" />}>
              <div className="stat-value">$ {stats.total_paid.toLocaleString()}</div>
              <div className="stat-label">Verified revenue to date</div>
            </Card>
            <Card title="Payment count" icon={<CreditCard className="text-green" />}>
              <div className="stat-value">{stats.count}</div>
              <div className="stat-label">Successful transactions</div>
            </Card>
            <Card title="Avg. Ticket" icon={<TrendingUp className="text-purple" />}>
              <div className="stat-value">$ {(stats.total_paid / (stats.count || 1)).toFixed(0)}</div>
              <div className="stat-label">Per payment collection</div>
            </Card>
          </div>

          <Card flush>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ position: 'relative', width: 300 }}>
                 <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
                 <input className="input" placeholder="Search clients..." style={{ paddingLeft: 36 }} value={search} onChange={e=>setSearch(e.target.value)} />
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Client / Project</th>
                    <th>Amount</th>
                    <th>Collector</th>
                    <th>Method</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: '48px 0' }}><Spinner /></td></tr>
                  : filteredPayments.length === 0 ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-3)' }}>No payments recorded yet.</td></tr>
                  : filteredPayments.map(p => (
                    <tr key={p.id}>
                      <td>{new Date(p.payment_date).toLocaleDateString()}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{p.projects?.client_name || 'N/A'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{p.projects?.product}</div>
                      </td>
                      <td>
                       <div style={{ fontWeight: 700 }}>$ {Number(p.amount_usd || p.amount_paid || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                       {p.currency && p.currency !== 'USD' && <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{p.currency} {Number(p.original_amount || p.amount_paid || 0).toLocaleString()}</div>}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{p.collected_by || p.logged_by || 'N/A'}</div>
                      </td>
                      <td>{p.payment_method || p.paid_through}</td>
                      <td><Pill status="success" label="Paid" /></td>
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
             <Card flush><div style={{ padding: 16 }}><div style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-3)' }}>Total Net (Passed)</div><h4 style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--accent)' }}>{formatUSD(totalNetValue)}</h4></div></Card>
          </div>

          <div className="grid-2">
            <Card title="Monthly Volume (Deals)">
              <MiniBarChart data={monthData} valueKey="count" labelKey="label" color="var(--accent)" />
            </Card>
            <Card title="Monthly Net Value">
              <MiniBarChart data={monthData} valueKey="net" labelKey="label" color="#6366f1" />
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
                    <th style={{ textAlign: 'right' }}>Net (USD)</th>
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
                      <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--accent)' }}>{formatUSD(r.net)}</td>
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
