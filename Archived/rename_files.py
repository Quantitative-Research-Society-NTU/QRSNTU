#!/usr/bin/env python3
"""
One-time script to rename files to put academic year before semester
Example: MH1100_CalculusI_Midterm_Sem1_18-19_QuestionPaper.pdf
      -> MH1100_CalculusI_Midterm_18-19_Sem1_QuestionPaper.pdf

Also adds a tutorial-detection/reporting mode so tutorials can be
presented similarly to problem sheets (grouped by course, year, semester).
"""

import os
import re
import json
import argparse
from pathlib import Path
from dataclasses import dataclass, asdict
from datetime import datetime
from typing import List, Optional, Dict


def rename_files(root_dir, dry_run=False):
    """
    Rename files in the Notes directory to put year before semester
    Pattern: _Sem[12]_YY-YY_ -> _YY-YY_Sem[12]_
    """
    pattern = r'_(Sem[12])_(\d{2}-\d{2})_'
    replacement = r'_\2_\1_'

    renamed_count = 0

    print(f"Scanning directory: {root_dir}")
    print(f"Mode: {'DRY RUN (no changes)' if dry_run else 'LIVE (files will be renamed)'}")
    print("-" * 80)

    for root, dirs, files in os.walk(root_dir):
        for filename in files:
            if filename.endswith('.pdf') or filename.endswith('.zip'):
                if re.search(pattern, filename):
                    new_filename = re.sub(pattern, replacement, filename)

                    if new_filename != filename:
                        old_path = Path(root) / filename
                        new_path = Path(root) / new_filename

                        print(f"\n📁 {Path(root).relative_to(root_dir)}")
                        print(f"  OLD: {filename}")
                        print(f"  NEW: {new_filename}")

                        if not dry_run:
                            try:
                                old_path.rename(new_path)
                                print("  ✓ Renamed successfully")
                                renamed_count += 1
                            except Exception as e:
                                print(f"  ✗ Error: {e}")
                        else:
                            renamed_count += 1

    print("\n" + "=" * 80)
    print(f"Total files to rename: {renamed_count}")
    if dry_run:
        print("\nThis was a DRY RUN. No files were actually renamed.")
        print("To rename files, run without --dry-run or set dry_run = False in the script.")
    else:
        print(f"\nSuccessfully renamed {renamed_count} files.")

    return renamed_count


# ---------------- New: Tutorial detection and reporting ----------------

EXTENSIONS = {'.pdf', '.zip', '.docx', '.doc', '.pptx', '.ppt'}
COURSE_RE = re.compile(r'([A-Z]{2,4}\d{4})')
YEAR_PATTERNS = [
    re.compile(r'(\d{2}-\d{2})'),
    re.compile(r'(\d{4}-\d{4})'),
    re.compile(r'AY\s*(\d{2}[-/]\d{2})', re.IGNORECASE),
    re.compile(r'AY\s*(\d{4}[-/]\d{4})', re.IGNORECASE),
]
SEM_RE = re.compile(r'Sem(?:ester)?[_\s-]*([12])', re.IGNORECASE)
TUTOR_INDICATOR = re.compile(r'\b(tutorials?|tut|practice|problem sheets|problem_sheets|problem-sheets|problemsheets)\b', re.IGNORECASE)


@dataclass
class TutorialRecord:
    course_code: Optional[str]
    course_title: Optional[str]
    doc_type: str
    academic_year: Optional[str]
    semester: Optional[int]
    file_name: str
    relative_path: str
    size_bytes: int
    mtime_iso: str


def find_tutorial_paths(root: Path):
    """Yield candidate file paths that look like tutorials/problem sheets."""
    for dirpath, dirs, files in os.walk(root):
        pdir = Path(dirpath)
        # If this directory name strongly indicates tutorials, include its files
        is_tutorial_dir = any(TUTOR_INDICATOR.search(part) for part in pdir.parts)

        for fname in files:
            fpath = pdir / fname
            suffix = fpath.suffix.lower()
            if suffix not in EXTENSIONS:
                continue

            # Heuristics: either filename contains tutorial indicator OR the file is in a tutorials dir
            if TUTOR_INDICATOR.search(fname) or is_tutorial_dir:
                yield fpath
            else:
                # Also include files that contain 'problem' (problem sheets) or 'sheet' etc.
                if re.search(r'problem', fname, re.IGNORECASE) or re.search(r'sheet', fname, re.IGNORECASE):
                    yield fpath


def extract_course_code_from_parts(parts: List[str]) -> Optional[str]:
    for part in parts:
        m = COURSE_RE.search(part)
        if m:
            return m.group(1)
    return None


def find_academic_year_in_parts(parts: List[str]) -> Optional[str]:
    for part in parts:
        for pat in YEAR_PATTERNS:
            m = pat.search(part)
            if m:
                # normalize separators to '-'
                return m.group(1).replace('/', '-')
    return None


def find_semester_in_parts(parts: List[str]) -> Optional[int]:
    for part in parts:
        m = SEM_RE.search(part)
        if m:
            try:
                return int(m.group(1))
            except Exception:
                return None
    return None


