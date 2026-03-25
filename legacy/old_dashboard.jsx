import React, { useState, useEffect, useMemo } from 'react';
import { Layers, DollarSign, Activity, AlertCircle, TrendingUp, CheckCircle2, X, Filter } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { formatUSD } from '../lib/currency';
import { Card, Pill, MiniBarChart } from '../components/ui';

export default function DashboardView({ setActiveTab }) {
  const { profile, ability, role } = useAuth();
  
  const [dateFilter, setDateFilter] = useState('all'); // all, 30days, month, ytd, custom
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  
  const [stats, setStats] = useState({ 
    projects: 0, collected: 0, queue: 0, atRisk: 0, 
    totalSalesCount: 0, totalGross: 0, totalNet: 0,
    passedSales: 0, failedSales: 0 
  });
  
  const [criticalProjects, setCriticalProjects] = useState([]);
  const [performanceGrid, setPerformanceGrid] = useState([]);
  const [loading, setLoading] = useState(true);

  // Date Filtering Logic
  const getDateRange = () => {
    const now = new Date();
    if (dateFilter === 'custom') return { start: customStart || null, end: customEnd || null };
    if (dateFilter === '30days') return { start: new Date(now.setDate(now.getDate() - 30)).toISOString(), end: null };
    if (dateFilter === 'month') return { start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(), end: null };
    if (dateFilter === 'ytd') return { start: new Date(now.getFullYear(), 0, 1).toISOString(), end: null };
    return { start: null, end: null };
  };

  const calculateStats = (allSubs, allProjs, rev, queueCount) => {
    const collected = (rev || []).reduce((s, r) => s + Number(r.amount_usd), 0);
    const passedSubs = allSubs.filter(s => s.status === 'passed');
    const totalGross = passedSubs.reduce((sum, s) => sum + Number(s.gross || 0), 0);
    const totalNet = passedSubs.reduce((sum, s) => sum + Number(s.net || 0), 0);
    const activeProjsData = (allProjs || []).filter(p => ['active', 'at_risk', 'on_hold'].includes(p.status));
    
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
      totalSalesCount: allSubs.length,
      passedSales: passedSubs.length,
      failedSales: allSubs.filter(s => s.status === 'failed').length,
      totalGross,
      totalNet,
      criticalList: critical.slice(0, 5)
    };
  };

  const loadData = async () => {
    if (!profile) return;
    const { start: minDate, end: maxDate } = getDateRange();

    // 1. PROJECTS
    let projQuery = supabase.from('projects').select('id, status, client_name, last_communication_date, created_at, assigned_am, assigned_pm');
    if (role === 'am') projQuery = projQuery.eq('assigned_am', profile.full_name);
    else if (role === 'pm') projQuery = projQuery.eq('assigned_pm', profile.full_name);

    // 2. REVENUE
    let revQuery = supabase.from('revenue_ledger').select('amount_usd');
    if (minDate) revQuery = revQuery.gte('payment_date', minDate);
    if (maxDate) revQuery = revQuery.lte('payment_date', maxDate);
    if (role === 'sales') revQuery = revQuery.eq('logged_by_id', profile.id);

    // 3. SUBMISSIONS
    let subsQuery = supabase.from('submissions').select('id, gross, net, currency, status, rep, sale_date, project_id, projects(assigned_am, assigned_pm)').order('sale_date');
    if (minDate) subsQuery = subsQuery.gte('sale_date', minDate);
    if (maxDate) subsQuery = subsQuery.lte('sale_date', maxDate);

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

    // 4. PERFORMANCE GRID
    if (role !== 'sales') {
      const perfMap = {};
      filteredSubs.forEach(s => {
        if (s.status !== 'passed') return;
        [s.rep, s.projects?.assigned_am, s.projects?.assigned_pm].forEach((name, idx) => {
          if (!name) return;
          const r = idx === 0 ? 'Sales' : idx === 1 ? 'AM' : 'PM';
          if (!perfMap[name]) perfMap[name] = { name, role: r, gross: 0, net: 0, count: 0 };
          perfMap[name].gross += Number(s.gross || 0);
          perfMap[name].net += Number(s.net || 0);
          perfMap[name].count++;
        });
      });

      let gridArray = Object.values(perfMap);
      if (role === 'am') {
        const team = new Set([profile.full_name]);
        filteredSubs.filter(s => s.status === 'passed' && s.projects?.assigned_am === profile.full_name).forEach(s => {
          if (s.projects?.assigned_pm) team.add(s.projects.assigned_pm);
        });
        gridArray = gridArray.filter(g => team.has(g.name));
      } else if (role === 'pm') {
        gridArray = gridArray.filter(g => g.name === profile.full_name);
      }
      setPerformanceGrid(gridArray.sort((a,b) => b.net - a.net));
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
  }, [profile, ability, role, dateFilter, customStart, customEnd]);

  const topCards = [
    ...(role !== 'sales' ? [{ label: role === 'ceo' || role === 'qa' ? 'Active Projects' : 'My Active Projects', value: stats.projects, icon: Layers, color: '' }] : []),
    { label: 'Total Global Sales', value: stats.totalSalesCount, icon: TrendingUp, color: 'text-blue-600' },
    { label: 'Passed Audits', value: stats.passedSales, icon: CheckCircle2, color: 'text-green-600' },
    { label: 'Total Net Sales', value: `$${stats.totalNet.toLocaleString()}`, icon: DollarSign, color: 'text-accent' },
    { label: 'Collected Revenue (Net)', value: formatUSD(stats.collected), icon: DollarSign, color: 'text-emerald-600' },
    ...(ability('view_qa_queue') ? [{ label: 'Audit Queue', value: stats.queue, icon: Activity, color: stats.queue > 0 ? 'text-amber-600' : '' }] : []),
    ...(role !== 'sales' ? [{ label: 'At Risk Projects', value: stats.atRisk, icon: AlertCircle, color: stats.atRisk > 0 ? 'text-red-600' : '' }] : []),
  ];

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
                 color: dateFilter === f ? '#fff' : 'var(--text-3)'
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

      <div className="grid-stat">
        {topCards.map((c, i) => {
          const Icon = c.icon;
          return (
            <Card key={i} className="stat-card" flush>
              <div style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p className="stat-label" style={{ marginBottom: 8, fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{c.label}</p>
                  <h4 className={c.color} style={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1 }}>{loading ? '...' : c.value}</h4>
                </div>
                <div style={{ width: 48, height: 48, borderRadius: '12px', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--text)' }}>
                  <Icon size={24} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {role !== 'sales' && (
        <div className="grid-2">
          
          <Card title={role === 'ceo' || role === 'qa' ? "Global Staff Performance" : "My Team Performance"} flush>
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Staff Name</th>
                    <th>Role</th>
                    <th style={{ textAlign: 'right' }}>Deals Closed</th>
                    <th style={{ textAlign: 'right' }}>Net Generated</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? <tr><td colSpan={4} style={{ textAlign: 'center', padding: '24px' }}>Loading...</td></tr> : 
                   performanceGrid.length === 0 ? <tr><td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-3)' }}>No performance data in this timeframe</td></tr> :
                   performanceGrid.map((row, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 700, fontSize: '0.875rem' }}>{row.name}</td>
                      <td><Pill status="pending" label={row.role} noDot /></td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{row.count}</td>
                      <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--green)' }}>${row.net.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card title="At Risk Projects" extra={<Pill status={criticalProjects.length > 0 ? 'critical' : 'healthy'} label={`${criticalProjects.length} flagged`} />}>
            {loading ? <p className="text-muted" style={{ textAlign: 'center' }}>Loading...</p> : 
             criticalProjects.length === 0 ? <p className="text-muted" style={{ textAlign: 'center', padding: '16px 0', fontSize: '0.875rem' }}>All projects healthy ✓</p>
             : <div className="space-y-4">
                  {criticalProjects.map((p, i) => (
                    <div key={i} onClick={() => setActiveTab(`project-${p.id}`)} style={{ padding: '16px', borderRadius: 'var(--radius-sm)', border: `1px solid var(--red)`, background: '#fef2f2', cursor: 'pointer', transition: 'background 0.2s' }} onMouseEnter={e=>e.currentTarget.style.background='#fee2e2'} onMouseLeave={e=>e.currentTarget.style.background='#fef2f2'}>
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
      )}
    </div>
  );
}
