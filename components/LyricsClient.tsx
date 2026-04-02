'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';

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
const TIMESTAMP_REGEX = /^\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]\s*(.*)$/;

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
    .map((line) => {
      const match = line.match(TIMESTAMP_REGEX);
      if (!match) {
        return null;
      }

      const minutes = Number(match[1]);
      const seconds = Number(match[2]);
      const millisRaw = match[3] ?? '0';
      const millis = Number(millisRaw.padEnd(3, '0').slice(0, 3));
      const text = match[4]?.trim() || '';

      if (!text) {
        return null;
      }

      return {
        time: minutes * 60 + seconds + millis / 1000,
        text,
      };
    })
    .filter((line): line is LyricLine => Boolean(line))
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
    return 0;
  }

  const index = lyrics.findIndex(
    (line, i) => currentTime >= line.time && currentTime < (lyrics[i + 1]?.time ?? Number.POSITIVE_INFINITY),
  );

  return index === -1 ? lyrics.length - 1 : index;
}

export default function LyricsClient({ track, currentTime, duration, isPlaying }: LyricsClientProps) {
  const [lyrics, setLyrics] = useState(FALLBACK_LYRICS);
  const [isLoading, setIsLoading] = useState(false);
  const lineRefs = useRef<Array<HTMLParagraphElement | null>>([]);

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

  const currentLyricIndex = useMemo(() => {
    if (!parsedLyrics.length) {
      return 0;
    }

    return findCurrentLyricIndex(parsedLyrics, currentTime);
  }, [currentTime, parsedLyrics]);

  useEffect(() => {
    const activeLineRef = lineRefs.current[currentLyricIndex];

    if (!activeLineRef) {
      return;
    }

    activeLineRef.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  }, [currentLyricIndex]);

  useEffect(() => {
    console.log('[lyrics-sync]', {
      currentTime: Number(currentTime.toFixed(3)),
      currentLyricIndex,
      isPlaying,
    });
  }, [currentTime, currentLyricIndex, isPlaying]);

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
        ) : (
          <div className="space-y-3 text-base leading-7 whitespace-pre-wrap">
            {parsedLyrics.map((line, index) => (
              <p
                key={`${line.time}-${index}`}
                ref={(element) => {
                  lineRefs.current[index] = element;
                }}
                className={`origin-center transition-all duration-300 ${
                  index === currentLyricIndex
                    ? 'text-white font-bold scale-105'
                    : 'text-gray-400'
                }`}
              >
                {line.text}
              </p>
            ))}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
