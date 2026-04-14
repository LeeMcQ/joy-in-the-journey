# ============================================================
#  Joy in the Journey — Developer Guide
#  Everything you need to test, deploy, and understand the app
# ============================================================


# ────────────────────────────────────────────────────────────
#  PART 1: TESTING ON YOUR PC
# ────────────────────────────────────────────────────────────

# STEP 1: Open your terminal (PowerShell or Command Prompt on Windows)
# Navigate to your project folder:

cd D:\Desktop\SDA\joy-in-the-journey

# STEP 2: Install dependencies (only needed the first time, or after changes to package.json)

npm install

# STEP 3: Start the development server

npm run dev

# This will print something like:
#   VITE v6.x.x  ready in 500ms
#   ➜  Local:   http://localhost:5173/
#   ➜  Network: http://192.168.x.x:5173/
#
# Open http://localhost:5173/ in your browser.
# Changes to any file will auto-refresh the page.
# Press Ctrl+C in the terminal to stop the server.

# STEP 4: Test the production build (optional, but recommended before deploying)

npm run build        # Creates the "dist" folder with optimised files
npm run preview      # Serves the production build at http://localhost:4173/


# ────────────────────────────────────────────────────────────
#  PART 2: PUSHING TO GITHUB (DEPLOYING)
# ────────────────────────────────────────────────────────────

# STEP 1: Make sure you're in the project folder

cd D:\Desktop\SDA\joy-in-the-journey

# STEP 2: Check what files changed

git status

# STEP 3: Add all changes

git add -A

# STEP 4: Write a commit message describing what you changed

git commit -m "Your message here, e.g. Fixed Bible download"

# STEP 5: Push to GitHub

git push

# That's it! GitHub Actions will automatically:
#   1. Install dependencies
#   2. Build the app
#   3. Deploy to GitHub Pages
#
# Wait ~2 minutes, then check:
#   https://leemcq.github.io/joy-in-the-journey/
#
# You can watch the build progress at:
#   https://github.com/LeeMcQ/joy-in-the-journey/actions


# ────────────────────────────────────────────────────────────
#  PART 3: COMMON TASKS
# ────────────────────────────────────────────────────────────

# --- Reset everything and start fresh ---
# If npm install gives errors:
rm -rf node_modules package-lock.json
npm install

# --- Check for TypeScript errors without building ---
npx tsc --noEmit

# --- Update the GitHub repo name ---
# If you renamed your repo, update this line in:
#   .github/workflows/deploy.yml  →  line 31
#   Change: VITE_BASE="/joy-in-the-journey/"
#   To:     VITE_BASE="/your-new-repo-name/"


# ════════════════════════════════════════════════════════════
#  PART 4: HOW THE APP WORKS — FILE BY FILE
# ════════════════════════════════════════════════════════════

# ┌─────────────────────────────────────────────────────────┐
# │  ROOT FILES (configuration)                             │
# └─────────────────────────────────────────────────────────┘
#
# package.json
#   → Lists all dependencies (React, Zustand, Tailwind, etc.)
#   → Defines scripts: "dev", "build", "preview"
#
# vite.config.ts
#   → Build tool configuration
#   → PWA plugin settings (app name, icons, offline caching)
#   → The "base" path for GitHub Pages
#
# tailwind.config.ts
#   → Custom colours (gold-500: #D4A017, navy-800: #0F172A)
#   → Font families (Playfair Display, Lora, DM Sans, Source Code Pro)
#   → Custom animations (fade-in, slide-up, scale-in)
#
# tsconfig.json
#   → TypeScript compiler settings
#   → Path alias: "@/" maps to "src/"
#
# index.html
#   → The single HTML page (it's a Single Page App)
#   → Loads Google Fonts
#   → Has a script to prevent theme flash on load
#
# netlify.toml / vercel.json
#   → Deployment configs for Netlify/Vercel (alternative to GitHub Pages)
#
# .github/workflows/deploy.yml
#   → GitHub Actions: auto-builds and deploys on every push to main
#
# postcss.config.js
#   → Tells PostCSS to use Tailwind CSS


# ┌─────────────────────────────────────────────────────────┐
# │  src/ — THE APP CODE                                    │
# └─────────────────────────────────────────────────────────┘

