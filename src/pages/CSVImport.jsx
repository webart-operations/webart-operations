import React, { useState, useEffect } from 'react';
import { Upload, CheckCircle2, ShieldAlert, FileText, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Button, Card, Spinner } from '../components/ui';

export default function CSVImportView({ appSettings }) {
  const [file, setFile] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [staff, setStaff] = useState([]);

  useEffect(() => {
    supabase.from('profiles').select('full_name, role, team').eq('status', 'active')
      .then(({ data }) => setStaff(data || []));
  }, []);

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (f && f.type === 'text/csv') {
      setFile(f);
      setError(null);
    } else {
      setError("Please select a valid CSV file.");
      setFile(null);
    }
  };

  const parseCSV = (text) => {
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length < 2) throw new Error("CSV file is empty or missing headers.");

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const data = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim());
      const obj = {};
      headers.forEach((h, i) => {
        obj[h] = values[i];
      });
      return obj;
    });
    return data;
  };

  const processImport = async () => {
    if (!file) return;
    setParsing(true);
    setResults(null);
    setError(null);

    try {
      const text = await file.text();
      const rows = parseCSV(text);
      
      let createdClients = 0;
      let existingClients = 0;
      let createdProjects = 0;

      for (const row of rows) {
        if (!row.client_name || !row.email) continue;

        // 1. Client Lookup (Uniqueness)
        const { data: existingC } = await supabase.from('clients')
          .select('id')
          .or(`email.eq.${row.email},phone.eq.${row.phone}`)
          .maybeSingle();

        let mClientId = null;
        if (existingC) {
          mClientId = existingC.id;
          existingClients++;
        } else {
          // Find team from assigned AM/PM
          const assignedStaff = staff.find(s => s.full_name === row.assigned_am || s.full_name === row.assigned_pm);
          const team = assignedStaff?.team || 'N/A';

          const { data: newC, error: cErr } = await supabase.from('clients').insert({
            client_name: row.client_name,
            business_name: row.business_name || row.client_name,
            email: row.email,
            phone: row.phone || '',
            address: row.address || '',
            country: row.country || '',
            website: row.website || '',
            source: 'csv_import',
            team
          }).select().single();

          if (cErr) throw cErr;
          mClientId = newC.id;
          createdClients++;
        }

        // 2. Project Creation
        const assignedStaff = staff.find(s => s.full_name === row.assigned_am || s.full_name === row.assigned_pm);
        const team = assignedStaff?.team || 'N/A';

        const { error: pErr } = await supabase.from('projects').insert({
          client_id: mClientId,
          client_name: row.client_name,
          product: row.product || 'Legacy Project',
          gross: Number(row.gross || 0),
          net: Number(row.net || 0),
          currency: row.currency || 'USD',
          assigned_am: row.assigned_am || '',
          assigned_pm: row.assigned_pm || '',
          closer: row.closer || '',
          status: (row.status || 'active').toLowerCase(),
          team,
          sale_date: row.sale_date || new Date().toISOString().split('T')[0]
        });

        if (pErr) console.error("Project Insert Error:", pErr);
        else createdProjects++;
      }

      setResults({ createdClients, existingClients, createdProjects });
    } catch (err) {
      console.error(err);
      setError(err.message || "An error occurred during import.");
    } finally {
      setParsing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="page-header">
        <div>
          <h1 className="page-title">Historical Data Importer</h1>
          <p className="page-subtitle">Upload CSV to bulk-ingest legacy clients and projects.</p>
        </div>
      </div>

      <Card>
        <div style={{ padding: '24px 0' }}>
          <div className="empty" style={{ border: '2px dashed var(--border)', background: 'var(--surface)', padding: 48, borderRadius: 'var(--radius-lg)' }}>
            <Upload size={48} className="text-muted" style={{ marginBottom: 16 }} />
            <h3 style={{ fontWeight: 800, marginBottom: 8 }}>{file ? file.name : 'Select CSV File'}</h3>
            <p className="empty-subtitle" style={{ marginBottom: 24 }}> Ensure your headers match: client_name, email, phone, business_name, product, gross, net, currency, assigned_am, assigned_pm, closer, status, sale_date </p>
            
            <input type="file" accept=".csv" onChange={handleFileChange} id="csv-upload" style={{ display: 'none' }} />
            <div style={{ display: 'flex', gap: 12 }}>
               <Button variant="outline" onClick={() => document.getElementById('csv-upload').click()}>
                 {file ? 'Change File' : 'Browse Files'}
               </Button>
               {file && (
                 <Button variant="primary" loading={parsing} onClick={processImport}>
                   Start Import
                 </Button>
               )}
            </div>
          </div>
        </div>

        {error && (
          <div style={{ marginTop: 24, padding: 16, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#991b1b', display: 'flex', alignItems: 'start', gap: 12 }}>
            <AlertCircle size={20} style={{ flexShrink: 0 }} />
            <div style={{ fontSize: '0.875rem' }}>{error}</div>
          </div>
        )}

        {results && (
          <div style={{ marginTop: 24, padding: 24, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, color: '#166534' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <CheckCircle2 size={24} />
              <strong style={{ fontSize: '1.125rem' }}>Import Completed Successfully!</strong>
            </div>
            <div className="grid-3" style={{ gap: 16 }}>
              <div style={{ background: '#fff', padding: 16, borderRadius: 8, border: '1px solid #bbf7d0' }}>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#166534', opacity: 0.7, fontWeight: 700 }}>New Clients</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 900 }}>{results.createdClients}</div>
              </div>
              <div style={{ background: '#fff', padding: 16, borderRadius: 8, border: '1px solid #bbf7d0' }}>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#166534', opacity: 0.7, fontWeight: 700 }}>Existing Matched</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 900 }}>{results.existingClients}</div>
              </div>
              <div style={{ background: '#fff', padding: 16, borderRadius: 8, border: '1px solid #bbf7d0' }}>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#166534', opacity: 0.7, fontWeight: 700 }}>Projects Imported</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 900 }}>{results.createdProjects}</div>
              </div>
            </div>
          </div>
        )}
      </Card>

      <Card title="Help & Formatting">
        <div className="space-y-4" style={{ fontSize: '0.875rem', color: 'var(--text-2)' }}>
          <p>The importer will automatically match existing clients using their <strong>Email</strong> or <strong>Phone</strong> to prevent duplicates. Historical projects will be linked to the appropriate Account Managers and Project Managers based on their Full Name.</p>
          <div style={{ background: 'var(--surface-2)', padding: 16, borderRadius: 8, border: '1px solid var(--border)' }}>
            <div style={{ fontWeight: 800, marginBottom: 8, color: 'var(--text)' }}>Standard Status Labels:</div>
            <code style={{ fontSize: '0.75rem' }}>active, on_hold, delivered, dead, closed</code>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>Tip: Save your Excel/Google Sheet as ".CSV (Comma Separated)" before uploading. Ensure dates are in YYYY-MM-DD format.</p>
        </div>
      </Card>
    </div>
  );
}
