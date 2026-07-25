import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, BarChart3, ChevronRight, Music, Building2, PenLine, Disc3, Calendar, ShoppingBag, FileText } from 'lucide-react';

const PORTALS = [
  {
    id: 'fan',
    tag: 'FAN',
    tagline: 'Listener · Supporter · Community',
    headline: 'For fans who want to go deeper.',
    description: 'Stream music, buy tickets, shop merch, follow the tour, and get first access to everything before it drops.',
    route: '/portal',
    status: 'live' as const,
    features: [
      { icon: <Music size={14} />, label: 'Stream & preview music' },
      { icon: <Calendar size={14} />, label: 'Tour dates & tickets' },
      { icon: <ShoppingBag size={14} />, label: 'Merch shop' },
      { icon: <BarChart3 size={14} />, label: 'Loyalty & spend history' },
    ],
  },
  {
    id: 'industry',
    tag: 'INDUSTRY',
    tagline: 'Label · Booking · Sync · Marketing',
    headline: 'For industry professionals.',
    description: 'Browse the full licensing catalog, check availability and submit booking requests, or request custom work — all in one secure dashboard.',
    route: '/pro/login',
    status: 'live' as const,
    roles: [
      { label: 'Label / Sync Agent', desc: 'Browse metadata, request licenses, manage deals', route: '/pro/dashboard/label' },
      { label: 'Booking Agent', desc: 'EPK, calendar, booking requests', route: '/pro/dashboard/booking' },
    ],
    features: [
      { icon: <Disc3 size={14} />, label: 'Full sync catalog with metadata' },
      { icon: <Calendar size={14} />, label: 'Availability calendar' },
      { icon: <FileText size={14} />, label: 'Deal history & contracts' },
      { icon: <Building2 size={14} />, label: 'Messaging with artist team' },
    ],
  },
  {
    id: 'collab',
    tag: 'ARTIST COLLABS',
    tagline: 'Songwriters · Producers · Collaborators',
    headline: 'For writers and collaborators.',
    description: 'View open collaboration calls, pitch demos, propose co-writes, or make an offer on songs available for outright purchase.',
    route: '/pro/signup',
    status: 'live' as const,
    features: [
      { icon: <PenLine size={14} />, label: 'Open collab calls' },
      { icon: <Music size={14} />, label: 'Submit demos & pitches' },
      { icon: <ShoppingBag size={14} />, label: 'Buy a song outright' },
      { icon: <FileText size={14} />, label: 'Track submissions' },
    ],
  },
];

const STATUS_DOT: Record<string, string> = {
  live: 'bg-emerald-400',
  beta: 'bg-amber-400',
  dev: 'bg-neutral-500',
};

const STATUS_LABEL: Record<string, string> = {
  live: 'Live',
  beta: 'Beta',
  dev: 'In development',
};

