// Course metadata mapping
const COURSE_NAMES = {
    'HE1001': 'Microeconomics I',
    'HE1002': 'Macroeconomics I',
    'CC0003': 'Ethics & Civics in a Multi-Cultural World',
    'MH1100': 'Calculus I',
    'MH1200': 'Linear Algebra I',
    'MH1300': 'Foundations of Mathematics',
    'HE2001': 'Microeconomics II',
    'HE2002': 'Macroeconomics II',
    'CC0001': 'Inquiry and Communication in an Interdisciplinary World',
    'CC0015': 'Health & Wellbeing',
    'MH1101': 'Calculus II',
    'MH1201': 'Linear Algebra II',
    'MH1301': 'Discrete Mathematics',
    'MH4913': 'Professional Attachment',
    'HE2003': 'Econometrics I',
    'ML0004': 'Career Design & Workplace Readiness in the V.U.C.A World',
    'MH2100': 'Calculus III',
    'MH2500': 'Probability',
    'MH3100': 'Real Analysis I',
    'PS0001': 'Introduction to Computational Thinking',
    'CSL': 'Care, Serve, Learn',
    'CC0006': 'Sustainability: Society, Economy & Environment',
    'CC0007': 'Science & Technology for Humanity',
    'MH2220': 'Algebra I',
    'MH1403': 'Algorithms and Computing',
    'MH2510': 'Statistics I',
    'HE3001': 'Microeconomics III',
    'MH3101': 'Complex Analysis',
    'MH3210': 'Number Theory',
    'MH3220': 'Algebra II',
    'MH3300': 'Graph Theory',
    'MH3320': 'Dynamical System Theory with Chaos and Fractals',
    'MH3400': 'Algorithms for the Real World',
    'MH3401': 'Signal and Noise in Biology',
    'MH3510': 'Regression Analysis',
    'MH3511': 'Data Analysis with Computer',
    'MH3512': 'Stochastic Processes',
    'MH3515': 'Stochastic Geometry',
    'MH3520': 'Mathematics of Deep Learning',
    'MH3700': 'Numerical Analysis I',
    'MH3701': 'Basic Optimization',
    'MH4100': 'Real Analysis II',
    'MH4110': 'Partial Differential Equations',
    'MH4200': 'Abstract Algebra II',
    'MH4300': 'Combinatorics',
    'MH4301': 'Set Theory and Logic',
    'MH4302': 'Theory of Computing',
    'MH4310': 'Coding Theory',
    'MH4311': 'Cryptography',
    'MH4320': 'Computational Economics',
    'MH4500': 'Time Series Analysis',
    'MH4510': 'Statistical Learning and Data Mining',
    'MH4511': 'Sampling & Survey',
    'MH4512': 'Clinical Trials',
    'MH4513': 'Survival Analysis',
    'MH4514': 'Financial Mathematics',
    'MH4515': 'Applied Bayesian Statistics',
    'MH4516': 'Applied Categorical Data Analysis',
    'MH4517': 'Data Applications in Natural Sciences',
    'MH4518': 'Simulation Techniques in Finance',
    'MH4519': 'Financial Econometrics',
    'MH4520': 'High Dimensional Probability',
    'MH4521': 'Reinforcement Learning',
    'MH4601': 'Differential Geometry',
    'MH4700': 'Numerical Analysis II',
    'MH4701': 'Mathematical Programming',
    'MH4702': 'Probabilistic Methods in OR',
    'MH4712': 'Geometric Methods in Mathematical Physics',
    'HE3002': 'Macroeconomics III',
    'HW0218': 'Communication Across the Sciences',
    'MH7002': 'Discrete Methods',
    'HE3003': 'Econometrics II',
    'PS0002': 'Introduction to Data Science and Artificial Intelligence'
};

// GitHub API base config
const GITHUB_API_BASE = 'https://api.github.com/repos/yuhesui/QRSNTU/contents/Notes';
const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/yuhesui/QRSNTU/main/Notes';

