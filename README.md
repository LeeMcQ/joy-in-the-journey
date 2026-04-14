# Joy in the Journey — Bible Study PWA

**28 interactive Bible studies** from *The Joy in the Journey Bible Study Series*,
built as a production-ready Progressive Web App.

## Stack

- **Vite 6** + **React 18** + **TypeScript**
- **Tailwind CSS** with custom gold/navy design system
- **Zustand** with IndexedDB persistence
- **vite-plugin-pwa** for offline-first service worker
- **bible-api.com** for verse lookup (KJV + WEB, cached offline)
- **lucide-react** for icons

## Features

- 📖 All 28 studies with questions, notes, scripture references
- ✍️ Auto-saving answers with debounced writes
- 🎨 4-colour text highlighting (gold/blue/green/pink)
- 📱 Install to home screen (Android & iOS)
- 🌙 Dark / Light / Sepia reading themes
- 🔤 3 font sizes with live preview
- 📕 Full Bible reader (66 books, chapter navigation)
- 🔍 Bible search + tap-to-lookup from study references
- 💾 IndexedDB persistence (survives cache clears)
- ✈️ Offline support — studies + cached Bible verses
- 🔔 PWA update notifications

## Quick Start

```bash
npm install
npm run dev        # → http://localhost:5173
```

## Production Build

```bash
npm run build      # outputs to dist/
npm run preview    # test the production build locally
```

---

## Deploy to Vercel

### Option A: Git push (recommended)

1. Push this repo to GitHub/GitLab
2. Go to [vercel.com/new](https://vercel.com/new), import the repo
3. Vercel auto-detects Vite — just click **Deploy**
4. Done. SPA rewrites are handled by `vercel.json`

### Option B: CLI

```bash
npm i -g vercel
vercel            # follow prompts
vercel --prod     # deploy to production
```

---

## Deploy to Netlify

### Option A: Git push (recommended)

1. Push to GitHub/GitLab
2. Go to [app.netlify.com](https://app.netlify.com), click **Add new site → Import from Git**
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Click **Deploy**. SPA redirects are handled by `netlify.toml` and `public/_redirects`

### Option B: CLI

```bash
npm i -g netlify-cli
npm run build
netlify deploy --prod --dir=dist
```

### Option C: Drag & drop

1. Run `npm run build`
2. Drag the `dist/` folder onto [app.netlify.com/drop](https://app.netlify.com/drop)

---

## Deploy to GitHub Pages

```bash
npm run build

# In dist/, create a 404.html that's a copy of index.html (SPA routing)
cp dist/index.html dist/404.html

# Push dist/ to gh-pages branch
npx gh-pages -d dist
```

Note: set `base: '/your-repo-name/'` in `vite.config.ts` if not using a custom domain.

---

## PWA Install Prompt

The app shows an install banner on the **More → Settings** page:

- **Android/Chrome**: native install prompt
- **iOS/Safari**: shows instructions to tap Share → Add to Home Screen
- Automatically hides once installed

## Offline Behaviour

| Content | Offline? | Strategy |
|---------|----------|----------|
| Study text + questions | ✅ Always | Bundled in JS |
| Your answers + highlights | ✅ Always | IndexedDB |
| Bible verses (read before) | ✅ Cached | StaleWhileRevalidate |
| Bible verses (new) | ❌ Needs network | bible-api.com |
| Google Fonts | ✅ Cached | CacheFirst |

## Project Structure

```
src/
├── components/
│   ├── layout/AppShell.tsx        # Bottom nav, scroll container
│   ├── study/
│   │   ├── QuestionBlock.tsx      # Question + answer + highlight
│   │   ├── SectionBlock.tsx       # Conclusion, quote, etc.
│   │   ├── HighlightableText.tsx  # Select-to-highlight engine
│   │   ├── BiblePopup.tsx         # Multi-translation bottom sheet
│   │   ├── ScriptureLink.tsx      # Tappable Bible reference
│   │   └── ReadingProgressBar.tsx
│   └── ui/
│       ├── ArrowHeader.tsx        # Gold pennant (matches PDF)
│       ├── ProgressRing.tsx       # SVG circular progress
│       ├── ThemeProvider.tsx       # CSS var theme context
│       └── Toast.tsx              # PWA update notifications
├── data/
│   ├── types.ts                   # All TypeScript interfaces
│   └── studies.json               # 28 studies (297 KB)
├── hooks/
│   └── useInstallPrompt.ts        # PWA install detection
├── lib/
│   ├── bibleApi.ts                # bible-api.com client + cache
│   ├── bibleData.ts               # 66 books metadata + parser
│   └── utils.ts
├── pages/
│   ├── HomePage.tsx               # Welcome + continue studying
│   ├── StudyListPage.tsx          # All 28 studies with search
│   ├── StudyPage.tsx              # Full study reader
│   ├── BiblePage.tsx              # Book/chapter/verse reader
│   ├── NotesPage.tsx              # Answers + highlights + progress
│   └── MorePage.tsx               # Settings + install + about
├── store/
│   └── useAppStore.ts             # Zustand + IDB persistence
├── App.tsx
├── main.tsx
└── index.css                      # Design system + CSS vars
```

## License

Bible study content © The Joy in the Journey Bible Study Series.
App code is provided as-is for ministry use.
