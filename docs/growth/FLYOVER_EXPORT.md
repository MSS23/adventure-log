# Flyover Video Export

Turn the Wrapped flight animation into a shareable 9:16 vertical video
(TikTok / Reels / Shorts), recorded entirely client-side — no server
rendering, no upload.

## User flow

1. Finish (or skip to) the Wrapped stats screen on your OWN Wrapped
   (`/wrapped`). The **Export Video** button appears next to Download Card —
   only when the browser can record (see support matrix) and there are at
   least 2 pinned locations (otherwise there is no flight to record).
2. Tap Export Video → the flight animation restarts from the beginning while
   a "Recording your journey…" pill shows. The Skip button becomes **Cancel**
   (discards the footage).
3. When the plane lands at the last pin, the finale wide shot is held for
   ~1.5 s (also recorded), then the recorder stops.
4. The file is offered via the native share sheet
   (`navigator.share({ files })`) when the device supports file sharing;
   otherwise it downloads as `travel-wrapped-<year>.<mp4|webm>`.
5. A `video_export` growth event is tracked with
   `meta: { year, mimeType, ms }` (see `docs/growth/METRICS.md`).

## How the recording pipeline works

```
WrappedGlobe (react-globe.gl WebGL canvas)
        │  remounted with rendererConfig.preserveDrawingBuffer = true
        ▼
createWatermarkCompositor()          src/lib/utils/globe-recorder.ts
  offscreen 1080x1920 <canvas>, rAF loop:
    • black fill
    • globe canvas drawn cover-cropped + centered (9:16 framing)
    • watermark: "Adventure Log" + "<host> · <year> Wrapped"
      (host from getWebOrigin(), so a future custom domain flows through)
        │  compositor.canvas.captureStream(30)
        ▼
startRecording()                     MediaRecorder, 8 Mbps, 1 s timeslices
  mimeType picked in order:
    1. video/mp4                     (Chrome 126+, recent Android WebView)
    2. video/webm;codecs=vp9
    3. video/webm
        │  stop() → Blob
        ▼
useWrappedVideoExport (src/components/wrapped/useWrappedVideoExport.ts)
  share sheet / object-URL download + trackGrowthEvent('video_export')
```

Key implementation notes:

- **The compositor canvas is recorded, not the globe canvas.** That is what
  bakes in the watermark and forces vertical 9:16 output regardless of the
  viewer's screen shape. On wide desktop screens the sides of the globe view
  are cropped away; the chase-cam keeps the plane centered so nothing
  important is lost.
- **`preserveDrawingBuffer` is required** to `drawImage()` from a WebGL
  canvas on an independent rAF loop — without it the buffer is cleared after
  each composite and frames come out black. It costs a little GPU memory, so
  it is only enabled for export runs: the export remounts `WrappedGlobe`
  (fresh React key), which both restarts the flight from the beginning and
  rebuilds the renderer with the flag. Normal playback is untouched.
- **Lazy loading:** `globe-recorder.ts` is `import()`ed by the hook after
  mount (for feature detection) and never ships in the shared bundle;
  a normal Wrapped view pays ~0 cost.
- **Pointer input is disabled during recording** so a stray drag can't fight
  the scripted chase-cam.
- **prefers-reduced-motion:** the flight is explicitly user-initiated (they
  tapped Export), so it still plays and records under reduced-motion
  settings — nothing is gated on the media query.
- **Cleanup:** navigating away (or switching year/friend) mid-recording
  cancels the recorder and compositor via effect cleanup; footage is
  discarded.
- The DOM overlays (progress bar, album flight reel, stat pills) are NOT in
  the video — only the globe + watermark. This is deliberate: canvas
  capture cannot see sibling DOM, and the clean flyover reads better as a
  post anyway.

## Browser / WebView support matrix

| Platform | captureStream | MediaRecorder mp4 | Result |
|---|---|---|---|
| Chrome / Edge desktop 126+ | yes | yes | mp4 |
| Chrome / Edge desktop < 126 | yes | no | webm (vp9) |
| Chrome Android / Android WebView (recent, incl. our Capacitor APK) | yes | yes (recent System WebView) | mp4, else webm |
| Firefox | yes | no | webm (vp9) |
| Safari macOS / iOS 14.1+ | partial/late | no mp4 for canvas streams; MediaRecorder support uneven | webm where MediaRecorder exists; **button hidden** where `canRecordVideo()` fails |
| Safari < 14.1 / old WebViews | varies | no | button hidden |

`canRecordVideo()` is the single gate: it checks
`HTMLCanvasElement.prototype.captureStream`, `MediaRecorder`, and
`isTypeSupported` for the candidate types. If it returns false the Export
Video button never renders.

### Known caveats

- **Transient activation:** `navigator.share()` requires a recent user
  gesture on Chrome/Safari, but the export finishes seconds after the tap
  (the whole flight plays first). Where the browser rejects the deferred
  share (`NotAllowedError`), the code falls through to the object-URL
  download — the file is never lost. A cleaner future flow: keep the blob
  and surface a "Share video" button on the stats screen so the share
  happens inside a fresh tap.
- **Capacitor APK:** the Android System WebView does not implement the Web
  Share API by default, so the APK takes the download path; anchor-click
  downloads inside a WebView depend on the host app's download handling.
  Follow-up: write the blob via `@capacitor/filesystem` and hand it to
  `@capacitor/share` for a proper native share sheet.

## mp4 vs webm caveat for TikTok / IG uploads

- **mp4** is universally accepted by TikTok, Instagram, and YouTube upload
  flows. When the recorder produces mp4 (Chrome 126+/recent Android), the
  share sheet → app flow "just works".
- **webm** is more fragile: the Android share sheet hands the file to the
  target app, and most (TikTok, IG) re-encode whatever they receive, so webm
  usually works there — but some apps/platforms (notably anything
  iOS-adjacent, some IG web upload paths) reject webm outright. Desktop
  users who download a webm may need a converter before uploading.
- The share filename/extension always matches the actual container, so users
  aren't handed a mislabeled file.

## Follow-up ideas

- **Server-side rendering for guaranteed mp4**: replay the flight in
  headless Chromium (or re-project pins into a remotion/ffmpeg pipeline) on
  a worker, and email/notify a download link. Removes every browser caveat
  above and enables higher bitrates + audio.
- **Music**: mix a royalty-free bed into the MediaRecorder stream via
  WebAudio (`AudioContext` → `MediaStreamDestination`, add the audio track to
  the canvas stream). Licensing and iOS autoplay policies need checking.
- **Richer composition**: draw the stat pills / destination labels / album
  covers onto the compositor canvas so the video carries the story, not just
  the flight.
- **Quality knobs**: bump `videoBitsPerSecond` or resolution for high-end
  devices; currently fixed at 1080x1920 @ 30 fps, 8 Mbps.
