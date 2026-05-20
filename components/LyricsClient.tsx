'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { usePlayerStore } from '@/lib/store';

interface LyricsTrack {
  videoId: string;
}

interface LyricLine {
  time: number;
  text: string;
}

interface LyricsClientProps {
  track: LyricsTrack | null;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
}

const FALLBACK_LYRICS = 'Lirik tidak tersedia';
const LRC_TIMESTAMP_REGEX = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g;
const INTRO_GUARD_SECONDS = 0.2;
const OFFSET = 0.1;
const SCROLL_DELAY_MS = 90;

async function fetchLyrics(videoId: string): Promise<string> {
  if (!videoId) {
    return FALLBACK_LYRICS;
  }

  try {
    const response = await fetch(`/api/lyrics?id=${encodeURIComponent(videoId)}`);

    if (!response.ok) {
      return FALLBACK_LYRICS;
    }

    const payload = (await response.json()) as { lyrics?: string | null };
    const lyrics = payload.lyrics?.trim();

    return lyrics || FALLBACK_LYRICS;
  } catch {
    return FALLBACK_LYRICS;
  }
}

function parseTimestampedLyrics(rawLyrics: string, duration: number): LyricLine[] {
  const lines = rawLyrics
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const timestamped = lines
    .flatMap((line) => {
      const matches = Array.from(line.matchAll(LRC_TIMESTAMP_REGEX));

      if (matches.length === 0) {
        return [];
      }

      const text = line.replace(LRC_TIMESTAMP_REGEX, '').trim();
      if (!text) {
        return [];
      }

      return matches
        .map((match) => {
          const minutes = Number(match[1] ?? 0);
          const seconds = Number(match[2] ?? 0);
          const fractionRaw = match[3] ?? '0';
          const fraction = Number(`0.${fractionRaw}`);
          const time = minutes * 60 + seconds + fraction;

          return {
            time,
            text,
          };
        })
        .filter((lineItem) => Number.isFinite(lineItem.time));
    })
    .sort((a, b) => a.time - b.time);

  if (timestamped.length > 0) {
    return timestamped;
  }

  const plainLines = lines.filter((line) => line !== FALLBACK_LYRICS);
  if (plainLines.length === 0) {
    return [{ time: 0, text: FALLBACK_LYRICS }];
  }

  const totalDuration = duration > 0 ? duration : plainLines.length * 4;
  const gap = Math.max(totalDuration / Math.max(plainLines.length, 1), 2);

  return plainLines.map((text, index) => ({
    time: Number((index * gap).toFixed(2)),
    text,
  }));
}