def parse_tutorial_from_path(path: Path, root: Path) -> Optional[TutorialRecord]:
    """Parse metadata for a tutorial-like file path.

    Heuristics:
    - Look for course code in filename, then parent folders.
    - Look for academic year tokens in filename or ancestors.
    - Look for semester tokens similarly.
    - Determine doc_type from indicators.
    """
    parts = [p for p in ([path.name] + list(path.parts)) if isinstance(p, str)]

    course_code = extract_course_code_from_parts(parts)
    academic_year = find_academic_year_in_parts(parts)
    semester = find_semester_in_parts(parts)

    # Determine doc type
    fname = path.name
    doc_type = 'tutorial' if TUTOR_INDICATOR.search(fname) or any(TUTOR_INDICATOR.search(p.name) for p in path.parents) else 'problem_sheet'

    # Try to infer course title from parent folder names (fallback)
    course_title = None
    # if course code present, try to find sibling folder name that looks like a title
    if course_code:
        # scan parents for a folder that isn't the course code itself
        for p in path.parents:
            if p.name and course_code not in p.name:
                if not COURSE_RE.search(p.name):
                    course_title = p.name.replace('_', ' ').replace('-', ' ').strip()
                    break

    rel = str(path.relative_to(root)) if root in path.parents or path == root else str(path)
    stat = path.stat()
    mtime_iso = datetime.fromtimestamp(stat.st_mtime).isoformat()

    return TutorialRecord(
        course_code=course_code,
        course_title=course_title,
        doc_type=doc_type,
        academic_year=academic_year,
        semester=semester,
        file_name=path.name,
        relative_path=rel,
        size_bytes=stat.st_size,
        mtime_iso=mtime_iso,
    )


def detect_tutorials(root_dir: str) -> List[TutorialRecord]:
    root = Path(root_dir)
    records: List[TutorialRecord] = []

    for p in find_tutorial_paths(root):
        try:
            rec = parse_tutorial_from_path(p, root)
            if rec:
                records.append(rec)
        except Exception:
            # non-fatal parsing error for a single file
            continue

    return records


def render_markdown(records: List[TutorialRecord]) -> str:
    # Group by course_code -> academic_year -> semester
    grouping: Dict[str, Dict[str, Dict[Optional[int], List[TutorialRecord]]]] = {}
    for r in records:
        course = r.course_code or 'UNKNOWN_COURSE'
        year = r.academic_year or 'UNKNOWN_YEAR'
        sem = r.semester
        grouping.setdefault(course, {}).setdefault(year, {}).setdefault(sem, []).append(r)

    lines: List[str] = []
    for course in sorted(grouping.keys()):
        header = course
        lines.append(f"## {header}")
        for year in sorted(grouping[course].keys()):
            lines.append(f"\n### {year}")
            year_block = grouping[course][year]
            for sem in sorted(year_block.keys(), key=lambda x: (x is None, x)):
                sem_label = f"Sem {sem}" if sem is not None else "Unknown semester"
                lines.append(f"\n#### {sem_label}")
                for rec in sorted(year_block[sem], key=lambda r: r.file_name):
                    title = rec.course_title or ''
                    lines.append(f"- {rec.file_name} — {title} — {rec.relative_path}")
        lines.append('\n---\n')
    return '\n'.join(lines)


def render_json(records: List[TutorialRecord]) -> str:
    return json.dumps([asdict(r) for r in records], indent=2)


# ---------------------- CLI / main flow ----------------------

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Rename files and optionally detect tutorials/problem sheets')
    parser.add_argument('--detect-tutorials', action='store_true', help='Detect tutorial/problem-sheet files and emit a report')
    parser.add_argument('--root', type=str, default='../Notes', help='Root directory to scan (defaults to ../Notes)')
    parser.add_argument('--output-format', choices=['md', 'json'], default='md', help='Report output format when detecting tutorials')
    parser.add_argument('--report-file', type=str, default=None, help='Optional path to write the report to')
    parser.add_argument('--dry-run', action='store_true', help='Do not perform renames; only show what would change')
    args = parser.parse_args()

    notes_dir = args.root
    if not os.path.exists(notes_dir):
        print(f"Error: Directory '{notes_dir}' not found!")
        print(f"Current directory: {os.getcwd()}")
        print(f"\nPlease run this script from the repository root directory or specify --root correctly.")
        exit(1)

    if args.detect_tutorials:
        records = detect_tutorials(notes_dir)
        if args.output_format == 'md':
            out = render_markdown(records)
        else:
            out = render_json(records)

        if args.report_file:
            with open(args.report_file, 'w', encoding='utf-8') as f:
                f.write(out)
            print(f"Wrote report to {args.report_file} ({len(records)} records)")
        else:
            print(out)

        # Don't run renaming when detection was requested
        print('\nDetection complete.')
        exit(0)

    # Otherwise run the original renaming flow
    count = rename_files(notes_dir, dry_run=args.dry_run)
    if count > 0:
        print("\n" + "=" * 80)
        print("After renaming files, you'll need to:")
        print("1. Regenerate the courses.json file")
        print("2. Update folder names if they contain Sem_YY-YY pattern")
        print("3. Commit and push the changes to GitHub")
    else:
        print("\n" + "=" * 80)
        print("No files found matching the pattern _Sem[12]_YY-YY_")
        print("\nThis could mean:")
        print("1. Files are already in the new format (_YY-YY_Sem[12]_)")
        print("2. Files follow a different naming pattern")
        print("3. The Notes directory is empty or doesn't contain PDFs")
