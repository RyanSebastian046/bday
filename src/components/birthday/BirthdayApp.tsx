import {
  ArrowLeft,
  CakeSlice,
  ChevronLeft,
  ChevronRight,
  Gift,
  Heart,
  Image,
  MessageCircleHeart,
  Music2,
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
  Sparkles,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from "react";

import { Button } from "@/components/ui/button";
import { config, fill, type Screen } from "@/config";
import { cn } from "@/lib/utils";

const menuItems = [
  { screen: "message", icon: MessageCircleHeart },
  { screen: "gallery", icon: Image },
  { screen: "playlist", icon: Music2 },
  { screen: "game", icon: Heart },
  { screen: "wish", icon: CakeSlice },
] as const;

const featureTitles: Record<(typeof menuItems)[number]["screen"], string> = config.ui.screens;

const safePlay = (audio: HTMLAudioElement | null) => {
  if (!audio) return;
  void audio.play().catch(() => undefined);
};

function MediaImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);

  if (failed) {
    return (
      <div className={cn("media-fallback", className)} role="img" aria-label={alt}>
        <Heart aria-hidden="true" />
        <Sparkles aria-hidden="true" />
      </div>
    );
  }
  return <img src={src} alt={alt} className={className} onError={() => setFailed(true)} />;
}

function BackgroundCelebration({ burst = false }: { burst?: boolean }) {
  const balloons = useMemo(() => Array.from({ length: 8 }, (_, index) => index), []);
  const pieces = useMemo(() => Array.from({ length: burst ? 70 : 22 }, (_, index) => index), [burst]);
  return (
    <div className={cn("celebration-layer", burst && "celebration-burst")} aria-hidden="true">
      {balloons.map((item) => <span key={`b${item}`} className={`balloon balloon-${item % 4}`} />)}
      {pieces.map((item) => <i key={`c${item}`} className={`confetti confetti-${item % 6}`} />)}
    </div>
  );
}

function BackHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <header className="feature-header">
      <Button variant="soft" size="icon" onClick={onBack} aria-label={config.ui.back} title={config.ui.back}>
        <ArrowLeft />
      </Button>
      <h1>{title}</h1>
      <div className="header-spacer" />
    </header>
  );
}

function MessageScreen({ onBack }: { onBack: () => void }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (count >= config.birthdayMessage.length) return;
    const timer = window.setTimeout(() => setCount((value) => value + 1), 40);
    return () => window.clearTimeout(timer);
  }, [count]);

  const complete = count >= config.birthdayMessage.length;
  return (
    <section className="screen-shell feature-screen">
      <BackHeader title={config.ui.screens.message} onBack={onBack} />
      <div className="message-card">
        <div className="profile-ring">
          <MediaImage src={config.profilePhoto} alt={config.recipientName} className="profile-photo" />
        </div>
        <h2>{fill(config.ui.birthdayGreeting, { name: config.recipientName })}</h2>
        <div className="message-copy">
          <p>{config.birthdayMessage.slice(0, count)}<span className={cn("typing-cursor", complete && "cursor-hidden")}>|</span></p>
          {!complete && <Button variant="link" onClick={() => setCount(config.birthdayMessage.length)}>{config.ui.skip}</Button>}
        </div>
        <p className="signature">— {config.senderName}</p>
      </div>
    </section>
  );
}

