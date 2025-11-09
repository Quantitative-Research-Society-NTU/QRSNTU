#!/usr/bin/env python3
"""
One-time script to rename files to put academic year before semester
Example: MH1100_CalculusI_Midterm_Sem1_18-19_QuestionPaper.pdf
      -> MH1100_CalculusI_Midterm_18-19_Sem1_QuestionPaper.pdf
"""

import os
import re
from pathlib import Path


def rename_files(root_dir):
    """
    Rename files in the Notes directory to put year before semester
    Pattern: _Sem[12]_YY-YY_ -> _YY-YY_Sem[12]_
    """
    pattern = r'_(Sem[12])_(\d{2}-\d{2})_'
    replacement = r'_\2_\1_'

    renamed_count = 0
    dry_run = False  # Set to False to actually rename files

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
        print("To rename files, set dry_run = False in the script.")
    else:
        print(f"\nSuccessfully renamed {renamed_count} files.")

    return renamed_count


if __name__ == "__main__":
    notes_dir = "../Notes"
    if not os.path.exists(notes_dir):
        print(f"Error: Directory '{notes_dir}' not found!")
        print(f"Current directory: {os.getcwd()}")
        print(f"\nPlease run this script from the repository root directory.")
        exit(1)
    count = rename_files(notes_dir)
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
