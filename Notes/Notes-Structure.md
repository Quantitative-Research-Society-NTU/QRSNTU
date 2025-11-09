# Math Notes Repository Structure

## File Naming Convention

All files must follow this standardized pattern:
```
{CourseCode}_{CourseName}_{ExamType}_{AcademicYear}_{Semester}_{MaterialType}.pdf
```

### Examples:
- `MH1200_LinearAlgebraI_Finals_23-24_Sem1_QuestionPaper.pdf`
- `MH1200_LinearAlgebraI_Finals_19-20_Sem1_Solution by QRS.pdf`
- `MH1100_CalculusI_Midterm_21-22_Sem1_Solution.pdf`
- `MH1300_FoundationsofMathematics_Finals_23-24_Sem1_Solution Handwritten.pdf`
- `MH1200_LinearAlgebraI_RevisionNotes.pdf`
- `MH5100_AdvancedInvestigationsinCalculusI_25-26_Sem1_ProblemSheet_Week 2_QuestionPaper.pdf`
- `MH5100_AdvancedInvestigationsinCalculusI_25-26_Sem1_LectureNotes_Week 3.pdf`

#### Component Breakdown:
- **{CourseCode}**: Standard NTU course code (e.g. MH1200, HE2001)
- **{CourseName}**: Course name, no spaces (e.g. LinearAlgebraI, CalculusI)
- **{ExamType}**: 'Finals', 'Midterm'
- **{AcademicYear}**: '23-24' for AY2023-2024 (now comes BEFORE semester)
- **{Semester}**: 'Sem1' or 'Sem2'
- **{MaterialType}**:
    - 'QuestionPaper': original exam
    - 'Solution': standard solution
        - 'Solution by QRS', 'Solution Handwritten', 'Solution Unofficial': modifier after a space for alternate formats/sources
    - "Examiner's Report": examiner feedback
    - 'ProblemSheet_{Identifier}': for problem sheets with identifiers like "Week 2"
    - 'LectureNotes_{Identifier}': for lecture notes with identifiers
    - For Practice Materials: plain file names are acceptable

### Important: Year Before Semester
**New Format (Correct):** `_23-24_Sem1_`  
**Old Format (Incorrect):** `_Sem1_23-24_`

## Folder Structure

### Exam Materials
Courses are **organized in folders** named:
```
{CourseCode} - {Course Full Name} - {ExamType}
```

#### Examples:
- `MH1200 - Linear Algebra I - Finals/`
- `MH1100 - Calculus I - Midterm/`

Inside each folder, files follow the naming convention above.

### Problem Sheets
Problem sheets are organized in folders named:
```
{CourseCode} - {Course Full Name} - Problem Sheets (AY{Year})
```

#### Example:
```
MH5100 - Advanced Investigations in Calculus I - Problem Sheets (AY25-26)/
├── MH5100_AdvancedInvestigationsinCalculusI_25-26_Sem1_ProblemSheet_Week 2_QuestionPaper.pdf
├── MH5100_AdvancedInvestigationsinCalculusI_25-26_Sem1_ProblemSheet_Week 2_Solution.pdf
├── MH5100_AdvancedInvestigationsinCalculusI_25-26_Sem1_ProblemSheet_Week 3_QuestionPaper.pdf
└── MH5100_AdvancedInvestigationsinCalculusI_25-26_Sem1_ProblemSheet_Week 3_Solution.pdf
```

### Lecture Notes
Lecture notes are organized in folders named:
```
{CourseCode} - {Course Full Name} - Lecture Notes (AY{Year})
```

#### Example:
```
MH5100 - Advanced Investigations in Calculus I - Lecture Notes (AY25-26)/
├── MH5100_AdvancedInvestigationsinCalculusI_25-26_Sem1_LectureNotes_Week 1.pdf
├── MH5100_AdvancedInvestigationsinCalculusI_25-26_Sem1_LectureNotes_Week 2.pdf
└── MH5100_AdvancedInvestigationsinCalculusI_25-26_Sem1_LectureNotes_Week 3.pdf
```

### Practice Materials
For courses that don't have finals but have practice materials, organize in:
```
{CourseCode} - {Course Full Name} - Practice Materials
```

Inside this folder, plain file names are acceptable since these are varied materials.

#### Example:
```
MH4930 - Special Topics in Mathematics - Practice Materials/
├── Topic1_Practice_Problems.pdf
├── Sample_Exercises_Set1.pdf
└── Additional_Resources.pdf
```

### Revision Notes
**Revision Notes**: Placed directly in the course folder:
```
MH1200_LinearAlgebraI_RevisionNotes.pdf
```

## Academic Year Coverage

Each folder may contain multiple years' material:
- Papers and solutions share the same naming and year
- Solution variants are grouped by material type

## Solution Types Priority

When multiple solution files exist for the same exam year:
1. Official solutions (no modifier)
2. QRS solutions ('Solution by QRS')
3. Unofficial solutions ('Solution Unofficial')
4. Handwritten solutions ('Solution Handwritten')

## Adding New Materials

