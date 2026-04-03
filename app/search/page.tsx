'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { db, RecentSearch } from '@/lib/db';
import { TrackItem } from '@/components/TrackItem';
import { ArtistItem } from '@/components/ArtistItem';
import { Search as SearchIcon, ArrowLeft, X, ArrowUpLeft, History } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { SearchSkeleton } from '@/components/SearchSkeleton';

const SEARCH_DEBOUNCE_MS = 350;

const TAB_TO_TYPE: Record<string, string | null> = {
  Semua: null,
  Lagu: 'song',
  Video: 'video',
  Album: 'all',
  Artis: 'artist',
  'Daftar putar': 'playlist',
};

export default function Search() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('Semua');
  const [isFocused, setIsFocused] = useState(false);
  const router = useRouter();

  const tabs = ['Semua', 'Lagu', 'Video', 'Album', 'Artis', 'Daftar putar'];
  const searchCacheRef = useRef<Map<string, any[]>>(new Map());

  useEffect(() => {
    const loadRecentSearches = async () => {
      const searches = await db.getRecentSearches();
      setRecentSearches(searches);
    };

    void loadRecentSearches();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }

    const controller = new AbortController();

    const fetchSuggestions = async () => {
      try {
        const res = await fetch(`/api/suggest?q=${encodeURIComponent(query.trim())}`, { signal: controller.signal });
        const data = (await res.json()) as string[];
        setSuggestions(Array.isArray(data) ? data : []);
      } catch (fetchError: any) {
        if (fetchError?.name !== 'AbortError') {
          console.error('Error fetching suggestions:', fetchError);
          setSuggestions([]);
        }
      }
    };

    void fetchSuggestions();

    return () => controller.abort();
  }, [query]);

  useEffect(() => {
    if (!debouncedQuery) {
      setResults([]);
      setError(null);
      setLoading(false);
      return;
    }

    const type = TAB_TO_TYPE[activeTab];
    const cacheKey = `${activeTab}:${debouncedQuery.toLowerCase()}`;
    const cached = searchCacheRef.current.get(cacheKey);

    if (cached) {
      setResults(cached);
      setError(null);
      return;
    }

    const controller = new AbortController();

    const runSearch = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({ q: debouncedQuery });
        if (type) {
          params.set('type', type);
        }

        const res = await fetch(`/api/search?${params.toString()}`, { signal: controller.signal });
        if (!res.ok) {
          throw new Error(`Search failed (${res.status})`);
        }

        const data = await res.json();
        const normalizedResults = Array.isArray(data) ? data : [];

        console.log('[search-results]', {
          query: debouncedQuery,
          tab: activeTab,
          count: normalizedResults.length,
          sample: normalizedResults[0],
        });

        searchCacheRef.current.set(cacheKey, normalizedResults);
        setResults(normalizedResults);

        await db.addRecentSearch(debouncedQuery);
        const searches = await db.getRecentSearches();
        setRecentSearches(searches);
      } catch (fetchError: any) {
        if (fetchError?.name !== 'AbortError') {
          console.error('Search request failed:', fetchError);
          setResults([]);
          setError('Gagal memuat hasil pencarian. Coba lagi.');
        }
      } finally {
        setLoading(false);
      }
    };

    void runSearch();

    return () => controller.abort();
  }, [activeTab, debouncedQuery]);

  const filteredResults = useMemo(() => {
    if (activeTab === 'Semua') {
      return results;
    }

    if (activeTab === 'Lagu') {
      return results.filter((item) => item.type === 'SONG');
    }

    if (activeTab === 'Video') {
      return results.filter((item) => item.type === 'VIDEO');
    }

    if (activeTab === 'Artis') {
      return results.filter((item) => item.type === 'ARTIST');
    }

    if (activeTab === 'Daftar putar') {
      return results.filter((item) => item.type === 'PLAYLIST');
    }

    return results;
  }, [activeTab, results]);

  const queueResults = useMemo(() => results.filter((item) => item.type !== 'ARTIST'), [results]);

  const handleSuggestionPick = (nextQuery: string) => {
    setQuery(nextQuery);
    setIsFocused(false);
  };

  const handleRemoveRecentSearch = async (e: React.MouseEvent, queryToRemove: string) => {
    e.stopPropagation();
    await db.removeRecentSearch(queryToRemove);
    const searches = await db.getRecentSearches();
    setRecentSearches(searches);
  };

  return (
    <main className="min-h-screen pt-6 pb-24">
      <div className="px-4 mb-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-white hover:bg-white/10 p-2 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="relative flex-1">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => {
              setTimeout(() => setIsFocused(false), 120);
            }}
            placeholder="Cari lagu, artis, album..."
            autoFocus
            className="w-full bg-[#2A2A2A] text-white rounded-full py-2.5 px-4 focus:outline-none focus:ring-1 focus:ring-white/30 transition-all border border-white/5"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setDebouncedQuery('');
                setResults([]);
                setError(null);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex overflow-x-auto no-scrollbar gap-3 mb-6 px-4 snap-x snap-mandatory scroll-smooth">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`whitespace-nowrap px-5 py-2 rounded-full text-sm font-medium transition-colors border snap-center ${
              activeTab === tab
                ? 'bg-white/20 text-white border-white/20'
                : 'bg-transparent text-white/70 border-white/10 hover:bg-white/5'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {query && isFocused && suggestions.length > 0 && (
        <div className="mb-6 border-y border-white/5">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
              onMouseDown={() => handleSuggestionPick(suggestion)}
            >
              <div className="flex items-center gap-4">
                <SearchIcon className="w-5 h-5 text-white/50" />
                <span className="text-white text-base truncate">{suggestion}</span>
              </div>
              <ArrowUpLeft className="w-5 h-5 text-white/50" />
            </button>
          ))}
        </div>
      )}

      {!query && recentSearches.length > 0 && (
        <div className="mb-6">
          {recentSearches.map((search) => (
            <div
              key={`recent-${search.query}`}
              className="flex items-center justify-between px-4 py-3 hover:bg-white/5 cursor-pointer transition-colors"
              onClick={() => handleSuggestionPick(search.query)}
            >
              <div className="flex items-center gap-4 min-w-0">
                <History className="w-6 h-6 text-white/50 shrink-0" />
                <span className="text-white text-base truncate">{search.query}</span>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={(e) => handleRemoveRecentSearch(e, search.query)}
                  className="text-white/50 hover:text-white p-1"
                >
                  <X className="w-5 h-5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setQuery(search.query);
                    setIsFocused(true);
                  }}
                  className="text-white/50 hover:text-white p-1"
                >
                  <ArrowUpLeft className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="px-4">
        {loading ? (
          <>
            <p className="text-sm text-white/60 mb-3">Searching...</p>
            <SearchSkeleton />
          </>
        ) : error ? (
          <div className="flex flex-col items-center justify-center mt-20 text-white/60 text-center">
            <SearchIcon className="w-16 h-16 mb-4 opacity-20" />
            <p>{error}</p>
          </div>
        ) : filteredResults.length > 0 ? (
          <div className="space-y-1 border-t border-white/10 pt-4">
            {filteredResults.map((item, index) => (
              item.type === 'ARTIST'
                ? <ArtistItem key={`artist-${item.artistId || index}`} artist={item} />
                : <TrackItem key={`track-${item.videoId || index}`} track={item} queue={queueResults} />
            ))}
          </div>
        ) : query ? (
          <div className="flex flex-col items-center justify-center mt-20 text-white/50">
            <SearchIcon className="w-16 h-16 mb-4 opacity-20" />
            <p>Tidak ada hasil yang ditemukan</p>
          </div>
        ) : recentSearches.length === 0 ? (
          <div className="flex flex-col items-center justify-center mt-20 text-white/50">
            <SearchIcon className="w-16 h-16 mb-4 opacity-20" />
            <p>Cari lagu, album, atau artis</p>
          </div>
        ) : null}
      </div>
    </main>
  );
}
