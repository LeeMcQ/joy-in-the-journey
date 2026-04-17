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

  // Load cached chapter counts
  useEffect(() => {
    Promise.all(LOCAL_TRANSLATIONS.map(async (t) => {
      const count = await getCachedChapterCount(t.id);
      return [t.id, count] as const;
    })).then((entries) => setCachedCounts(Object.fromEntries(entries)));
  }, [dlProgress?.status]);

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

  // Download handler
  const startDownload = (tid: TranslationId) => {
    const controller = new AbortController();
    setDlAbort(controller);
    setDlProgress({ total: 1189, done: 0, currentBook: "", status: "downloading" });

    downloadTranslation(tid, setDlProgress, controller.signal)
      .catch(() => {})
      .finally(() => setDlAbort(null));
  };

  const cancelDownload = () => { dlAbort?.abort(); setDlAbort(null); setDlProgress(null); };

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

  return (
    <>
      <div className="flex flex-col gap-0 pb-4">
        {/* Top bar */}
        <div className="sticky top-0 z-30 bg-base/90 backdrop-blur-2xl border-b border-theme px-5 pt-8 pb-3">
          <div className="flex items-center justify-between gap-3">
            {view === "reading" || view === "chapterSelect" ? (
              <button onClick={() => setView(view === "reading" ? "chapterSelect" : "bookSelect")} className="flex items-center gap-1 text-sm font-medium text-gold-500 active:opacity-70 py-1">
                <ChevronLeft size={18} />
                {view === "reading" ? selectedBook?.name : "Books"}
              </button>
            ) : view === "download" ? (
              <button onClick={() => setView("bookSelect")} className="flex items-center gap-1 text-sm font-medium text-gold-500 active:opacity-70 py-1">
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
                <button onClick={() => setView("download")} className="rounded-lg p-2 active:opacity-70" aria-label="Download for offline">
                  <Download size={17} className={isDark ? "text-white/30" : "text-muted"} />
                </button>
              )}

              <button onClick={() => setTranslation(t => {
                const ids = LOCAL_TRANSLATIONS.map(x => x.id);
                return ids[(ids.indexOf(t) + 1) % ids.length];
              })} className="rounded-lg bg-gold-500/10 px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-gold-500 active:opacity-70">
                {translation.toUpperCase()}
              </button>

              {view !== "download" && (
                <button onClick={() => setView(view === "search" ? "bookSelect" : "search")} className="rounded-lg p-2 active:opacity-70">
                  {view === "search" ? <X size={18} className="text-gold-500" /> : <Search size={18} className={isDark ? "text-white/40" : "text-muted"} />}
                </button>
              )}
            </div>
          </div>

          {view === "reading" && selectedBook && (
            <div className="mt-2 flex items-center gap-2 text-[11px]">
              <button onClick={() => setView("bookSelect")} className="text-muted font-medium active:text-gold-500">Bible</button>
              <ChevronRight size={10} className="text-muted opacity-40" />
              <button onClick={() => setView("chapterSelect")} className="text-muted font-medium active:text-gold-500">{selectedBook.name}</button>
              <ChevronRight size={10} className="text-muted opacity-40" />
              <span className="font-semibold text-gold-500">Ch. {selectedChapter}</span>
            </div>
          )}
        </div>

        {/* ── DOWNLOAD VIEW ──────────────────────────────── */}
        {view === "download" && (
          <div className="flex flex-col gap-4 px-5 pt-5">
            <div>
              <h2 className="font-display text-lg font-bold">Download for Offline</h2>
              <p className="text-muted mt-1 text-[13px] leading-relaxed">
                Save Bible translations to your device. Chapters you've already read are cached automatically.
              </p>
            </div>

            {LOCAL_TRANSLATIONS.map((t) => {
              const cached = cachedCounts[t.id] ?? 0;
              const pct = Math.round((cached / 1189) * 100);
              const isDownloading = dlProgress?.status === "downloading" && dlAbort;

              return (
                <div key={t.id} className="card card-surface">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">{t.fullName}</p>
                      <p className="text-muted text-[12px]">{t.name} · {cached}/1,189 chapters cached</p>
                    </div>
                    {pct === 100 ? (
                      <span className="flex items-center gap-1 text-[12px] font-semibold text-emerald-500">
                        <CheckCircle2 size={14} /> Saved
                      </span>
                    ) : isDownloading ? (
                      <button onClick={cancelDownload} className="btn-secondary !py-1.5 !px-3 text-xs">Cancel</button>
                    ) : (
                      <button
                        onClick={() => startDownload(t.id)}
                        disabled={!isOnline || !!dlAbort}
                        className="btn-primary !py-1.5 !px-3 text-xs disabled:opacity-30"
                      >
                        <Download size={13} /> {cached > 0 ? "Resume" : "Download"}
                      </button>
                    )}
                  </div>

                  {/* Progress bar */}
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface">
                    <div className="h-full rounded-full bg-gold-500 transition-all duration-300" style={{ width: `${pct}%` }} />
                  </div>

                  {/* Active download progress */}
                  {dlProgress && dlProgress.status === "downloading" && (
                    <p className="text-muted mt-1 text-[11px] animate-pulse">
                      {dlProgress.currentBook}… {dlProgress.done}/{dlProgress.total}
                    </p>
                  )}
                  {dlProgress?.status === "error" && (
                    <p className="text-red-400 mt-1 text-[11px]">{dlProgress.error}</p>
                  )}
                </div>
              );
            })}

            {!isOnline && (
              <p className="text-amber-500 text-center text-[12px]">
                You need internet to download Bibles. Already-cached chapters are available offline.
              </p>
            )}

            {/* Online-only translations */}
            <div>
              <p className="text-2xs font-bold uppercase tracking-caps text-gold-500 mb-2">Online Only (via BibleGateway)</p>
              {ONLINE_TRANSLATIONS.map((t) => (
                <div key={t.id} className="card card-surface mb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">{t.fullName}</p>
                      <p className="text-muted text-[12px]">{t.name} · Copyrighted · Online lookup</p>
                    </div>
                    <a href={bibleGatewayUrl(t.fullName, t.gatewayId)} target="_blank" rel="noopener noreferrer"
                      className="btn-secondary !py-1.5 !px-3 text-xs">
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
              <Search size={16} className="text-muted pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }} placeholder="e.g. John 3:16 or Romans 8" className="input pl-10 pr-4" autoFocus />
            </div>
            <button onClick={handleSearch} className="btn-primary text-sm"><Search size={15} /> Search</button>
            {searching && <div className="flex items-center justify-center py-12"><Loader2 size={24} className="animate-spin text-gold-500" /></div>}
            {searchResults && searchResults.verses.length > 0 && (
              <div className="flex flex-col gap-1">
                <p className="text-muted text-xs font-semibold uppercase tracking-caps">{searchResults.reference} ({translation.toUpperCase()})</p>
                {searchResults.verses.map((v, i) => (
                  <button key={i} onClick={() => {
                    const book = BIBLE_BOOKS.find((b) => b.name.toLowerCase() === v.book.toLowerCase());
                    if (book) { setSelectedBook(book); setSelectedChapter(v.chapter); setHighlightVerse(v.verse); setView("reading"); }
                  }} className="card card-surface card-interactive text-left">
                    <p className="font-scripture text-[14px] leading-[1.8] text-secondary">
                      <sup className="mr-1 text-[10px] font-bold text-gold-500/60">{v.verse}</sup>{v.text}
                    </p>
                    <p className="text-muted mt-1 text-[11px]">{v.book} {v.chapter}:{v.verse}</p>
                  </button>
                ))}
              </div>
            )}
            {searchResults && searchResults.verses.length === 0 && <p className="text-muted py-12 text-center text-sm">No results found.</p>}
          </div>
        )}

        {/* ── BOOK SELECT ────────────────────────────────── */}
        {view === "bookSelect" && (
          <div className="flex flex-col gap-5 px-5 pt-4">
            <BookGrid label="Old Testament" books={OT_BOOKS} onSelect={(b) => { setSelectedBook(b); setView("chapterSelect"); }} />
            <BookGrid label="New Testament" books={NT_BOOKS} onSelect={(b) => { setSelectedBook(b); setView("chapterSelect"); }} />
          </div>
        )}

        {/* ── CHAPTER SELECT ─────────────────────────────── */}
        {view === "chapterSelect" && selectedBook && (
          <div className="flex flex-col gap-4 px-5 pt-4">
            <div className="flex items-center gap-3">
              <BookMarked size={18} className="text-gold-500" />
              <div>
                <h2 className="font-display text-lg font-bold">{selectedBook.name}</h2>
                <p className="text-muted text-[12px]">{selectedBook.chapters} chapters · {selectedBook.testament === "OT" ? "Old" : "New"} Testament</p>
              </div>
            </div>
            <div className="grid grid-cols-6 gap-2">
              {Array.from({ length: selectedBook.chapters }, (_, i) => i + 1).map((ch) => (
                <button key={ch} onClick={() => { setSelectedChapter(ch); setHighlightVerse(null); setView("reading"); }}
                  className="flex h-11 items-center justify-center rounded-xl text-sm font-semibold transition-all active:scale-[0.93] bg-surface text-secondary hover:bg-gold-500/10">
                  {ch}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── READING VIEW ───────────────────────────────── */}
        {view === "reading" && selectedBook && (
          <div className="flex flex-col gap-4 px-5 pt-4">
            <div className="flex items-center justify-between">
              <button onClick={() => goChapter(-1)} disabled={!canPrev} className={cn("rounded-lg p-2.5 active:opacity-70", !canPrev && "opacity-20 pointer-events-none")}>
                <ChevronLeft size={20} className="text-gold-500" />
              </button>
              <button onClick={() => setView("chapterSelect")} className="flex items-center gap-1.5 rounded-xl bg-surface px-4 py-2.5 active:opacity-70">
                <span className="font-display text-sm font-bold">{selectedBook.name} {selectedChapter}</span>
                <ChevronDown size={14} className="text-muted" />
              </button>
              <button onClick={() => goChapter(1)} disabled={!canNext} className={cn("rounded-lg p-2.5 active:opacity-70", !canNext && "opacity-20 pointer-events-none")}>
                <ChevronRight size={20} className="text-gold-500" />
              </button>
            </div>

            {loading && (
              <div className="flex flex-col items-center gap-3 py-16">
                <Loader2 size={28} className="animate-spin text-gold-500" />
                <p className="text-muted text-sm">Loading chapter…</p>
              </div>
            )}

            {error && (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <WifiOff size={28} className="text-muted opacity-30" />
                <p className="text-secondary text-sm">Could not load chapter</p>
                <p className="text-muted text-xs max-w-[280px] whitespace-pre-line">{error}</p>
                {!isOnline && <p className="text-amber-500 text-xs">Connect to the internet and try again, or download this Bible for offline use.</p>}
              </div>
            )}

            {chapterData && !loading && (
              <>
                <div className="flex flex-col gap-0 pb-4">
                  {chapterData.verses.map((v, i) => (
                    <button key={`${v.chapter}-${v.verse}-${i}`} onClick={() => handleVerseTap(v)} id={`verse-${v.verse}`}
                      className={cn("rounded-lg px-2 py-1 text-left transition-all -mx-2 active:bg-gold-500/10",
                        highlightVerse === v.verse && "bg-gold-500/10 ring-1 ring-gold-500/20")}>
                      <p className="font-scripture text-[15px] leading-[1.95] text-secondary">
                        <sup className={cn("mr-1.5 text-[10px] font-bold", highlightVerse === v.verse ? "text-gold-500" : "text-gold-500/50")}>{v.verse}</sup>
                        {v.text}
                      </p>
                    </button>
                  ))}
                  {chapterData.verses.length === 0 && <p className="text-muted py-12 text-center text-sm italic">No verses available.</p>}
                </div>
                <div className="flex gap-3 safe-bottom">
                  {canPrev && <button onClick={() => goChapter(-1)} className="btn-secondary flex-1 text-sm"><ChevronLeft size={16} /> Ch. {selectedChapter - 1}</button>}
                  {canNext && <button onClick={() => goChapter(1)} className="btn-primary flex-1 text-sm">Ch. {selectedChapter + 1} <ChevronRight size={16} /></button>}
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

function BookGrid({ label, books, onSelect }: { label: string; books: BibleBook[]; onSelect: (b: BibleBook) => void }) {
  return (
    <section>
      <h2 className="mb-3 text-xs font-bold uppercase tracking-caps text-gold-500">{label}</h2>
      <div className="grid grid-cols-3 gap-2">
        {books.map((book, i) => (
          <button key={book.name} onClick={() => onSelect(book)} className="card card-surface card-interactive py-3 text-center animate-fade-in" style={{ animationDelay: `${Math.min(i, 12) * 25}ms` }}>
            <p className="text-[13px] font-semibold leading-snug">{book.name}</p>
            <p className="text-muted mt-0.5 text-2xs">{book.chapters} ch.</p>
          </button>
        ))}
      </div>
    </section>
  );
}
