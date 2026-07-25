import { Link } from 'react-router-dom';
import { Star, Quote, Play, ExternalLink, Calendar, MapPin, Music, Award } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

const PHOTOS = [
  'https://images.pexels.com/photos/167636/pexels-photo-167636.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/1370545/pexels-photo-1370545.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/995301/pexels-photo-995301.jpeg?auto=compress&cs=tinysrgb&w=800',
];

const PRESS_QUOTES = [
  {
    quote:
      'Nova Sound Collective delivers a transcendent live experience that blurs the line between DJ set and live orchestration.',
    source: 'Mixmag',
    rating: 5,
  },
  {
    quote:
      'One of the most exciting electronic acts to emerge from Berlin this decade. Their sets are meticulously crafted journeys.',
    source: 'Resident Advisor',
    rating: 5,
  },
  {
    quote:
      'A masterclass in crowd reading and sonic storytelling. Book them before the festival circuit makes them unattainable.',
    source: 'DJ Mag',
    rating: 4,
  },
];

const VIDEOS = [
  { title: 'Live at Berghain — Full Set', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', duration: '1:24:00' },
  { title: 'Festival Highlight Reel — Summer Tour', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', duration: '4:32' },
  { title: 'Acoustic Session — Boiler Room', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', duration: '28:15' },
];

const NOTABLE_SHOWS = [
  { event: 'Berlin Music Week', venue: 'Berghain', date: 'Sep 2024', city: 'Berlin, DE' },
  { event: 'Tomorrowland', venue: 'Main Stage', date: 'Jul 2024', city: 'Boom, BE' },
  { event: 'Coachella', venue: 'Yuma Tent', date: 'Apr 2024', city: 'Indio, CA' },
  { event: 'Movement Festival', venue: 'Stage 2', date: 'May 2024', city: 'Detroit, MI' },
];

export default function BookingEPK() {
  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="relative rounded-2xl overflow-hidden border border-white/10">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${PHOTOS[0]})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/80 to-neutral-950/40" />
        <div className="relative px-8 py-16 sm:px-12 sm:py-20">
          <div className="flex flex-wrap gap-2 mb-4">
            <Badge color="purple" size="md">Electronic / House</Badge>
            <Badge color="teal" size="md">Berlin, DE</Badge>
            <Badge color="green" size="md">Available 2025</Badge>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">Nova Sound Collective</h1>
          <p className="mt-3 text-lg text-white/70 max-w-2xl">
            Electronic duo crafting immersive live performances blending analog synthesis with cutting-edge production.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/pro/dashboard/booking/request">
              <Button variant="primary" size="lg" className="bg-white text-neutral-900 hover:bg-white/90">
                <Calendar size={18} /> Book This Artist
              </Button>
            </Link>
            <a href="#press">
              <Button variant="ghost" size="lg" className="text-white hover:bg-white/10">
                <Star size={18} /> Press & Reviews
              </Button>
            </a>
          </div>
        </div>
      </div>

      {/* Bio */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-8">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <Music size={20} className="text-white/50" /> Biography
        </h2>
        <div className="space-y-4 text-white/70 leading-relaxed">
          <p>
            Nova Sound Collective is a Berlin-based electronic duo known for their genre-defying live performances that
            seamlessly blend house, techno, and ambient soundscapes. Formed in 2019, the duo has quickly risen through
            the European underground circuit to become one of the most sought-after live electronic acts.
          </p>
          <p>
            Their debut album <span className="text-white font-medium">"Resonance Fields"</span> earned critical acclaim
            for its innovative use of modular synthesis and field recordings, landing on multiple year-end lists. The
            follow-up EP, <span className="text-white font-medium">"Nocturne"</span>, solidified their reputation for
            crafting immersive sonic environments that translate powerfully to festival and club stages alike.
          </p>
          <p>
            With over 150 performances across 12 countries — including marquee slots at Tomorrowland, Coachella, and
            Berlin Music Week — Nova Sound Collective brings a level of production sophistication and crowd engagement
            that few in the electronic space can match.
          </p>
        </div>
      </div>

      {/* Photo Gallery */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <Award size={20} className="text-white/50" /> Live Photos
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {PHOTOS.map((photo, i) => (
            <div
              key={i}
              className="aspect-square rounded-xl overflow-hidden border border-white/10 bg-white/5 group"
            >
              <img
                src={photo}
                alt={`Nova Sound Collective live photo ${i + 1}`}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Press Quotes */}
      <div id="press" className="bg-white/5 border border-white/10 rounded-xl p-8">
        <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
          <Quote size={20} className="text-white/50" /> Press & Reviews
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PRESS_QUOTES.map((item, i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-lg p-5 flex flex-col">
              <div className="flex gap-0.5 mb-3">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Star
                    key={j}
                    size={14}
                    className={j < item.rating ? 'text-amber-400 fill-amber-400' : 'text-white/20'}
                  />
                ))}
              </div>
              <p className="text-sm text-white/80 leading-relaxed flex-1">"{item.quote}"</p>
              <p className="mt-3 text-xs font-semibold text-white/50 uppercase tracking-wider">— {item.source}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Video / Live Links */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-8">
        <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
          <Play size={20} className="text-white/50" /> Video & Live Links
        </h2>
        <div className="space-y-3">
          {VIDEOS.map((video, i) => (
            <a
              key={i}
              href={video.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                  <Play size={20} className="text-white/70" fill="currentColor" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{video.title}</p>
                  <p className="text-xs text-white/40">{video.duration}</p>
                </div>
              </div>
              <ExternalLink size={16} className="text-white/30 group-hover:text-white/60 transition-colors" />
            </a>
          ))}
        </div>
      </div>

      {/* Notable Shows */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-8">
        <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
          <Calendar size={20} className="text-white/50" /> Notable Past Shows
        </h2>
        <div className="space-y-2">
          {NOTABLE_SHOWS.map((show, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                  <Music size={16} className="text-white/50" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{show.event}</p>
                  <p className="text-xs text-white/40 flex items-center gap-1">
                    <MapPin size={12} /> {show.venue} — {show.city}
                  </p>
                </div>
              </div>
              <span className="text-xs text-white/40">{show.date}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
