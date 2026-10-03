# Public website data

Production uses V1. V2 is an isolated, non-deployed design snapshot.

* `people.json`: current organisational `roles` and persistent
  `research_academy` cohort history (`member` or `promoted`). Academy
  `research_areas` are curated areas for the cohort card; project roles are
  derived from projects, never copied into organisational roles.
  Optional `about` biographies are concise adaptations of a verified profile's
  About text; `about_source` records its source URL. Missing biographies stay hidden.
  `education` and `experience` render compact affiliation lines separately from
  QRS organisational roles. Education uses verified public profiles and the supplied
  school reference; the five UBS internship labels were confirmed by the user.
  Optional affiliation `dates` display to the right on desktop and wrap on mobile.
  Education `dates_source` records the LinkedIn profile where the range was verified;
  internship ranges were supplied by the user. Leave unavailable dates blank.
* `projects.json`: stable parent programmes. Research programmes have one
  `lead`, `authors`, and `slicers`. These relationships are distinct and may
  overlap. `derived_research` contains generic public wording only.
  Existing unrelated projects retain their `participants` and recognition.
* `research.json`: **accepted records only**, with `status: accepted`.
  This is not an operational tracker. Do not put non-accepted titles,
  venues, internal codes, deadlines, or rejection history in deployable data.
  `related_project_ids` permits accepted cross-links without duplicate papers.
* `publications.json`: intentionally retained public archival/preprint records.
  The shared `publicPublications` helper merges these with accepted research
  for publications, profiles and the homepage, deduplicating matching titles
  and preserving old publication anchors. Do not duplicate the accepted workshop collection here. Project preprint
  links live in `projects.json` with the generic label `arXiv preprint`.

Generate project pages, Academy pages and missing profile wrappers with
`python Website/tools/generate_research.py`, then run
`python Website/tools/generate_seo.py`. Renderers use the same JSON data.
Generate campus previews with `python Website/v1/branches/build_drafts.py`.
Generated HTML is checked in for crawlability; edit data/templates instead.

Old project directory URLs redirect to the new names; the projects renderer
also preserves inbound `#project-…` anchors. Vanity profile routes are retained.
