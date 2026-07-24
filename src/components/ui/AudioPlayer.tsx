import { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Pause, Loader2, Lock, Download } from 'lucide-react';

interface AudioPlayerProps {
  src: string;
  title?: string;
  artist?: string;
  previewSeconds?: number;
  isFree?: boolean;
  isPreviewEnabled?: boolean;
  downloadAllowed?: boolean;
  onDownload?: () => void;
  compact?: boolean;
  dark?: boolean;
}

export function AudioPlayer({
  src,
  title,
  artist,
  previewSeconds = 30,
  isFree = false,
  isPreviewEnabled = true,
  downloadAllowed = false,
  onDownload,
  compact = false,
  dark = false,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const canPlayFull = isFree;
  const previewLimit = previewSeconds;

  const handleTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setCurrentTime(audio.currentTime);
    const pct = canPlayFull
      ? (audio.currentTime / (audio.duration || 1)) * 100
      : Math.min((audio.currentTime / previewLimit) * 100, 100);
    setProgress(pct);

    if (!canPlayFull && audio.currentTime >= previewLimit) {
      audio.pause();
      setPlaying(false);
      setProgress(0);
      audio.currentTime = 0;
    }
  }, [canPlayFull, previewLimit]);

  const handleLoadedMetadata = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setDuration(audio.duration);
    setLoading(false);
  }, []);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play();
      setPlaying(true);
    }
  }, [playing]);

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    const maxTime = canPlayFull ? (audio.duration || 0) : previewLimit;
    audio.currentTime = pct * maxTime;
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !src) return;
    audio.load();
    setLoading(true);
  }, [src]);

  const formatTime = (sec: number) => {
    if (!sec || isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const showPreviewBadge = !canPlayFull && isPreviewEnabled;

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${dark ? 'text-white' : 'text-neutral-900'}`}>
        <button
          onClick={togglePlay}
          disabled={loading || !src}
          className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
            dark ? 'bg-white/10 hover:bg-white/20' : 'bg-neutral-900 text-white hover:bg-neutral-800'
          } disabled:opacity-50`}
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : playing ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-medium truncate ${dark ? 'text-white' : 'text-neutral-900'}`}>{title}</div>
          {artist && <div className={`text-xs truncate ${dark ? 'text-white/40' : 'text-neutral-400'}`}>{artist}</div>}
        </div>
        <div className={`flex-1 max-w-[120px] h-1 rounded-full ${dark ? 'bg-white/10' : 'bg-neutral-200'}`}>
          <div className={`h-full rounded-full ${dark ? 'bg-white/40' : 'bg-neutral-400'}`} style={{ width: `${progress}%` }} />
        </div>
        <span className={`text-xs tabular-nums ${dark ? 'text-white/30' : 'text-neutral-400'}`}>{formatTime(currentTime)}</span>
        {showPreviewBadge && <span className={`text-xs ${dark ? 'text-white/30' : 'text-neutral-400'}`}>30s</span>}
        {downloadAllowed && onDownload && (
          <button onClick={onDownload} className={`p-1 rounded ${dark ? 'hover:bg-white/10 text-white/40' : 'hover:bg-neutral-100 text-neutral-400'}`}>
            <Download size={14} />
          </button>
        )}
        {!isPreviewEnabled && !canPlayFull && <Lock size={12} className={dark ? 'text-white/30' : 'text-neutral-300'} />}
        <audio ref={audioRef} src={src} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={handleLoadedMetadata} onEnded={() => setPlaying(false)} preload="metadata" />
      </div>
    );
  }

  return (
    <div className={`rounded-xl p-4 ${dark ? 'bg-white/5 border border-white/10' : 'bg-neutral-50 border border-neutral-200'}`}>
      <div className="flex items-center gap-3 mb-3">
        <button
          onClick={togglePlay}
          disabled={loading || !src}
          className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
            dark ? 'bg-white text-neutral-900 hover:bg-white/90' : 'bg-neutral-900 text-white hover:bg-neutral-800'
          } disabled:opacity-50`}
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : playing ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
        </button>
        <div className="flex-1 min-w-0">
          {title && <div className={`text-sm font-semibold truncate ${dark ? 'text-white' : 'text-neutral-900'}`}>{title}</div>}
          {artist && <div className={`text-xs truncate ${dark ? 'text-white/40' : 'text-neutral-400'}`}>{artist}</div>}
        </div>
        {showPreviewBadge && (
          <span className={`text-xs px-2 py-0.5 rounded-full ${dark ? 'bg-white/10 text-white/50' : 'bg-neutral-200 text-neutral-500'}`}>
            {previewSeconds}s preview
          </span>
        )}
        {!isPreviewEnabled && !canPlayFull && (
          <span className={`flex items-center gap-1 text-xs ${dark ? 'text-white/30' : 'text-neutral-400'}`}>
            <Lock size={12} /> No preview
          </span>
        )}
        {downloadAllowed && onDownload && (
          <button onClick={onDownload} className={`p-2 rounded-lg ${dark ? 'hover:bg-white/10 text-white/40' : 'hover:bg-neutral-100 text-neutral-400'}`}>
            <Download size={16} />
          </button>
        )}
      </div>
      {/* Progress bar */}
      <div className={`relative h-1.5 rounded-full cursor-pointer ${dark ? 'bg-white/10' : 'bg-neutral-200'}`} onClick={seek}>
        <div className={`absolute h-full rounded-full ${dark ? 'bg-white/40' : 'bg-neutral-900'}`} style={{ width: `${progress}%` }} />
      </div>
      <div className={`flex items-center justify-between mt-1.5 text-xs tabular-nums ${dark ? 'text-white/30' : 'text-neutral-400'}`}>
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(canPlayFull ? duration : previewLimit)}</span>
      </div>
      <audio ref={audioRef} src={src} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={handleLoadedMetadata} onEnded={() => setPlaying(false)} preload="metadata" />
    </div>
  );
}