# --- Entry points ---
#
# src/main.tsx
#   → THE STARTING POINT. React mounts here.
#   → Sets up BrowserRouter for navigation
#   → Handles PWA update notifications ("New version available")
#
# src/App.tsx
#   → Main app component
#   → Wraps everything in ErrorBoundary → ThemeProvider → AppShell
#   → Defines all 6 routes (/, /studies, /study/:id, /bible, /notes, /more)
#   → Uses React.lazy() to load pages on demand (faster initial load)
#
# src/index.css
#   → ALL the styling: CSS custom properties for themes, component classes,
#     animations, the gold arrow header, scrollbar, range slider, focus states
#   → Theme tokens (--color-bg, --color-text-primary, etc.) change per theme
#   → Global font size controlled by --app-font-size variable


# --- Data layer ---
#
# src/data/types.ts
#   → ALL TypeScript interfaces: Study, Question, ContentSection,
#     StudyProgress, UserHighlight, AppSettings, StudyPlan, FontFamily
#   → This is the "dictionary" of all data shapes in the app
#
# src/data/studies.json (297 KB)
#   → All 28 Bible studies with every question, note, scripture reference,
#     introduction, conclusion, and special section from the PDF
#   → This is the content of the entire study series


# --- State management ---
#
# src/store/useAppStore.ts (THE BRAIN)
#   → Zustand store with ALL app state
#   → Study progress (started, completed, answers, bookmarks, highlights)
#   → Settings (font size, font family, theme, Bible version)
#   → Study plan (pace, start date, reminder time)
#   → Persisted to IndexedDB (survives browser clears)
#   → Schema migrations (v1 → v2 → v3) for upgrading existing users


# --- Pages (what the user sees) ---
#
# src/pages/HomePage.tsx
#   → Welcome screen with greeting, "Today's Study" card, progress stats
#   → Shows StudyPlanSetup modal on first launch
#   → "Continue studying" smart card, recently studied horizontal scroll
#
# src/pages/StudyListPage.tsx
#   → All 28 studies in a scrollable list with search
#   → Each study shows the gold arrow header, progress ring, question count
#
# src/pages/StudyPage.tsx (THE MAIN READING EXPERIENCE)
#   → Sticky header with progress bar, bookmark, share
#   → Gold arrow banner, introduction, questions with answer textareas
#   → Tappable scripture references → BiblePopup
#   → Highlightable text (select text → pick colour)
#   → Auto-saving answers with debounced writes
#   → "Mark Complete" button with celebration animation
#   → Previous/Next study navigation
#
# src/pages/BiblePage.tsx
#   → Full Bible reader: 66 books → chapter selector → verse-by-verse
#   → KJV and WEB translations (toggle button)
#   → Search by reference (e.g. "John 3:16")
#   → Tap any verse → BiblePopup with both translations
#   → "Download for Offline" screen with progress bars
#   → Deep-link support: /bible?ref=Romans+6:23
#
# src/pages/NotesPage.tsx
#   → Three tabs: Answers, Highlights, Progress
#   → Shows all user answers grouped by study
#   → Shows all highlights with colour dots and delete
#   → Shows per-study progress with completion dates
#
# src/pages/MorePage.tsx (SETTINGS)
#   → Theme switcher (Dark / Light / Sepia)
#   → Sound & Haptics toggle
#   → Font size slider (12–24px, affects ALL text)
#   → Typeface selector (Sans / Serif / Mono)
#   → Bible version selector
#   → Study plan display
#   → Daily reminder toggle + time picker
#   → Statistics (started, completed, answers, highlights, bookmarks)
#   → Install app prompt (Android + iOS)
#   → Reset all data button


