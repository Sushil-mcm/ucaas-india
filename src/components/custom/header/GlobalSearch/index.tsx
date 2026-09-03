import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { globalSearch } from '@/services/api';
import useDebounce from '@/hooks/use-debounce';
import { filterPages, resolveApiResultPath } from './search-config';
import type { SearchablePage } from './search-config';
import { useQuery } from '@tanstack/react-query';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ApiSearchResult {
  type: string;
  id: string;
  title: string;
  raw: Record<string, any>;
  score: number;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const SearchIcon = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 15 15"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="text-slate-400"
  >
    <path
      d="M10 6.5C10 8.433 8.433 10 6.5 10C4.567 10 3 8.433 3 6.5C3 4.567 4.567 3 6.5 3C8.433 3 10 4.567 10 6.5ZM9.30884 10.0159C8.53901 10.6318 7.56251 11 6.5 11C4.01472 11 2 8.98528 2 6.5C2 4.01472 4.01472 2 6.5 2C8.98528 2 11 4.01472 11 6.5C11 7.56251 10.6318 8.53901 10.0159 9.30884L12.8536 12.1464C13.0488 12.3417 13.0488 12.6583 12.8536 12.8536C12.6583 13.0488 12.3417 13.0488 12.1464 12.8536L9.30884 10.0159Z"
      fill="currentColor"
      fillRule="evenodd"
      clipRule="evenodd"
    />
  </svg>
);

