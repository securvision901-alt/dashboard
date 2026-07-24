import { useState } from 'react';
import { Download, FileText, Database } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/layout/PageHeader';
import { toast } from '@/components/ui/Toast';
import { supabase } from '@/lib/supabase';

const EXPORTS = [
  { table: 'bookings', label: 'Bookings', desc: 'All booking records with status, fees, and dates' },
  { table: 'booking_inquiries', label: 'Inquiries', desc: 'All booking inquiries from forms and DMs' },
  { table: 'crm_contacts', label: 'CRM Contacts', desc: 'All contacts — venues, promoters, stylists, etc.' },
  { table: 'releases', label: 'Releases', desc: 'Catalog of releases' },
  { table: 'orders', label: 'Orders', desc: 'Commerce orders' },
  { table: 'fans', label: 'Fans', desc: 'Fan email list with subscription status' },
  { table: 'platform_connections', label: 'Platform Connections', desc: 'Connected music platforms' },
  { table: 'mcp_action_log', label: 'MCP Action Log', desc: 'Automation action history' },
];

export default function ExportsPage() {
  const [exporting, setExporting] = useState<string | null>(null);

  const doExport = async (table: string, label: string) => {
    setExporting(table);
    const { data, error } = await supabase.from(table).select('*');
    setExporting(null);
    if (error) { toast('error', `Failed to export ${label}`); return; }
    if (!data || data.length === 0) { toast('info', `No data in ${label}`); return; }

    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(','),
      ...data.map((row) => headers.map((h) => {
        const val = (row as Record<string, unknown>)[h];
        const str = val === null || val === undefined ? '' : typeof val === 'object' ? JSON.stringify(val) : String(val);
        return `"${str.replace(/"/g, '""')}"`;
      }).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${table}_export.csv`; a.click();
    URL.revokeObjectURL(url);
    toast('success', `Exported ${data.length} rows from ${label}`);
  };

  return (
    <div>
      <PageHeader title="Exports" description="Download your data as CSV files" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {EXPORTS.map((e) => (
          <Card key={e.table} className="p-5">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center flex-shrink-0">
                <FileText size={20} className="text-neutral-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-neutral-900">{e.label}</p>
                <p className="text-xs text-neutral-500 mt-0.5">{e.desc}</p>
              </div>
            </div>
            <Button variant="secondary" size="sm" className="w-full" onClick={() => doExport(e.table, e.label)} disabled={exporting === e.table}>
              <Download size={14} /> {exporting === e.table ? 'Exporting…' : 'Export CSV'}
            </Button>
          </Card>
        ))}
      </div>
      <Card className="p-5 mt-4">
        <div className="flex items-center gap-2 text-neutral-400 mb-1"><Database size={16} /><span className="text-xs font-semibold uppercase">Info</span></div>
        <p className="text-sm text-neutral-600">Exports download all rows from each table as a CSV file. Data includes all columns currently in the database.</p>
      </Card>
    </div>
  );
}
