import { useEffect, useState } from 'react';
import { FileText, Download, File, FileImage, FileCheck } from 'lucide-react';
import { proSupabase } from '@/pro/lib/supabase';
import { useProAuth } from '@/pro/lib/auth';
import { LoadingState, EmptyState, ErrorState } from '@/components/ui/States';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { formatDate } from '@/lib/format';
import type { PortalDocument } from '@/types/database';

function getFileIcon(type: string) {
  const t = type.toLowerCase();
  if (t.includes('image')) return <FileImage size={18} />;
  if (t.includes('contract') || t.includes('sign')) return <FileCheck size={18} />;
  if (t.includes('pdf') || t.includes('doc')) return <FileText size={18} />;
  return <File size={18} />;
}

export default function BookingDocuments() {
  const { portalUser } = useProAuth();
  const [documents, setDocuments] = useState<PortalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!portalUser) return;
      try {
        const { data, error: err } = await proSupabase
          .from('portal_documents')
          .select('*')
          .eq('user_id', portalUser.id)
          .order('created_at', { ascending: false });
        if (err) throw err;
        setDocuments((data as PortalDocument[]) ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load documents');
      } finally {
        setLoading(false);
      }
    })();
  }, [portalUser]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Documents</h1>
        <p className="mt-1 text-sm text-white/50">
          Contracts, riders, invoices, and other documents shared with you.
        </p>
      </div>

      {/* Table */}
      {loading ? (
        <LoadingState label="Loading documents…" />
      ) : error ? (
        <ErrorState message={error} />
      ) : documents.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-xl">
          <EmptyState
            icon={<FileText size={32} />}
            title="No documents yet"
            description="When our team shares contracts or other documents with you, they'll appear here for download."
          />
        </div>
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white/40 uppercase tracking-wider">File Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white/40 uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white/40 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white/40 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-white/40 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center text-white/60 flex-shrink-0">
                          {getFileIcon(doc.type)}
                        </div>
                        <span className="text-sm font-medium text-white truncate">{doc.file_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge color="gray">{doc.type || 'document'}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={doc.esign_status} />
                    </td>
                    <td className="px-4 py-3 text-sm text-white/50">
                      {formatDate(doc.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        download={doc.file_name}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                      >
                        <Download size={14} /> Download
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
