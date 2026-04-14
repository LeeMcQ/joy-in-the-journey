import { lazy, Suspense } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { ThemeProvider } from "@/components/ui/ThemeProvider";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { ToastContainer } from "@/components/ui/Toast";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { AppShell } from "@/components/layout/AppShell";

/* ── Lazy-loaded pages (code-split) ──────────────────── */
const HomePage = lazy(() => import("@/pages/HomePage").then((m) => ({ default: m.HomePage })));
const StudyListPage = lazy(() => import("@/pages/StudyListPage").then((m) => ({ default: m.StudyListPage })));
const StudyPage = lazy(() => import("@/pages/StudyPage").then((m) => ({ default: m.StudyPage })));
const BiblePage = lazy(() => import("@/pages/BiblePage").then((m) => ({ default: m.BiblePage })));
const NotesPage = lazy(() => import("@/pages/NotesPage").then((m) => ({ default: m.NotesPage })));
const MorePage = lazy(() => import("@/pages/MorePage").then((m) => ({ default: m.MorePage })));

export default function App() {
  const location = useLocation();

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AppShell>
          <Suspense fallback={<PageSkeleton />}>
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<HomePage />} />
              <Route path="/studies" element={<StudyListPage />} />
              <Route path="/study/:id" element={<StudyPage />} />
              <Route path="/bible" element={<BiblePage />} />
              <Route path="/notes" element={<NotesPage />} />
              <Route path="/more" element={<MorePage />} />
            </Routes>
          </Suspense>
        </AppShell>
        <ToastContainer />
      </ThemeProvider>
    </ErrorBoundary>
  );
}
