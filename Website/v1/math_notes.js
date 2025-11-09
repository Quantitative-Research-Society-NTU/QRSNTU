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
    'PS5000': 'Introduction to Undergraduate Research Experience',
    'MH4910': 'Undergraduate Research Experience in Mathematical Sciences I',
    'MH4911': 'Undergraduate Research Experience in Mathematical Sciences II',
    'MH4912': 'Professional Internship',
    'MH4913': 'Professional Attachment',
    'MH4920': 'Supervised Independent Study I',
    'MH4921': 'Supervised Independent Study II',
    'MH4930': 'Special Topics in Mathematics',
    'MH4931': 'Special Topics in Applied Mathematics',
    'MH4932': 'Special Topics in Statistics',
    'MH5301': 'Modern Cryptography: Real-World Applications and Impact',
    'MH5401': 'Real-World E-Commerce and DEEP Technology',
    'MH5000': 'Mathematical Problem-Solving',
    'MH5100': 'Advanced Investigations in Calculus I',
    'MH5101': 'Advanced Investigations in Calculus II',
    'MH5200': 'Advanced Investigations in Linear Algebra I',
    'MH5201': 'Advanced Investigations in Linear Algebra II',
    'MH9102': 'Advanced Investigations in Calculus III',
    'MH9300': 'Advanced Investigations in Discrete Mathematics',
    'MH7002': 'Discrete Methods'
};


let allCourses = [], filteredCourses = [], selectedCourses = new Set();
let filterState = { examType: 'all', showSelectedOnly: false };

document.addEventListener('DOMContentLoaded', async () => {
    lucide.createIcons();
    await loadCourses();
    setupSearch();
    setupFilters();
    handleURLParams();
});

async function loadCourses() {
    const loadingState = document.getElementById('loading-state');
    try {
        const response = await fetch('courses.json');
        if (!response.ok) throw new Error(`Failed to load courses data: ${response.status}`);
        const data = await response.json();
        allCourses = data.courses;
        filteredCourses = [...allCourses];
        loadingState.classList.add('hidden');
        renderCourses(filteredCourses);
        updateResultsCount(filteredCourses.length, allCourses.length);
        if (data.generatedAt) {
            const updateTime = new Date(data.generatedAt).toLocaleString();
            document.getElementById('results-count').innerHTML += ` <span class="text-gray-500 text-sm">(Updated: ${updateTime})</span>`;
        }
    } catch (error) {
        console.error('Error loading courses:', error);
        loadingState.innerHTML = `<div class="text-center py-12"><i data-lucide="alert-circle" class="w-12 h-12 mx-auto mb-4 text-red-500"></i><p class="text-lg font-medium text-gray-900">Failed to load courses</p><p class="text-gray-600 mt-2">${error.message}</p></div>`;
        lucide.createIcons();
    }
}

function setupFilters() {
    document.querySelectorAll('[data-filter-type]').forEach(btn => {
        btn.addEventListener('click', () => {
            const filterType = btn.getAttribute('data-filter-type');
            document.querySelectorAll('[data-filter-type]').forEach(b => {
                b.classList.remove('active', 'bg-blue-600', 'text-white');
                b.classList.add('bg-white', 'text-gray-700');
            });
            btn.classList.remove('bg-white', 'text-gray-700');
            btn.classList.add('active', 'bg-blue-600', 'text-white');
            filterState.examType = filterType;
            applyFilters();
        });
    });

    const showSelectedBtn = document.getElementById('show-selected-btn');
    if (showSelectedBtn) {
        showSelectedBtn.addEventListener('click', () => {
            filterState.showSelectedOnly = !filterState.showSelectedOnly;
            updateShowSelectedButton();
            applyFilters();
        });
    }

    const clearSelectedBtn = document.getElementById('clear-selected-btn');
    if (clearSelectedBtn) {
        clearSelectedBtn.addEventListener('click', () => {
            selectedCourses.clear();
            filterState.showSelectedOnly = false;
            updateShowSelectedButton();
            applyFilters();
        });
    }
}