export default function GatePage() {
  const navigate = useNavigate();
  const [active, setActive] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const go = (portal: typeof PORTALS[0]) => {
    if (portal.id === 'collab') {
      navigate('/pro/signup?role=writer');
    } else {
      navigate(portal.route);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row font-sans">
      {/* ─── LEFT — dark brand panel ─── */}
      <div className="relative lg:w-[44%] bg-neutral-950 text-white flex flex-col justify-between px-10 py-12 min-h-[50vh] lg:min-h-screen overflow-hidden">
        {/* Subtle texture */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_50%,rgba(255,255,255,0.03)_0%,transparent_70%)]" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        <div className="relative">
          <p className="text-xs tracking-[0.2em] text-white/30 uppercase mb-10">Adea Lyric</p>
          <h1 className="text-5xl sm:text-6xl lg:text-[5.5rem] font-bold leading-[0.92] tracking-tight mb-6">
            Behind<br />
            <em className="not-italic text-white/30">the</em><br />
            <span>sound.</span>
          </h1>
          <p className="text-white/40 text-base leading-relaxed max-w-sm">
            Multiple portals. One mission. Whether you're here to listen, to work, or to manage — this is where the business of the music lives.
          </p>
        </div>

        {/* Active portals status */}
        <div className="relative mt-12 lg:mt-0">
          <p className="text-[10px] tracking-[0.2em] text-white/20 uppercase mb-4">Active Portals</p>
          <div className="space-y-3">
            {PORTALS.map((p) => (
              <button
                key={p.id}
                onClick={() => setActive(active === p.id ? null : p.id)}
                className="flex items-start gap-3 group w-full text-left"
              >
                <div className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${STATUS_DOT[p.status]}`} />
                <div>
                  <p className="text-sm font-medium text-white/70 group-hover:text-white transition-colors">{p.tag === 'FAN' ? 'Fan Portal' : p.tag === 'INDUSTRY' ? 'Industry Portal' : 'Artist Collab Portal'}</p>
                  <p className="text-xs text-white/30">{STATUS_LABEL[p.status]}</p>
                </div>
              </button>
            ))}
          </div>
          <div className="mt-10 pt-6 border-t border-white/5">
            <p className="text-xs tracking-[0.2em] text-white/20 uppercase">West Philadelphia</p>
          </div>
        </div>
      </div>

      {/* ─── RIGHT — role picker ─── */}
      <div className="flex-1 bg-white flex flex-col justify-center px-8 sm:px-12 lg:px-16 py-12 lg:py-16">
        <div className={`transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <p className="text-[10px] tracking-[0.2em] text-neutral-400 uppercase mb-3">Secure Access</p>
          <h2 className="text-4xl sm:text-5xl font-bold text-neutral-900 leading-tight mb-2">
            Who are you?
          </h2>
          <p className="text-4xl sm:text-5xl font-bold text-neutral-300 leading-tight italic mb-6">
            Choose your role.
          </p>
          <p className="text-neutral-500 text-base mb-10 max-w-md leading-relaxed">
            We need to know your intent so we can give you the right experience. Select your role below to continue.
          </p>

          <div className="space-y-3 max-w-xl">
            {PORTALS.map((portal, i) => {
              const isExpanded = active === portal.id;
              return (
                <div
                  key={portal.id}
                  className={`border rounded-xl overflow-hidden transition-all duration-200 ${
                    isExpanded ? 'border-neutral-900 shadow-lg' : 'border-neutral-200 hover:border-neutral-400'
                  }`}
                  style={{ transitionDelay: `${i * 40}ms` }}
                >
                  <button
                    className="w-full flex items-center gap-4 p-4 text-left group"
                    onClick={() => setActive(isExpanded ? null : portal.id)}
                  >
                    <div className={`w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                      isExpanded ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-500 group-hover:bg-neutral-200'
                    }`}>
                      {portal.id === 'fan' && <Music size={20} />}
                      {portal.id === 'industry' && <Building2 size={20} />}
                      {portal.id === 'collab' && <PenLine size={20} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[10px] font-bold tracking-[0.18em] uppercase mb-0.5 ${isExpanded ? 'text-neutral-900' : 'text-neutral-400'}`}>
                        {portal.tag}
                      </p>
                      <p className="text-xs text-neutral-400">{portal.tagline}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${
                        portal.status === 'live' ? 'bg-emerald-50 text-emerald-700' :
                        portal.status === 'beta' ? 'bg-amber-50 text-amber-700' :
                        'bg-neutral-100 text-neutral-500'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[portal.status]}`} />
                        {STATUS_LABEL[portal.status]}
                      </span>
                      <ChevronRight size={16} className={`text-neutral-300 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-neutral-100">
                      <p className="text-sm text-neutral-500 mt-3 mb-3 leading-relaxed">{portal.description}</p>
                      <div className="grid grid-cols-2 gap-1.5 mb-4">
                        {portal.features.map((f) => (
                          <div key={f.label} className="flex items-center gap-2 text-xs text-neutral-500">
                            <span className="text-neutral-300">{f.icon}</span>
                            {f.label}
                          </div>
                        ))}
                      </div>
                      {'roles' in portal && portal.roles && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {portal.roles.map((r) => (
                            <button
                              key={r.label}
                              onClick={(e) => { e.stopPropagation(); navigate(r.route); }}
                              className="text-xs px-3 py-1.5 rounded-lg border border-neutral-200 hover:border-neutral-400 hover:bg-neutral-50 text-neutral-600 transition-colors"
                            >
                              {r.label}
                            </button>
                          ))}
                        </div>
                      )}
                      <button
                        onClick={() => go(portal)}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-700 transition-colors"
                      >
                        {portal.id === 'fan' ? 'Enter Fan Portal' : portal.id === 'collab' ? 'Request Collab Access' : 'Sign In / Request Access'}
                        <ArrowRight size={15} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <p className="text-xs text-neutral-300 mt-8 max-w-md">
            Each portal requires appropriate credentials. Fan and public-facing content is open. Industry and collab access is role-gated.
          </p>
        </div>
      </div>
    </div>
  );
}
