import { type ReactNode, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Disc3,
  ShoppingBag,
  Calendar,
  Inbox,
  Users,
  Mail,
  Plug,
  Bot,
  Download,
  Settings,
  Menu,
  X,
  Search,
  Bell,
  ChevronDown,
  Music,
  Image,
  Video,
  LayoutTemplate,
  Ticket,
  Heart,
  ExternalLink,
  MapPin,
  Radio,
} from 'lucide-react';

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  badge?: string;
}

const navSections: { title: string; items: NavItem[] }[] = [
  {
    title: 'Overview',
    items: [{ to: '/admin', label: 'Dashboard', icon: <LayoutDashboard size={18} /> }],
  },
  {
    title: 'Music',
    items: [
      { to: '/admin/music/albums', label: 'Albums & Tracks', icon: <Disc3 size={18} /> },
      { to: '/admin/music/distribution', label: 'Streaming & Distribution', icon: <Radio size={18} /> },
    ],
  },
  {
    title: 'Shop',
    items: [
      { to: '/admin/shop/products', label: 'Products', icon: <ShoppingBag size={18} /> },
      { to: '/admin/shop/orders', label: 'Orders', icon: <ShoppingBag size={18} /> },
    ],
  },
  {
    title: 'Events',
    items: [
      { to: '/admin/events/tickets', label: 'Ticket Events', icon: <Ticket size={18} /> },
      { to: '/admin/events/tours', label: 'Tour Dates', icon: <MapPin size={18} /> },
    ],
  },
  {
    title: 'Bookings',
    items: [
      { to: '/admin/bookings/pipeline', label: 'Pipeline', icon: <Calendar size={18} /> },
      { to: '/admin/bookings/calendar', label: 'Calendar', icon: <Calendar size={18} /> },
      { to: '/admin/bookings/inquiries', label: 'Inquiries', icon: <Inbox size={18} /> },
    ],
  },
  {
    title: 'Audience',
    items: [
      { to: '/admin/audience/contacts', label: 'Contacts', icon: <Users size={18} /> },
      { to: '/admin/audience/fans', label: 'Fans', icon: <Heart size={18} /> },
      { to: '/admin/audience/campaigns', label: 'Email Campaigns', icon: <Mail size={18} /> },
    ],
  },
  {
    title: 'Content',
    items: [
      { to: '/admin/content', label: 'Pages & Media', icon: <LayoutTemplate size={18} /> },
    ],
  },
  {
    title: 'System',
    items: [
      { to: '/admin/integrations', label: 'Integrations', icon: <Plug size={18} /> },
      { to: '/admin/automation', label: 'Automation', icon: <Bot size={18} /> },
      { to: '/admin/exports', label: 'Exports', icon: <Download size={18} /> },
      { to: '/admin/settings', label: 'Settings', icon: <Settings size={18} /> },
    ],
  },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4">
      {navSections.map((section) => (
        <div key={section.title} className="mb-6">
          <p className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-400">{section.title}</p>
          <div className="space-y-0.5">
            {section.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onNavigate}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-neutral-900 text-white'
                      : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                  }`
                }
              >
                {item.icon}
                <span>{item.label}</span>
                {item.badge && (
                  <span className="ml-auto text-xs bg-neutral-200 text-neutral-600 px-1.5 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

export function AdminLayout({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [artistMenuOpen, setArtistMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-neutral-50 flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 flex-col bg-white border-r border-neutral-200 fixed inset-y-0 left-0 z-30">
        <div className="flex items-center gap-2 px-6 py-5 border-b border-neutral-200">
          <div className="w-8 h-8 rounded-lg bg-neutral-900 flex items-center justify-center">
            <Music size={18} className="text-white" />
          </div>
          <span className="font-semibold text-neutral-900">Admin Portal</span>
        </div>
        <SidebarContent />
        <div className="px-6 py-4 border-t border-neutral-200 space-y-2">
          <a href="/portal" className="flex items-center gap-2 text-xs text-neutral-500 hover:text-neutral-900 transition-colors">
            <ExternalLink size={12} /> View Fan Portal
          </a>
          <a href="/" className="flex items-center gap-2 text-xs text-neutral-500 hover:text-neutral-900 transition-colors">
            <ExternalLink size={12} /> Back to Gate
          </a>
          <p className="text-xs text-neutral-400 mt-1">Admin Portal v3.0</p>
        </div>
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-64 bg-white flex flex-col">
            <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-neutral-900 flex items-center justify-center">
                  <Music size={18} className="text-white" />
                </div>
                <span className="font-semibold text-neutral-900">Admin Portal</span>
              </div>
              <button onClick={() => setMobileOpen(false)} className="text-neutral-400">
                <X size={20} />
              </button>
            </div>
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Topbar */}
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-neutral-200 px-4 lg:px-8 py-3 flex items-center gap-4">
          <button onClick={() => setMobileOpen(true)} className="lg:hidden text-neutral-500">
            <Menu size={22} />
          </button>

          {/* Artist switcher */}
          <div className="relative">
            <button
              onClick={() => setArtistMenuOpen(!artistMenuOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-neutral-100 transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-neutral-700 to-neutral-900 flex items-center justify-center">
                <Music size={14} className="text-white" />
              </div>
              <span className="text-sm font-medium text-neutral-900">My Artist</span>
              <ChevronDown size={16} className="text-neutral-400" />
            </button>
            {artistMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setArtistMenuOpen(false)} />
                <div className="absolute top-full mt-1 left-0 z-20 w-56 bg-white rounded-lg shadow-lg border border-neutral-200 py-1">
                  <div className="px-3 py-2 text-xs font-semibold text-neutral-400 uppercase">Switch Artist</div>
                  <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-neutral-700 to-neutral-900" />
                    My Artist
                  </button>
                  <div className="border-t border-neutral-100 mt-1 pt-1">
                    <button className="w-full text-left px-3 py-2 text-sm text-neutral-500 hover:bg-neutral-50">
                      + Add Artist
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Search */}
          <div className="flex-1 max-w-md ml-2">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                placeholder="Search music, orders, contacts…"
                className="w-full pl-9 pr-4 py-2 text-sm bg-neutral-100 rounded-lg border border-transparent focus:outline-none focus:border-neutral-300 focus:bg-white transition-colors"
              />
            </div>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2 ml-auto">
            <button className="relative p-2 rounded-lg hover:bg-neutral-100 text-neutral-500">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            </button>
            <div className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center text-sm font-medium text-neutral-600">
              A
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 px-4 lg:px-8 py-6">{children}</main>
      </div>
    </div>
  );
}