function GalleryScreen({ onBack }: { onBack: () => void }) {
  const [active, setActive] = useState(0);
  const [resetKey, setResetKey] = useState(0);
  const touchStart = useRef<number | null>(null);
  const count = config.gallery.length;
  const move = useCallback((direction: number, manual = false) => {
    setActive((value) => (value + direction + count) % count);
    if (manual) setResetKey((value) => value + 1);
  }, [count]);

  useEffect(() => {
    const timer = window.setInterval(() => move(1), 4000);
    return () => window.clearInterval(timer);
  }, [move, resetKey]);

  const photo = config.gallery[active] ?? config.gallery[0];
  if (!photo) return null;
  return (
    <section className="screen-shell feature-screen">
      <BackHeader title={config.ui.screens.gallery} onBack={onBack} />
      <div className="gallery-layout">
        <div
          className="main-photo-wrap"
          onTouchStart={(event) => { touchStart.current = event.touches[0]?.clientX ?? null; }}
          onTouchEnd={(event) => {
            const start = touchStart.current;
            const end = event.changedTouches[0]?.clientX;
            if (start !== null && end !== undefined && Math.abs(end - start) > 45) move(end < start ? 1 : -1, true);
            touchStart.current = null;
          }}
        >
          <MediaImage src={photo.src} alt={photo.caption} className="main-photo" />
          <Button variant="glass" size="icon" className="photo-arrow photo-arrow-left" onClick={() => move(-1, true)} aria-label={config.ui.previousPhoto}><ChevronLeft /></Button>
          <Button variant="glass" size="icon" className="photo-arrow photo-arrow-right" onClick={() => move(1, true)} aria-label={config.ui.nextPhoto}><ChevronRight /></Button>
        </div>
        <p className="photo-caption">{photo.caption}</p>
        <div className="thumbnail-strip">
          {config.gallery.map((item, index) => (
            <button
              type="button"
              key={item.src}
              className={cn("polaroid", active === index && "polaroid-active")}
              onClick={() => { setActive(index); setResetKey((value) => value + 1); }}
              aria-label={item.caption}
            >
              <MediaImage src={item.src} alt={item.caption} />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function formatTime(value: number) {
  if (!Number.isFinite(value)) return "0:00";
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function PlaylistScreen({ onBack }: { onBack: () => void }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [trackIndex, setTrackIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);
  const track = config.playlist[trackIndex] ?? config.playlist[0];

  const selectTrack = useCallback((index: number, autoplay: boolean) => {
    setTrackIndex((index + config.playlist.length) % config.playlist.length);
    setElapsed(0);
    setPlaying(autoplay);
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.load();
    if (playing) safePlay(audio);
  }, [trackIndex, playing]);

  useEffect(() => () => {
    audioRef.current?.pause();
  }, []);

  if (!track) return null;
  return (
    <section className="screen-shell feature-screen">
      <BackHeader title={config.ui.screens.playlist} onBack={onBack} />
      <div className="playlist-layout">
        <div className="player-card">
          <MediaImage src={track.cover} alt={track.title} className="album-art" />
          <h2>{track.title}</h2><p>{track.artist}</p>
          <audio
            ref={audioRef}
            src={track.src}
            onTimeUpdate={(event) => setElapsed(event.currentTarget.currentTime)}
            onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => selectTrack(trackIndex + 1, true)}
          />
          <input
            className="seek-bar"
            type="range"
            min="0"
            max={duration || 0}
            step="0.1"
            value={Math.min(elapsed, duration || 0)}
            aria-label={track.title}
            onChange={(event) => {
              const value = Number(event.target.value);
              if (audioRef.current) audioRef.current.currentTime = value;
              setElapsed(value);
            }}
          />
          <div className="time-row"><span>{formatTime(elapsed)}</span><span>{formatTime(duration)}</span></div>
          <div className="player-controls">
            <Button variant="soft" size="icon" onClick={() => selectTrack(trackIndex - 1, playing)} aria-label={config.ui.previousTrack}><SkipBack /></Button>
            <Button variant="romantic" size="player" onClick={() => {
              const audio = audioRef.current;
              if (!audio) return;
              if (audio.paused) safePlay(audio); else audio.pause();
            }} aria-label={playing ? config.ui.pause : config.ui.play}>{playing ? <Pause /> : <Play />}</Button>
            <Button variant="soft" size="icon" onClick={() => selectTrack(trackIndex + 1, playing)} aria-label={config.ui.nextTrack}><SkipForward /></Button>
          </div>
        </div>
        <div className="track-list">
          {config.playlist.map((item, index) => (
            <button type="button" key={item.src} onClick={() => selectTrack(index, true)} className={cn("track-row", trackIndex === index && "track-active")}>
              <MediaImage src={item.cover} alt={item.title} />
              <span><strong>{item.title}</strong><small>{item.artist}</small></span>
              {trackIndex === index && <Music2 aria-hidden="true" />}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

type FallingHeart = { id: number; left: number; duration: number; born: number };

function GameScreen({ onBack }: { onBack: () => void }) {
  const [score, setScore] = useState(0);
  const [missed, setMissed] = useState(0);
  const [time, setTime] = useState<number>(config.gameDuration);
  const [hearts, setHearts] = useState<FallingHeart[]>([]);
  const [run, setRun] = useState(0);
  const missTimers = useRef(new Map<number, number>());
  const finished = time === 0;

  useEffect(() => {
    setScore(0); setMissed(0); setTime(config.gameDuration); setHearts([]);
    let nextId = 0;
    const spawned = missTimers.current;
    const spawnTimer = window.setInterval(() => {
      const id = nextId++;
      const duration = 2800 + Math.random() * 2400;
      const born = Date.now();
      setHearts((items) => [...items, { id, left: 5 + Math.random() * 86, duration, born }]);
      spawned.set(id, window.setTimeout(() => {
        setHearts((items) => items.filter((heart) => heart.id !== id));
        setMissed((value) => value + 1);
        spawned.delete(id);
      }, duration));
    }, 800);
    const clock = window.setInterval(() => setTime((value) => Math.max(0, value - 1)), 1000);
    const endTimer = window.setTimeout(() => {
      window.clearInterval(spawnTimer);
      window.clearInterval(clock);
      spawned.forEach((timer) => window.clearTimeout(timer));
      spawned.clear();
      setHearts([]);
      setTime(0);
    }, config.gameDuration * 1000);
    return () => {
      window.clearInterval(spawnTimer); window.clearInterval(clock);
      window.clearTimeout(endTimer);
      spawned.forEach((timer) => window.clearTimeout(timer));
    };
  }, [run]);

  useEffect(() => {
    if (!finished) return;
    setHearts([]);
  }, [finished]);

  const catchHeart = (id: number, event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    const timer = missTimers.current.get(id);
    if (timer !== undefined) window.clearTimeout(timer);
    missTimers.current.delete(id);
    setHearts((items) => items.filter((heart) => heart.id !== id));
    setScore((value) => value + 1);
  };

  return (
    <section className="screen-shell feature-screen game-screen">
      <BackHeader title={config.ui.gameTitle} onBack={onBack} />
      <div className="score-board">
        <span><small>{config.ui.score}</small><strong>{score}</strong></span>
        <span><small>{config.ui.missed}</small><strong>{missed}</strong></span>
        <span><small>{config.ui.time}</small><strong>{time}</strong></span>
      </div>
      <div className="game-field">
        {!finished && hearts.map((heart) => (
          <button
            type="button"
            key={heart.id}
            className="falling-heart"
            style={{ left: `${heart.left}%`, animationDuration: `${heart.duration}ms` }}
            onPointerDown={(event) => catchHeart(heart.id, event)}
            aria-label={config.ui.gameTitle}
          ><Heart fill="currentColor" /></button>
        ))}
      </div>
      {finished && (
        <div className="modal-backdrop">
          <BackgroundCelebration burst />
          <div className="game-modal">
            <Sparkles />
            <h2>{config.ui.gameOver}</h2>
            <p>{fill(config.ui.finalScore, { score })}</p>
            <div className="secret-card"><small>{config.ui.secret}</small><strong>{config.gameSecretMessage}</strong></div>
            <Button variant="romantic" size="lg" onClick={() => setRun((value) => value + 1)}><RotateCcw />{config.ui.playAgain}</Button>
          </div>
        </div>
      )}
    </section>
  );
}

function Cake({ candles, onCandle }: { candles: boolean[]; onCandle: (index: number) => void }) {
  return (
    <div className="cake-scene" role="img" aria-label={config.ui.screens.wish}>
      <div className="candles-row">
        {candles.map((lit, index) => (
          <button type="button" key={index} className="candle" onClick={() => onCandle(index)} aria-label={fill(config.ui.candleLabel, { number: index + 1 })}>
            <span className={cn("flame", !lit && "flame-out")} /><span className="wick" /><span className="candle-stick" />
          </button>
        ))}
      </div>
      <div className="cake-top"><span /><span /><span /><span /><span /></div>
      <div className="cake-tier cake-tier-top"><i /><i /><i /></div>
      <div className="cake-tier cake-tier-bottom"><span className="cake-heart">♥</span></div>
      <div className="cake-plate" />
    </div>
  );
}

function WishScreen({ onBack }: { onBack: () => void }) {
  const [candles, setCandles] = useState([true, true, true, true, true]);
  const complete = candles.every((lit) => !lit);
  const extinguish = (index: number) => setCandles((items) => items.map((lit, itemIndex) => itemIndex === index ? false : lit));
  return (
    <section className="screen-shell feature-screen wish-screen">
      <BackHeader title={config.ui.screens.wish} onBack={onBack} />
      <p className="wish-hint">{config.ui.wishHint}</p>
      <Cake candles={candles} onCandle={extinguish} />
      <Button variant="soft" onClick={() => setCandles([true, true, true, true, true])}><RotateCcw />{config.ui.relight}</Button>
      {complete && <div className="wish-celebration"><BackgroundCelebration burst /><h2>{fill(config.ui.wishComplete, { name: config.recipientName })}</h2></div>}
    </section>
  );
}

export function BirthdayApp() {
  const [screen, setScreen] = useState<Screen>("welcome");
  const [muted, setMuted] = useState(false);
  const backgroundAudio = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (screen !== "loading") return;
    const timer = window.setTimeout(() => setScreen("menu"), 2500);
    return () => window.clearTimeout(timer);
  }, [screen]);

  useEffect(() => {
    const audio = backgroundAudio.current;
    if (!audio || screen === "welcome" || screen === "loading") return;
    if (screen === "playlist" || muted) audio.pause(); else safePlay(audio);
  }, [screen, muted]);

  const openGift = () => {
    safePlay(backgroundAudio.current);
    setScreen("loading");
  };

  const goMenu = () => setScreen("menu");
  return (
    <main className="birthday-app">
      <BackgroundCelebration />
      <audio ref={backgroundAudio} src={config.backgroundMusic} loop muted={muted} />
      <div key={screen} className="screen-transition">
        {screen === "welcome" && (
          <section className="screen-shell welcome-screen">
            <div className="welcome-spark"><Sparkles /></div>
            <h1>{fill(config.ui.welcomeTitle, { name: config.recipientName })}</h1>
            <button type="button" className="gift-button" onClick={openGift} aria-label={config.ui.openGiftLabel}>
              <span className="gift-lid"><i /></span><span className="gift-box"><i /></span><Gift />
            </button>
            <p>{config.ui.welcomeHint}</p>
          </section>
        )}
        {screen === "loading" && <section className="screen-shell loading-screen"><div className="heart-loader"><Heart fill="currentColor" /></div><p>{config.ui.loading}</p></section>}
        {screen === "menu" && (
          <section className="screen-shell menu-screen">
            <div className="menu-heading"><Sparkles /><h1>{config.ui.menuTitle}</h1><p>{fill(config.ui.menuSubtitle, { sender: config.senderName })}</p></div>
            <div className="menu-grid">
              {menuItems.map(({ screen: itemScreen, icon: Icon }, index) => (
                <Button key={itemScreen} variant="menu" className={cn(index === 4 && "menu-card-wide")} onClick={() => setScreen(itemScreen)}>
                  <span className="menu-icon"><Icon /></span><span>{featureTitles[itemScreen]}</span><ChevronRight className="menu-chevron" />
                </Button>
              ))}
            </div>
          </section>
        )}
        {screen === "message" && <MessageScreen onBack={goMenu} />}
        {screen === "gallery" && <GalleryScreen onBack={goMenu} />}
        {screen === "playlist" && <PlaylistScreen onBack={goMenu} />}
        {screen === "game" && <GameScreen onBack={goMenu} />}
        {screen === "wish" && <WishScreen onBack={goMenu} />}
      </div>
      {screen !== "welcome" && screen !== "loading" && (
        <Button variant="floating" size="icon" className="mute-button" onClick={() => setMuted((value) => !value)} aria-label={muted ? config.ui.unmute : config.ui.mute} title={muted ? config.ui.unmute : config.ui.mute}>
          {muted ? <VolumeX /> : <Volume2 />}
        </Button>
      )}
    </main>
  );
}