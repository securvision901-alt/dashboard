import { useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import {
  Music, LayoutDashboard, Disc3, Calendar, FileText, Mail, MessageSquare,
  Bell, Search, Menu, X, LogOut, User, ShoppingBag, Clock, Handshake,
  PenLine, DollarSign, Send, Inbox, Users, ChevronDown,
} from 'lucide-react';
import { useProAuth } from '@/pro/lib/auth';
import { proSupabase } from '@/pro/lib/supabase';
import { toast } from '@/components/ui/Toast';

interface NavItem { to: string; label: string; icon: ReactNode }
interface NavSection { title: string; items: NavItem[] }

const ROLE_NAV: Record<string, NavSection[]> = {
  label: [
    { title: 'Sync Portal', items: [
      { to: '/pro/dashboard/label', label: 'Overview', icon: <LayoutDashboard size={18} /> },
      { to: '/pro/dashboard/label/catalog', label: 'Catalog', icon: <Disc3 size={18} /> },
      { to: '/pro/dashboard/label/requests', label: 'License Requests', icon: <FileText size={18} /> },
      { to: '/pro/dashboard/label/deals', label: 'Deal History', icon: <Handshake size={18} /> },
      { to: '/pro/dashboard/label/custom', label: 'Custom Write Request', icon: <PenLine size={18} /> },
    ]},
    { title: 'Communication', items: [
      { to: '/pro/dashboard/label/messages', label: 'Messages', icon: <MessageSquare size={18} /> },
      { to: '/pro/dashboard/label/documents', label: 'Contracts & Invoices', icon: <FileText size={18} /> },
    ]},
  ],
  booking: [
    { title: 'Booking Portal', items: [
      { to: '/pro/dashboard/booking', label: 'Overview', icon: <LayoutDashboard size={18} /> },
      { to: '/pro/dashboard/booking/epk', label: 'Artist EPK', icon: <User size={18} /> },
      { to: '/pro/dashboard/booking/calendar', label: 'Availability', icon: <Calendar size={18} /> },
      { to: '/pro/dashboard/booking/request', label: 'Submit Booking', icon: <Send size={18} /> },
      { to: '/pro/dashboard/booking/my-bookings', label: 'My Bookings', icon: <Clock size={18} /> },
    ]},
    { title: 'Communication', items: [
      { to: '/pro/dashboard/booking/messages', label: 'Messages', icon: <MessageSquare size={18} /> },
      { to: '/pro/dashboard/booking/documents', label: 'Documents', icon: <FileText size={18} /> },
    ]},
  ],
  writer: [
    { title: 'Writer Portal', items: [
      { to: '/pro/dashboard/writer', label: 'Overview', icon: <LayoutDashboard size={18} /> },
      { to: '/pro/dashboard/writer/collab-calls', label: 'Open Collab Calls', icon: <PenLine size={18} /> },
      { to: '/pro/dashboard/writer/submit', label: 'Submit a Demo', icon: <Send size={18} /> },
      { to: '/pro/dashboard/writer/buy', label: 'Buy a Song', icon: <DollarSign size={18} /> },
      { to: '/pro/dashboard/writer/submissions', label: 'My Submissions', icon: <Inbox size={18} /> },
    ]},
    { title: 'Communication', items: [
      { to: '/pro/dashboard/writer/messages', label: 'Messages', icon: <MessageSquare size={18} /> },
    ]},
  ],
  admin: [
    { title: 'Admin', items: [
      { to: '/pro/dashboard/admin', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
      { to: '/pro/dashboard/admin/users', label: 'Users & Roles', icon: <Users size={18} /> },
      { to: '/pro/dashboard/admin/requests', label: 'Requests Inbox', icon: <Inbox size={18} /> },
      { to: '/pro/dashboard/admin/catalog', label: 'Catalog Manager', icon: <Disc3 size={18} /> },
      { to: '/pro/dashboard/admin/spend', label: 'Spend & Financials', icon: <DollarSign size={18} /> },
    ]},
  ],
};

const ROLE_LABELS: Record<string, string> = {
  label: 'Sync Agent',
  booking: 'Booking Agent',
  writer: 'Writer / Collaborator',
  admin: 'Global Admin',
};

export function ProPortalShell({ children, role }: { children: ReactNode; role: string }) {
  const { portalUser, signOut, loading } = useProAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  if (loading) return <div className="min-h-screen bg-neutral-950 flex items-center justify-center"><div className="w-8 h-8 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" /></div>;
  if (!portalUser) return <Navigate to="/pro/login" />;
  if (portalUser.status === 'pending') return <Navigate to="/pro/pending" />;
  if (portalUser.status === 'suspended') return <Navigate to="/pro/suspended" />;

  const nav = ROLE_NAV[role] ?? ROLE_NAV[portalUser.role] ?? [];
  const roleLabel = ROLE_LABELS[portalUser.role] ?? portalUser.role;

  const handleSignOut = async () => {
    await signOut();
    navigate('/pro/login');
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex">
      {/* Sidebar */}
      <aside className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-60 bg-neutral-900 border-r border-white/5 flex flex-col transition-transform ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="px-5 py-4 border-b border-white/5">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
              <Music size={18} />
            </div>
            <span className="font-semibold tracking-tight">Portal</span>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {nav.map((section) => (
            <div key={section.title}>
              <p className="text-xs font-semibold text-white/30 uppercase tracking-wider px-3 mb-2">{section.title}</p>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const active = location.pathname === item.to || (item.to !== `/pro/dashboard/${role}` && location.pathname.startsWith(item.to));
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                        active ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {item.icon}
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="px-4 py-3 border-t border-white/5">
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2 py-1 rounded-full bg-white/10 text-white/60">{roleLabel}</span>
            {portalUser.org_name && <span className="text-white/30 truncate">{portalUser.org_name}</span>}
          </div>
        </div>
      </aside>

      {mobileOpen && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setMobileOpen(false)} />}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-neutral-950/80 backdrop-blur-md border-b border-white/5">
          <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
            <button onClick={() => setMobileOpen(!mobileOpen)} className="lg:hidden text-white/60">
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            <div className="flex-1 max-w-md hidden sm:block">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  type="text"
                  placeholder="Search catalog, messages..."
                  className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/20"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <NotificationBell />
              <div className="relative">
                <button onClick={() => setShowProfile(!showProfile)} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-neutral-600 to-neutral-800 flex items-center justify-center text-xs font-medium">
                    {(portalUser.display_name ?? portalUser.email).charAt(0).toUpperCase()}
                  </div>
                  <ChevronDown size={14} className="text-white/40" />
                </button>
                {showProfile && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowProfile(false)} />
                    <div className="absolute right-0 top-full mt-1 w-56 bg-neutral-900 border border-white/10 rounded-lg shadow-xl z-20 py-1">
                      <div className="px-3 py-2 border-b border-white/5">
                        <p className="text-sm font-medium truncate">{portalUser.display_name ?? 'User'}</p>
                        <p className="text-xs text-white/40 truncate">{portalUser.email}</p>
                      </div>
                      <button onClick={handleSignOut} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors">
                        <LogOut size={14} /> Sign Out
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

function NotificationBell() {
  const { portalUser } = useProAuth();
  const [unread, setUnread] = useState(0);

  if (portalUser) {
    proSupabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', portalUser.id).is('read_at', null).then(({ count }) => setUnread(count ?? 0));
  }

  return (
    <button className="relative p-2 rounded-lg hover:bg-white/5 transition-colors">
      <Bell size={18} className="text-white/50" />
      {unread > 0 && <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-medium">{unread > 9 ? '9+' : unread}</span>}
    </button>
  );
}
