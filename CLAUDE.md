# Octant — Fictional Investment Firm Landing Page

## Purpose
Award-style marketing landing page for **Octant Global Management LP**, a fictional elite investment partnership (Viking Global / Lone Pine archetype, ~$28B AUM). Pure design study — the footer explicitly discloses the firm is fictional. Brand concept: an octant is a celestial-navigation instrument ("position is everything" / "price is our horizon, value our star"), which drives the visual identity (eighth-arc logo, star-sphere hero, coordinate/degree motifs).

## Tech Stack
- Static site, **no build step** — plain HTML/CSS/ES modules
- **three.js 0.170** (CDN import map) — hero WebGL scene
- **GSAP 3.13** core + ScrollTrigger + SplitText (CDN; all plugins free since 3.13)
- **Lenis 1.3.11** (CDN) — smooth scroll, driven by GSAP ticker (`autoRaf:false`, `lagSmoothing(0)`)
- Google Fonts: **Fraunces** (display serif, 300–600 + italic), **Inter** (body), **IBM Plex Mono** (labels/data)

## How to Run
```bash
cd octant-capital
python3 -m http.server 8087     # any static server works
# open http://localhost:8087
```
Must be served over HTTP — ES modules + import map fail on `file://`.
Stop a stray server: `lsof -ti:8087 | xargs kill`.

## Structure
- `index.html` — all markup; import map before module script; GSAP/Lenis as classic scripts at body end (sync, then module `main.js` runs after)
- `styles.css` — design system: ink `#0a0d14` / bone `#ece7da` / brass `#c4a265`, hairlines, clamp() type scale, film-grain overlay (SVG feTurbulence data URI)
- `js/main.js` — orchestration: loader, hero intro, Lenis, reveals, SplitText masks, counters, horizontal pin, quote scrub, clocks, scramble ticker, cursor, magnetic buttons, menu overlay
- `js/scene.js` — three.js hero: fibonacci star sphere (2,600 pts desktop / 1,500 mobile, custom point shader w/ twinkle + 4.5% gold "fixed stars"), graticule lines, city markers, pooled great-circle "comet" arcs between 10 financial centers (drawRange head/tail animation)

## Key Architectural Decisions
- **Scene is a dynamic import** inside `main.js` with try/catch — if the three.js CDN or WebGL fails, the page works fully without the canvas (`window.__sceneOK` flag records outcome).
- **Render loop pauses** when the hero scrolls out of view (ScrollTrigger) and on `visibilitychange`; DPR clamped (2 desktop / 1.6 coarse pointers).
- **Reduced motion**: `.reduced` class on `<html>`; loader removed, all `[data-reveal]/[data-split]` forced visible, scene renders one static frame, Lenis not initialized.
- **Manual line masks for the hero h1** (`.hline > .hline__in`, fixed `<br>`-free two-line lockup) — immune to SplitText re-split/resize quirks; SplitText (`mask:'lines'`, `autoSplit`) only on section headings, with a WeakSet so replays after resize don't re-animate.
- **Horizontal strategies section** only at ≥1024px + no-preference via `gsap.matchMedia()`; mobile gets a vertical stack. Pin distance = `track.scrollWidth - innerWidth + 35vh`.
- **`.strategies { overflow-x: clip }`** keeps the max-content track from widening the document (body also `overflow-x: clip`).
- **Specificity trap (fixed)**: `.btn` display rule is declared after the nav media query, so hiding the login pill on mobile requires `.nav__right .nav__login { display:none }` — don't lower it back to a single class.
- Animations boot after `document.fonts.ready` (2.5s fallback) so SplitText measures correct line breaks.
- Live details: per-office clocks via `Intl.DateTimeFormat` timezones; hero coordinates ticker scrambles between office lat/lons (DIY scrambler, no plugin).

## Verification (last run: 2026-06-11)
Playwright/Chromium (CDP) at 1440×900, 834×1112, 390×844 + reduced-motion context:
- 0 console errors / 0 page errors on all passes; WebGL OK
- `scrollWidth - clientWidth = 0` (no horizontal overflow) on all viewports
- Pin verified mid-state (start 3334 / end 4774 @1440×900); anchor + Investor Login clicks land on target sections
- Headless FPS reads ~21 desktop because headless uses SwiftShader (software GL) — real-GPU Chrome is far faster; scene is only ~2.6K additive points + ~20 lines
- Note: headless screenshots were the design QA tool — re-check in real Chrome after any scene change

## Status / TODOs
- Complete and verified. Possible future polish: deploy to Render/Netlify static, OG image, favicon .ico fallback for older browsers.