function findCurrentLyricIndex(lyrics: LyricLine[], currentTime: number): number {
  if (!lyrics.length) {
    return -1;
  }

  const firstTime = lyrics[0]?.time ?? 0;
  if (currentTime < firstTime - INTRO_GUARD_SECONDS) {
    return -1;
  }

  let low = 0;
  let high = lyrics.length - 1;
  let best = -1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (lyrics[mid].time <= currentTime) {
      best = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return best;
}

export default function LyricsClient() {
  const track = usePlayerStore((state) => state.currentTrack);
  const playerTime = usePlayerStore((state) => state.progress);
  const duration = usePlayerStore((state) => state.duration);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const [lyrics, setLyrics] = useState(FALLBACK_LYRICS);
  const [isLoading, setIsLoading] = useState(false);
  const [currentLyricIndex, setCurrentLyricIndex] = useState(-1);
  const lineRefs = useRef<Array<HTMLParagraphElement | null>>([]);
  const lyricLoopRafRef = useRef<number | null>(null);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const visualTimeRef = useRef(0);
  const storeTimeRef = useRef(0);
  const storeTimeStampRef = useRef(0);
  const activeIndexRef = useRef(-1);
  const activeProgressRef = useRef(0);
  const logCounterRef = useRef(0);

  useEffect(() => {
    let isMounted = true;

    const loadLyrics = async () => {
      if (!track?.videoId) {
        setLyrics(FALLBACK_LYRICS);
        return;
      }

      setIsLoading(true);
      lineRefs.current = [];

      const nextLyrics = await fetchLyrics(track.videoId);

      if (isMounted) {
        setLyrics(nextLyrics);
        setIsLoading(false);
      }
    };

    loadLyrics();

    return () => {
      isMounted = false;
    };
  }, [track?.videoId]);

  const parsedLyrics = useMemo(() => parseTimestampedLyrics(lyrics, duration), [lyrics, duration]);
  const firstLyricTime = parsedLyrics[0]?.time ?? 0;
  const shouldHideDuringIntro = playerTime + OFFSET < firstLyricTime - INTRO_GUARD_SECONDS;

  useEffect(() => {
    storeTimeRef.current = playerTime;
    storeTimeStampRef.current = performance.now();
    if (!isPlaying) {
      visualTimeRef.current = playerTime;
    }
  }, [isPlaying, playerTime]);

  useEffect(() => {
    if (lyricLoopRafRef.current) {
      cancelAnimationFrame(lyricLoopRafRef.current);
    }

    const updateLyrics = () => {
      const now = performance.now();
      const elapsed = isPlaying ? (now - storeTimeStampRef.current) / 1000 : 0;
      const projectedTime = storeTimeRef.current + elapsed;
      const boundedTime = duration > 0 ? Math.min(projectedTime, duration) : projectedTime;
      const syncedTime = boundedTime + OFFSET;

      visualTimeRef.current = syncedTime;

      const nextIndex = findCurrentLyricIndex(parsedLyrics, syncedTime);
      if (nextIndex !== activeIndexRef.current) {
        activeIndexRef.current = nextIndex;
        setCurrentLyricIndex(nextIndex);
      }

      if (nextIndex >= 0) {
        const currentLine = parsedLyrics[nextIndex];
        const nextLine = parsedLyrics[nextIndex + 1];
        const range = Math.max((nextLine?.time ?? currentLine.time + 2) - currentLine.time, 0.001);
        const progress = Math.min(Math.max((syncedTime - currentLine.time) / range, 0), 1);
        activeProgressRef.current = progress;
      } else {
        activeProgressRef.current = 0;
      }

      lineRefs.current.forEach((lineRef, index) => {
        if (!lineRef) {
          return;
        }

        const distance = activeIndexRef.current >= 0 ? Math.abs(index - activeIndexRef.current) : 99;
        const isActive = index === activeIndexRef.current;
        const isNear = distance <= 1;

        const scale = isActive ? 1 + activeProgressRef.current * 0.05 : isNear ? 1.01 : 1;
        const opacity = isActive ? 1 : isNear ? 0.75 : 0.4;
        const translateY = isActive ? -4 * activeProgressRef.current : 0;

        lineRef.style.opacity = String(opacity);
        lineRef.style.transform = `translate3d(0, ${translateY}px, 0) scale(${scale})`;
        lineRef.style.filter = isActive ? 'blur(0px)' : 'blur(0.6px)';
        lineRef.style.setProperty('--karaoke-progress', `${Math.round((isActive ? activeProgressRef.current : 0) * 100)}%`);
      });

      if (nextIndex >= 0 && logCounterRef.current % 20 === 0) {
        const lyricTime = parsedLyrics[nextIndex]?.time ?? 0;
        const payload = {
          currentTime: Number(boundedTime.toFixed(3)),
          progress: Number(activeProgressRef.current.toFixed(3)),
          lyricTime: Number(lyricTime.toFixed(3)),
          delay: Number((boundedTime - lyricTime).toFixed(3)),
        };
        if (Math.abs(payload.delay) > 0.2) {
          console.warn('[lyrics-sync:drift]', payload);
        } else {
          console.log('[lyrics-sync]', payload);
        }
      }
      logCounterRef.current += 1;
      lyricLoopRafRef.current = requestAnimationFrame(updateLyrics);
    };

    lyricLoopRafRef.current = requestAnimationFrame(updateLyrics);

    return () => {
      if (lyricLoopRafRef.current) {
        cancelAnimationFrame(lyricLoopRafRef.current);
      }
    };
  }, [duration, isPlaying, parsedLyrics]);

  useEffect(() => {
    if (currentLyricIndex < 0 || shouldHideDuringIntro) {
      return;
    }

    const activeLineRef = lineRefs.current[currentLyricIndex];

    if (!activeLineRef) {
      return;
    }

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      activeLineRef.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }, SCROLL_DELAY_MS);

    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [currentLyricIndex, shouldHideDuringIntro]);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={track?.videoId || 'empty-lyrics'}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="h-64 overflow-y-auto rounded-xl bg-white/5 p-4 no-scrollbar"
      >
        {isLoading ? (
          <div className="text-sm text-white/60">Memuat lirik...</div>
        ) : shouldHideDuringIntro ? (
          <div className="text-sm text-white/40">♪ Intro...</div>
        ) : (
          <div className="space-y-3 text-base leading-7 whitespace-pre-wrap">
            {parsedLyrics.map((line, index) => (
              <p
                key={`${line.time}-${index}`}
                ref={(element) => {
                  lineRefs.current[index] = element;
                }}
                className={`group relative origin-center transition-all duration-300 ease-out will-change-transform ${
                  index === currentLyricIndex ? 'font-bold' : 'font-medium'
                }`}
                style={{
                  transform: 'translate3d(0, 0, 0) scale(1)',
                  opacity: 0.4,
                }}
              >
                <span className="relative z-10 text-gray-400">{line.text}</span>
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 z-20 overflow-hidden text-white"
                  style={{ width: 'var(--karaoke-progress, 0%)' }}
                >
                  {line.text}
                </span>
              </p>
            ))}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
