const fs = require('fs');
const path = require('path');

// Load course names from external JSON file
const COURSE_NAMES = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../data/course-names.json'), 'utf8')
);

// Helper functions
function isProblemSheetFolder(name) {
    return name.includes('Problem Sheets') || name.includes('Tutorials');
}

function isLectureNotesFolder(name) {
    return name.includes('Lecture Notes');
}

function isPracticeMaterialsFolder(name) {
    // Treat any folder containing "Practice" as practice materials
    return name.includes('Practice');
}

function isRevisionNote(name) {
    return name.includes('RevisionNotes');
}

// New: recognise Cheatsheet / CheatSheet files (case-insensitive)
function isCheatSheet(name) {
    const lower = name.toLowerCase();
    return (
        lower.includes('cheatsheet') || // Cheatsheet / CheatSheet
        lower.includes('cheat_sheet') ||
        lower.includes('cheat-sheet')
    );
}

function extractAcademicYear(name) {
    // Expect pattern like _21-22_ or _21-22 at end; be a bit more flexible
    const match = name.match(/_(\d{2}-\d{2})(?:_|$)/);
    return match ? match[1] : null;
}

function extractMaterialType(name) {
    if (name.includes('QuestionPaper')) return 'QuestionPaper';
    if (name.includes("Examiner's Report") || name.includes('ExaminersReport')) return 'ExaminerReport';
    if (name.includes('Solution')) return 'Solution';
    return 'Other';
}

function normaliseCourseCode(folderName) {
    const match = folderName.match(/^([A-Z]{2}\d{4})/);
    return match ? match[1] : folderName;
}

function getCourseName(courseCode, folderName) {
    return COURSE_NAMES[courseCode] || folderName;
}

function makeRawUrl(relativePath) {
    // relativePath like "Notes/HE1002/HE1002 - Macroeconomics I - Finals - Practice/file.pdf"
    return `https://raw.githubusercontent.com/yuhesui/QRSNTU/main/${relativePath}`;
}

function makeZipUrl(relativePath) {
    return `https://github.com/yuhesui/QRSNTU/raw/main/${relativePath}`;
}

// Extracts identifiers for practice / weekly problem sheets
function extractPracticeIdentifier(fileName) {
    // 1) Week-based pattern (e.g. _Week 2_)
    const weekMatch = fileName.match(/_Week\s*(\d+)[_. ]/i);
    if (weekMatch) {
        return `Week ${weekMatch[1]}`;
    }

    // 2) Original "Practice 1" pattern
    const matchNum = fileName.match(/_Practice\s*(\d+)[_. ]/i);
    if (matchNum) {
        return `Practice ${matchNum[1]}`;
    }

    // 3) Fallback: if the word "Practice" exists but no number, just label as "Practice"
    if (fileName.toLowerCase().includes('practice')) {
        return 'Practice';
    }

    // 4) Generic fallback
    return 'Practice';
}

// --- NEW HELPER: Count total files in a course for sorting ---
function getCourseFileCount(course) {
    let count = 0;
    const m = course.materials;
    if (!m) return 0;

    // Direct arrays
    count += (m.revisionNotes || []).length;
    count += (m.cheatSheets || []).length;
    count += (m.problemSheets || []).length;
    count += (m.lectureNotes || []).length;
    count += (m.pastYearZips || []).length;

    // Nested objects (Finals)
    if (m.finals) {
        Object.values(m.finals).forEach(y => {
            count += (y.papers || []).length + (y.solutions || []).length + (y.reports || []).length;
        });
    }

    // Nested objects (Midterms)
    if (m.midterms) {
        Object.values(m.midterms).forEach(y => {
            count += (y.papers || []).length + (y.solutions || []).length + (y.reports || []).length;
        });
    }

    // Nested objects (Practice)
    if (m.practiceMaterials) {
        Object.values(m.practiceMaterials).forEach(p => {
            count += (p.papers || []).length + (p.solutions || []).length;
        });
    }
    return count;
}
// -------------------------------------------------------------

