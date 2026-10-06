# Kenny Lin

Personal portfolio for **https://modas101.github.io/**.

Plain HTML, CSS, and JavaScript. No build step, framework, backend, analytics, or third-party runtime requests. Fonts and images are served locally.

## Run

Serve this directory with any static server, for example `python3 -m http.server 8000`, and open the local address in a browser.

## GitHub Pages

Publish the repository root. `.nojekyll` keeps the files as-is. All local asset paths are relative, and navigation uses same-page anchors.

## Motion and accessibility

The optional opening story plays once per browser tab session. It has Skip, Escape, Pause/Play, Previous, Next, a text alternative, and a Replay button. Manual navigation pauses the story. Reduced-motion preferences bypass the opening. Direct links to sections bypass it too. A missing script or unavailable browser storage leaves the portfolio accessible.

The main page uses ordinary scrolling, semantic headings, keyboard focus indicators, native project disclosures, and an accessible project filter. There is no looping animation on the portfolio itself.

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
