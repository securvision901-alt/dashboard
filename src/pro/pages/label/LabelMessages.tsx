import { useEffect, useState, useCallback, useRef } from 'react';
import { MessageSquare, Send, ArrowLeft } from 'lucide-react';
import { proSupabase } from '@/pro/lib/supabase';
import { useProAuth } from '@/pro/lib/auth';
import { LoadingState, EmptyState, ErrorState } from '@/components/ui/States';
import { formatDateTime, timeAgo } from '@/lib/format';
import type { MessageThread, Message } from '@/types/database';

export default function LabelMessages() {
  const { portalUser, supaUser } = useProAuth();
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<MessageThread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messageBody, setMessageBody] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchThreads = useCallback(async () => {
    if (!portalUser) return;
    setLoadingThreads(true);
    setError(null);
    try {
      const { data, error: err } = await proSupabase
        .from('message_threads')
        .select('*')
        .eq('user_id', portalUser.id)
        .eq('is_archived', false)
        .order('updated_at', { ascending: false });

      if (err) throw err;
      setThreads((data as MessageThread[]) ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load threads');
    } finally {
      setLoadingThreads(false);
    }
  }, [portalUser]);

  const fetchMessages = useCallback(async (threadId: string) => {
    setLoadingMessages(true);
    try {
      const { data, error: err } = await proSupabase
        .from('messages')
        .select('*')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });

      if (err) throw err;
      setMessages((data as Message[]) ?? []);
    } catch {
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  useEffect(() => {
    if (selectedThread) {
      fetchMessages(selectedThread.id);
    }
  }, [selectedThread, fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!portalUser || !selectedThread || !messageBody.trim()) return;
    setSending(true);
    try {
      const { data, error } = await proSupabase
        .from('messages')
        .insert({
          tenant_id: portalUser.tenant_id,
          thread_id: selectedThread.id,
          sender_id: portalUser.id,
          body: messageBody.trim(),
          is_internal_note: false,
        })
        .select('*')
        .single();

      if (error) throw error;
      setMessages((prev) => [...prev, data as Message]);
      setMessageBody('');
      // Update thread's updated_at locally so it sorts correctly
      setThreads((prev) => {
        const updated = prev.map((t) =>
          t.id === selectedThread.id ? { ...t, updated_at: new Date().toISOString() } : t
        );
        return [...updated].sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1));
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  if (loadingThreads) return <LoadingState label="Loading messages…" />;
  if (error && threads.length === 0) return <ErrorState message={error} />;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-white">Messages</h1>
        <p className="mt-1 text-sm text-white/50">Communicate with our team about your requests.</p>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden h-[600px] flex">
        {/* Thread list */}
        <div className={`${selectedThread ? 'hidden md:block' : 'block'} w-full md:w-72 border-r border-white/10 flex flex-col`}>
          <div className="px-4 py-3 border-b border-white/10">
            <h2 className="text-sm font-semibold text-white">Conversations</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {threads.length === 0 ? (
              <EmptyState icon={<MessageSquare size={24} />} title="No conversations" description="Messages will appear here when you start a conversation." />
            ) : (
              threads.map((thread) => (
                <button
                  key={thread.id}
                  onClick={() => setSelectedThread(thread)}
                  className={`w-full text-left px-4 py-3 border-b border-white/5 transition-colors ${
                    selectedThread?.id === thread.id ? 'bg-white/10' : 'hover:bg-white/5'
                  }`}
                >
                  <p className="text-sm font-medium text-white truncate">{thread.subject ?? 'Conversation'}</p>
                  <p className="text-xs text-white/40 mt-0.5">{timeAgo(thread.updated_at)}</p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Message view */}
        <div className={`${selectedThread ? 'flex' : 'hidden md:flex'} flex-1 flex-col`}>
          {!selectedThread ? (
            <div className="flex-1 flex items-center justify-center">
              <EmptyState icon={<MessageSquare size={32} />} title="Select a conversation" description="Choose a thread from the left to view messages." />
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="px-4 py-3 border-b border-white/10 flex items-center gap-3">
                <button onClick={() => setSelectedThread(null)} className="md:hidden text-white/40 hover:text-white">
                  <ArrowLeft size={18} />
                </button>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-white truncate">{selectedThread.subject ?? 'Conversation'}</h3>
                  <p className="text-xs text-white/40">Started {formatDateTime(selectedThread.created_at)}</p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loadingMessages ? (
                  <LoadingState label="Loading messages…" />
                ) : messages.length === 0 ? (
                  <EmptyState title="No messages yet" description="Send a message to start the conversation." />
                ) : (
                  messages.map((msg) => {
                    const isOwn = msg.sender_id === portalUser?.id;
                    return (
                      <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] rounded-lg px-3 py-2 ${isOwn ? 'bg-white text-neutral-900' : 'bg-white/10 text-white'}`}>
                          <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
                          <p className={`text-xs mt-1 ${isOwn ? 'text-neutral-400' : 'text-white/40'}`}>{formatDateTime(msg.created_at)}</p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Composer */}
              <form onSubmit={sendMessage} className="p-3 border-t border-white/10 flex items-center gap-2">
                <input
                  type="text"
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                  placeholder="Type a message…"
                  className="flex-1 rounded-lg border border-white/10 bg-neutral-950 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/10"
                />
                <button
                  type="submit"
                  disabled={sending || !messageBody.trim()}
                  className="w-9 h-9 rounded-lg bg-white text-neutral-900 flex items-center justify-center flex-shrink-0 disabled:opacity-50 hover:bg-white/90 transition-colors"
                >
                  <Send size={16} />
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
