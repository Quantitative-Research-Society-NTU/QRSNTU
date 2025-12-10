const fs = require('fs');
const path = require('path');

// Load course names from external JSON file
const COURSE_NAMES = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../data/course-names.json'), 'utf8')
);

// Helper functions
function isProblemSheetFolder(name) {
    return name.includes('Problem Sheets');
}

function isLectureNotesFolder(name) {
    return name.includes('Lecture Notes');
}

function isPracticeMaterialsFolder(name) {
    // Treat any folder containing "Practice" as practice materials
    // e.g. "HE1002 - Macroeconomics I - Finals - Practice"
    //      "HE1002 - Macroeconomics I - Midterms - Practice"
    //      "Practice Materials"
    return name.includes('Practice');
}

function isRevisionNote(name) {
    return name.includes('RevisionNotes');
}

function extractAcademicYear(name) {
    // Expect pattern like _21-22_ in filename
    const match = name.match(/_(\d{2}-\d{2})_/);
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

// Extracts "Practice 1" from names like
// "HE1002_MacroeconomicsI_Finals_Practice1_QuestionPaper.pdf"
// "HE1002_MacroeconomicsI_Finals_Practice1_Solution by QRS.pdf"
function extractPracticeIdentifier(fileName) {
    const matchNum = fileName.match(/_Practice\s*(\d+)[_. ]/);
    if (matchNum) {
        return `Practice ${matchNum[1]}`;
    }
    // Fallback: if the word "Practice" exists but no number, just label as "Practice"
    if (fileName.includes('Practice')) {
        return 'Practice';
    }
    return 'Practice';
}

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
        const problemSheets = [];
        const lectureNotes = [];
        const practiceMaterials = {}; // <-- now an object keyed by "Practice 1", etc.
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

                        const identifier = extractPracticeIdentifier(fileName); // e.g. "Practice 1"
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
                const examType = itemName.includes('Finals') ? 'Finals'
                    : itemName.includes('Midterms') ? 'Midterms'
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
            materials: {
                finals,
                midterms,
                revisionNotes,
                problemSheets,
                lectureNotes,
                practiceMaterials,
                pastYearZips
            }
        });
    });

    return courses;
}

const courses = scanDirectory();
// const outputPath = path.join(__dirname, '../../Website/v1/courses.json');
const outputPath = 'D:/Projects/QRSNTU/Archived/Test_Nov15/courses.json';

fs.writeFileSync(
    outputPath,
    JSON.stringify({ courses, generatedAt: new Date().toISOString() }, null, 2)
);
console.log(`✓ Generated courses.json with ${courses.length} courses`);
console.log(
    `  - Problem Sheets: ${courses.filter(c =>
        c.materials.problemSheets && c.materials.problemSheets.length > 0
    ).length} courses`
);
console.log(
    `  - Lecture Notes: ${courses.filter(c =>
        c.materials.lectureNotes && c.materials.lectureNotes.length > 0
    ).length} courses`
);
console.log(
    `  - Practice Materials: ${courses.filter(c =>
        c.materials.practiceMaterials &&
        Object.keys(c.materials.practiceMaterials).length > 0
    ).length} courses`
);
