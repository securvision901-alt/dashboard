import { useState, useCallback, useRef } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, Download, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Form';
import { PageHeader } from '@/components/layout/PageHeader';
import { toast } from '@/components/ui/Toast';
import { supabase } from '@/lib/supabase';
import type { CrmContact } from '@/types/database';

// CSV parser — handles quoted fields, commas inside quotes, newlines inside quotes
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += char; i++; continue;
    }
    if (char === '"') { inQuotes = true; i++; continue; }
    if (char === ',') { row.push(field); field = ''; i++; continue; }
    if (char === '\r') { i++; continue; }
    if (char === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
    field += char; i++;
  }
  if (field || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

const FIELD_OPTIONS = [
  { value: '', label: '— Skip —' },
  { value: 'name', label: 'Name' },
  { value: 'contact_type', label: 'Contact Type' },
  { value: 'company', label: 'Company' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'city', label: 'City' },
  { value: 'state', label: 'State' },
  { value: 'country', label: 'Country' },
  { value: 'stage', label: 'Stage' },
  { value: 'role_title', label: 'Role/Title' },
  { value: 'rate_notes', label: 'Rate Notes' },
  { value: 'value_estimate_cents', label: 'Est. Value (cents)' },
  { value: 'owner', label: 'Owner' },
  { value: 'notes', label: 'Notes' },
  { value: 'source', label: 'Source' },
];

const CONTACT_TYPES = ['venue', 'bar_club', 'promoter', 'stylist', 'photographer', 'publicist', 'agent', 'vendor', 'press', 'team', 'other'];

function guessColumn(header: string): string {
  const h = header.toLowerCase().trim();
  if (h.match(/^(name|full name|contact name|first name)/)) return 'name';
  if (h.match(/^(type|contact.?type|category)/)) return 'contact_type';
  if (h.match(/^(company|organization|org|venue|club)/)) return 'company';
  if (h.match(/^(email|e-mail|mail)/)) return 'email';
  if (h.match(/^(phone|tel|telephone|mobile|cell)/)) return 'phone';
  if (h.match(/^(city)/)) return 'city';
  if (h.match(/^(state|region|province)/)) return 'state';
  if (h.match(/^(country)/)) return 'country';
  if (h.match(/^(stage|status)/)) return 'stage';
  if (h.match(/^(role|title|position|job)/)) return 'role_title';
  if (h.match(/^(rate|fee|pay)/)) return 'rate_notes';
  if (h.match(/^(value|estimat|worth|deal)/)) return 'value_estimate_cents';
  if (h.match(/^(owner|assigned|rep)/)) return 'owner';
  if (h.match(/^(notes|comment|description)/)) return 'notes';
  if (h.match(/^(source|origin|referral)/)) return 'source';
  return '';
}

type ParsedRow = { data: Record<string, string>; valid: boolean; errors: string[] };

export default function CsvImportPage() {
  const [step, setStep] = useState<'upload' | 'map' | 'preview' | 'done'>('upload');
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<number, string>>({});
  const [defaultType, setDefaultType] = useState('venue');
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState({ success: 0, failed: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCSV(text);
      if (parsed.length < 2) { toast('error', 'CSV needs at least a header row and one data row'); return; }
      const hdrs = parsed[0];
      setHeaders(hdrs);
      setRows(parsed.slice(1));
      setFileName(file.name);
      // Auto-guess mapping
      const guess: Record<number, string> = {};
      hdrs.forEach((h, i) => { guess[i] = guessColumn(h); });
      setMapping(guess);
      setStep('map');
    };
    reader.readAsText(file);
  }, []);

  const mappedRows = (): ParsedRow[] => {
    return rows.map((row) => {
      const data: Record<string, string> = {};
      for (let i = 0; i < headers.length; i++) {
        const field = mapping[i];
        if (field) data[field] = (row[i] ?? '').trim();
      }
      const errors: string[] = [];
      if (!data.name) errors.push('Missing name');
      if (data.value_estimate_cents && isNaN(parseInt(data.value_estimate_cents))) errors.push('Invalid value');
      return { data, valid: errors.length === 0, errors };
    });
  };

  const doImport = async () => {
    const parsed = mappedRows();
    setImporting(true);
    let success = 0, failed = 0;

    // Batch insert in chunks of 50
    const contacts = parsed.map((r) => {
      const contact: Record<string, unknown> = {
        name: r.data.name,
        tags: [],
      };
      if (r.data.company) contact.company = r.data.company;
      if (r.data.email) contact.email = r.data.email;
      if (r.data.phone) contact.phone = r.data.phone;
      if (r.data.city) contact.city = r.data.city;
      if (r.data.state) contact.state = r.data.state;
      if (r.data.country) contact.country = r.data.country;
      if (r.data.role_title) contact.role_title = r.data.role_title;
      if (r.data.rate_notes) contact.rate_notes = r.data.rate_notes;
      if (r.data.owner) contact.owner = r.data.owner;
      if (r.data.notes) contact.notes = r.data.notes;
      if (r.data.source) contact.source = r.data.source;
      if (r.data.value_estimate_cents) contact.value_estimate_cents = parseInt(r.data.value_estimate_cents);
      // Contact type: use mapped value or default
      const ct = r.data.contact_type?.toLowerCase().trim() ?? '';
      contact.contact_type = CONTACT_TYPES.includes(ct) ? ct : defaultType;
      // Stage: validate or default
      const validStages = ['new', 'contacted', 'qualified', 'negotiating', 'active', 'inactive', 'lost'];
      const st = r.data.stage?.toLowerCase().trim() ?? '';
      contact.stage = validStages.includes(st) ? st : 'new';
      return contact;
    });

    for (let i = 0; i < contacts.length; i += 50) {
      const batch = contacts.slice(i, i + 50);
      const { error } = await supabase.from('crm_contacts').insert(batch);
      if (error) { failed += batch.length; }
      else { success += batch.length; }
    }

    setImporting(false);
    setImportResults({ success, failed });
    setStep('done');
    if (failed === 0) toast('success', `Imported ${success} contacts`);
    else toast('info', `Imported ${success}, ${failed} failed`);
  };

  const downloadTemplate = () => {
    const csv = 'name,contact_type,company,email,phone,city,state,stage,role_title,notes\nJohn Smith,venue,The Warehouse,john@warehouse.com,555-0100,New York,NY,new,Booking Manager,Great venue for weekend shows\nJane Doe,promoter,Promo Co,jane@promo.com,555-0200,Los Angeles,CA,contacted,Promoter,Handles west coast dates';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'crm_contacts_template.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setStep('upload'); setHeaders([]); setRows([]); setMapping({}); setFileName(''); setImportResults({ success: 0, failed: 0 });
  };

  return (
    <div>
      <PageHeader title="CSV Import" description="Bulk import contacts — venues, promoters, stylists, photographers, and your whole team" />

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6 text-sm">
        {(['upload', 'map', 'preview', 'done'] as const).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${
              step === s ? 'bg-neutral-900 text-white' : ['upload','map','preview','done'].indexOf(step) > i ? 'bg-green-500 text-white' : 'bg-neutral-200 text-neutral-400'
            }`}>{i + 1}</div>
            <span className={`capitalize ${step === s ? 'text-neutral-900 font-medium' : 'text-neutral-400'}`}>{s}</span>
            {i < 3 && <ArrowRight size={14} className="text-neutral-300" />}
          </div>
        ))}
      </div>

      {step === 'upload' && (
        <Card className="p-8">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            className="border-2 border-dashed border-neutral-200 rounded-xl p-12 text-center hover:border-neutral-300 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={40} className="text-neutral-300 mx-auto mb-4" />
            <p className="text-sm font-medium text-neutral-700">Drop your CSV file here, or click to browse</p>
            <p className="text-xs text-neutral-400 mt-1">Supports headers in the first row</p>
            <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          </div>
          <div className="flex items-center justify-between mt-6">
            <p className="text-sm text-neutral-500">Need a template?</p>
            <Button variant="secondary" onClick={downloadTemplate}><Download size={16} /> Download Template</Button>
          </div>
        </Card>
      )}

      {step === 'map' && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText size={20} className="text-neutral-400" />
            <span className="text-sm font-medium text-neutral-700">{fileName}</span>
            <Badge color="gray">{rows.length} rows</Badge>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">Default Contact Type</label>
            <Select value={defaultType} onChange={(e) => setDefaultType(e.target.value)} className="max-w-xs">
              {CONTACT_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
            </Select>
            <p className="text-xs text-neutral-400 mt-1">Used when a row doesn't specify a valid type</p>
          </div>

          <h3 className="text-sm font-semibold text-neutral-700 mb-3">Map Columns</h3>
          <div className="space-y-2">
            {headers.map((h, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-neutral-50">
                <div className="flex-1">
                  <p className="text-sm font-medium text-neutral-700">{h}</p>
                  <p className="text-xs text-neutral-400">Sample: {rows[0]?.[i] ?? '—'}</p>
                </div>
                <ArrowRight size={16} className="text-neutral-300" />
                <Select value={mapping[i] ?? ''} onChange={(e) => setMapping({ ...mapping, [i]: e.target.value })} className="max-w-[200px]">
                  {FIELD_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </Select>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button onClick={reset}>Cancel</Button>
            <Button variant="primary" onClick={() => setStep('preview')}>Preview Import</Button>
          </div>
        </Card>
      )}

      {step === 'preview' && (
        <Card className="p-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-neutral-900">Preview</h3>
              <p className="text-sm text-neutral-500">{mappedRows().filter((r) => r.valid).length} valid · {mappedRows().filter((r) => !r.valid).length} invalid</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setStep('map')}>Back</Button>
              <Button variant="primary" onClick={doImport} disabled={importing}>{importing ? 'Importing…' : `Import ${mappedRows().filter((r) => r.valid).length} Contacts`}</Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-neutral-500">#</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-neutral-500">Name</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-neutral-500">Type</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-neutral-500">Company</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-neutral-500">Email</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-neutral-500">City</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-neutral-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {mappedRows().slice(0, 100).map((r, i) => (
                  <tr key={i} className={r.valid ? '' : 'bg-red-50'}>
                    <td className="px-4 py-2 text-neutral-400">{i + 1}</td>
                    <td className="px-4 py-2 text-neutral-900">{r.data.name || '—'}</td>
                    <td className="px-4 py-2 text-neutral-600">{r.data.contact_type || defaultType}</td>
                    <td className="px-4 py-2 text-neutral-600">{r.data.company || '—'}</td>
                    <td className="px-4 py-2 text-neutral-600">{r.data.email || '—'}</td>
                    <td className="px-4 py-2 text-neutral-600">{r.data.city || '—'}</td>
                    <td className="px-4 py-2">
                      {r.valid ? <CheckCircle2 size={16} className="text-green-500" /> : <AlertCircle size={16} className="text-red-500" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {mappedRows().length > 100 && <p className="text-xs text-neutral-400 text-center py-3">Showing first 100 of {mappedRows().length} rows</p>}
          </div>
        </Card>
      )}

      {step === 'done' && (
        <Card className="p-8 text-center">
          <CheckCircle2 size={48} className="text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-neutral-900">Import Complete</h3>
          <p className="text-sm text-neutral-500 mt-1">
            {importResults.success} contacts imported successfully{importResults.failed > 0 ? `, ${importResults.failed} failed` : ''}
          </p>
          <div className="flex justify-center gap-2 mt-6">
            <Button onClick={reset}>Import Another File</Button>
            <Button variant="primary" onClick={() => window.location.href = '/crm/contacts'}>View Contacts</Button>
          </div>
        </Card>
      )}
    </div>
  );
}