function updateShowSelectedButton() {
    const btn = document.getElementById('show-selected-btn');
    if (btn) {
        if (filterState.showSelectedOnly) {
            btn.classList.add('bg-green-600', 'text-white');
            btn.classList.remove('bg-white', 'text-gray-700');
            btn.textContent = `Selected (${selectedCourses.size})`;
        } else {
            btn.classList.remove('bg-green-600', 'text-white');
            btn.classList.add('bg-white', 'text-gray-700');
            btn.textContent = selectedCourses.size > 0 ? `Show Selected (${selectedCourses.size})` : 'Show Selected';
        }
    }
}

function applyFilters() {
    filteredCourses = allCourses.filter(course => {
        if (filterState.showSelectedOnly && !selectedCourses.has(course.code)) return false;
        if (filterState.examType !== 'all') {
            const examKey = filterState.examType === 'finals' ? 'finals' : 'midterms';
            if (Object.keys(course.materials[examKey]).length === 0) return false;
        }
        return true;
    });
    renderCourses(filteredCourses);
    updateResultsCount(filteredCourses.length, allCourses.length);
}

function setupSearch() {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            filteredCourses = query === '' ? [...allCourses] : allCourses.filter(course =>
                course.code.toLowerCase().includes(query) || course.name.toLowerCase().includes(query)
            );
            applyFilters();
        });
    }
}

function toggleCourseSelection(courseCode) {
    selectedCourses.has(courseCode) ? selectedCourses.delete(courseCode) : selectedCourses.add(courseCode);
    updateShowSelectedButton();
    renderCourses(filteredCourses);
}

function renderCourses(courses) {
    const container = document.getElementById('courses-container'), noResults = document.getElementById('no-results');
    if (courses.length === 0) {
        container.innerHTML = '';
        noResults.classList.remove('hidden');
        return;
    }
    noResults.classList.add('hidden');
    container.innerHTML = courses.map(course => createCourseCard(course)).join('');
    lucide.createIcons();
    document.querySelectorAll('.course-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.tagName === 'A' || e.target.closest('a')) return;
            toggleCourseSelection(card.dataset.courseCode);
        });
    });
}