1. **For Exams**: Place in correct folder (e.g., Finals, Midterm)
2. **For Problem Sheets**: Create/use folder with format `{Code} - {Name} - Problem Sheets (AY{Year})`
3. **For Lecture Notes**: Create/use folder with format `{Code} - {Name} - Lecture Notes (AY{Year})`
4. **For Practice Materials**: Create/use folder with format `{Code} - {Name} - Practice Materials`
5. Use the **exact format** above, with underscores, case, and years
6. **Ensure year comes BEFORE semester** in the filename
7. Solution modifiers go after "Solution" with a space
8. Update course README if needed

## Website Integration

### Display Behavior

1. **Finals and Midterms**: Always visible, organized by year with download buttons
2. **Problem Sheets**: Collapsible section showing count. Click to expand and see all files
3. **Lecture Notes**: Collapsible section showing count. Click to expand and see all files
4. **Practice Materials**: Collapsible section showing count. Click to expand and see all files with plain names
5. **Revision Notes**: Always visible with direct download button

### Folder Scanning Rules

- The website scans folders named `{Code} - {Name} - {Type}`
- Types recognized:
  - `Finals` - shown inline by year
  - `Midterm` - shown inline by year
  - `Problem Sheets (AY{Year})` - collapsible section
  - `Lecture Notes (AY{Year})` - collapsible section
  - `Practice Materials` - collapsible section
- Files are parsed to extract: year, type, modifier
- Materials are grouped by year and type in the UI
- Revision notes are detected and displayed independently

## Example Repository Structure

```
Notes/
├── MH1100/
│   └── MH1100 - Calculus I - Midterm/
│       ├── MH1100_CalculusI_Midterm_21-22_Sem1_QuestionPaper.pdf
│       ├── MH1100_CalculusI_Midterm_21-22_Sem1_Solution.pdf
│       ├── MH1100_CalculusI_Midterm_22-23_Sem1_QuestionPaper.pdf
│       ├── MH1100_CalculusI_Midterm_22-23_Sem1_Solution.pdf
│       └── MH1100_CalculusI_Midterm_23-24_Sem1_QuestionPaper.pdf
├── MH1200/
│   ├── MH1200 - Linear Algebra I - Finals/
│   │   ├── MH1200_LinearAlgebraI_Finals_19-20_Sem1_Solution by QRS.pdf
│   │   ├── MH1200_LinearAlgebraI_Finals_21-22_Sem1_QuestionPaper.pdf
│   │   ├── MH1200_LinearAlgebraI_Finals_21-22_Sem1_Examiner's Report.pdf
│   │   └── MH1200_LinearAlgebraI_Finals_23-24_Sem1_QuestionPaper.pdf
│   └── MH1200_LinearAlgebraI_RevisionNotes.pdf
├── MH1300/
│   └── MH1300 - Foundations of Mathematics - Finals/
│       └── MH1300_FoundationsofMathematics_Finals_23-24_Sem1_Solution Handwritten.pdf
├── MH5100/
│   ├── MH5100 - Advanced Investigations in Calculus I - Problem Sheets (AY25-26)/
│   │   ├── MH5100_AdvancedInvestigationsinCalculusI_25-26_Sem1_ProblemSheet_Week 2_QuestionPaper.pdf
│   │   ├── MH5100_AdvancedInvestigationsinCalculusI_25-26_Sem1_ProblemSheet_Week 2_Solution.pdf
│   │   ├── MH5100_AdvancedInvestigationsinCalculusI_25-26_Sem1_ProblemSheet_Week 3_QuestionPaper.pdf
│   │   └── MH5100_AdvancedInvestigationsinCalculusI_25-26_Sem1_ProblemSheet_Week 3_Solution.pdf
│   └── MH5100 - Advanced Investigations in Calculus I - Lecture Notes (AY25-26)/
│       ├── MH5100_AdvancedInvestigationsinCalculusI_25-26_Sem1_LectureNotes_Week 1.pdf
│       └── MH5100_AdvancedInvestigationsinCalculusI_25-26_Sem1_LectureNotes_Week 2.pdf
└── MH4930/
    └── MH4930 - Special Topics in Mathematics - Practice Materials/
        ├── Topic1_Practice_Problems.pdf
        └── Sample_Exercises_Set1.pdf
```

## Website Display Example

For a course with all material types:

**MH5100 - Advanced Investigations in Calculus I**
- 📄 **Finals** (always shown)
  - AY 24-25: [Paper] [Solution]
  - AY 23-24: [Paper] [Solution (QRS)]

- 📝 **Midterms** (always shown)
  - AY 24-25: [Paper] [Solution]

- ▶️ **Problem Sheets (8)** (click to expand)
  - [Week 2 Question] [Week 2 Solution]
  - [Week 3 Question] [Week 3 Solution]
  - ...

- ▶️ **Lecture Notes (10)** (click to expand)
  - [Week 1] [Week 2] [Week 3] ...

- ▶️ **Practice Materials (5)** (click to expand)
  - [Topic1_Practice_Problems.pdf]
  - [Sample_Exercises_Set1.pdf]

- 📚 **Revision Notes** (always shown)
  - [Revision Notes]

## Migration Notes

If you have files with the old format `_Sem1_23-24_`, use the provided Python script `rename_files.py` to automatically rename them to the new format `_23-24_Sem1_`.
