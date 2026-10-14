# Campus branch previews

The site contains /nus/, /cuhk/, /fdu/, /sjtu/, /cmu/, /hkust/, and /ntu-tw/.
Each has a full-content homepage and inner pages; /{campus}/landing/ contains the minimal landing variant and its local About page.
Compare at /branches/. Chinese About pages are included for CUHK, FDU and SJTU.
The footer uses QRS@FDU, with English and Chinese on separate lines in the brand column.
CMU, FDU, CUHKSZ (港中深), and SJTU display Coming soon in the network directory.
NUS links to `/nus/`; `/tw/` is a compatibility entry point for `/ntu-tw/`.
The existing `/cuhk/` preview route is retained under CUHKSZ branding.
The full-content previews reuse existing NTU records; local campus records remain to be supplied.

Previews are generated into `site/<campus>/` from the main pages (News is not copied).
The public campus scripts stay in `site/branches/`; this folder holds the generator and the Chinese About fragment.
Regenerate with `python tools/build.py`, or this step alone:
python tools/branches/build_drafts.py
The generator excludes branch directories to avoid recursive copies.
