# Kenny Lin

Personal portfolio for **https://modas101.github.io/**.

Plain HTML, CSS, and JavaScript. No build step, framework, backend, analytics, or third-party runtime requests. Fonts and images are served locally.

## Run

Serve this directory with any static server, for example `python3 -m http.server 8000`, and open the local address in a browser.

## GitHub Pages

Publish the repository root. `.nojekyll` keeps the files as-is. All local asset paths are relative, and navigation uses same-page anchors.

## Motion and accessibility

The optional 51.4-second opening offers “Play with sound” and “Watch silently” once per browser tab session. Audio never starts without an explicit user gesture. It has Skip, Escape, Pause/Play, Previous, Next, a text alternative, and a Replay button. Manual navigation pauses the story. Reduced-motion preferences bypass the opening. Direct links to sections bypass it too. A missing script or unavailable browser storage leaves the portfolio accessible.

The main page uses ordinary scrolling, semantic headings, keyboard focus indicators, native project disclosures, and an accessible project filter. There is no looping animation on the portfolio itself. The intro uses prebuilt scene layers, overlapping transform/opacity entrances and exits, a shared Web Animations timeline, continuous progress, and one persistent résumé-camera movement rather than replacing/canceling every scene. Font and résumé-image preloads reduce first-frame swaps.

## Sound

The primary soundtrack is **“Moil” by Ruskerdax**, a CC0 noir-jazz composition, with **CC0 swishes by artisticdude** and selected **Kenney CC0 interface samples**. The four local audio files total approximately 3.05 MB. The music file retains the full piece; the audio engine crossfades the final 1.6 seconds into the next playback rather than cutting or treating an arbitrary excerpt as a musical loop. Exact sources, licenses, selected originals, and processing are in `assets/audio/AUDIO-LICENSES.txt`. Nothing is ripped from an anime/game soundtrack.

Native Web Audio decodes and mixes these library assets. A 25 ms lookahead scheduler schedules against the audio hardware clock; gain ramps, gentle filtering, compression, and source cleanup avoid abrupt cutoffs. The intro has synchronized swishes, low impacts, and résumé-scan accents. The bed settles to a quieter level while browsing the portfolio. A deterministic original eight-bar synthesized fallback is used only if the recorded music fails to load.

Mute and volume remain available during the story and on the portfolio. Pause stops both motion and audio; hiding the tab pauses playback and returning does not restart it automatically. Replay returns to the sound-choice screen. Escape/Skip, Previous/Next, reading the transcript, direct hash links, once-per-tab behavior, and reduced motion remain supported. AudioContext is created/resumed only in an explicit click, and unsupported audio leaves a usable silent story. No accounts, analytics, trackers, or third-party runtime/CDN requests are added.

## Content and assets

Project figures are from the September 2026 portfolio/résumé and are historical, not live counters. The résumé image is an excerpt of experience and projects only. It excludes the contact and education header; the original PDF is not included.

- My Floating Isles artwork: @Gibbletiggle, retained from the existing portfolio
- Tivelet artwork: retained official project artwork
- Barlow Condensed: Jeremy Tribby, SIL Open Font License; see `fonts/BARLOW-OFL.txt`
- Space Grotesk: Florian Karsten, SIL Open Font License; see `fonts/SPACE-OFL.txt`
- Geometric print layers and spiral graphic: original site graphics

## Design references

The motion uses transform and opacity where practical, avoids scroll hijacking, and offers a complete reduced-motion alternative. References consulted:

- https://web.dev/articles/animations-guide
- https://www.w3.org/WAI/WCAG22/Techniques/css/C39
- https://www.nngroup.com/articles/animation-purpose-ux/
- https://www.nngroup.com/articles/animation-duration/

## Additional implementation references

- https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API/Using_the_Web_Animations_API
- https://web.dev/articles/stick-to-compositor-only-properties-and-manage-layer-count
- https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices
- https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Advanced_techniques
- https://developer.mozilla.org/en-US/docs/Web/API/AudioParam/setTargetAtTime
- https://developer.mozilla.org/en-US/docs/Web/API/DynamicsCompressorNode
