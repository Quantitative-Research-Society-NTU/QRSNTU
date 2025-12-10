# Implementation Guide for QRSNTU Repository Updates

This guide walks you through implementing three major changes to the QRSNTU repository:

1. Rename files to put year before semester
2. Add collapsible sections for Problem Sheets and Lecture Notes
3. Add collapsible section for Practice Materials

## Prerequisites

- Python 3.7+ installed
- Git installed and configured
- Access to your QRSNTU repository
- Basic command line knowledge

## Step 1: Backup Your Repository

Before making any changes, create a backup:

```bash
git checkout -b backup-before-updates
git push origin backup-before-updates
git checkout main  # or your working branch
```

## Step 2: Rename Files (Year Before Semester)

### 2.1 Download the Rename Script

Save the `rename_files.py` script to the root of your QRSNTU repository.

### 2.2 Test Run (Dry Run)

First, run the script in dry-run mode to see what will be changed:

```bash
cd /path/to/QRSNTU
python3 rename_files.py
```

This will show you all the files that will be renamed without actually changing them.

### 2.3 Execute the Rename

Once you've reviewed the changes and are satisfied:

1. Open `rename_files.py` in a text editor
2. Find the line `dry_run = True`
3. Change it to `dry_run = False`
4. Save the file
5. Run the script again:

```bash
python3 rename_files.py
```

### 2.4 Verify the Changes

Check that files have been renamed correctly:

```bash
# Look at files in one of your course folders
ls "Notes/MH1300/MH1300 - Foundations of Mathematics - Finals/"
```

Files should now be named like:
- `MH1300_FoundationsofMathematics_Finals_23-24_Sem1_Solution Handwritten.pdf`

Instead of:
- `MH1300_FoundationsofMathematics_Finals_Sem1_23-24_Solution Handwritten.pdf`

## Step 3: Update Website JavaScript

### 3.1 Backup Current JavaScript

```bash
cd Website/v1
cp math_notes.js math_notes.js.backup
```

### 3.2 Replace with Updated Version

Replace the contents of `Website/v1/math_notes.js` with the content from `math_notes_updated.js`.

The new version includes:
- Support for `problemSheets` array in course materials
- Support for `lectureNotes` array in course materials
- Support for `practiceMaterials` array in course materials
- Collapsible sections with chevron icons
- Click-to-expand functionality

## Step 4: Update courses.json Structure

You'll need to update your JSON generation script (or manually update) to include the new fields. The `courses.json` structure should now support:

```json
{
  "courses": [
    {
      "code": "MH5100",
      "name": "Advanced Investigations in Calculus I",
      "materials": {
        "finals": { ... },
        "midterms": { ... },
        "problemSheets": [
          {
            "name": "MH5100_..._Week 2_QuestionPaper.pdf",
            "path": "Notes/...",
            "downloadUrl": "https://..."
          }
        ],
        "lectureNotes": [
          {
            "name": "MH5100_..._Week 1.pdf",
            "path": "Notes/...",
            "downloadUrl": "https://..."
          }
        ],
        "practiceMaterials": [
          {
            "name": "Practice_Problems.pdf",
            "path": "Notes/...",
            "downloadUrl": "https://..."
          }
        ],
        "revisionNotes": [ ... ],
        "pastYearZips": [ ... ]
      }
    }
  ]
}
```

## Step 5: Organize New Material Types

### 5.1 Create Problem Sheets Folders

For courses with problem sheets:

```bash
cd Notes/MH5100
mkdir "MH5100 - Advanced Investigations in Calculus I - Problem Sheets (AY25-26)"
```

Place problem sheet files following the naming convention:
```
MH5100_AdvancedInvestigationsinCalculusI_25-26_Sem1_ProblemSheet_Week 2_QuestionPaper.pdf
MH5100_AdvancedInvestigationsinCalculusI_25-26_Sem1_ProblemSheet_Week 2_Solution.pdf
```

### 5.2 Create Lecture Notes Folders

For courses with lecture notes:

```bash
cd Notes/MH5100
mkdir "MH5100 - Advanced Investigations in Calculus I - Lecture Notes (AY25-26)"
```

Place lecture note files following the naming convention:
```
MH5100_AdvancedInvestigationsinCalculusI_25-26_Sem1_LectureNotes_Week 1.pdf
```

### 5.3 Create Practice Materials Folders

For courses without traditional finals/midterms:

```bash
cd Notes/MH4930
mkdir "MH4930 - Special Topics in Mathematics - Practice Materials"
```

Place practice materials with plain descriptive names:
```
Topic1_Practice_Problems.pdf
Sample_Exercises_Set1.pdf
```

## Step 6: Update JSON Generation Script

If you have a script that generates `courses.json`, update it to:

1. Scan for folders matching:
   - `{Code} - {Name} - Problem Sheets (AY{Year})`
   - `{Code} - {Name} - Lecture Notes (AY{Year})`
   - `{Code} - {Name} - Practice Materials`