# --- Components ---
#
# src/components/layout/AppShell.tsx
#   → Bottom navigation bar (Home, Studies, Bible, Notes, More)
#   → Gold active indicator that slides between tabs
#   → Hides nav bar during study reading (full screen)
#   → Audio feedback on tab switch
#
# src/components/study/QuestionBlock.tsx
#   → Renders one question: number badge, text, scripture link
#   → Expandable study note
#   → Answer textarea with debounced auto-save (800ms)
#   → Save indicator (spinner → checkmark → pencil)
#   → Highlightable text
#
# src/components/study/SectionBlock.tsx
#   → Renders non-question content: conclusions, quotes, illustrations,
#     principles, read directives
#   → Each type has a different visual style
#
# src/components/study/BiblePopup.tsx
#   → Bottom-sheet popup when you tap a scripture reference
#   → Shows verses in KJV and WEB tabs
#   → Tries local IDB cache first, then fetches from bible-api.com
#   → Copy button, "Open in Reader" button
#   → Offline indicator
#
# src/components/study/ScriptureLink.tsx
#   → Splits "John 16:13; 1 Cor. 2:14" into separate tappable pills
#   → Each pill is independently tappable
#
# src/components/study/HighlightableText.tsx
#   → Select any text → colour picker appears (gold/blue/green/pink)
#   → Highlights saved to store, rendered as coloured marks
#   → Tap existing highlight → delete option
#
# src/components/study/ReadingProgressBar.tsx
#   → 3px gold bar at the top of the study reader
#   → Shows percentage of questions answered
#
# src/components/ui/ArrowHeader.tsx
#   → Gold pennant/arrow that matches the PDF headers exactly
#   → "GOD'S WORD GIVES YOU PEACE  # 1" style
#   → CSS-only triangle point
#
# src/components/ui/ProgressRing.tsx
#   → Circular SVG progress indicator (used everywhere)
#
# src/components/ui/ThemeProvider.tsx
#   → Manages dark/light/sepia theme via CSS class on <html>
#   → Syncs font size + font family as CSS variables on :root
#   → Provides useTheme() hook for components
#
# src/components/ui/StudyPlanSetup.tsx
#   → First-launch onboarding modal (4 steps):
#     1. Choose pace (28 days / 28 weeks / 1 year / custom)
#     2. Custom days slider (if custom selected)
#     3. Reminder toggle + time picker
#     4. Download Bibles for offline
#   → Notification permission + scheduling
#
# src/components/ui/Toast.tsx
#   → Slide-up notification system (PWA updates, save confirmations)
#
# src/components/ui/ErrorBoundary.tsx
#   → Catches React crashes, shows a "Reload" button
#
# src/components/ui/PageSkeleton.tsx
#   → Pulsing placeholder shown while pages lazy-load


# --- Libraries (helpers) ---
#
# src/lib/localBible.ts (THE BIBLE ENGINE)
#   → Fetches verses from bible-api.com with retry + backoff
#   → Caches every chapter in IndexedDB for offline use
#   → downloadTranslation() pre-fetches all 1,189 chapters
#   → getChapter(), getVerses(), lookupReference(), lookupMultiTranslation()
#
# src/lib/bibleApi.ts
#   → Legacy API client (kept as fallback)
#
# src/lib/bibleData.ts
#   → All 66 Bible books with chapter counts and abbreviations
#   → parseReference() turns "John 3:16" into structured data
#
# src/lib/scriptureUtils.ts
#   → splitReferences() handles "John 16:13; 1 Cor. 2:14"
#   → normaliseReference() turns "1 Cor." into "1 Corinthians"
#
# src/lib/audio.ts
#   → Web Audio API sound effects (9 sounds + haptic feedback)
#   → Tab switch click, answer saved chime, study complete fanfare,
#     bookmark pluck, highlight pop, scripture bell
#
# src/lib/utils.ts
#   → cn() class merger, countQuestions(), studyLabel(), truncate()


# --- Hooks ---
#
# src/hooks/useReadingStyle.ts
#   → Returns CSS style object from fontSize + fontFamily settings
#   → Used by study reader components for inline styles
#
# src/hooks/useOnlineStatus.ts
#   → Reactive online/offline detection
#
# src/hooks/useInstallPrompt.ts
#   → Captures PWA install prompt for Android, detects iOS


# --- Scripts ---
#
# scripts/download-bibles.js
#   → Node.js script to pre-download KJV + WEB from bible-api.com
#   → Creates JSON files in public/bibles/ (optional, for pre-bundling)
#   → Run with: node scripts/download-bibles.js


# ┌─────────────────────────────────────────────────────────┐
# │  HOW DATA FLOWS                                         │
# └─────────────────────────────────────────────────────────┘
#
# 1. User opens app
#    → main.tsx renders App.tsx inside BrowserRouter
#    → ThemeProvider applies theme + font settings
#    → If first visit → StudyPlanSetup modal appears
#
# 2. User reads a study
#    → StudyPage loads study from studies.json (bundled, always offline)
#    → Questions rendered by QuestionBlock
#    → User types answer → debounced 800ms → saved to Zustand → persisted to IDB
#    → Scripture refs tapped → BiblePopup → local IDB cache OR bible-api.com
#
# 3. User opens Bible tab
#    → BiblePage shows 66 books → chapters → verses
#    → Chapters fetched from bible-api.com → cached in IDB
#    → Next time: loaded from IDB (instant, works offline)
#    → "Download" screen pre-fetches entire Bible
#
# 4. User changes settings
#    → MorePage updates Zustand store
#    → ThemeProvider syncs CSS variables on <html>
#    → All text in the app updates immediately
#
# 5. User pushes to GitHub
#    → GitHub Actions workflow runs
#    → Builds with VITE_BASE="/joy-in-the-journey/"
#    → Deploys to GitHub Pages
#    → Site live at leemcq.github.io/joy-in-the-journey/
