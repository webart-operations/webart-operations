import React, { useState, useEffect } from 'react';
import { Layers, DollarSign, Activity, AlertCircle, TrendingUp, CheckCircle2, Filter, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { formatUSD } from '../lib/currency';
import { Card, Pill, Select, MiniBarChart } from '../components/ui';
export default function DashboardView({ setActiveTab, appSettings }) {
  const { profile, ability, role } = useAuth();
  const [dateFilter, setDateFilter] = useState('all'); // all, 30days, month, ytd, custom
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  
  // Phase 17 Role Filter state
  const [roleFilter, setRoleFilter] = useState({ sales: 'all', closer: 'all', am: 'all', pm: 'all' });
  const [staffList, setStaffList] = useState({ ams: [], pms: [] });
  const [stats, setStats] = useState({ 
    projects: 0, collected: 0, queue: 0, atRisk: 0, 
    onHold: 0, delivered: 0,
    totalSalesCount: 0, totalGross: 0, totalNet: 0,
    passedSales: 0, failedSales: 0 
  });
  
  const [criticalProjects, setCriticalProjects] = useState([]);
  
  // Performance Grids and Charts
  const [salesPerf, setSalesPerf] = useState([]);
  const [closerPerf, setCloserPerf] = useState([]);
  const [amPmPerf, setAmPmPerf] = useState([]);
  const [monthData, setMonthData] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const getDateRange = () => {
    const now = new Date();
    if (dateFilter === 'custom') return { start: customStart || null, end: customEnd || null };
    if (dateFilter === '30days') return { start: new Date(now.setDate(now.getDate() - 30)).toISOString(), end: null };
    if (dateFilter === 'month') return { start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(), end: null };
    if (dateFilter === 'ytd') return { start: new Date(now.getFullYear(), 0, 1).toISOString(), end: null };
    return { start: null, end: null };
  };
  const calculateStats = (allSubs, allProjs, rev, queueCount) => {
    // 1. Revenue
    const collected = (rev || []).reduce((s, r) => s + Number(r.amount_usd || 0), 0);
    // Sales Revenue is strictly Sales Form submissions (excluding onboarding and am/pm reactivations)
    const passedSubs = allSubs.filter(s => s.status === 'passed' && !s.is_onboarding && !s.is_reactivation); 
    const totalNet = passedSubs.reduce((sum, s) => sum + Number(s.usd_net || s.net || 0), 0);
    const totalGross = passedSubs.reduce((sum, s) => sum + Number(s.usd_gross || s.gross || 0), 0);
    
    // "Total Revenue" = Total Net Sales + Collected AM/PM Revenue
    const totalRevenue = totalNet + collected;
    // 2. Projects
    const activeProjsData = (allProjs || []).filter(p => ['active', 'at_risk'].includes(p.status));
    const onHoldProjs = (allProjs || []).filter(p => p.status === 'on_hold');
    const deliveredProjs = (allProjs || []).filter(p => p.status === 'delivered');
    
    const now = Date.now();
    const riskAssessed = activeProjsData.map(p => {
       const days = Math.floor((now - new Date(p.last_communication_date || p.created_at).getTime()) / (1000*3600*24));
       return { ...p, inactiveDays: days };
    });
    const critical = riskAssessed.filter(p => p.inactiveDays > 15 || p.status === 'at_risk').sort((a,b) => b.inactiveDays - a.inactiveDays);
    return {
      projects: activeProjsData.length,
      collected,
      queue: queueCount || 0,
      atRisk: critical.length,
      onHold: onHoldProjs.length,
      delivered: deliveredProjs.length,
      totalSalesCount: passedSubs.length, // Passed audits represent the "Total Global Sales" count
      totalRevenue,
      totalNet,
      passedSales: passedSubs.length,
      failedSales: allSubs.filter(s => s.status === 'failed').length,
      criticalList: critical.slice(0, 5)
    };
  };
  const loadData = async () => {
    if (!profile) return;
    const { start: minDate, end: maxDate } = getDateRange();
    
    // Fetch Staff for AM/PM filters
    const { data: profiles } = await supabase.from('profiles').select('full_name, role');
    if (profiles) {
       setStaffList({
         ams: profiles.filter(p => ['am', 'manager', 'ceo'].includes(p.role)).map(p => p.full_name),
         pms: profiles.filter(p => ['pm', 'manager', 'ceo'].includes(p.role)).map(p => p.full_name)
       });
    }
    // 1. PROJECTS
    let projQuery = supabase.from('projects').select('id, status, client_name, last_communication_date, created_at, team, assigned_am, assigned_pm, closer');
    if (role === 'manager') projQuery = projQuery.eq('team', profile.team);
    else if (role === 'am') projQuery = projQuery.eq('assigned_am', profile.full_name);
    else if (role === 'pm') projQuery = projQuery.eq('assigned_pm', profile.full_name);
    if (roleFilter.am !== 'all') projQuery = projQuery.eq('assigned_am', roleFilter.am);
    if (roleFilter.pm !== 'all') projQuery = projQuery.eq('assigned_pm', roleFilter.pm);
    if (roleFilter.closer !== 'all') projQuery = projQuery.eq('closer', roleFilter.closer);
    // 2. REVENUE
    let revQuery = supabase.from('revenue_ledger').select('*');
    if (minDate) revQuery = revQuery.gte('payment_date', minDate);
    if (maxDate) revQuery = revQuery.lte('payment_date', maxDate);
    if (role === 'sales') revQuery = revQuery.eq('logged_by_id', profile.id);
    // 3. SUBMISSIONS
    let subsQuery = supabase.from('submissions').select('*').order('sale_date');
    if (minDate) subsQuery = subsQuery.gte('sale_date', minDate);
    if (maxDate) subsQuery = subsQuery.lte('sale_date', maxDate);
    if (role === 'manager') subsQuery = subsQuery.eq('team', profile.team);
    if (roleFilter.sales !== 'all') subsQuery = subsQuery.eq('rep', roleFilter.sales);
    if (roleFilter.closer !== 'all') subsQuery = subsQuery.eq('closer', roleFilter.closer);
    if (roleFilter.am !== 'all') subsQuery = subsQuery.eq('assigned_am', roleFilter.am);
    if (roleFilter.pm !== 'all') subsQuery = subsQuery.eq('assigned_pm', roleFilter.pm);
    const [
      { data: projs },
      { data: rev },
      { data: subs },
      { count: qCount }
    ] = await Promise.all([
      role === 'sales' ? Promise.resolve({ data: [] }) : projQuery,
      revQuery,
      subsQuery,
      ability('view_qa_queue') ? supabase.from('submissions').select('id', { count: 'exact', head: true }).eq('status', 'pending') : Promise.resolve({ count: 0 })
    ]);
    const filteredSubs = (role === 'sales' && !ability('view_all_sales')) 
      ? (subs || []).filter(s => s.rep === profile.full_name) 
      : (subs || []);
    const res = calculateStats(filteredSubs, projs, rev, qCount);
    setStats(res);
    setCriticalProjects(res.criticalList);
    // 4. PERFORMANCE GRIDS & CHARTS
    if (role !== 'sales') {
      const salesMap = {};
      const closerMap = {};
      const amPmMap = {};
      const monthMap = {};
      // Sales & Closer Maps
      filteredSubs.forEach(s => {
         // Monthly Net Chart (only passed audits)
         if (s.status === 'passed' && s.sale_date) {
            const month = s.sale_date.slice(0, 7);
            if (!monthMap[month]) monthMap[month] = { month, count: 0, net: 0 };
            monthMap[month].count++;
            monthMap[month].net += Number(s.usd_net || s.net || 0);
         }
          if (s.status !== 'passed') return;
          
          // CRITICAL: Onboarding and Reactivations belong to AM/PM (Collections), not Sales Performance
          if (s.is_onboarding || s.is_reactivation) return;
          const netVal = Number(s.usd_net || s.net || 0);
          const effRep = s.rep;
          
          if (effRep) {
            if (!salesMap[effRep]) salesMap[effRep] = { name: effRep, count: 0, net: 0 };
            salesMap[effRep].count++;
            salesMap[effRep].net += netVal;
         }
         
         if (s.closer) {
            if (!closerMap[s.closer]) closerMap[s.closer] = { name: s.closer, count: 0, net: 0 };
            closerMap[s.closer].count++;
            closerMap[s.closer].net += netVal;
         }
      });
      // AM/PM Map (Collected Revenue)
      (rev || []).forEach(r => {
         const val = Number(r.amount_usd || 0);
         // Prioritize collected_by (AM/PM). If missing for onboarding, show as Unknown.
         const logger = r.collected_by || (r.payment_type === 'Onboarding' ? 'Unknown' : (r.logged_by || 'Unknown'));
         if (!amPmMap[logger]) amPmMap[logger] = { name: logger, count: 0, collected: 0 };
         amPmMap[logger].count++; // number of payment logs
         amPmMap[logger].collected += val;
      });
      const processedMonthData = Object.values(monthMap)
        .sort((a, b) => a.month.localeCompare(b.month))
        .slice(-12)
        .map(m => ({
          ...m,
          label: new Date(m.month + '-01').toLocaleDateString('en', { month: 'short', year: '2-digit' })
        }));
      setMonthData(processedMonthData);
      setSalesPerf(Object.values(salesMap).sort((a,b) => b.net - a.net));
      setCloserPerf(Object.values(closerMap).sort((a,b) => b.net - a.net));
      setAmPmPerf(Object.values(amPmMap).sort((a,b) => b.collected - a.collected));
    }
    setLoading(false);
  };
  useEffect(() => {
    loadData();
    const ch = supabase.channel('dashboard_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'submissions' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'revenue_ledger' }, loadData)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [profile, ability, role, dateFilter, customStart, customEnd, roleFilter]);
  const topCards = [
    ...(role !== 'sales' ? [
      { label: role === 'ceo' || role === 'qa' ? 'Active Projects' : 'My Active Projects', value: stats.projects, icon: Layers, color: 'text-blue-600' },
      { label: 'On Hold', value: stats.onHold, icon: AlertCircle, color: 'text-amber-500' },
      { label: 'Delivered', value: stats.delivered, icon: CheckCircle2, color: 'text-purple-600' }
    ] : []),
    
    // Revenue logic: AM/PM see only collections; Sales see only their net sales; Execs see everything.
    ...(role !== 'sales' ? [
      { label: (role === 'am' || role === 'pm') ? 'My Collected Revenue' : 'Total Collected Revenue', value: formatUSD(stats.collected), icon: DollarSign, color: 'text-green-600' },
    ] : []),
    
    ...(ability('view_sales_data') || role === 'sales' ? [
      { label: (role === 'sales') ? 'My Total Net Sales' : 'Total Net Sales', value: formatUSD(stats.totalNet), icon: DollarSign, color: 'text-accent' },
      { label: (role === 'sales') ? 'My Passed Audits' : 'Passed Audits', value: stats.passedSales, icon: CheckCircle2, color: 'text-green-600' }
    ] : []),
    
    ...(role === 'ceo' || role === 'qa' || role === 'manager' ? [
      { label: 'Total Collection', value: formatUSD(stats.totalRevenue), icon: DollarSign, color: 'text-emerald-600' },
    ] : []),
    ...(ability('view_qa_queue') ? [{ label: 'Audit Queue', value: stats.queue, icon: Activity, color: stats.queue > 0 ? 'text-amber-600' : '' }] : []),
  ];
  const updateRoleFilter = (key, val) => setRoleFilter(prev => ({ ...prev, [key]: val }));
  return (
    <div className="space-y-6 pb-12">
      <div className="page-header" style={{ marginBottom: 16 }}>
        <div>
          <h1 className="page-title">Executive Dashboard</h1>
          <p className="page-subtitle">Welcome back, {profile?.full_name}</p>
        </div>
        
        {/* Date Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface)', padding: 6, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <Filter size={16} style={{ color: 'var(--text-3)', marginLeft: 8 }} />
          {['all', '30days', 'month', 'ytd', 'custom'].map(f => (
            <button 
              key={f}
              onClick={() => setDateFilter(f)}
              style={{
                 padding: '6px 14px', fontSize: '0.75rem', fontWeight: 700, borderRadius: 6, transition: 'all 0.2s', textTransform: 'uppercase',
                 background: dateFilter === f ? 'var(--accent)' : 'transparent',
                 color: dateFilter === f ? '#fff' : 'var(--text-3)',
                 border: 'none', cursor: 'pointer'
              }}
            >
              {f === 'all' ? 'All Time' : f === '30days' ? 'Last 30 Days' : f === 'month' ? 'This Month' : f === 'custom' ? 'Custom Filter' : 'YTD'}
            </button>
          ))}
          {dateFilter === 'custom' && (
             <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 8, borderLeft: '1px solid var(--border)' }}>
                 <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} style={{ padding: '4px 8px', fontSize: '0.75rem', borderRadius: 4, border: '1px solid var(--border)' }} />
                 <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>to</span>
                 <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} style={{ padding: '4px 8px', fontSize: '0.75rem', borderRadius: 4, border: '1px solid var(--border)' }} />
             </div>
          )}
        </div>
      </div>
      {/* Role Analytics Filters */}
      {role !== 'sales' && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', padding: '16px', background: '#fff', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 8, marginRight: 8 }}><Filter size={16} /> Filter By:</div>
          <Select size="sm" style={{ width: 160 }} value={roleFilter.sales} onChange={e => updateRoleFilter('sales', e.target.value)}>
            <option value="all">Sale Rep: All</option>
            {appSettings?.sales_reps?.map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
          <Select size="sm" style={{ width: 160 }} value={roleFilter.closer} onChange={e => updateRoleFilter('closer', e.target.value)}>
            <option value="all">Closer: All</option>
            {appSettings?.closers?.map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
          <Select size="sm" style={{ width: 160 }} value={roleFilter.am} onChange={e => updateRoleFilter('am', e.target.value)}>
            <option value="all">AM: All</option>
            {staffList.ams.map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
          <Select size="sm" style={{ width: 160 }} value={roleFilter.pm} onChange={e => updateRoleFilter('pm', e.target.value)}>
            <option value="all">PM: All</option>
            {staffList.pms.map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
        </div>
      )}
      <div className="grid-stat">
        {topCards.map((c, i) => {
          const Icon = c.icon;
          return (
            <Card key={i} className="stat-card" flush>
              <div style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p className="stat-label" style={{ marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.75rem' }}>{c.label}</p>
                  <h4 className={c.color} style={{ fontSize: '1.875rem', fontWeight: 800, lineHeight: 1.1 }}>{loading ? '...' : c.value}</h4>
                </div>
                <div style={{ width: 44, height: 44, borderRadius: '12px', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--accent)' }}>
                  <Icon size={22} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      {/* Role-based performance grids */}
      {(role === 'ceo' || role === 'qa' || role === 'manager') && (
        <>
          <div className="grid-2" style={{ marginBottom: 24 }}>
            <Card title="Monthly Sales Velocity">
               <MiniBarChart data={monthData} valueKey="net" labelKey="label" color="var(--accent)" />
            </Card>
            
            <Card title="At Risk Projects" extra={<Pill status={criticalProjects.length > 0 ? 'critical' : 'healthy'} label={`${criticalProjects.length} flagged`} />}>
              {loading ? <p className="text-muted" style={{ textAlign: 'center' }}>Loading...</p> : 
               criticalProjects.length === 0 ? <p className="text-muted" style={{ textAlign: 'center', padding: '16px 0', fontSize: '0.875rem' }}>All projects healthy ✓</p>
               : <div className="space-y-4">
                    {criticalProjects.map((p, i) => (
                      <div key={i} onClick={() => setActiveTab(`project-${p.id}`)} style={{ padding: '16px', borderRadius: 'var(--radius-sm)', border: `1px solid var(--red)`, background: '#fef2f2', cursor: 'pointer', transition: 'background 0.2s' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                           <div style={{ fontWeight: 800, fontSize: '0.875rem', color: 'var(--red)' }}>{p.client_name}</div>
                           <div style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 700 }}>AT RISK</div>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#991b1b', marginTop: 4 }}>Last Comms: {p.last_communication_date ? new Date(p.last_communication_date).toLocaleDateString() : 'Never'}</div>
                      </div>
                    ))}
                  </div>
              }
            </Card>
          </div>
          <div className="grid-2" style={{ marginBottom: 24 }}>
            <Card title="🏆 Top 3 Sales Reps" flush>
              <div style={{ overflowX: 'auto' }}>
                <table className="table">
                  <thead><tr><th>Rep Name</th><th>Deals</th><th style={{ textAlign: 'right' }}>Net Generataed</th></tr></thead>
                  <tbody>
                    {salesPerf.slice(0, 3).map((r, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 700 }}>{r.name}</td>
                        <td>{r.count}</td>
                        <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--green)' }}>{formatUSD(r.net)}</td>
                      </tr>
                    ))}
                    {salesPerf.length === 0 && <tr><td colSpan={3} style={{ textAlign: 'center', padding: '16px' }}>No data</td></tr>}
                  </tbody>
                </table>
              </div>
            </Card>
            <Card title="⚠️ Needs Improvement (Bottom 3 Reps)" flush>
              <div style={{ overflowX: 'auto' }}>
                <table className="table">
                  <thead><tr><th>Rep Name</th><th>Deals</th><th style={{ textAlign: 'right' }}>Net Generated</th></tr></thead>
                  <tbody>
                    {salesPerf.slice(-3).reverse().map((r, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 700 }}>{r.name}</td>
                        <td>{r.count}</td>
                        <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--red)' }}>{formatUSD(r.net)}</td>
                      </tr>
                    ))}
                    {salesPerf.length === 0 && <tr><td colSpan={3} style={{ textAlign: 'center', padding: '16px' }}>No data</td></tr>}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
          <div className="grid-2">
            <Card title="🤝 Closer Performance" flush>
              <div style={{ overflowX: 'auto' }}>
                <table className="table">
                  <thead><tr><th>Closer Name</th><th>Number of Sales</th><th style={{ textAlign: 'right' }}>Total Sales Value (Net)</th></tr></thead>
                  <tbody>
                    {closerPerf.map((r, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 700 }}>{r.name} <Pill status="passed" label="Closer" noDot /></td>
                        <td>{r.count} sales</td>
                        <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--accent)' }}>{formatUSD(r.net)}</td>
                      </tr>
                    ))}
                    {closerPerf.length === 0 && <tr><td colSpan={3} style={{ textAlign: 'center', padding: '16px' }}>No closed deals</td></tr>}
                  </tbody>
                </table>
              </div>
            </Card>
            <Card title="💼 AM / PM Performance (Collections)" flush>
              <div style={{ overflowX: 'auto' }}>
                <table className="table">
                  <thead><tr><th>Collector Name</th><th>Logs Recorded</th><th style={{ textAlign: 'right' }}>Total Net Collection</th></tr></thead>
                  <tbody>
                    {amPmPerf.map((r, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 700 }}>{r.name}</td>
                        <td>{r.count} payment logs</td>
                        <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--blue)' }}>{formatUSD(r.collected)}</td>
                      </tr>
                    ))}
                    {amPmPerf.length === 0 && <tr><td colSpan={3} style={{ textAlign: 'center', padding: '16px' }}>No collections recorded</td></tr>}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
