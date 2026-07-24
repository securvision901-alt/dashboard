import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { Music, Calendar, Image as ImageIcon, Video, User, Home, LogOut, Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/Toast';
import PortalHomePage from '@/portal/pages/PortalHomePage';
import PortalEventsPage from '@/portal/pages/PortalEventsPage';
import PortalEventDetailPage from '@/portal/pages/PortalEventDetailPage';
import PortalGalleryPage from '@/portal/pages/PortalGalleryPage';
import PortalVideosPage from '@/portal/pages/PortalVideosPage';
import PortalLoginPage from '@/portal/pages/PortalLoginPage';
import PortalSignupPage from '@/portal/pages/PortalSignupPage';
import PortalDashboardPage from '@/portal/pages/PortalDashboardPage';

export default function PortalApp() {
  const [user, setUser] = useState(supabase.auth.getUser().then((u) => u.data.user).catch(() => null));
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => { setUser(session?.user ?? null); })();
    });
    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    toast('success', 'Signed out');
    navigate('/portal');
  };

  const navItems = [
    { to: '/portal', label: 'Home', icon: <Home size={18} /> },
    { to: '/portal/events', label: 'Events', icon: <Calendar size={18} /> },
    { to: '/portal/gallery', label: 'Gallery', icon: <ImageIcon size={18} /> },
    { to: '/portal/videos', label: 'Videos', icon: <Video size={18} /> },
  ];

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-neutral-950/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link to="/portal" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
              <Music size={18} className="text-white" />
            </div>
            <span className="font-semibold tracking-tight">My Artist</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === item.to ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Auth */}
          <div className="hidden md:flex items-center gap-2">
            {user ? (
              <>
                <Link to="/portal/dashboard" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors">
                  <User size={16} /> Dashboard
                </Link>
                <button onClick={signOut} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors">
                  <LogOut size={16} /> Sign Out
                </button>
              </>
            ) : (
              <>
                <Link to="/portal/login" className="px-3 py-2 rounded-lg text-sm text-white/60 hover:text-white transition-colors">Sign In</Link>
                <Link to="/portal/signup" className="px-4 py-2 rounded-lg text-sm font-medium bg-white text-neutral-900 hover:bg-white/90 transition-colors">Sign Up</Link>
              </>
            )}
          </div>

          {/* Mobile toggle */}
          <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden text-white/60">
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <nav className="md:hidden border-t border-white/5 px-4 py-3 space-y-1">
            {navItems.map((item) => (
              <Link key={item.to} to={item.to} onClick={() => setMobileOpen(false)} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/5">
                {item.icon}{item.label}
              </Link>
            ))}
            {user ? (
              <>
                <Link to="/portal/dashboard" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/5"><User size={16} /> Dashboard</Link>
                <button onClick={() => { signOut(); setMobileOpen(false); }} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/5"><LogOut size={16} /> Sign Out</button>
              </>
            ) : (
              <div className="flex gap-2 pt-2">
                <Link to="/portal/login" onClick={() => setMobileOpen(false)} className="flex-1 text-center px-3 py-2 rounded-lg text-sm text-white/60 border border-white/10">Sign In</Link>
                <Link to="/portal/signup" onClick={() => setMobileOpen(false)} className="flex-1 text-center px-3 py-2 rounded-lg text-sm font-medium bg-white text-neutral-900">Sign Up</Link>
              </div>
            )}
          </nav>
        )}
      </header>

      {/* Content */}
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<PortalHomePage />} />
          <Route path="/events" element={<PortalEventsPage />} />
          <Route path="/events/:id" element={<PortalEventDetailPage />} />
          <Route path="/gallery" element={<PortalGalleryPage />} />
          <Route path="/videos" element={<PortalVideosPage />} />
          <Route path="/login" element={<PortalLoginPage />} />
          <Route path="/signup" element={<PortalSignupPage />} />
          <Route path="/dashboard" element={<PortalDashboardPage />} />
        </Routes>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 px-4 text-center">
        <p className="text-sm text-white/30">© 2026 My Artist. All rights reserved.</p>
        <a href="/" className="text-xs text-white/20 hover:text-white/40 mt-1 inline-block">Admin Portal</a>
      </footer>
    </div>
  );
}
