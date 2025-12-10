## Convert PDF file to Latex


Convert the uploaded PDF into a **complete, clean, and fully formatted LaTeX document** using the style template provided below.
Always output the **entire LaTeX file**, from `\documentclass` to `\end{document}`, ensuring it is fully compilable and visually consistent with the PDF reference.

---

### **Inputs Provided**

* The **original PDF** (for structure, layout, and visual reference)
* The **machine-converted `.tex` file** (for partial math reconstruction)
* The **LaTeX style template** (below) to ensure consistent formatting, headers, and metadata

---

### **Conversion Requirements**

1. **Full Document Rendering**

    * Always render the *complete* `.tex` document, including preamble and `\end{document}`.
    * Do **not** truncate or summarize sections.

2. **Title, Author, and Metadata Adaptation**

    * Use the title format:

      ```latex
      \title{<AUTO: Course Code and Title> -- Solutions}
      \author{<AUTO: Assessment Type, Academic Year, Semester> \\ \small{\textit{Quantitative Research Society @NTU}}}
      ```

      Examples:

        * `\title{MH1300 Foundations of Mathematics -- Solutions}`
        * `\author{Final Examination, Academic Year 2024/2025, Semester 2 \\ \small{\textit{Quantitative Research Society @NTU}}}`
    * Automatically update course code, title, semester, and academic year based on the uploaded PDF.
    * The date (`\date{}`) should be updated to reflect the inferred or current month and year (e.g., `\date{November 2025}`).

3. **Formatting and Layout Consistency**

    * Use **exactly** the formatting conventions of the style template:
      headers, footers, watermark, and spacing.
    * Clearly separate **Problem**, **Solution**, **Remark**, and **Theorem** parts.
    * Reconstruct all math environments properly using `equation`, `align`, `cases`, `bmatrix`, etc.
    * Maintain visual consistency for spacing and indentation (`\bigskip`, `\medskip`, etc.).

4. **Text and Equation Reconstruction**

    * Faithfully reproduce all text, symbols, and equations from the PDF.
    * Fix OCR or machine conversion issues (e.g., missing subscripts, misread symbols, spacing).
    * For unreadable or ambiguous text, insert:

      ```latex
      % [Unclear text here]
      ```
    * Do **not** include figures, scanned images, or decorative borders.

5. **Output Requirements**

    * Produce one **fully compilable LaTeX file** that visually reproduces the original document’s structure with updated metadata.
    * The final output must contain everything — no placeholders or omitted sections.

---

### **Style Template**

```latex
\documentclass[11pt]{article}
\usepackage[margin=1in]{geometry}
\usepackage{amsmath,amssymb,mathtools}
\usepackage{enumitem}
\usepackage{bm}
\usepackage{hyperref}
\usepackage{orcidlink}
\usepackage{fancyhdr}
\usepackage{draftwatermark}

%------------- TITLE AND METADATA (auto-update based on PDF) -------------
\title{MH1300 Foundations of Mathematics -- Solutions}
\author{Final Examination, Academic Year 2017/2018, Semester 1 \\ \small{\textit{Quantitative Research Society @NTU}}}
\date{November 2025}
%--------------------------------------------------------------------------

\pagestyle{fancy}
\fancyhf{}
\fancyhead[L]{MH1300 Foundations of Mathematics}
\fancyhead[R]{\href{https://qrsntu.org}{QRS@NTU}}
\fancyfoot[C]{\thepage}
\renewcommand{\headrulewidth}{0.4pt}
\renewcommand{\footrulewidth}{0pt}

\SetWatermarkText{QRS@NTU — qrsntu.org}
\SetWatermarkScale{0.25}
\SetWatermarkLightness{0.99}

\begin{document}
\maketitle
\bigskip
%----------------------------

% [Full reconstructed LaTeX content begins here]

\end{document}
'''