const LoadingSpinner = () => (
  <svg
    className="animate-spin text-primary"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    width="14"
    height="14"
  >
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
    />
  </svg>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const GlobalSearch = () => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const [activeIndex, setActiveIndex] = useState(-1);

  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebounce(query, 350);

  const { data: apiResultsResponse, isFetching: isLoading } = useQuery({
    queryKey: ['globalSearch', debouncedQuery.trim()],
    queryFn: () => globalSearch({ searchText: debouncedQuery.trim(), limit: 3 }),
    enabled: debouncedQuery.trim().length >= 2,
    staleTime: 1000 * 60 * 5, // 5 mins
  });

  const apiResults: ApiSearchResult[] =
    debouncedQuery.trim().length >= 2
      ? (apiResultsResponse?.data?.data?.result?.results ?? [])
      : [];

  // ── Filtered static pages ──────────────────────────────────────────────────
  const pageResults: SearchablePage[] = debouncedQuery.trim() ? filterPages(debouncedQuery) : [];

  // ── Total result count for keyboard nav ────────────────────────────────────
  const totalResults = apiResults.length + pageResults.length;

  // ── Click outside to close ─────────────────────────────────────────────────
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── ⌘K / Ctrl-K focuses search from anywhere ──────────────────────────────
  useEffect(() => {
    const handleShortcut = (e: KeyboardEvent) => {
      if (e.key?.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
        return;
      }
      // Escape gives the field up again, but only while it holds focus, so it
      // cannot swallow Escape from a dialog on top of the page.
      if (e.key === 'Escape' && document.activeElement === inputRef.current) {
        inputRef.current?.blur();
        setIsOpen(false);
        setActiveIndex(-1);
      }
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, []);

  // ── Open dropdown when there's a query ────────────────────────────────────
  useEffect(() => {
    if (query.trim()) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  }, [query]);

  // ── Keyboard navigation ────────────────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((prev) => (prev < totalResults - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : totalResults - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (activeIndex < 0) return;

        if (activeIndex < apiResults.length) {
          // API result selected
          const result = apiResults[activeIndex];
          const path = resolveApiResultPath(result);
          navigate(path);
        } else {
          // Page result selected
          const page = pageResults[activeIndex - apiResults.length];
          if (page) navigate(page.path);
        }

        setIsOpen(false);
        setQuery('');
        setActiveIndex(-1);
      } else if (e.key === 'Escape') {
        setIsOpen(false);
        setActiveIndex(-1);
        inputRef.current?.blur();
      }
    },
    [isOpen, totalResults, activeIndex, apiResults, pageResults, navigate],
  );

  // ── Navigate to API result ──────────────────────────────────────────────────
  const handleApiResultClick = (result: ApiSearchResult) => {
    const path = resolveApiResultPath(result);
    console.log(path, 'pathpath');

    navigate(path);
    setIsOpen(false);
    setQuery('');
    setActiveIndex(-1);
  };

  // ── Navigate to page result ────────────────────────────────────────────────
  const handlePageClick = (page: SearchablePage) => {
    navigate(page.path);
    setIsOpen(false);
    setQuery('');
    setActiveIndex(-1);
  };

  const hasAnyResults = apiResults.length > 0 || pageResults.length > 0;
  const showDropdown = isOpen && query.trim().length > 0;

  return (
    <div
      ref={containerRef}
      className="global-search-root w-[200px] sm:w-[260px] lg:w-[300px] min-[1440px]:w-[380px]"
    >
      <div className="global-search-input-wrapper ">
        <SearchIcon />
        <input
          ref={inputRef}
          id="global-search-input"
          type="text"
          value={query}
          placeholder="Search here..."
          autoComplete="off"
          className="global-search-input"
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.trim() && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          aria-label="Global search"
          aria-expanded={showDropdown}
          aria-autocomplete="list"
          aria-controls="global-search-dropdown"
          maxLength={50}
        />
        <kbd className="global-search-kbd" aria-hidden="true">
          {typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
            ? '⌘K'
            : 'Ctrl + K'}
        </kbd>

        {isLoading && (
          <span className="global-search-spinner">
            <LoadingSpinner />
          </span>
        )}
      </div>

      {/* ── Dropdown ──────────────────────────────────────────────────────── */}
      {showDropdown && (
        <div
          id="global-search-dropdown"
          className="global-search-dropdown"
          role="listbox"
          aria-label="Search results"
        >
          {/* ── Loader placeholder while no data yet ── */}
          {isLoading && !hasAnyResults && (
            <div className="global-search-empty">
              <LoadingSpinner />
              <span style={{ marginLeft: 8, fontSize: 13, color: '#888' }}>Searching…</span>
            </div>
          )}

          {/* ── No results ── */}
          {!isLoading && !hasAnyResults && (
            <p className="global-search-empty" style={{ color: '#888', fontSize: 13 }}>
              No results found
            </p>
          )}

          {/* ── API results section ─────────────────────────────────────── */}
          {apiResults.length > 0 && (
            <section>
              <p className="global-search-section-label">RESULTS</p>
              {apiResults.map((result, idx) => (
                <button
                  key={result.id}
                  role="option"
                  aria-selected={activeIndex === idx}
                  className={`global-search-item${activeIndex === idx ? ' is-active' : ''}`}
                  onClick={() => handleApiResultClick(result)}
                  onMouseEnter={() => setActiveIndex(idx)}
                >
                  <span className="global-search-item-title">{result.title}</span>
                  <span className="global-search-item-badge">{capitalize(result.type)}</span>
                </button>
              ))}
            </section>
          )}

          {/* ── Page results section ────────────────────────────────────── */}
          {pageResults.length > 0 && (
            <section>
              <p className="global-search-section-label">PAGES</p>
              {pageResults.map((page, idx) => {
                const globalIdx = apiResults.length + idx;
                return (
                  <button
                    key={page.path + page.label}
                    role="option"
                    aria-selected={activeIndex === globalIdx}
                    className={`global-search-item${activeIndex === globalIdx ? ' is-active' : ''}`}
                    onClick={() => handlePageClick(page)}
                    onMouseEnter={() => setActiveIndex(globalIdx)}
                  >
                    <span className="global-search-item-title">{page.label}</span>
                  </button>
                );
              })}
            </section>
          )}
        </div>
      )}

      {/* ── Empty state when focused but no query ─────────────────────────── */}
      {isOpen && !query.trim() && (
        <div className="global-search-dropdown">
          <p className="global-search-empty" style={{ color: '#aaa', fontSize: 13 }}>
            Type to search pages…
          </p>
        </div>
      )}
    </div>
  );
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function capitalize(str: string) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ');
}

export default GlobalSearch;