function scanDirectory() {
    const courses = [];
    const notesPath = path.join(__dirname, '../../Notes');

    if (!fs.existsSync(notesPath)) {
        console.error('Notes directory not found');
        return courses;
    }

    const folders = fs.readdirSync(notesPath);

    folders.forEach(folderName => {
        const folderPath = path.join(notesPath, folderName);
        const stat = fs.statSync(folderPath);
        if (!stat.isDirectory()) return;
        if (!folderName.match(/^[A-Z]{2}\d{4}/)) return;

        const courseCode = normaliseCourseCode(folderName);
        const courseName = getCourseName(courseCode, folderName);

        const finals = {};
        const midterms = {};
        const revisionNotes = [];
        const cheatSheets = []; // cheatsheets at course level
        const problemSheets = [];
        const lectureNotes = [];
        const practiceMaterials = {}; // object keyed by "Practice 1", "Week 2", etc.
        const pastYearZips = [];

        const courseContents = fs.readdirSync(folderPath);

        courseContents.forEach(itemName => {
            const itemPath = path.join(folderPath, itemName);
            const itemStat = fs.statSync(itemPath);

            if (itemStat.isFile()) {
                // Revision notes in root
                if (isRevisionNote(itemName) && itemName.endsWith('.pdf')) {
                    const relPath = `Notes/${courseCode}/${itemName}`;
                    revisionNotes.push({
                        name: itemName,
                        path: relPath,
                        downloadUrl: makeRawUrl(relPath)
                    });
                    return;
                }

                // Cheatsheets in root, parallel to RevisionNotes
                if (isCheatSheet(itemName) && itemName.endsWith('.pdf')) {
                    const relPath = `Notes/${courseCode}/${itemName}`;
                    cheatSheets.push({
                        name: itemName,
                        path: relPath,
                        downloadUrl: makeRawUrl(relPath)
                    });
                    return;
                }

                // Root-level ZIPs (generic archives)
                if (itemName.endsWith('.zip')) {
                    const relPath = `Notes/${courseCode}/${itemName}`;
                    pastYearZips.push({
                        name: itemName,
                        path: relPath,
                        downloadUrl: makeZipUrl(relPath)
                    });
                    return;
                }

                return;
            }

            if (itemStat.isDirectory()) {
                // 1. Practice folders first so they aren't double-counted as Finals/Midterms
                if (isPracticeMaterialsFolder(itemName)) {
                    const files = fs.readdirSync(itemPath);
                    files.forEach(fileName => {
                        const filePath = path.join(itemPath, fileName);
                        if (!fs.statSync(filePath).isFile()) return;

                        const relPath = `Notes/${courseCode}/${itemName}/${fileName}`;

                        // Practice ZIPs
                        if (fileName.endsWith('.zip')) {
                            pastYearZips.push({
                                name: fileName,
                                path: relPath,
                                downloadUrl: makeZipUrl(relPath)
                            });
                            return;
                        }

                        if (!fileName.endsWith('.pdf')) return;

                        // Can now pick up Week-based problem sheet naming
                        const identifier = extractPracticeIdentifier(fileName); // e.g. "Practice 1" or "Week 2"
                        if (!practiceMaterials[identifier]) {
                            practiceMaterials[identifier] = { papers: [], solutions: [] };
                        }

                        const materialType = extractMaterialType(fileName);
                        const fileData = {
                            name: fileName,
                            path: relPath,
                            downloadUrl: makeRawUrl(relPath)
                        };

                        if (materialType === 'QuestionPaper') {
                            practiceMaterials[identifier].papers.push(fileData);
                        } else if (materialType === 'Solution') {
                            practiceMaterials[identifier].solutions.push(fileData);
                        } else {
                            // default: treat unknown as paper
                            practiceMaterials[identifier].papers.push(fileData);
                        }
                    });
                    return;
                }

                // 2. Finals / Midterms folders
                const examType = itemName.includes('Finals')
                    ? 'Finals'
                    : itemName.includes('Midterms')
                        ? 'Midterms'
                        : '';

                if (examType) {
                    const examFiles = fs.readdirSync(itemPath);
                    examFiles.forEach(fileName => {
                        const filePath = path.join(itemPath, fileName);
                        if (!fs.statSync(filePath).isFile()) return;

                        const relPath = `Notes/${courseCode}/${itemName}/${fileName}`;

                        if (fileName.endsWith('.zip')) {
                            pastYearZips.push({
                                name: fileName,
                                path: relPath,
                                downloadUrl: makeZipUrl(relPath)
                            });
                            return;
                        }

                        if (!fileName.endsWith('.pdf')) return;

                        const year = extractAcademicYear(fileName);
                        const materialType = extractMaterialType(fileName);
                        if (!year) return;

                        const bucket = {
                            name: fileName,
                            path: relPath,
                            downloadUrl: makeRawUrl(relPath)
                        };

                        if (examType === 'Finals') {
                            if (!finals[year]) finals[year] = { papers: [], solutions: [], reports: [] };
                            if (materialType === 'QuestionPaper') {
                                finals[year].papers.push(bucket);
                            } else if (materialType === 'Solution') {
                                finals[year].solutions.push(bucket);
                            } else if (materialType === 'ExaminerReport') {
                                finals[year].reports.push(bucket);
                            }
                        } else if (examType === 'Midterms') {
                            if (!midterms[year]) midterms[year] = { papers: [], solutions: [], reports: [] };
                            if (materialType === 'QuestionPaper') {
                                midterms[year].papers.push(bucket);
                            } else if (materialType === 'Solution') {
                                midterms[year].solutions.push(bucket);
                            }
                        }
                    });
                    return;
                }

                // 3. Problem Sheets
                if (isProblemSheetFolder(itemName)) {
                    const files = fs.readdirSync(itemPath);
                    files.forEach(fileName => {
                        const filePath = path.join(itemPath, fileName);
                        if (!fs.statSync(filePath).isFile()) return;
                        if (!fileName.endsWith('.pdf')) return;

                        const relPath = `Notes/${courseCode}/${itemName}/${fileName}`;
                        problemSheets.push({
                            name: fileName,
                            path: relPath,
                            downloadUrl: makeRawUrl(relPath)
                        });
                    });
                    return;
                }

                // 4. Lecture Notes
                if (isLectureNotesFolder(itemName)) {
                    const files = fs.readdirSync(itemPath);
                    files.forEach(fileName => {
                        const filePath = path.join(itemPath, fileName);
                        if (!fs.statSync(filePath).isFile()) return;
                        if (!fileName.endsWith('.pdf')) return;

                        const relPath = `Notes/${courseCode}/${itemName}/${fileName}`;
                        lectureNotes.push({
                            name: fileName,
                            path: relPath,
                            downloadUrl: makeRawUrl(relPath)
                        });
                    });
                    return;
                }
            }
        });

        courses.push({
            code: courseCode,
            name: courseName,
            folderName,
            githubUrl: `https://github.com/yuhesui/QRSNTU/tree/main/Notes/${folderName}`,
            materials: {
                finals,
                midterms,
                revisionNotes,
                cheatSheets,
                problemSheets,
                lectureNotes,
                practiceMaterials,
                pastYearZips
            }
        });
    });

    // --- NEW: Sort courses by number of files (descending) ---
    courses.sort((a, b) => getCourseFileCount(b) - getCourseFileCount(a));
    // ---------------------------------------------------------

    return courses;
}

