# QRS branch drafts

Open http://127.0.0.1:8874/v2/chapters/ to compare both versions for NUS, 上交 (SJTU), and HKUST.

- Full content: /v2/chapters/{campus}/ includes the existing V2 homepage and inner pages under branch branding.
- Landing: /v2/chapters/{campus}/landing/ includes the original hero and a local About page. All other links point to the main https://qrsntu.org website.
- Both versions retain the original design, add Main branch in the top navigation, and omit Math Notes.
- Existing NTU research, people, event records, and contacts remain shared preview content, not verified campus-specific records.

Run rtk proxy python Website/v2/chapters/build_drafts.py to regenerate the branch HTML from the original V2 files. Header, footer and routing modules are shared across all branch drafts. Original resources and data are reused via each page base URL.

V1 branch data and footer rendering now include non-clickable Coming soon entries for SJTU and FDU. No deployment has been performed.

Latest revision: subbranch top navigation contains only Main Branch. CUHK, FDU and SJTU have Chinese About content in both full and landing variants. V1/V2 footers list MAIN BRANCH and SUB BRANCH; CMU and SJTU are Coming soon. CUHK/FDU public URLs are not configured. HKUST previews are retained but excluded from the requested public branch listing.