function createCourseCard(course) {
    const isSelected = selectedCourses.has(course.code);
    const selectedClass = isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200';
    const finalsYears = Object.keys(course.materials.finals).sort().reverse();
    const midtermsYears = Object.keys(course.materials.midterms).sort().reverse();
    const finalsZips = course.materials.pastYearZips.filter(z => z.name.toLowerCase().includes('final'));
    const midtermsZips = course.materials.pastYearZips.filter(z => z.name.toLowerCase().includes('midterm'));
    const otherZips = course.materials.pastYearZips.filter(z => !z.name.toLowerCase().includes('final') && !z.name.toLowerCase().includes('midterm'));

    let badges = [];
    if (finalsYears.length > 0) badges.push('<span class="material-badge bg-blue-100 text-blue-800">Finals</span>');
    if (midtermsYears.length > 0) badges.push('<span class="material-badge bg-purple-100 text-purple-800">Midterms</span>');
    if (course.materials.revisionNotes.length > 0) badges.push('<span class="material-badge bg-green-100 text-green-800">Notes</span>');

    let sectionHtml = '';

    // Finals
    if ((filterState.examType === 'all' || filterState.examType === 'finals') && finalsYears.length > 0) {
        sectionHtml += '<div class="mb-4"><h4 class="text-sm font-bold text-gray-900 flex items-center gap-2 mb-2"><i data-lucide="file-text" class="w-4 h-4 text-blue-600"></i><span>Finals</span>';
        finalsZips.forEach(zip => {
            sectionHtml += `<a href="${zip.downloadUrl}" download onclick="event.stopPropagation()" class="inline-flex items-center px-2 py-1 bg-yellow-600 text-white text-xs font-medium rounded hover:bg-yellow-700 transition-colors"><i data-lucide="archive" class="w-3 h-3 mr-1"></i>ZIP</a>`;
        });
        sectionHtml += '</h4>';
        finalsYears.forEach(year => {
            const materials = course.materials.finals[year];
            const officialSols = materials.solutions.filter(s => !s.name.includes('by QRS') && !s.name.includes('Unofficial'));
            const qrsSols = materials.solutions.filter(s => s.name.includes('by QRS'));
            const unofficialSols = materials.solutions.filter(s => s.name.includes('Unofficial'));
            const sortedSolutions = [...officialSols, ...qrsSols, ...unofficialSols];
            sectionHtml += `<div class="mb-2 flex items-center flex-wrap gap-2"><span class="text-xs text-gray-700 mr-2">AY ${year}:</span>`;
            materials.papers.forEach(paper => {
                sectionHtml += `<a href="${paper.downloadUrl}" download onclick="event.stopPropagation()" class="inline-flex items-center px-2 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors"><i data-lucide="download" class="w-3 h-3 mr-1"></i>Paper</a>`;
            });
            sortedSolutions.forEach(solution => {
                const isQRS = solution.name.includes('by QRS'), isUnofficial = solution.name.includes('Unofficial');
                const colorClass = isQRS ? 'bg-green-600 hover:bg-green-700' : isUnofficial ? 'bg-gray-600 hover:bg-gray-700' : 'bg-purple-600 hover:bg-purple-700';
                const label = isQRS ? 'Solution (QRS)' : isUnofficial ? 'Solution (Other)' : 'Solution';
                sectionHtml += `<a href="${solution.downloadUrl}" download onclick="event.stopPropagation()" class="inline-flex items-center px-2 py-1 ${colorClass} text-white text-xs font-medium rounded transition-colors"><i data-lucide="download" class="w-3 h-3 mr-1"></i>${label}</a>`;
            });
            materials.reports.forEach(report => {
                sectionHtml += `<a href="${report.downloadUrl}" download onclick="event.stopPropagation()" class="inline-flex items-center px-2 py-1 bg-gray-600 text-white text-xs font-medium rounded hover:bg-gray-700 transition-colors"><i data-lucide="download" class="w-3 h-3 mr-1"></i>Report</a>`;
            });
            sectionHtml += '</div>';
        });
        sectionHtml += '</div>';
    }

    // Midterms
    if ((filterState.examType === 'all' || filterState.examType === 'midterms') && midtermsYears.length > 0) {
        sectionHtml += '<div class="mb-4"><h4 class="text-sm font-bold text-gray-900 flex items-center gap-2 mb-2"><i data-lucide="file-text" class="w-4 h-4 text-purple-600"></i><span>Midterms</span>';
        midtermsZips.forEach(zip => {
            sectionHtml += `<a href="${zip.downloadUrl}" download onclick="event.stopPropagation()" class="inline-flex items-center px-2 py-1 bg-yellow-600 text-white text-xs font-medium rounded hover:bg-yellow-700 transition-colors"><i data-lucide="archive" class="w-3 h-3 mr-1"></i>ZIP</a>`;
        });
        sectionHtml += '</h4>';
        midtermsYears.forEach(year => {
            const materials = course.materials.midterms[year];
            const officialSols = materials.solutions.filter(s => !s.name.includes('by QRS') && !s.name.includes('Unofficial'));
            const qrsSols = materials.solutions.filter(s => s.name.includes('by QRS'));
            const unofficialSols = materials.solutions.filter(s => s.name.includes('Unofficial'));
            const sortedSolutions = [...officialSols, ...qrsSols, ...unofficialSols];
            sectionHtml += `<div class="mb-2 flex items-center flex-wrap gap-2"><span class="text-xs text-gray-700 mr-2">AY ${year}:</span>`;
            materials.papers.forEach(paper => {
                sectionHtml += `<a href="${paper.downloadUrl}" download onclick="event.stopPropagation()" class="inline-flex items-center px-2 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors"><i data-lucide="download" class="w-3 h-3 mr-1"></i>Paper</a>`;
            });
            sortedSolutions.forEach(solution => {
                const isQRS = solution.name.includes('by QRS'), isUnofficial = solution.name.includes('Unofficial');
                const colorClass = isQRS ? 'bg-green-600 hover:bg-green-700' : isUnofficial ? 'bg-gray-600 hover:bg-gray-700' : 'bg-purple-600 hover:bg-purple-700';
                const label = isQRS ? 'Solution (QRS)' : isUnofficial ? 'Solution (Other)' : 'Solution';
                sectionHtml += `<a href="${solution.downloadUrl}" download onclick="event.stopPropagation()" class="inline-flex items-center px-2 py-1 ${colorClass} text-white text-xs font-medium rounded transition-colors"><i data-lucide="download" class="w-3 h-3 mr-1"></i>${label}</a>`;
            });
            sectionHtml += '</div>';
        });
        sectionHtml += '</div>';
    }

    // Revision Notes - ALWAYS SHOW
    if (course.materials.revisionNotes.length > 0) {
        sectionHtml += '<div class="mb-3"><h4 class="text-sm font-bold mb-2 text-gray-900 flex items-center"><i data-lucide="book-open" class="w-4 h-4 mr-1 text-green-600"></i>Revision Notes</h4><div class="flex flex-wrap gap-2">';
        course.materials.revisionNotes.forEach(note => {
            sectionHtml += `<a href="${note.downloadUrl}" download onclick="event.stopPropagation()" class="inline-flex items-center px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 transition-colors"><i data-lucide="download" class="w-3 h-3 mr-1"></i>Revision Notes</a>`;
        });
        sectionHtml += '</div></div>';
    }



    // Other Archives
    if (otherZips.length > 0) {
        sectionHtml += '<div class="mb-3"><h4 class="text-sm font-bold mb-2 text-gray-900 flex items-center"><i data-lucide="archive" class="w-4 h-4 mr-1 text-yellow-600"></i>Archives</h4><div class="flex flex-wrap gap-2">';
        otherZips.forEach(zip => {
            sectionHtml += `<a href="${zip.downloadUrl}" download onclick="event.stopPropagation()" class="inline-flex items-center px-3 py-1.5 bg-yellow-600 text-white text-xs font-medium rounded hover:bg-yellow-700 transition-colors"><i data-lucide="download" class="w-3 h-3 mr-1"></i>${zip.name}</a>`;
        });
        sectionHtml += '</div></div>';
    }

    return `<div class="course-card bg-white rounded-lg border-2 ${selectedClass} p-4 hover:border-blue-500 transition-all duration-200 hover:shadow-md cursor-pointer" data-course-code="${course.code}"><div class="flex items-start justify-between mb-3"><div class="flex-1"><h3 class="text-lg font-bold text-gray-900 mb-1">${course.code}</h3><p class="text-sm text-gray-700 mb-2">${course.name}</p><div class="flex flex-wrap gap-1 mb-2">${badges.join('')}</div></div><a href="${course.githubUrl}" target="_blank" onclick="event.stopPropagation()" class="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded hover:bg-gray-200 transition-colors flex-shrink-0"><i data-lucide="folder" class="w-3 h-3 mr-1"></i>Folder</a></div>${sectionHtml}</div>`;
}

function updateResultsCount(showing, total) {
    const element = document.getElementById('results-count');
    if (element) element.innerHTML = `Showing ${showing} of ${total} courses`;
}

function handleURLParams() {
    const params = new URLSearchParams(window.location.search);
    const course = params.get('course');
    if (course) {
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.value = course;
            searchInput.dispatchEvent(new Event('input'));
        }
    }
}