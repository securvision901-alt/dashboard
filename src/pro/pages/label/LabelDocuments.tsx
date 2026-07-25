import { useEffect, useState, useCallback } from 'react';
import { FileText, Download, RefreshCw, FileCheck, FileSignature } from 'lucide-react';
import { proSupabase } from '@/pro/lib/supabase';
import { useProAuth } from '@/pro/lib/auth';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { LoadingState, EmptyState, ErrorState } from '@/components/ui/States';
import { formatDate } from '@/lib/format';
import type { PortalDocument } from '@/types/database';

const DOC_TYPE_ICONS: Record<string, typeof FileText> = {
  contract: FileSignature,
  license: FileCheck,
  agreement: FileSignature,
  invoice: FileText,
  other: FileText,
};

export default function LabelDocuments() {
  const { portalUser } = useProAuth();
  const [documents, setDocuments] = useState<PortalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    if (!portalUser) return;
    setLoading(true);
    setError(null);
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
  }, [portalUser]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  if (loading) return <LoadingState label="Loading documents…" />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Documents</h1>
          <p className="mt-1 text-sm text-white/50">Contracts, licenses, and files shared with you.</p>
        </div>
        <Button variant="ghost" size="sm" onClick={fetchDocuments} className="text-white/60 hover:bg-white/10">
          <RefreshCw size={14} /> Refresh
        </Button>
      </div>

      {documents.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-xl">
          <EmptyState
            icon={<FileText size={32} />}
            title="No documents shared"
            description="Contracts, licenses, and other documents will appear here when they're shared with you."
          />
        </div>
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-white/40">
                  <th className="px-4 py-3">File Name</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">E-Sign Status</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Download</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => {
                  const Icon = DOC_TYPE_ICONS[doc.type] ?? FileText;
                  return (
                    <tr key={doc.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                            <Icon size={16} className="text-white/50" />
                          </div>
                          <span className="font-medium text-white truncate">{doc.file_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge color="gray">{doc.type.replace(/_/g, ' ')}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge color={doc.esign_status === 'signed' ? 'green' : doc.esign_status === 'pending' ? 'amber' : 'gray'}>
                          {doc.esign_status.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-white/40">{formatDate(doc.created_at)}</td>
                      <td className="px-4 py-3 text-right">
                        {doc.file_url ? (
                          <a
                            href={doc.file_url}
                            download={doc.file_name}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-white/50 hover:bg-white/10 hover:text-white transition-colors"
                          >
                            <Download size={16} />
                          </a>
                        ) : (
                          <span className="text-white/20">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