2. Parse files from these folders and add them to the appropriate arrays

3. Ensure the new naming convention (year before semester) is properly parsed

Example Python snippet for parsing:

```python
import re

# Pattern for new format: _YY-YY_Sem[12]_
pattern = r'_(\d{2}-\d{2})_(Sem[12])_'

match = re.search(pattern, filename)
if match:
    year = match.group(1)
    semester = match.group(2)
```

## Step 7: Test the Website Locally

Before pushing changes:

1. Start a local web server:
```bash
cd Website/v1
python3 -m http.server 8000
```

2. Open http://localhost:8000/math_notes.html in your browser

3. Verify:
   - Files are displayed with correct names
   - Problem Sheets section appears and is collapsible
   - Lecture Notes section appears and is collapsible
   - Practice Materials section appears and is collapsible
   - Clicking chevrons expands/collapses sections
   - Download links work correctly

## Step 8: Commit and Push Changes

Once everything is tested:

```bash
cd /path/to/QRSNTU

# Stage all changes
git add -A

# Commit with descriptive message
git commit -m "Update file naming convention and add support for problem sheets, lecture notes, and practice materials

- Renamed files to put academic year before semester (e.g., 23-24_Sem1)
- Added collapsible sections for problem sheets and lecture notes
- Added collapsible section for practice materials
- Updated Notes Structure documentation
- Updated math_notes.js to support new material types"

# Push to GitHub
git push origin main  # or your branch name
```

## Step 9: Verify on GitHub Pages

1. Wait a few minutes for GitHub Pages to rebuild
2. Visit https://qrsntu.org (or your GitHub Pages URL)
3. Test all functionality on the live site

## Step 10: Update Documentation

Replace the old `Notes/Notes Structure.md` with the new `Notes-Structure.md`.

```bash
cp Notes-Structure.md Notes/Notes\ Structure.md
git add Notes/Notes\ Structure.md
git commit -m "Update Notes Structure documentation with new conventions"
git push origin main
```

## Troubleshooting

### Files Not Showing in New Sections

**Issue**: Problem sheets or lecture notes not appearing on website

**Solution**: 
1. Check folder naming exactly matches: `{Code} - {Name} - Problem Sheets (AY{Year})`
2. Verify courses.json includes the new arrays
3. Check browser console for JavaScript errors

### Collapsible Sections Not Working

**Issue**: Clicking chevron doesn't expand section

**Solution**:
1. Ensure math_notes.js was properly updated
2. Clear browser cache (Ctrl+F5 or Cmd+Shift+R)
3. Check browser console for errors
4. Verify lucide icons are loading correctly

### Download Links Broken After Rename

**Issue**: Download links give 404 errors

**Solution**:
1. Regenerate courses.json after renaming files
2. Ensure paths in courses.json match new filenames
3. Check that files were actually renamed on GitHub

### Chevron Icons Not Showing

**Issue**: No icon appears next to collapsible sections

**Solution**:
1. Verify lucide.js is loading: `<script src="https://unpkg.com/lucide@latest"></script>`
2. Check that `lucide.createIcons()` is being called after rendering
3. Inspect HTML to see if `data-lucide` attributes are present

## File Naming Quick Reference

### Old Format (Incorrect)
```
MH1300_FoundationsofMathematics_Finals_Sem1_23-24_QuestionPaper.pdf
```

### New Format (Correct)
```
MH1300_FoundationsofMathematics_Finals_23-24_Sem1_QuestionPaper.pdf
```

### Problem Sheet Format
```
MH5100_AdvancedInvestigationsinCalculusI_25-26_Sem1_ProblemSheet_Week 2_QuestionPaper.pdf
```

### Lecture Note Format
```
MH5100_AdvancedInvestigationsinCalculusI_25-26_Sem1_LectureNotes_Week 3.pdf
```

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review the updated Notes-Structure.md
3. Inspect browser console for JavaScript errors
4. Verify all files are committed and pushed to GitHub

## Rollback Procedure

If you need to undo the changes:

```bash
# Return to backup branch
git checkout backup-before-updates

# Create a new main branch from backup
git branch -D main
git checkout -b main

# Force push (use with caution!)
git push -f origin main
```

## Summary Checklist

- [ ] Created backup branch
- [ ] Ran rename script in dry-run mode
- [ ] Executed actual file rename
- [ ] Updated math_notes.js
- [ ] Created Problem Sheets folders (if applicable)
- [ ] Created Lecture Notes folders (if applicable)
- [ ] Created Practice Materials folders (if applicable)
- [ ] Updated courses.json generation
- [ ] Tested website locally
- [ ] Committed and pushed all changes
- [ ] Verified on live site
- [ ] Updated Notes Structure documentation

Congratulations! Your QRSNTU repository now supports the new file naming convention and additional material types with an improved user interface.
