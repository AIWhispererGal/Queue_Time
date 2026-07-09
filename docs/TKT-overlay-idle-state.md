# TKT: Video overlay — off by default, idle "No current speaker" frame, review fixes

**Context:** Zoom Marketplace functional review (Jul 09, 2026) rejected with two findings:
1. "There should be some kind of video overlay feature, but when we click this button, nothing happens. What does happen is that the text length causes all the other elements to shift in the sidebar view."
2. "The participant section is scaled down so small you can't read anything. You scroll through, but can only see a very narrow slice of what is there."

Reviewer screenshots: Error 445–447.png in the Marketplace review notes panel (Publish page → chat icon).

**Do not resubmit from this ticket** — resubmission paperwork is handled separately after these changes are verified.

---

## Change 1 (REQUIRED): Overlay defaults to OFF

`src/App.jsx` (~line 33):

```js
// BEFORE
const [videoOverlayEnabled, setVideoOverlayEnabled] = useState('full');
// AFTER
const [videoOverlayEnabled, setVideoOverlayEnabled] = useState('off');
```

Rationale: overlay must be opt-in. Currently `runRenderingContext({view:'camera'})` fires the first time any speaker turn starts, hijacking the user's camera without any user action.

## Change 2 (REQUIRED): Idle frame instead of silent no-op

`src/hooks/useVideoOverlay.js` — the `if (!currentSpeaker)` branch currently clears the overlay and returns. When overlay mode is `mini` or `full` and there is **no** current speaker:

- Ensure the rendering context is started (same `initRenderingContext()` path).
- Draw a static idle frame on the 1280×720 canvas and push it via the existing `drawImage` fallback chain: centered text **"No current speaker"**, with the app's gradient styling (see `src/utils/overlayRenderer.js` — add an `drawIdle(mode)` method there rather than inline canvas code in the hook).
- Idle frame is static: draw once on mode change / speaker end; no 1 s interval needed while idle.
- Toggling to `off` keeps the existing clear + `closeRenderingContext()` behavior — do not change that path.

Acceptance: clicking the Video button in a live meeting produces an immediately visible change on the user's video in every mode, even with an empty queue.

## Change 3 (REQUIRED): Fix header layout shift

`src/App.css` — `.btn-small` (the `Video: OFF/MINI/FULL` button): add fixed sizing so the label change doesn't reflow the header, e.g.

```css
min-width: 5.75rem !important;
text-align: center !important;
```

(Keep `!important` — this file is in a specificity war with zoom-override.css and the injected styles; see Change 6.)

## Change 4 (REQUIRED): Surface overlay status instead of discarding it

`src/App.jsx` currently discards debug state: `const [, setOverlayDebug] = useState(...)`. Keep the value and render it as small muted text in the header (or under the Video button) whenever `videoOverlayEnabled !== 'off'`. This makes SDK failures (camera off, unsupported API) visible instead of silent. Also show a one-line hint when overlay is on and queue is empty: "Overlay shows on your video; start a turn to display the timer."

## Change 5 (REQUIRED if screenshots confirm): inCamera context split

Check reviewer screenshots first. If they show the **entire app UI squished inside a camera/video tile**, this is the cause of finding #2:

`runRenderingContext({view:'camera'})` re-renders this same webview inside the camera feed. The app never checks its running context, so the full dashboard renders into the camera.

Fix (documented Zoom Layers API pattern): at boot (in `src/main.jsx` or top of `App.jsx`), call `zoomSdk.getRunningContext()`; if `context === 'inCamera'` (also handle `'inImmersive'`), render a minimal `<CameraOverlay/>` (timer, current/next speaker, "No current speaker" idle) instead of the full app. The sidebar instance keeps running the full UI and drives state; the camera instance renders visuals only.

## Change 6 (REQUIRED if screenshots confirm sidebar issue): CSS overflow fix

If screenshots instead/also show the **sidebar** with unreadably small or clipped panels:

- Add `min-width: 0` to `.left-panel`, `.center-panel`, `.right-panel` (grid/flex children default `min-width:auto` and can force horizontal overflow that `overflow:hidden` on `.main-layout` then clips — "narrow slice").
- Longer term: consolidate the three competing style sources (`App.css`, `zoom-override.css`, and the `injectCriticalStyles()` block in `src/hooks/useZoomSdk.js`) into one. At minimum ensure the ≤1024px single-column media query wins in the ~370px Zoom sidebar in BOTH the flex and grid variants.

## Change 7 (OPTIONAL, decide explicitly): persist manually added participants

Manually added participants live only in React state and vanish on app reload. If persistence is wanted, key `localStorage` by meeting ID (`getMeetingContext().meetingID`) and restore on load, expiring entries after ~24 h.

**⚠️ Privacy-claim conflict:** the Marketplace release notes and listing state "Zero data collection — all queue/timer data exists only in browser memory during meeting" and "Data: None stored (temporary session memory only)." localStorage persistence contradicts that as written. If implementing, the release notes / privacy policy must be updated in the same change. Recommendation: **skip for now** — keep the clean privacy story through review; revisit post-approval.

## Housekeeping (include)

- `index.html`: remove the stale `<meta name="zoom-domain-verification" content="ZOOM_verify_3c1c...">` (domain is now TXT-verified via DNS with a different token; the meta is dead weight).

---

## Test plan (local + in-client)

1. Browser dev mode (`https://queuetime.app` or `npm run dev`): Video button cycles OFF→MINI→FULL with no layout shift; status text explains overlay is unavailable outside Zoom.
2. Zoom desktop client, real meeting, dev build: app loads with overlay OFF; nothing touches the camera until the button is pressed.
3. Toggle MINI with empty queue → "No current speaker" appears on own video promptly. Toggle FULL → same, full styling. Toggle OFF → overlay cleared, camera normal.
4. Start a speaker turn with overlay on → timer overlay renders and counts down; end turn → returns to idle frame (not blank).
5. If Change 5 implemented: while overlay active, confirm the camera feed shows ONLY the overlay visuals, never the app dashboard.
6. Sidebar check: default sidebar width — all three sections readable, no horizontal clipping; participant names ellipsize rather than force overflow.

## Files

- `src/App.jsx`
- `src/hooks/useVideoOverlay.js`
- `src/utils/overlayRenderer.js`
- `src/App.css` (and possibly `src/zoom-override.css`, `src/hooks/useZoomSdk.js` for Change 6)
- `src/main.jsx` + new `src/components/CameraOverlay.jsx` (Change 5)
- `index.html` (housekeeping)