const courses = scanDirectory();
const outputPath = path.join(__dirname, '../../Website/v1/courses.json');

fs.writeFileSync(
    outputPath,
    JSON.stringify({ courses, generatedAt: new Date().toISOString() }, null, 2)
);

console.log(`✓ Generated courses.json with ${courses.length} courses (Sorted by file count)`);

// ---------- Aggregated stats ----------

const courseHasProblemSheets = courses.filter(
    c => c.materials.problemSheets && c.materials.problemSheets.length > 0
).length;
const totalProblemSheets = courses.reduce(
    (sum, c) => sum + (c.materials.problemSheets ? c.materials.problemSheets.length : 0),
    0
);

const courseHasLectureNotes = courses.filter(
    c => c.materials.lectureNotes && c.materials.lectureNotes.length > 0
).length;
const totalLectureNotes = courses.reduce(
    (sum, c) => sum + (c.materials.lectureNotes ? c.materials.lectureNotes.length : 0),
    0
);

const courseHasPractice = courses.filter(
    c =>
        c.materials.practiceMaterials &&
        Object.keys(c.materials.practiceMaterials).length > 0
).length;

const practiceStats = courses.reduce(
    (acc, c) => {
        const pm = c.materials.practiceMaterials || {};
        acc.identifiers += Object.keys(pm).length;
        Object.values(pm).forEach(entry => {
            acc.papers += entry.papers.length;
            acc.solutions += entry.solutions.length;
        });
        return acc;
    },
    { identifiers: 0, papers: 0, solutions: 0 }
);

const courseHasCheatSheets = courses.filter(
    c => c.materials.cheatSheets && c.materials.cheatSheets.length > 0
).length;
const totalCheatSheets = courses.reduce(
    (sum, c) => sum + (c.materials.cheatSheets ? c.materials.cheatSheets.length : 0),
    0
);

const courseHasRevisionNotes = courses.filter(
    c => c.materials.revisionNotes && c.materials.revisionNotes.length > 0
).length;
const totalRevisionNotes = courses.reduce(
    (sum, c) => sum + (c.materials.revisionNotes ? c.materials.revisionNotes.length : 0),
    0
);

const totalPastYearZips = courses.reduce(
    (sum, c) => sum + (c.materials.pastYearZips ? c.materials.pastYearZips.length : 0),
    0
);

// Finals / Midterms totals
const examTotals = {
    finals: { papers: 0, solutions: 0, reports: 0 },
    midterms: { papers: 0, solutions: 0, reports: 0 }
};