let allCourses = [];

// Helper: Extract academic year (e.g. "23-24") from filename
function extractAcademicYear(name) {
    const match = name.match(/_(\d{2}-\d{2})_/);
    return match ? match[1] : null;
}

// Helper: Extract exam type ("Finals", "Midterm") from filename
function extractExamType(name) {
    if (name.includes('_Finals_')) return 'Finals';
    if (name.includes('_Midterm_')) return 'Midterm';
    return '';
}

// Helper: Extract material type (QuestionPaper, Solution, Exam Report) and modifier
function extractMaterialType(name) {
    if (name.includes('QuestionPaper')) return 'QuestionPaper';
    if (name.includes("Examiner's Report")) return 'ExaminerReport';
    if (name.includes('Solution')) {
        if (name.includes('by QRS')) return 'SolutionByQRS';
        if (name.includes('Unofficial')) return 'SolutionUnofficial';
        if (name.includes('Handwritten')) return 'SolutionHandwritten';
        return 'SolutionOfficial'; // no modifier
    }
    return '';
}

// Helper: Is it a revision note?
function isRevisionNote(name) {
    return name.includes('RevisionNotes');
}

// Helper: Is it past year zip file? (same name as folder, .zip)
function isPastYearZip(name, folderName) {
    // Compare with folder name, replacing spaces with %20 for GitHub encoding
    let folderMatch = folderName.replace(/ /g, '%20');
    let baseName = name.replace('.zip', '');
    return folderMatch === baseName;
}

// Main parser: Recursively parses course folders
async function parseMaterials(contents, courseCode) {
    let finals = {}, midterms = {};
    let revisionNotes = [];
    let pastYearZips = [];

    for (const item of contents) {
        // Direct file in course root
        if (item.type === 'file') {
            if (isRevisionNote(item.name)) {
                revisionNotes.push(item);
            }
            // Could be zip (past year)
            if (item.name.endsWith('.zip')) {
                pastYearZips.push(item);
            }
        }
        // Exam folders (e.g., "MH1200 - Linear Algebra I - Finals")
        else if (item.type === 'dir') {
            let examType = item.name.includes('Finals') ? 'Finals'
                : item.name.includes('Midterm') ? 'Midterm'
                    : '';

            // Fetch folder contents
            const folderRes = await fetch(item.url);
            const folderFiles = await folderRes.json();

            // Check for ZIP file matching folder name
            folderFiles.forEach(f => {
                if (f.name.endsWith('.zip') && isPastYearZip(f.name, item.name)) {
                    pastYearZips.push(f);
                }
            });

            // Parse all PDF files inside
            folderFiles.forEach(f => {
                if (!f.name.endsWith('.pdf')) return;
                let year = extractAcademicYear(f.name);
                let materialType = extractMaterialType(f.name);

                if (!year) return;
                if (examType === 'Finals') {
                    if (!finals[year]) finals[year] = { papers: [], solutions: [], reports: [] };
                    if (materialType === 'QuestionPaper') finals[year].papers.push(f);
                    else if (materialType.startsWith('Solution')) finals[year].solutions.push(f);
                    else if (materialType === 'ExaminerReport') finals[year].reports.push(f);
                } else if (examType === 'Midterm') {
                    if (!midterms[year]) midterms[year] = { papers: [], solutions: [], reports: [] };
                    if (materialType === 'QuestionPaper') midterms[year].papers.push(f);
                    else if (materialType.startsWith('Solution')) midterms[year].solutions.push(f);
                }
            });
        }
    }

    return {
        finals,
        midterms,
        revisionNotes,
        pastYearZips
    };
}

// Initialize page logic
document.addEventListener('DOMContentLoaded', async () => {
    lucide.createIcons();
    await loadCourses();
    setupSearch();
    handleURLParams();
});

