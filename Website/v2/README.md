# V2 — restrained accent study

Preserves V1's dark navigation, centred network-image hero, Playfair Display typography, section order, cards and white/grey backgrounds. Loads V1's shared CSS and navigation.

Dark blue `#183B63` (hover `#102C4B`) replaces the garnet accents. The homepage Programmes section compares the two pathways, with focus, format and direct links. The hero fade affects only the background, keeping text and buttons readable.

The supplied Noto Sans SC and Noto Serif SC variable fonts are self-hosted as WOFF in `fonts/`, with their original OFL licences. They provide Chinese fallbacks throughout v2; Math Notes uses Noto Sans SC for its main content, including headings. English typography elsewhere remains Inter/Playfair. Events supports keyword, status, type and year filtering; Publications supports keyword, author, year and venue filtering.

Serve `Website` and visit `/v2/`. Navigation now connects the inner-page drafts: About, Projects, Publications, Programmes, Events, People and profiles, Math Notes, Join QRS and Contact. Main-content styling is isolated in `drafts.css`; existing headers, page titles, typography and footers use the V1 styles. Projects/publications retain search and filtering. Data and renderers are copied snapshots for draft isolation; homepage data still reads V1. These drafts do not modify V1.
