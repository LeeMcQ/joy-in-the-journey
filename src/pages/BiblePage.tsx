import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Search, X, BookMarked, ChevronLeft, ChevronRight, ChevronDown,
  Loader2, WifiOff, Download, CheckCircle2,
} from "lucide-react";
import { useTheme } from "@/components/ui/ThemeProvider";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { cn } from "@/lib/utils";
import { BIBLE_BOOKS, OT_BOOKS, NT_BOOKS, parseReference, type BibleBook } from "@/lib/bibleData";
import { normaliseReference } from "@/lib/scriptureUtils";
import {
  getChapter, lookupReference,
  downloadTranslation, getCachedChapterCount,
  LOCAL_TRANSLATIONS, ONLINE_TRANSLATIONS, bibleGatewayUrl,
  type TranslationId, type VerseResult, type LocalVerse, type DownloadProgress,
} from "@/lib/localBible";
import { BiblePopup } from "@/components/study/BiblePopup";

type ViewMode = "bookSelect" | "chapterSelect" | "reading" | "search" | "download";

export function BiblePage() {
  const { isDark } = useTheme();
  const isOnline = useOnlineStatus();
  const [searchParams, setSearchParams] = useSearchParams();

  const [view, setView] = useState<ViewMode>("bookSelect");
  const [selectedBook, setSelectedBook] = useState<BibleBook | null>(null);
  const [selectedChapter, setSelectedChapter] = useState(1);
  const [translation, setTranslation] = useState<TranslationId>("kjv");

  const [chapterData, setChapterData] = useState<VerseResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [popupRef, setPopupRef] = useState<string | null>(null);
  const [highlightVerse, setHighlightVerse] = useState<number | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<VerseResult | null>(null);
  const [searching, setSearching] = useState(false);

  // Download state
  const [dlProgress, setDlProgress] = useState<DownloadProgress | null>(null);
  const [dlAbort, setDlAbort] = useState<AbortController | null>(null);
  const [cachedCounts, setCachedCounts] = useState<Record<string, number>>({});
  const [activeDownloadId, setActiveDownloadId] = useState<TranslationId | null>(null);

  // Reload cached counts whenever a download completes or starts
  const refreshCounts = useCallback(async () => {
    const entries = await Promise.all(
      LOCAL_TRANSLATIONS.map(async (t) => {
        const count = await getCachedChapterCount(t.id);
        return [t.id, count] as const;
      })
    );
    setCachedCounts(Object.fromEntries(entries));
  }, []);

  useEffect(() => {
    refreshCounts();
  }, [refreshCounts]);

  // Also refresh after a download finishes/errors
  useEffect(() => {
    if (dlProgress?.status === "done" || dlProgress?.status === "error") {
      refreshCounts();
    }
  }, [dlProgress?.status, refreshCounts]);

  // Deep-link: ?ref=John+3:16
  useEffect(() => {
    const ref = searchParams.get("ref");
    if (!ref) return;
    const parsed = parseReference(normaliseReference(ref));
    if (!parsed) return;
    const book = BIBLE_BOOKS.find((b) => b.name.toLowerCase() === parsed.book.toLowerCase());
    if (book) {
      setSelectedBook(book);
      setSelectedChapter(parsed.chapter);
      setView("reading");
      if (parsed.verseStart) setHighlightVerse(parsed.verseStart);
    }
    setSearchParams({}, { replace: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch chapter
  useEffect(() => {
    if (view !== "reading" || !selectedBook) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setChapterData(null);

    getChapter(selectedBook.name, selectedChapter, translation)
      .then((data) => { if (!cancelled) { setChapterData(data); setLoading(false); } })
      .catch((err) => { if (!cancelled) { setError(String(err)); setLoading(false); } });

    return () => { cancelled = true; };
  }, [view, selectedBook, selectedChapter, translation]);

  // Search
  const handleSearch = useCallback(async () => {
    const q = searchQuery.trim();
    if (!q) return;
    const parsed = parseReference(normaliseReference(q));
    if (parsed) {
      const book = BIBLE_BOOKS.find((b) => b.name.toLowerCase() === parsed.book.toLowerCase());
      if (book) {
        setSelectedBook(book);
        setSelectedChapter(parsed.chapter);
        if (parsed.verseStart) setHighlightVerse(parsed.verseStart);
        setView("reading");
        return;
      }
    }
    setSearching(true);
    setSearchResults(null);
    try {
      const data = await lookupReference(normaliseReference(q), translation);
      setSearchResults(data);
    } catch { setSearchResults(null); }
    setSearching(false);
  }, [searchQuery, translation]);

  // Download handler — downloads one translation at a time
  const startDownload = (tid: TranslationId) => {
    if (dlAbort) return; // already downloading
    const controller = new AbortController();
    setDlAbort(controller);
    setActiveDownloadId(tid);
    setDlProgress({ total: 1189, done: 0, currentBook: "Starting…", status: "downloading" });

    downloadTranslation(tid, setDlProgress, controller.signal)
      .catch((err) => {
        if (!String(err).includes("Cancelled")) {
          setDlProgress((p) => p ? { ...p, status: "error", error: String(err) } : null);
        }
      })
      .finally(() => {
        setDlAbort(null);
        setActiveDownloadId(null);
        refreshCounts();
      });
  };

  const cancelDownload = () => {
    dlAbort?.abort();
    setDlAbort(null);
    setActiveDownloadId(null);
    setDlProgress(null);
  };

  const canPrev = selectedChapter > 1;
  const canNext = selectedBook ? selectedChapter < selectedBook.chapters : false;

  const goChapter = (d: number) => {
    if (!selectedBook) return;
    const n = selectedChapter + d;
    if (n >= 1 && n <= selectedBook.chapters) { setSelectedChapter(n); setHighlightVerse(null); }
  };

  const handleVerseTap = (v: LocalVerse) => {
    if (!selectedBook) return;
    setPopupRef(`${selectedBook.name} ${v.chapter}:${v.verse}`);
  };

  // Cycle only through LOCAL translations in the reader
  const cycleTranslation = () => {
    const ids = LOCAL_TRANSLATIONS.map((x) => x.id);
    setTranslation((t) => ids[(ids.indexOf(t) + 1) % ids.length]);
  };

  return (
    <>
      {/*
       * Outer wrapper: no fixed height here — AppShell's <main> handles scroll.
       * pb-4 gives breathing room at the bottom above the nav.
       */}
      <div className="flex flex-col gap-0 pb-4">

        {/* ── Top bar ─────────────────────────────────────── */}
        <div className={cn(
          "sticky top-0 z-30 border-b border-theme px-5 pb-3 pt-safe",
          "backdrop-blur-2xl",
          isDark ? "bg-navy-900/90" : "bg-white/90",
        )}
          style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 2rem)" }}
        >
          <div className="flex items-center justify-between gap-3">
            {view === "reading" || view === "chapterSelect" ? (
              <button
                onClick={() => setView(view === "reading" ? "chapterSelect" : "bookSelect")}
                className="flex items-center gap-1 py-1 text-sm font-medium text-gold-500 active:opacity-70"
              >
                <ChevronLeft size={18} />
                {view === "reading" ? selectedBook?.name : "Books"}
              </button>
            ) : view === "download" ? (
              <button
                onClick={() => setView("bookSelect")}
                className="flex items-center gap-1 py-1 text-sm font-medium text-gold-500 active:opacity-70"
              >
                <ChevronLeft size={18} /> Back
              </button>
            ) : (
              <h1 className="font-display text-[22px] font-bold">Bible</h1>
            )}

            <div className="flex items-center gap-2">
              {!isOnline && (
                <div className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-1">
                  <WifiOff size={10} className="text-amber-500" />
                  <span className="text-[9px] font-bold text-amber-500">Offline</span>
                </div>
              )}

              {view !== "download" && (
                <button
                  onClick={() => setView("download")}
                  className="rounded-lg p-2 active:opacity-70"
                  aria-label="Download for offline"
                >
                  <Download size={17} className={isDark ? "text-white/30" : "text-muted"} />
                </button>
              )}

              <button
                onClick={cycleTranslation}
                className="rounded-lg bg-gold-500/10 px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-gold-500 active:opacity-70"
                aria-label="Switch translation"
              >
                {translation.toUpperCase()}
              </button>

              {view !== "download" && (
                <button
                  onClick={() => setView(view === "search" ? "bookSelect" : "search")}
                  className="rounded-lg p-2 active:opacity-70"
                  aria-label={view === "search" ? "Close search" : "Search"}
                >
                  {view === "search"
                    ? <X size={18} className="text-gold-500" />
                    : <Search size={18} className={isDark ? "text-white/40" : "text-muted"} />}
                </button>
              )}
            </div>
          </div>

          {/* Breadcrumb — only in reading view */}
          {view === "reading" && selectedBook && (
            <div className="mt-2 flex items-center gap-2 text-[11px]">
              <button onClick={() => setView("bookSelect")} className="font-medium text-muted active:text-gold-500">Bible</button>
              <ChevronRight size={10} className="opacity-40 text-muted" />
              <button onClick={() => setView("chapterSelect")} className="font-medium text-muted active:text-gold-500">{selectedBook.name}</button>
              <ChevronRight size={10} className="opacity-40 text-muted" />
              <span className="font-semibold text-gold-500">Ch. {selectedChapter}</span>
            </div>
          )}
        </div>

        {/* ── DOWNLOAD VIEW ──────────────────────────────── */}
        {view === "download" && (
          <div className="flex flex-col gap-4 px-5 pt-5">
            <div>
              <h2 className="font-display text-lg font-bold">Download for Offline</h2>
              <p className="mt-1 text-[13px] leading-relaxed text-muted">
                Save Bible translations to your device. Chapters you've already read are cached automatically.
                Downloading from local files is fast — no internet needed if already on the app.
              </p>
            </div>

            {LOCAL_TRANSLATIONS.map((t) => {
              const cached = cachedCounts[t.id] ?? 0;
              const pct = Math.min(100, Math.round((cached / 1189) * 100));
              const isThisDownloading = activeDownloadId === t.id && dlProgress?.status === "downloading";
              const isDone = pct === 100 || dlProgress?.status === "done" && activeDownloadId === t.id;

              return (
                <div key={t.id} className="card card-surface">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">{t.fullName}</p>
                      <p className="text-[12px] text-muted">{t.name} · {cached}/1,189 chapters cached</p>
                    </div>
                    {isDone ? (
                      <span className="flex items-center gap-1 text-[12px] font-semibold text-emerald-500">
                        <CheckCircle2 size={14} /> Saved
                      </span>
                    ) : isThisDownloading ? (
                      <button
                        onClick={cancelDownload}
                        className="btn-secondary !py-1.5 !px-3 text-xs"
                      >
                        Cancel
                      </button>
                    ) : (
                      <button
                        onClick={() => startDownload(t.id)}
                        disabled={!!dlAbort}
                        className="btn-primary !py-1.5 !px-3 text-xs disabled:opacity-30"
                      >
                        <Download size={13} />
                        {cached > 0 && cached < 1189 ? "Resume" : "Download"}
                      </button>
                    )}
                  </div>

                  {/* Progress bar */}
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface">
                    <div
                      className="h-full rounded-full bg-gold-500 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  {/* Live progress text */}
                  {isThisDownloading && dlProgress && (
                    <p className="mt-1 animate-pulse text-[11px] text-muted">
                      {dlProgress.currentBook
                        ? `${dlProgress.currentBook}… ${dlProgress.done}/${dlProgress.total} chapters`
                        : `${dlProgress.done}/${dlProgress.total} chapters`}
                    </p>
                  )}
                  {dlProgress?.status === "error" && activeDownloadId === t.id && (
                    <p className="mt-1 text-[11px] text-red-400">{dlProgress.error ?? "Download failed — check your connection."}</p>
                  )}
                  {dlProgress?.status === "done" && activeDownloadId === t.id && (
                    <p className="mt-1 text-[11px] text-emerald-500">✓ Download complete!</p>
                  )}
                </div>
              );
            })}

            {!isOnline && (
              <p className="text-center text-[12px] text-amber-500">
                You need internet to download Bibles from the API. If Bible JSON files are bundled with the app, they can be downloaded offline.
              </p>
            )}

            {/* Online-only translations */}
            <div>
              <p className="mb-2 text-2xs font-bold uppercase tracking-caps text-gold-500">
                Online Only (via BibleGateway)
              </p>
              {ONLINE_TRANSLATIONS.map((t) => (
                <div key={t.id} className="card card-surface mb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">{t.fullName}</p>
                      <p className="text-[12px] text-muted">{t.name} · Copyrighted · Online lookup</p>
                    </div>
                    <a
                      href={bibleGatewayUrl(t.fullName, t.gatewayId)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary !py-1.5 !px-3 text-xs"
                    >
                      Open ↗
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── SEARCH VIEW ────────────────────────────────── */}
        {view === "search" && (
          <div className="flex flex-col gap-4 px-5 pt-4">
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
                placeholder="e.g. John 3:16 or Romans 8"
                className="input pl-10 pr-4"
                autoFocus
              />
            </div>
            <button onClick={handleSearch} className="btn-primary text-sm">
              <Search size={15} /> Search
            </button>
            {searching && (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={24} className="animate-spin text-gold-500" />
              </div>
            )}
            {searchResults && searchResults.verses.length > 0 && (
              <div className="flex flex-col gap-1">
                <p className="text-xs font-semibold uppercase tracking-caps text-muted">
                  {searchResults.reference} ({translation.toUpperCase()})
                </p>
                {searchResults.verses.map((v, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      const book = BIBLE_BOOKS.find((b) => b.name.toLowerCase() === v.book.toLowerCase());
                      if (book) {
                        setSelectedBook(book);
                        setSelectedChapter(v.chapter);
                        setHighlightVerse(v.verse);
                        setView("reading");
                      }
                    }}
                    className="card card-surface card-interactive text-left"
                  >
                    <p className="font-scripture text-[14px] leading-[1.8] text-secondary">
                      <sup className="mr-1 text-[10px] font-bold text-gold-500/60">{v.verse}</sup>
                      {v.text}
                    </p>
                    <p className="mt-1 text-[11px] text-muted">{v.book} {v.chapter}:{v.verse}</p>
                  </button>
                ))}
              </div>
            )}
            {searchResults && searchResults.verses.length === 0 && (
              <p className="py-12 text-center text-sm text-muted">No results found.</p>
            )}
          </div>
        )}

        {/* ── BOOK SELECT ────────────────────────────────── */}
        {view === "bookSelect" && (
          <div className="flex flex-col gap-5 px-5 pt-4">
            <BookGrid
              label="Old Testament"
              books={OT_BOOKS}
              onSelect={(b) => { setSelectedBook(b); setView("chapterSelect"); }}
            />
            <BookGrid
              label="New Testament"
              books={NT_BOOKS}
              onSelect={(b) => { setSelectedBook(b); setView("chapterSelect"); }}
            />
          </div>
        )}

        {/* ── CHAPTER SELECT ─────────────────────────────── */}
        {view === "chapterSelect" && selectedBook && (
          <div className="flex flex-col gap-4 px-5 pt-4">
            <div className="flex items-center gap-3">
              <BookMarked size={18} className="text-gold-500" />
              <div>
                <h2 className="font-display text-lg font-bold">{selectedBook.name}</h2>
                <p className="text-[12px] text-muted">
                  {selectedBook.chapters} chapters · {selectedBook.testament === "OT" ? "Old" : "New"} Testament
                </p>
              </div>
            </div>
            <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
              {Array.from({ length: selectedBook.chapters }, (_, i) => i + 1).map((ch) => (
                <button
                  key={ch}
                  onClick={() => { setSelectedChapter(ch); setHighlightVerse(null); setView("reading"); }}
                  className="flex h-11 items-center justify-center rounded-xl bg-surface text-sm font-semibold text-secondary transition-all active:scale-[0.93] hover:bg-gold-500/10"
                >
                  {ch}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── READING VIEW ───────────────────────────────── */}
        {view === "reading" && selectedBook && (
          <div className="flex flex-col gap-4 px-5 pt-4">
            {/* Chapter navigation header */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => goChapter(-1)}
                disabled={!canPrev}
                className={cn("rounded-lg p-2.5 active:opacity-70", !canPrev && "pointer-events-none opacity-20")}
                aria-label="Previous chapter"
              >
                <ChevronLeft size={20} className="text-gold-500" />
              </button>
              <button
                onClick={() => setView("chapterSelect")}
                className="flex items-center gap-1.5 rounded-xl bg-surface px-4 py-2.5 active:opacity-70"
              >
                <span className="font-display text-sm font-bold">{selectedBook.name} {selectedChapter}</span>
                <ChevronDown size={14} className="text-muted" />
              </button>
              <button
                onClick={() => goChapter(1)}
                disabled={!canNext}
                className={cn("rounded-lg p-2.5 active:opacity-70", !canNext && "pointer-events-none opacity-20")}
                aria-label="Next chapter"
              >
                <ChevronRight size={20} className="text-gold-500" />
              </button>
            </div>

            {loading && (
              <div className="flex flex-col items-center gap-3 py-16">
                <Loader2 size={28} className="animate-spin text-gold-500" />
                <p className="text-sm text-muted">Loading chapter…</p>
              </div>
            )}

            {error && (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <WifiOff size={28} className="opacity-30 text-muted" />
                <p className="text-sm text-secondary">Could not load chapter</p>
                <p className="max-w-[280px] whitespace-pre-line text-xs text-muted">{error}</p>
                {!isOnline && (
                  <div className="flex flex-col gap-2">
                    <p className="text-xs text-amber-500">
                      You're offline. Download this translation first.
                    </p>
                    <button
                      onClick={() => setView("download")}
                      className="btn-secondary text-xs"
                    >
                      <Download size={13} /> Go to Download
                    </button>
                  </div>
                )}
              </div>
            )}

            {chapterData && !loading && (
              <>
                <div className="flex flex-col gap-0 pb-4">
                  {chapterData.verses.map((v, i) => (
                    <button
                      key={`${v.chapter}-${v.verse}-${i}`}
                      onClick={() => handleVerseTap(v)}
                      id={`verse-${v.verse}`}
                      className={cn(
                        "-mx-2 rounded-lg px-2 py-1 text-left transition-all active:bg-gold-500/10",
                        highlightVerse === v.verse && "bg-gold-500/10 ring-1 ring-gold-500/20",
                      )}
                    >
                      <p className="font-scripture text-[15px] leading-[1.95] text-secondary">
                        <sup className={cn(
                          "mr-1.5 text-[10px] font-bold",
                          highlightVerse === v.verse ? "text-gold-500" : "text-gold-500/50",
                        )}>
                          {v.verse}
                        </sup>
                        {v.text}
                      </p>
                    </button>
                  ))}
                  {chapterData.verses.length === 0 && (
                    <p className="py-12 text-center text-sm italic text-muted">No verses available.</p>
                  )}
                </div>

                {/* Chapter prev/next at bottom */}
                <div className="flex gap-3">
                  {canPrev && (
                    <button onClick={() => goChapter(-1)} className="btn-secondary flex-1 text-sm">
                      <ChevronLeft size={16} /> Ch. {selectedChapter - 1}
                    </button>
                  )}
                  {canNext && (
                    <button onClick={() => goChapter(1)} className="btn-primary flex-1 text-sm">
                      Ch. {selectedChapter + 1} <ChevronRight size={16} />
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <BiblePopup reference={popupRef} onClose={() => setPopupRef(null)} />
    </>
  );
}

/* ── Book grid sub-component ──────────────────────────── */

function BookGrid({
  label,
  books,
  onSelect,
}: {
  label: string;
  books: BibleBook[];
  onSelect: (b: BibleBook) => void;
}) {
  return (
    <section>
      <h2 className="mb-3 text-xs font-bold uppercase tracking-caps text-gold-500">{label}</h2>
      {/* 3 cols on mobile, 4 on sm+, 5 on md+ for desktop comfort */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
        {books.map((book, i) => (
          <button
            key={book.name}
            onClick={() => onSelect(book)}
            className="card card-surface card-interactive animate-fade-in py-3 text-center"
            style={{ animationDelay: `${Math.min(i, 12) * 25}ms` }}
          >
            <p className="text-[13px] font-semibold leading-snug">{book.name}</p>
            <p className="mt-0.5 text-2xs text-muted">{book.chapters} ch.</p>
          </button>
        ))}
      </div>
    </section>
  );
}