// Replace the entire loadCourses function with this:
async function loadCourses() {
    const loadingState = document.getElementById('loading-state');
    try {
        // Load from pre-generated JSON instead of GitHub API
        const response = await fetch('courses.json');
        if (!response.ok) {
            throw new Error(`Failed to load courses data: ${response.status}`);
        }
        
        const data = await response.json();
        allCourses = data.courses;
        
        loadingState.classList.add('hidden');
        renderCourses(allCourses);
        updateResultsCount(allCourses.length, allCourses.length);
        
        // Show when data was last updated
        if (data.generatedAt) {
            const updateTime = new Date(data.generatedAt).toLocaleString();
            const resultsCount = document.getElementById('results-count');
            resultsCount.innerHTML += ` <span class="text-gray-400">(Updated: ${updateTime})</span>`;
        }
        
    } catch (error) {
        console.error('Error loading courses:', error);
        loadingState.innerHTML = `
            <i data-lucide="alert-circle" class="h-12 w-12 text-red-500 mx-auto mb-4"></i>
            <p class="text-red-600">Failed to load courses</p>
            <p class="text-sm text-gray-600 mt-2">${error.message}</p>
        `;
        lucide.createIcons();
    }
}


// Render UI for all courses
function renderCourses(courses) {
    const container = document.getElementById('courses-container');
    const noResults = document.getElementById('no-results');
    if (courses.length === 0) {
        container.innerHTML = '';
        noResults.classList.remove('hidden');
        return;
    }
    noResults.classList.add('hidden');
    container.innerHTML = courses.map(course => createCourseCard(course)).join('');
    lucide.createIcons();
}

