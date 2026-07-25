import { useEffect, useState, useRef } from 'react';
import { MessageSquare, Send, ArrowLeft, Search } from 'lucide-react';
import { proSupabase } from '@/pro/lib/supabase';
import { useProAuth } from '@/pro/lib/auth';
import { LoadingState, EmptyState, ErrorState } from '@/components/ui/States';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import { formatDateTime, timeAgo } from '@/lib/format';
import type { MessageThread, Message, PortalUser } from '@/types/database';

export default function BookingMessages() {
  const { portalUser } = useProAuth();
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [activeThread, setActiveThread] = useState<MessageThread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [adminUsers, setAdminUsers] = useState<PortalUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [msgLoading, setMsgLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load threads + admin users
  useEffect(() => {
    (async () => {
      if (!portalUser) return;
      try {
        const [threadsRes, adminsRes] = await Promise.all([
          proSupabase
            .from('message_threads')
            .select('*')
            .eq('user_id', portalUser.id)
            .order('updated_at', { ascending: false }),
          proSupabase
            .from('portal_users')
            .select('*')
            .eq('role', 'admin')
            .eq('status', 'approved'),
        ]);
        if (threadsRes.error) throw threadsRes.error;
        if (adminsRes.error) throw adminsRes.error;
        setThreads((threadsRes.data as MessageThread[]) ?? []);
        setAdminUsers((adminsRes.data as PortalUser[]) ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load messages');
      } finally {
        setLoading(false);
      }
    })();
  }, [portalUser]);

  // Load messages when thread selected
  useEffect(() => {
    if (!activeThread || !portalUser) return;
    setMsgLoading(true);
    (async () => {
      try {
        const { data, error: err } = await proSupabase
          .from('messages')
          .select('*')
          .eq('thread_id', activeThread.id)
          .order('created_at', { ascending: true });
        if (err) throw err;
        setMessages((data as Message[]) ?? []);
      } catch (e) {
        toast('error', e instanceof Error ? e.message : 'Failed to load messages');
      } finally {
        setMsgLoading(false);
      }
    })();
  }, [activeThread, portalUser]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!portalUser || !activeThread || !newMessage.trim()) return;
    setSending(true);
    try {
      const { data, error: err } = await proSupabase
        .from('messages')
        .insert({
          tenant_id: portalUser.tenant_id,
          thread_id: activeThread.id,
          sender_id: portalUser.id,
          body: newMessage.trim(),
          is_internal_note: false,
        })
        .select('*')
        .single();
      if (err) throw err;
      setMessages((prev) => [...prev, data as Message]);
      setNewMessage('');
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const filteredThreads = threads.filter((t) =>
    (t.subject ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const isOwnMessage = (m: Message) => m.sender_id === portalUser?.id;

  if (loading) return <LoadingState label="Loading messages…" />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-white">Messages</h1>
        <p className="mt-1 text-sm text-white/50">Communicate with our admin team about your bookings.</p>
      </div>

      <div className="flex h-[calc(100vh-220px)] min-h-[500px] bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        {/* Thread list */}
        <div className={`${activeThread ? 'hidden md:flex' : 'flex'} w-full md:w-80 flex-col border-r border-white/10`}>
          <div className="p-3 border-b border-white/10">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search threads..."
                className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/20"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredThreads.length === 0 ? (
              <EmptyState
                icon={<MessageSquare size={28} />}
                title="No message threads"
                description="Messages with our team will appear here."
              />
            ) : (
              filteredThreads.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveThread(t)}
                  className={`w-full text-left p-3 border-b border-white/5 transition-colors ${
                    activeThread?.id === t.id ? 'bg-white/10' : 'hover:bg-white/5'
                  }`}
                >
                  <p className="text-sm font-medium text-white truncate">{t.subject ?? 'Conversation'}</p>
                  <p className="text-xs text-white/40 mt-0.5">{timeAgo(t.updated_at)}</p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Message view */}
        <div className={`${activeThread ? 'flex' : 'hidden md:flex'} flex-1 flex-col`}>
          {!activeThread ? (
            <div className="flex-1 flex items-center justify-center">
              <EmptyState
                icon={<MessageSquare size={32} />}
                title="Select a conversation"
                description="Choose a thread from the left to view messages."
              />
            </div>
          ) : (
            <>
              {/* Thread header */}
              <div className="flex items-center gap-3 p-4 border-b border-white/10">
                <button
                  onClick={() => setActiveThread(null)}
                  className="md:hidden p-1 rounded-lg text-white/60 hover:bg-white/10"
                >
                  <ArrowLeft size={18} />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{activeThread.subject ?? 'Conversation'}</p>
                  <p className="text-xs text-white/40">Started {formatDateTime(activeThread.created_at)}</p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {msgLoading ? (
                  <LoadingState label="Loading messages…" />
                ) : messages.length === 0 ? (
                  <EmptyState
                    icon={<MessageSquare size={28} />}
                    title="No messages yet"
                    description="Start the conversation by sending a message below."
                  />
                ) : (
                  messages.map((m) => {
                    const own = isOwnMessage(m);
                    const senderAdmin = adminUsers.find((a) => a.id === m.sender_id);
                    return (
                      <div key={m.id} className={`flex ${own ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] ${own ? 'order-2' : ''}`}>
                          <div
                            className={`rounded-2xl px-4 py-2.5 ${
                              own
                                ? 'bg-white text-neutral-900 rounded-br-md'
                                : 'bg-white/10 text-white rounded-bl-md'
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap">{m.body}</p>
                          </div>
                          <p className={`mt-1 text-xs text-white/30 ${own ? 'text-right' : 'text-left'}`}>
                            {own ? 'You' : senderAdmin?.display_name ?? 'Admin'} · {timeAgo(m.created_at)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Composer */}
              <div className="p-4 border-t border-white/10">
                <div className="flex items-end gap-2">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={1}
                    placeholder="Type a message…"
                    className="flex-1 resize-none bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/20 max-h-32"
                  />
                  <Button
                    onClick={handleSend}
                    disabled={!newMessage.trim() || sending}
                    variant="primary"
                    size="md"
                    className="bg-white text-neutral-900 hover:bg-white/90"
                  >
                    <Send size={16} />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
