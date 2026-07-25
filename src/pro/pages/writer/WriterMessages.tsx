import { useEffect, useState, useRef, useCallback } from 'react';
import { Send, Loader2, MessageSquare, ArrowLeft, Plus } from 'lucide-react';
import { proSupabase } from '@/pro/lib/supabase';
import { useProAuth } from '@/pro/lib/auth';
import { Button } from '@/components/ui/Button';
import { Field, Input, Textarea } from '@/components/ui/Form';
import { LoadingState, EmptyState } from '@/components/ui/States';
import { toast } from '@/components/ui/Toast';
import { formatDateTime, timeAgo } from '@/lib/format';
import type { MessageThread, Message } from '@/types/database';

export function WriterMessages() {
  const { portalUser } = useProAuth();
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewThread, setShowNewThread] = useState(false);

  useEffect(() => {
    (async () => {
      if (!portalUser) return;
      try {
        const { data, error } = await proSupabase
          .from('message_threads')
          .select('*')
          .eq('user_id', portalUser.id)
          .eq('is_archived', false)
          .is('deleted_at', null)
          .order('updated_at', { ascending: false });
        if (error) throw error;
        const t = (data as MessageThread[]) ?? [];
        setThreads(t);
        if (t.length > 0) setActiveThreadId(t[0].id);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load messages');
      } finally {
        setLoading(false);
      }
    })();
  }, [portalUser]);

  const activeThread = threads.find((t) => t.id === activeThreadId) ?? null;

  const handleNewThread = (thread: MessageThread) => {
    setThreads((prev) => [thread, ...prev]);
    setActiveThreadId(thread.id);
    setShowNewThread(false);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Messages</h1>
            <p className="mt-1 text-white/50">Conversations with our team about your submissions and opportunities.</p>
          </div>
          <Button
            variant="primary"
            size="md"
            className="bg-white text-neutral-900 hover:bg-white/90"
            onClick={() => setShowNewThread(true)}
          >
            <Plus size={16} /> New thread
          </Button>
        </div>

        {loading ? (
          <LoadingState label="Loading messages…" />
        ) : error ? (
          <div className="text-sm text-red-400 py-8 text-center">{error}</div>
        ) : threads.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-xl">
            <EmptyState
              icon={<MessageSquare size={32} />}
              title="No messages yet"
              description="Start a conversation with our team by creating a new thread."
              action={
                <Button variant="primary" size="sm" className="bg-white text-neutral-900 hover:bg-white/90" onClick={() => setShowNewThread(true)}>
                  <Plus size={14} /> New thread
                </Button>
              }
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100vh-220px)]">
            {/* Thread list */}
            <div
              className={`bg-white/5 border border-white/10 rounded-xl overflow-y-auto ${
                activeThreadId ? 'hidden md:block' : 'block'
              }`}
            >
              <div className="p-3 border-b border-white/10 text-xs uppercase tracking-wide text-white/30">
                {threads.length} {threads.length === 1 ? 'thread' : 'threads'}
              </div>
              <div className="divide-y divide-white/5">
                {threads.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setActiveThreadId(t.id)}
                    className={`w-full text-left p-4 hover:bg-white/5 transition-colors ${
                      activeThreadId === t.id ? 'bg-white/10' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-medium text-white text-sm truncate">
                        {t.subject || 'Conversation'}
                      </h3>
                      <span className="text-xs text-white/30 flex-shrink-0">{timeAgo(t.updated_at)}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Message view */}
            <div className={`md:col-span-2 bg-white/5 border border-white/10 rounded-xl flex flex-col overflow-hidden ${activeThreadId ? 'block' : 'hidden md:block'}`}>
              {activeThread ? (
                <MessageView thread={activeThread} onBack={() => setActiveThreadId(null)} />
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-sm text-white/30">Select a thread to view messages.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showNewThread && portalUser && (
        <NewThreadModal userId={portalUser.id} tenantId={portalUser.tenant_id} onCreated={handleNewThread} onClose={() => setShowNewThread(false)} />
      )}
    </div>
  );
}

function MessageView({ thread, onBack }: { thread: MessageThread; onBack: () => void }) {
  const { portalUser } = useProAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback(async () => {
    const { data, error } = await proSupabase
      .from('messages')
      .select('*')
      .eq('thread_id', thread.id)
      .eq('is_internal_note', false)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });
    if (!error) setMessages((data as Message[]) ?? []);
    setLoading(false);
  }, [thread.id]);

  useEffect(() => {
    setLoading(true);
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    if (!portalUser || !body.trim()) return;
    setSending(true);
    try {
      const { data, error } = await proSupabase
        .from('messages')
        .insert({
          tenant_id: portalUser.tenant_id,
          thread_id: thread.id,
          sender_id: portalUser.id,
          body: body.trim(),
          is_internal_note: false,
        })
        .select('*')
        .single();
      if (error) throw error;
      setMessages((prev) => [...prev, data as Message]);
      setBody('');
      // bump thread updated_at
      await proSupabase.from('message_threads').update({ updated_at: new Date().toISOString() }).eq('id', thread.id);
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center gap-3">
        <button onClick={onBack} className="md:hidden text-white/40 hover:text-white">
          <ArrowLeft size={18} />
        </button>
        <div className="min-w-0">
          <h2 className="font-semibold text-white truncate">{thread.subject || 'Conversation'}</h2>
          <p className="text-xs text-white/30">Started {formatDateTime(thread.created_at)}</p>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={20} className="animate-spin text-white/30" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8 text-sm text-white/30">No messages yet. Say hello 👋</div>
        ) : (
          messages.map((m) => {
            const isMe = m.sender_id === portalUser?.id;
            return (
              <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                    isMe
                      ? 'bg-white text-neutral-900 rounded-br-sm'
                      : 'bg-white/10 text-white rounded-bl-sm'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{m.body}</p>
                  <p className={`text-[10px] mt-1 ${isMe ? 'text-neutral-400' : 'text-white/30'}`}>
                    {formatDateTime(m.created_at)}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Composer */}
      <div className="p-4 border-t border-white/10">
        <div className="flex items-end gap-2">
          <Textarea
            rows={2}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Type a message…"
            className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:ring-white/20 focus:border-white/30 resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
          />
          <Button
            variant="primary"
            size="md"
            className="bg-white text-neutral-900 hover:bg-white/90 flex-shrink-0"
            onClick={send}
            disabled={sending || !body.trim()}
          >
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </Button>
        </div>
      </div>
    </>
  );
}

function NewThreadModal({
  userId,
  tenantId,
  onCreated,
  onClose,
}: {
  userId: string;
  tenantId: string;
  onCreated: (t: MessageThread) => void;
  onClose: () => void;
}) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [creating, setCreating] = useState(false);

  const create = async () => {
    if (!subject.trim() || !body.trim()) {
      toast('error', 'Please add a subject and message.');
      return;
    }
    setCreating(true);
    try {
      const { data: thread, error: tErr } = await proSupabase
        .from('message_threads')
        .insert({
          tenant_id: tenantId,
          user_id: userId,
          subject: subject.trim(),
          is_archived: false,
        })
        .select('*')
        .single();
      if (tErr) throw tErr;
      const t = thread as MessageThread;

      const { error: mErr } = await proSupabase.from('messages').insert({
        tenant_id: tenantId,
        thread_id: t.id,
        sender_id: userId,
        body: body.trim(),
        is_internal_note: false,
      });
      if (mErr) throw mErr;

      toast('success', 'Thread created.');
      onCreated(t);
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Failed to create thread');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-neutral-900 border border-white/10 rounded-2xl w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-white mb-4">New conversation</h2>
        <div className="space-y-4">
          <Field label="Subject" required>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Question about my submission"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:ring-white/20 focus:border-white/30"
            />
          </Field>
          <Field label="Message" required>
            <Textarea
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Hi team, I had a question about…"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:ring-white/20 focus:border-white/30"
            />
          </Field>
        </div>
        <div className="flex items-center justify-end gap-3 mt-5">
          <Button variant="ghost" size="md" className="text-white/60 hover:bg-white/10" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            className="bg-white text-neutral-900 hover:bg-white/90"
            onClick={create}
            disabled={creating}
          >
            {creating ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            {creating ? 'Creating…' : 'Start thread'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default WriterMessages;