// Create UI card for a course, aggregating years/types, clickable links for zip & revision notes
function createCourseCard(course) {
    let finalsYears = Object.keys(course.materials.finals).sort().reverse();
    let midtermsYears = Object.keys(course.materials.midterms).sort().reverse();

    let badges = [];
    if (finalsYears.length > 0) badges.push('Finals');
    if (midtermsYears.length > 0) badges.push('Midterms');
    if (course.materials.revisionNotes.length > 0) badges.push('Notes');
    if (course.materials.pastYearZips.length > 0) badges.push('ZIP');

    let sectionHtml = '';
    if (finalsYears.length > 0) {
        sectionHtml += `<div class="mb-3">
            <h4 class="font-semibold text-sm text-gray-700 mb-1 flex items-center">
                <i data-lucide="file-text" class="h-4 w-4 mr-2"></i> Finals
                ${course.materials.pastYearZips.length > 0
                ? course.materials.pastYearZips.filter(zip => zip.name.includes('Finals')).map(zip =>
                    `<a href="${zip.html_url}" target="_blank" class="ml-2 btn-view-materials px-2 py-1" download>
                        <i data-lucide="archive" class="inline h-4 w-4 mr-1"></i>Download ZIP</a>`
                ).join('') : ''
            }
            </h4>
            <div class="text-xs text-gray-600 space-y-1 pl-5">` +
            finalsYears.map(year => {
                let y = course.materials.finals[year];
                let hasPaper = y.papers.length > 0;
                let hasSolution = y.solutions.length > 0;
                let hasReport = y.reports.length > 0;
                return `<div class="flex items-center">
                    <span class="font-medium">${year}:</span>
                    ${hasPaper ? '<span class="ml-2 text-green-600">✓ Paper</span>' : ''}
                    ${hasSolution ? '<span class="ml-2 text-blue-600">✓ Solution</span>' : ''}
                    ${hasReport ? '<span class="ml-2 text-purple-600">✓ Report</span>' : ''}
                </div>`;
            }).join('') +
            `</div>
        </div>`;
    }
    if (midtermsYears.length > 0) {
        sectionHtml += `<div class="mb-3">
            <h4 class="font-semibold text-sm text-gray-700 mb-1 flex items-center">
                <i data-lucide="file-edit" class="h-4 w-4 mr-2"></i> Midterms
                ${course.materials.pastYearZips.length > 0
                ? course.materials.pastYearZips.filter(zip => zip.name.includes('Midterm')).map(zip =>
                    `<a href="${zip.html_url}" target="_blank" class="ml-2 btn-view-materials px-2 py-1" download>
                        <i data-lucide="archive" class="inline h-4 w-4 mr-1"></i>Download ZIP</a>`
                ).join('') : ''
            }
            </h4>
            <div class="text-xs text-gray-600 space-y-1 pl-5">` +
            midtermsYears.map(year => {
                let y = course.materials.midterms[year];
                let hasPaper = y.papers.length > 0;
                let hasSolution = y.solutions.length > 0;
                return `<div class="flex items-center">
                    <span class="font-medium">${year}:</span>
                    ${hasPaper ? '<span class="ml-2 text-green-600">✓ Paper</span>' : ''}
                    ${hasSolution ? '<span class="ml-2 text-blue-600">✓ Solution</span>' : ''}
                </div>`;
            }).join('') +
            `</div>
        </div>`;
    }

    // Revision Notes
    let noteHtml = '';
    if (course.materials.revisionNotes.length) {
        noteHtml = course.materials.revisionNotes.map(note =>
            `<div class="mb-2">
                <a href="${note.html_url}" target="_blank" class="btn-view-materials" download>
                    <i data-lucide="book-open" class="h-4 w-4 mr-2"></i>
                    Download Revision Note
                </a>
            </div>`).join('');
    }

    return `<div class="course-card bg-white border-2 border-gray-200 rounded-lg p-6 hover:border-blue-500 transition-all duration-300 hover:shadow-lg">
        <div class="flex justify-between items-start mb-4">
            <div class="flex-1">
                <h3 class="text-xl font-bold text-gray-900 font-serif">${course.code}</h3>
                <p class="text-gray-600 mt-1 text-sm">${course.name}</p>
            </div>
            <span class="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap ml-2">
                ${badges.join(', ')}
            </span>
        </div>
        <div class="flex flex-wrap gap-2 mb-4">
            ${badges.map(badge => `<span class="material-badge">${badge}</span>`).join('')}
        </div>
        <div class="space-y-2 mb-4">
            ${sectionHtml}
            ${noteHtml}
        </div>
        <div class="flex gap-2">
            <a href="${course.githubUrl}"
                target="_blank"
                rel="noopener noreferrer"
                class="flex-1 btn-view-materials">
                <i data-lucide="folder-open" class="h-4 w-4 mr-2 inline"></i>
                View Folder
            </a>
        </div>
    </div>`;
}

// Search/filter logic (same as before)
function setupSearch() {
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        if (query === '') {
            renderCourses(allCourses);
            updateResultsCount(allCourses.length, allCourses.length);
            return;
        }
        const filtered = allCourses.filter(course => {
            const codeMatch = course.code.toLowerCase().includes(query);
            const nameMatch = course.name.toLowerCase().includes(query);
            return codeMatch || nameMatch;
        });
        renderCourses(filtered);
        updateResultsCount(filtered.length, allCourses.length);
    });
}

function updateResultsCount(showing, total) {
    const resultsCount = document.getElementById('results-count');
    if (showing === total) {
        resultsCount.textContent = `Showing all ${total} course${total !== 1 ? 's' : ''}`;
    } else {
        resultsCount.textContent = `Showing ${showing} of ${total} course${total !== 1 ? 's' : ''}`;
    }
}

function handleURLParams() {
    const params = new URLSearchParams(window.location.search);
    const courseParam = params.get('course');
    const searchParam = params.get('search');
    if (courseParam || searchParam) {
        const searchInput = document.getElementById('search-input');
        searchInput.value = courseParam || searchParam;
        searchInput.dispatchEvent(new Event('input'));
        setTimeout(() => {
            document.getElementById('courses-container').scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 500);
    }
}
