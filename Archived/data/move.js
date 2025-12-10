// Notes/move.js
// Rename and move past year finals into course-specific Finals folders.

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// ------------------------ CONFIG ------------------------

// Folder containing the original past year papers (inside Notes)
const PAST_YEAR_DIR = path.join(__dirname, 'PastYearPapers');

// Path to course names JSON from repo root: .github/data/course-names.json
const COURSE_JSON_PATH = path.resolve(
    __dirname,
    '..',
    '.github',
    'data',
    'course-names.json'
);

// ------------------------ UTILS ------------------------

function createReadlineInterface() {
    return readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
}

function askQuestion(rl, question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => resolve(answer.trim()));
    });
}

// Load course names mapping from JSON.
function loadCourseNames() {
    try {
        const jsonText = fs.readFileSync(COURSE_JSON_PATH, 'utf8');
        const data = JSON.parse(jsonText);
        return data || {};
    } catch (err) {
        console.error('Error reading course-names.json:', err.message);
        return {};
    }
}

// Shorten "2022-2023" -> "22-23"
function shortenYearRange(rangeStr) {
    const m = rangeStr.match(/^(\d{4})-(\d{4})$/);
    if (!m) return rangeStr; // fallback
    const y1 = m[1].slice(-2);
    const y2 = m[2].slice(-2);
    return `${y1}-${y2}`;
}

// Normalize course name for filenames: strip spaces and non-alphanumerics.
function normalizeCourseNameForFile(courseName) {
    return courseName.replace(/[^A-Za-z0-9]/g, '');
}

// Extract info from a filename like "BR2207 2022-2023 Semester 1.pdf"
function parseFilename(fileName) {
    // Remove extension
    const ext = path.extname(fileName);
    const base = fileName.slice(0, -ext.length);

    const parts = base.split(/\s+/);

    // Find year range token
    const yearIdx = parts.findIndex((p) => /^\d{4}-\d{4}$/.test(p));
    if (yearIdx === -1) {
        console.warn(`Could not find year range in "${fileName}", skipping.`);
        return null;
    }

    const yearRangeRaw = parts[yearIdx];
    const yearRangeShort = shortenYearRange(yearRangeRaw);

    // Course codes are tokens before yearIdx that look like "BR2207", "MH1101", etc.
    const courseCodes = parts
        .slice(0, yearIdx)
        .filter((p) => /^[A-Z]{2}\d{4}$/.test(p));

    if (courseCodes.length === 0) {
        console.warn(`Could not find any course codes in "${fileName}", skipping.`);
        return null;
    }

    // Semester: search in full base string
    let semNumber = null;
    const semMatch = base.match(/Semester\s+(\d+)/i);
    if (semMatch) {
        semNumber = semMatch[1];
    } else {
        console.warn(`Could not find "Semester X" in "${fileName}", using "?" as semester.`);
        semNumber = '?';
    }

    return {
        fileName,
        ext,
        courseCodes,
        yearRangeRaw,
        yearRangeShort,
        semNumber,
    };
}

// Build destination filename
function buildDestFilename(courseCode, courseName, yearRangeShort, semNumber) {
    const courseNameForFile = normalizeCourseNameForFile(courseName);
    // Pattern: CODE_CourseName_Finals_YY-YY_SemX_QuestionPaper.pdf
    return `${courseCode}_${courseNameForFile}_Finals_${yearRangeShort}_Sem${semNumber}_QuestionPaper.pdf`;
}

// Ensure directory exists (mkdir -p style).
function ensureDirSync(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

// ------------------------ MAIN LOGIC ------------------------

async function main() {
    const rl = createReadlineInterface();
    const courseNames = loadCourseNames();

    console.log('Loaded course names from:', COURSE_JSON_PATH);
    console.log('Using source folder:', PAST_YEAR_DIR);
    console.log('Starting rename + move...\n');

    if (!fs.existsSync(PAST_YEAR_DIR)) {
        console.error('PastYearPapers folder does not exist:', PAST_YEAR_DIR);
        rl.close();
        return;
    }

    const entries = fs.readdirSync(PAST_YEAR_DIR, { withFileTypes: true });
    const pdfFiles = entries
        .filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.pdf'))
        .map((e) => e.name);

    if (pdfFiles.length === 0) {
        console.log('No PDF files found in PastYearPapers.');
        rl.close();
        return;
    }

    for (const fileName of pdfFiles) {
        console.log(`\nProcessing "${fileName}"`);

        const parsed = parseFilename(fileName);
        if (!parsed) continue;

        const {
            ext,
            courseCodes,
            yearRangeShort,
            semNumber,
        } = parsed;

        const srcPath = path.join(PAST_YEAR_DIR, fileName);

        let firstDestPathForCopies = null; // for handling multi-course files

        for (let i = 0; i < courseCodes.length; i++) {
            const courseCode = courseCodes[i];

            // Lookup course name
            let courseName = courseNames[courseCode];

            if (!courseName) {
                console.log(
                    `  Course code "${courseCode}" not found in course-names.json for file "${fileName}".`
                );

                // Ask user: 1 skip, 2 enter course name
                let choice = await askQuestion(
                    rl,
                    '  Choose action: [1] Skip this course code, [2] Enter course name manually: '
                );

                while (!['1', '2'].includes(choice)) {
                    choice = await askQuestion(
                        rl,
                        '  Please enter 1 (Skip) or 2 (Manual name): '
                    );
                }

                if (choice === '1') {
                    console.log(`  Skipping course code ${courseCode} for this file.`);
                    continue;
                } else {
                    const manualName = await askQuestion(
                        rl,
                        `  Enter course name for ${courseCode}: `
                    );
                    if (!manualName) {
                        console.log(
                            `  Empty course name entered. Skipping course code ${courseCode}.`
                        );
                        continue;
                    }
                    courseName = manualName;
                }
            }

            // We have courseCode and courseName now.

            // Course folder: Notes/CODE
            const courseDir = path.join(__dirname, courseCode);
            ensureDirSync(courseDir);

            // Finals folder: Notes/CODE/CODE - CourseName - Finals
            const finalsFolderName = `${courseCode} - ${courseName} - Finals`;
            const finalsDir = path.join(courseDir, finalsFolderName);
            ensureDirSync(finalsDir);

            const destFileName = buildDestFilename(
                courseCode,
                courseName,
                yearRangeShort,
                semNumber
            );

            const destPath = path.join(finalsDir, destFileName);

            if (fs.existsSync(destPath)) {
                console.log(`  Destination exists, skipping: ${destPath}`);
                continue;
            }

            try {
                if (firstDestPathForCopies === null) {
                    // First course for this original file: move (rename)
                    fs.renameSync(srcPath, destPath);
                    firstDestPathForCopies = destPath;
                    console.log(`  Moved to: ${destPath}`);
                } else {
                    // Additional course codes share the same paper: copy
                    fs.copyFileSync(firstDestPathForCopies, destPath);
                    console.log(`  Copied to: ${destPath}`);
                }
            } catch (err) {
                console.error(`  Error moving/copying to "${destPath}":`, err.message);
            }
        }

        // If no course code was actually processed (all skipped / errors),
        // and file was not moved, it will remain in PastYearPapers.
        if (firstDestPathForCopies === null) {
            console.log(
                `  No successful move for "${fileName}" (all course codes skipped or failed).`
            );
        }
    }

    console.log('\nDone.');
    rl.close();
}

main().catch((err) => {
    console.error('Unexpected error:', err);
});
