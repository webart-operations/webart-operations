import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { useAuth, AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { Spinner, LOGO_URL } from './components/ui';

import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';

import DashboardView from './pages/Dashboard';
import SubmissionsView from './pages/Submissions';
import ClientsView from './pages/Clients';
import ClientDetailView from './pages/ClientDetail';
import ProjectsView from './pages/Projects';
import ProjectDetailView from './pages/ProjectDetail';
import RevenueView from './pages/Revenue';
import MeetingsView from './pages/Meetings';
import SalesFormView from './pages/SalesForm';
import AuditQueueView from './pages/AuditQueue';

import CSVImportView from './pages/CSVImport';
import FormConfigView from './pages/FormConfig';
import TeamView from './pages/Team';
import LogPaymentView from './pages/LogPayment';
import ProfileView from './pages/Profile';
import PublicSaleView from './pages/PublicSale';
import ProjectArchiveView from './pages/ProjectArchive';
import ClientOnboardingView from './pages/ClientOnboarding';

// ─── LOGIN VIEW ───────────────────────────────────────────────────────────────
function LoginView() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault(); setLoading(true); setError(null);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) setError(err.message);
    setLoading(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg)', padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <img src={LOGO_URL} alt="WebArt Logo" style={{ height: '40px', margin: '0 auto' }} />
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: '32px', boxShadow: 'var(--shadow-xl)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '4px', background: 'linear-gradient(90deg, var(--accent), var(--blue))' }}></div>
          <div style={{ marginBottom: '32px' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text)', marginBottom: '8px', letterSpacing: '-0.02em' }}>Platform Access</h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-3)', fontWeight: 500 }}>Secured internal operations</p>
          </div>
          {error && <div style={{ padding: '12px', background: 'var(--red)', color: 'white', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', fontWeight: 700, marginBottom: '24px' }}>{error}</div>}
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="field">
              <label className="label">Work Email</label>
              <input type="email" className="input" value={email} onChange={e => setEmail(e.target.value)} required placeholder="name@webart.technology" />
            </div>
            <div className="field">
              <label className="label">Password</label>
              <input type="password" className="input" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <button type="submit" className="btn btn-dark btn-lg btn-full" disabled={loading} style={{ marginTop: '8px' }}>
              {loading ? <Spinner /> : 'Authenticate'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── PENDING VIEW ─────────────────────────────────────────────────────────────
function PendingApprovalView() {
  const { signOut } = useAuth();
  return (
    <div className="empty" style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ width: '64px', height: '64px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', boxShadow: 'var(--shadow-sm)' }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
      </div>
      <h1 style={{ fontSize: '1.25rem', fontWeight: 900, marginBottom: '8px', letterSpacing: '-0.02em' }}>Access Pending</h1>
      <p style={{ color: 'var(--text-3)', fontSize: '0.875rem', maxWidth: '320px', marginBottom: '32px' }}>Your account has been created but requires administrator approval before you can access the platform.</p>
      <button onClick={signOut} className="btn btn-outline btn-lg">Sign Out</button>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
function AppContent() {
  const { session, profile, loading } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Routing State (Hash-based to prevent 404 on refresh)
  const [activeTab, setActiveTab] = useState(() => {
    const hash = window.location.hash.replace(/^#\//, '').toLowerCase() || 'dashboard';
    return hash;
  });

  useEffect(() => {
    const currentHash = window.location.hash.replace(/^#\//, '').toLowerCase() || 'dashboard';
    if (currentHash !== activeTab) {
       window.location.hash = `#/${activeTab === 'dashboard' ? '' : activeTab}`;
    }
    
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#\//, '').toLowerCase() || 'dashboard';
      setActiveTab(hash);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [activeTab]);

  // Global App Settings
  const [appSettings, setAppSettings] = useState({
    products: ['SEO', 'PPC', 'Web Dev', 'SMM', 'Others'],
    sales_reps: [],
    closers: [],
    payment_terms: ['Full Upfront', '50/50', 'Monthly Retainer', 'Milestone'],
    currencies: ['USD', 'INR', 'GBP', 'AUD', 'CAD', 'EUR', 'AED', 'SGD'],
    paid_through: ['Stripe', 'PayPal', 'Wire Transfer', 'Razorpay', 'Other'],
    installments: ['1st', '2nd', '3rd', 'Final', 'One-Time'],
  });

  useEffect(() => {
    if (!session) return;
    const loadSettings = async () => {
      const { data } = await supabase.from('app_settings').select('key, values');
      if (data) {
        const settingsMap = data.reduce((acc, curr) => {
          acc[curr.key] = curr.values;
          return acc;
        }, {});
        setAppSettings(prev => ({ ...prev, ...settingsMap }));
      }
    };
    loadSettings();
    const ch = supabase.channel('settings_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings' }, (payload) => {
        if (payload.new && payload.new.key) {
           setAppSettings(prev => ({ ...prev, [payload.new.key]: payload.new.values }));
        } else {
           loadSettings(); // Fallback to full reload for deletes or complex changes
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [session]);

  // Removed Dark Mode

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg)' }}><Spinner size="lg" /></div>;
  
  if (activeTab === 'sales') return <PublicSaleView />;

  if (!session) return <LoginView />;
  if (profile?.status !== 'active') return <PendingApprovalView />;

  return (
    <div className="app-layout">
      <div className={`sidebar-overlay ${isMobileMenuOpen ? 'active' : ''}`} onClick={() => setIsMobileMenuOpen(false)} />
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={(tab) => { setActiveTab(tab); setIsMobileMenuOpen(false); }} 
        onProfileClick={() => { setActiveTab('profile'); setIsMobileMenuOpen(false); }}
        isMobileOpen={isMobileMenuOpen}
      />
      <main className="app-main">
        <TopBar activeTab={activeTab} setActiveTab={setActiveTab} onMenuClick={() => setIsMobileMenuOpen(true)} />
        <div className="app-content relative">
          {activeTab === 'dashboard' && <DashboardView setActiveTab={setActiveTab} appSettings={appSettings} />}
          {activeTab === 'submissions' && <SubmissionsView setActiveTab={setActiveTab} />}
          {activeTab === 'clients' && <ClientsView setActiveTab={setActiveTab} />}
          {activeTab.startsWith('client-') && <ClientDetailView clientId={activeTab.replace('client-', '')} setActiveTab={setActiveTab} />}
          {activeTab === 'projects' && <ProjectsView setActiveTab={setActiveTab} />}
          {activeTab.startsWith('project-') && <ProjectDetailView projectId={activeTab.replace('project-', '')} setActiveTab={setActiveTab} appSettings={appSettings} />}
          
          {/* We haven't separated these 5 yet but they are relatively isolated forms so we port them into pages next */}
          {activeTab === 'revenue' && <RevenueView setActiveTab={setActiveTab} appSettings={appSettings} />}
          {activeTab === 'log-payment' && <LogPaymentView setActiveTab={setActiveTab} appSettings={appSettings} />}
          {activeTab === 'archive' && <ProjectArchiveView />}
          {activeTab === 'onboarding' && <ClientOnboardingView appSettings={appSettings} />}
          {activeTab === 'meetings' && <MeetingsView />}
          
          {activeTab === 'sales-form' && <SalesFormView appSettings={appSettings} setActiveTab={setActiveTab} />}
          {activeTab === 'audit-queue' && <AuditQueueView appSettings={appSettings} setActiveTab={setActiveTab} />}
          
          {activeTab === 'csv-import' && <CSVImportView appSettings={appSettings} />}
          {activeTab === 'config' && <FormConfigView appSettings={appSettings} />}
          {activeTab === 'team' && <TeamView />}
          {activeTab === 'profile' && <ProfileView />}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <AppContent />
      </NotificationProvider>
    </AuthProvider>
  );
}