courses.forEach(c => {
    const { finals, midterms } = c.materials;

    Object.values(finals || {}).forEach(yearData => {
        examTotals.finals.papers += yearData.papers.length;
        examTotals.finals.solutions += yearData.solutions.length;
        examTotals.finals.reports += yearData.reports.length;
    });

    Object.values(midterms || {}).forEach(yearData => {
        examTotals.midterms.papers += yearData.papers.length;
        examTotals.midterms.solutions += yearData.solutions.length;
        examTotals.midterms.reports += yearData.reports.length;
    });
});

console.log(
    `  - Problem Sheets: ${courseHasProblemSheets} courses, ${totalProblemSheets} files`
);
console.log(
    `  - Lecture Notes: ${courseHasLectureNotes} courses, ${totalLectureNotes} files`
);
console.log(
    `  - Practice Materials: ${courseHasPractice} courses, ${practiceStats.identifiers} sets, ${practiceStats.papers} papers, ${practiceStats.solutions} solutions`
);
console.log(
    `  - Revision Notes: ${courseHasRevisionNotes} courses, ${totalRevisionNotes} files`
);
console.log(
    `  - Cheat Sheets: ${courseHasCheatSheets} courses, ${totalCheatSheets} files`
);
console.log(
    `  - Past-year ZIPs: ${totalPastYearZips} archives`
);
console.log(
    `  - Finals: ${examTotals.finals.papers} papers, ${examTotals.finals.solutions} solutions, ${examTotals.finals.reports} reports`
);
console.log(
    `  - Midterms: ${examTotals.midterms.papers} papers, ${examTotals.midterms.solutions} solutions, ${examTotals.midterms.reports} reports`
);

// ---------- Solution / QuestionPaper table for past-year papers ----------

const pastYearRows = [];

// Collect per-course, per-year data for finals & midterms
courses.forEach(c => {
    const { finals, midterms } = c.materials;

    Object.keys(finals || {}).forEach(year => {
        const data = finals[year];
        pastYearRows.push({
            course: c.code,
            exam: 'Finals',
            year,
            papers: data.papers.length,
            solutions: data.solutions.length,
            reports: data.reports.length
        });
    });

    Object.keys(midterms || {}).forEach(year => {
        const data = midterms[year];
        pastYearRows.push({
            course: c.code,
            exam: 'Midterms',
            year,
            papers: data.papers.length,
            solutions: data.solutions.length,
            reports: data.reports.length
        });
    });
});

if (pastYearRows.length > 0) {
    const headers = {
        course: 'Course',
        exam: 'Exam',
        year: 'Year',
        papers: 'QuestionPapers',
        solutions: 'Solutions',
        reports: 'Reports'
    };

    const colWidths = {
        course: Math.max(
            headers.course.length,
            ...pastYearRows.map(r => r.course.length)
        ),
        exam: Math.max(
            headers.exam.length,
            ...pastYearRows.map(r => r.exam.length)
        ),
        year: Math.max(
            headers.year.length,
            ...pastYearRows.map(r => r.year.length)
        ),
        papers: Math.max(
            headers.papers.length,
            ...pastYearRows.map(r => String(r.papers).length)
        ),
        solutions: Math.max(
            headers.solutions.length,
            ...pastYearRows.map(r => String(r.solutions).length)
        ),
        reports: Math.max(
            headers.reports.length,
            ...pastYearRows.map(r => String(r.reports).length)
        )
    };

    const pad = (value, width) => String(value).padEnd(width, ' ');

    const headerLine =
        pad(headers.course, colWidths.course) + ' | ' +
        pad(headers.exam, colWidths.exam) + ' | ' +
        pad(headers.year, colWidths.year) + ' | ' +
        pad(headers.papers, colWidths.papers) + ' | ' +
        pad(headers.solutions, colWidths.solutions) + ' | ' +
        pad(headers.reports, colWidths.reports);

    const separator =
        '-'.repeat(colWidths.course) + '-+-' +
        '-'.repeat(colWidths.exam) + '-+-' +
        '-'.repeat(colWidths.year) + '-+-' +
        '-'.repeat(colWidths.papers) + '-+-' +
        '-'.repeat(colWidths.solutions) + '-+-' +
        '-'.repeat(colWidths.reports);

    console.log('\nPast-year paper summary (Finals & Midterms):');
    console.log(headerLine);
    console.log(separator);

    pastYearRows.forEach(r => {
        const line =
            pad(r.course, colWidths.course) + ' | ' +
            pad(r.exam, colWidths.exam) + ' | ' +
            pad(r.year, colWidths.year) + ' | ' +
            pad(r.papers, colWidths.papers) + ' | ' +
            pad(r.solutions, colWidths.solutions) + ' | ' +
            pad(r.reports, colWidths.reports);
        console.log(line);
    });
} else {
    console.log('No past-year Finals/Midterms papers detected.');
}