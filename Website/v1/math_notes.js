let allCourses = [], filteredCourses = [], selectedCourses = new Set();
let filterState = { examType: 'all', showSelectedOnly: false };
let expandedSections = new Set();

// Manual version for cache busting. Bump this when courses.json changes.
const APP_VERSION = '1.5';

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
        const response = await fetch(`courses.json?v=${APP_VERSION}`);
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

function extractYearFromPath(path) {
    const match = path.match(/\(AY(\d{2}-\d{2})\)/);
    return match ? match[1] : null;
}

function extractIdentifier(filename) {
    const match = filename.match(/_(Week \d+|Problem[_ ]?Sheet[_ ]?\d+|Lecture[_ ]?\d+|\d+)_/);
    return match ? match[1] : 'Uncategorized';
}

function groupByIdentifier(items) {
    const grouped = {};
    items.forEach(item => {
        const identifier = extractIdentifier(item.name);
        if (!grouped[identifier]) {
            grouped[identifier] = { papers: [], solutions: [] };
        }
        if (item.name.includes('QuestionPaper')) {
            grouped[identifier].papers.push(item);
        } else if (item.name.includes('Solution')) {
            grouped[identifier].solutions.push(item);
        } else {
            grouped[identifier].papers.push(item);
        }
    });
    return grouped;
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
            if (e.target.closest('[data-toggle-section]')) return;
            toggleCourseSelection(card.dataset.courseCode);
        });
    });

    document.querySelectorAll('[data-toggle-section]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const sectionId = btn.getAttribute('data-toggle-section');
            const section = document.getElementById(sectionId);
            const icon = btn.querySelector('[data-toggle-icon]');
            if (section) {
                section.classList.toggle('hidden');
                const isExpanded = !section.classList.contains('hidden');
                if (isExpanded) {
                    expandedSections.add(sectionId);
                } else {
                    expandedSections.delete(sectionId);
                }
                if (icon) {
                    icon.setAttribute('data-lucide', isExpanded ? 'chevron-down' : 'chevron-right');
                    lucide.createIcons();
                }
            }
        });
    });
}

function createCourseCard(course) {
    const isSelected = selectedCourses.has(course.code);
    const selectedClass = isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200';
    const finalsYears = Object.keys(course.materials.finals || {}).sort().reverse();
    const midtermsYears = Object.keys(course.materials.midterms || {}).sort().reverse();

    const problemSheetsYear = course.materials.problemSheets && course.materials.problemSheets.length > 0
        ? extractYearFromPath(course.materials.problemSheets[0].path) : null;
    const lectureNotesYear = course.materials.lectureNotes && course.materials.lectureNotes.length > 0
        ? extractYearFromPath(course.materials.lectureNotes[0].path) : null;

    const finalsZips = (course.materials.pastYearZips || []).filter(z => z.name.toLowerCase().includes('final'));
    const midtermsZips = (course.materials.pastYearZips || []).filter(z => z.name.toLowerCase().includes('midterm'));
    const otherZips = (course.materials.pastYearZips || []).filter(z => !z.name.toLowerCase().includes('final') && !z.name.toLowerCase().includes('midterm'));

    let badges = [];
    if (finalsYears.length > 0) badges.push('<span class="material-badge bg-blue-100 text-blue-800">Finals</span>');
    if (midtermsYears.length > 0) badges.push('<span class="material-badge bg-purple-100 text-purple-800">Midterms</span>');
    if (course.materials.revisionNotes && course.materials.revisionNotes.length > 0) badges.push('<span class="material-badge bg-green-100 text-green-800">Notes</span>');
    if (course.materials.problemSheets && course.materials.problemSheets.length > 0) badges.push('<span class="material-badge bg-yellow-100 text-yellow-800">Problem Sheets</span>');
    if (course.materials.lectureNotes && course.materials.lectureNotes.length > 0) badges.push('<span class="material-badge bg-indigo-100 text-indigo-800">Lecture Notes</span>');
    if (course.materials.practiceMaterials && Object.keys(course.materials.practiceMaterials).length > 0) {
        badges.push('<span class="material-badge bg-pink-100 text-pink-800">Practice</span>');
    }

    /**
     * Helper to render solution buttons.
     * Updated: Wraps output in a vertical flex container.
     */
    function renderSolutions(solutions) {
        if (!solutions || solutions.length === 0) return '';

        // 1. Sort logic
        const sorted = [...solutions].sort((a, b) => {
            const aQRS = a.name.includes('by QRS');
            const bQRS = b.name.includes('by QRS');
            if (aQRS && !bQRS) return -1;
            if (!aQRS && bQRS) return 1;

            const aIsClean = /Solution\.pdf$/i.test(a.name);
            const bIsClean = /Solution\.pdf$/i.test(b.name);
            if (aIsClean && !bIsClean) return -1;
            if (!aIsClean && bIsClean) return 1;

            return a.name.localeCompare(b.name);
        });

        // 2. Limit to max 2
        const sliced = sorted.slice(0, 2);

        // 3. Create Button HTML
        const buttonsHtml = sliced.map(solution => {
            let label = 'Solution';
            // Default Standard: Purple with white text
            let colorClass = 'bg-purple-600 hover:bg-purple-700 text-white';
            const lowerName = solution.name.toLowerCase();

            if (solution.name.includes('by QRS')) {
                label = 'Solution (QRS)';
                // QRS: Green with white text
                colorClass = 'bg-green-600 hover:bg-green-700 text-white';
            } else if (lowerName.includes('handwritten')) {
                label = 'Solution Handwritten';
                // Handwritten: Grey box, Dark text, Italic
                colorClass = 'bg-gray-200 hover:bg-gray-300 text-gray-900 italic border border-gray-300';
            } else if (lowerName.includes('scanned')) {
                label = 'Solution Scanned';
                // Scanned: Grey box, Dark text, Italic
                colorClass = 'bg-gray-200 hover:bg-gray-300 text-gray-900 italic border border-gray-300';
            } else if (solution.name.includes('Unofficial')) {
                label = 'Solution (Other)';
                // Unofficial: Dark Grey with white text
                colorClass = 'bg-gray-600 hover:bg-gray-700 text-white';
            }

            return `<a href="${solution.downloadUrl}" download onclick="event.stopPropagation()" class="inline-flex items-center px-2 py-1 ${colorClass} text-xs font-medium rounded transition-colors"><i data-lucide="download" class="w-3 h-3 mr-1"></i>${label}</a>`;
        }).join('');

        // 4. Wrap in a vertical flex container
        return `<div class="inline-flex flex-col gap-1 ml-1">${buttonsHtml}</div>`;
    }

    let sectionHtml = '';

    // Finals - Collapsible
    if ((filterState.examType === 'all' || filterState.examType === 'finals') && finalsYears.length > 0) {
        const uniqueId = `finals-${course.code}`;
        const isExpanded = expandedSections.has(uniqueId);
        sectionHtml += `<div class="mb-4">
            <h4 class="text-sm font-bold text-gray-900 flex items-center gap-2 mb-2 cursor-pointer hover:text-gray-700" data-toggle-section="${uniqueId}">
                <i data-lucide="${isExpanded ? 'chevron-down' : 'chevron-right'}" data-toggle-icon class="w-4 h-4 text-blue-600"></i>
                <i data-lucide="file-text" class="w-4 h-4 text-blue-600"></i>
                <span>Finals (${finalsYears.length} years)</span>`;
        finalsZips.forEach(zip => {
            sectionHtml += `<a href="${zip.downloadUrl}" download onclick="event.stopPropagation()" class="inline-flex items-center px-2 py-1 bg-yellow-600 text-white text-xs font-medium rounded hover:bg-yellow-700 transition-colors"><i data-lucide="archive" class="w-3 h-3 mr-1"></i>ZIP</a>`;
        });
        sectionHtml += `</h4><div id="${uniqueId}" class="${isExpanded ? '' : 'hidden'} pl-5">`;
        finalsYears.forEach(year => {
            const materials = course.materials.finals[year];
            // CHANGE: items-start to align top, mt-1 on span to fix text baseline
            sectionHtml += `<div class="mb-2 flex items-start flex-wrap gap-2"><span class="text-xs text-gray-700 mr-2 mt-1">AY ${year}:</span>`;
            materials.papers.forEach(paper => {
                sectionHtml += `<a href="${paper.downloadUrl}" download onclick="event.stopPropagation()" class="inline-flex items-center px-2 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors"><i data-lucide="download" class="w-3 h-3 mr-1"></i>Paper</a>`;
            });
            sectionHtml += renderSolutions(materials.solutions);
            (materials.reports || []).forEach(report => {
                sectionHtml += `<a href="${report.downloadUrl}" download onclick="event.stopPropagation()" class="inline-flex items-center px-2 py-1 bg-gray-600 text-white text-xs font-medium rounded hover:bg-gray-700 transition-colors"><i data-lucide="download" class="w-3 h-3 mr-1"></i>Report</a>`;
            });
            sectionHtml += '</div>';
        });
        sectionHtml += '</div></div>';
    }

    // Midterms - Collapsible
    if ((filterState.examType === 'all' || filterState.examType === 'midterms') && midtermsYears.length > 0) {
        const uniqueId = `midterms-${course.code}`;
        const isExpanded = expandedSections.has(uniqueId);
        sectionHtml += `<div class="mb-4">
            <h4 class="text-sm font-bold text-gray-900 flex items-center gap-2 mb-2 cursor-pointer hover:text-gray-700" data-toggle-section="${uniqueId}">
                <i data-lucide="${isExpanded ? 'chevron-down' : 'chevron-right'}" data-toggle-icon class="w-4 h-4 text-purple-600"></i>
                <i data-lucide="file-text" class="w-4 h-4 text-purple-600"></i>
                <span>Midterms (${midtermsYears.length} years)</span>`;
        midtermsZips.forEach(zip => {
            sectionHtml += `<a href="${zip.downloadUrl}" download onclick="event.stopPropagation()" class="inline-flex items-center px-2 py-1 bg-yellow-600 text-white text-xs font-medium rounded hover:bg-yellow-700 transition-colors"><i data-lucide="archive" class="w-3 h-3 mr-1"></i>ZIP</a>`;
        });
        sectionHtml += `</h4><div id="${uniqueId}" class="${isExpanded ? '' : 'hidden'} pl-5">`;
        midtermsYears.forEach(year => {
            const materials = course.materials.midterms[year];
            // CHANGE: items-start to align top, mt-1 on span to fix text baseline
            sectionHtml += `<div class="mb-2 flex items-start flex-wrap gap-2"><span class="text-xs text-gray-700 mr-2 mt-1">AY ${year}:</span>`;
            materials.papers.forEach(paper => {
                sectionHtml += `<a href="${paper.downloadUrl}" download onclick="event.stopPropagation()" class="inline-flex items-center px-2 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors"><i data-lucide="download" class="w-3 h-3 mr-1"></i>Paper</a>`;
            });
            sectionHtml += renderSolutions(materials.solutions);
            sectionHtml += '</div>';
        });
        sectionHtml += '</div></div>';
    }

    // Problem Sheets
    if (course.materials.problemSheets && course.materials.problemSheets.length > 0) {
        const uniqueId = `problem-sheets-${course.code}`;
        const isExpanded = expandedSections.has(uniqueId);
        const grouped = groupByIdentifier(course.materials.problemSheets);
        const groupCount = Object.keys(grouped).length;
        const yearLabel = problemSheetsYear ? ` (AY${problemSheetsYear})` : '';
        sectionHtml += `<div class="mb-3">
            <h4 class="text-sm font-bold mb-2 text-gray-900 flex items-center cursor-pointer hover:text-gray-700" data-toggle-section="${uniqueId}">
                <i data-lucide="${isExpanded ? 'chevron-down' : 'chevron-right'}" data-toggle-icon class="w-4 h-4 mr-1 text-yellow-600"></i>
                <i data-lucide="clipboard-list" class="w-4 h-4 mr-1 text-yellow-600"></i>
                Problem Sheets${yearLabel} (${groupCount})
            </h4>
            <div id="${uniqueId}" class="${isExpanded ? '' : 'hidden'} pl-5">`;

        Object.keys(grouped).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })).forEach(identifier => {
            const group = grouped[identifier];

            // --- UPDATED DISPLAY LOGIC START ---
            let displayName = identifier;

            // Regex to catch "ProblemSheet_1", "Problem Sheet 1", "Sheet_1", etc.
            // It captures the digits at the end into group 1
            const match = identifier.match(/^(?:Problem[_ ]?Sheet[_ ]?|Sheet[_ ]?)(\d+)$/i);

            if (match) {
                // If it matches "ProblemSheet_1", display "#1"
                displayName = `#${match[1]}`;
            } else if (/^\d+$/.test(identifier)) {
                // If it is already just "1", display "#1"
                displayName = `#${identifier}`;
            }
            // --- UPDATED DISPLAY LOGIC END ---

            sectionHtml += `<div class="mb-2 flex items-start flex-wrap gap-2"><span class="text-xs font-semibold text-gray-700 mr-2 mt-1">${displayName}:</span>`;
            group.papers.forEach(paper => {
                sectionHtml += `<a href="${paper.downloadUrl}" download onclick="event.stopPropagation()" class="inline-flex items-center px-2 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors"><i data-lucide="download" class="w-3 h-3 mr-1"></i>Question</a>`;
            });
            sectionHtml += renderSolutions(group.solutions);
            sectionHtml += '</div>';
        });
        sectionHtml += '</div></div>';
    }

    // Lecture Notes
    if (course.materials.lectureNotes && course.materials.lectureNotes.length > 0) {
        const uniqueId = `lecture-notes-${course.code}`;
        const isExpanded = expandedSections.has(uniqueId);
        const grouped = groupByIdentifier(course.materials.lectureNotes);
        const groupCount = Object.keys(grouped).length;
        const yearLabel = lectureNotesYear ? ` (AY${lectureNotesYear})` : '';
        sectionHtml += `<div class="mb-3">
            <h4 class="text-sm font-bold mb-2 text-gray-900 flex items-center cursor-pointer hover:text-gray-700" data-toggle-section="${uniqueId}">
                <i data-lucide="${isExpanded ? 'chevron-down' : 'chevron-right'}" data-toggle-icon class="w-4 h-4 mr-1 text-indigo-600"></i>
                <i data-lucide="book-open" class="w-4 h-4 mr-1 text-indigo-600"></i>
                Lecture Notes${yearLabel} (${groupCount})
            </h4>
            <div id="${uniqueId}" class="${isExpanded ? '' : 'hidden'} pl-5">`;
        Object.keys(grouped).sort().forEach(identifier => {
            const group = grouped[identifier];
            // CHANGE: items-start
            sectionHtml += `<div class="mb-2 flex items-start flex-wrap gap-2"><span class="text-xs font-semibold text-gray-700 mr-2 mt-1">${identifier}:</span>`;
            group.papers.forEach(note => {
                sectionHtml += `<a href="${note.downloadUrl}" download onclick="event.stopPropagation()" class="inline-flex items-center px-2 py-1 bg-indigo-600 text-white text-xs font-medium rounded hover:bg-indigo-700 transition-colors"><i data-lucide="download" class="w-3 h-3 mr-1"></i>Notes</a>`;
            });
            sectionHtml += '</div>';
        });
        sectionHtml += '</div></div>';
    }

    // Practice Materials
    if (course.materials.practiceMaterials && Object.keys(course.materials.practiceMaterials).length > 0) {
        const uniqueId = `practice-materials-${course.code}`;
        const isExpanded = expandedSections.has(uniqueId);
        const practiceData = course.materials.practiceMaterials || {};
        const allKeys = Object.keys(practiceData);

        const numberedKeys = allKeys
            .filter(k => /^Practice\s+\d+$/.test(k))
            .sort((a, b) => {
                const na = parseInt(a.match(/Practice\s+(\d+)/)[1], 10);
                const nb = parseInt(b.match(/Practice\s+(\d+)/)[1], 10);
                return na - nb;
            });

        const otherKeys = allKeys.filter(k => !/^Practice\s+\d+$/.test(k));
        const practiceZips = (course.materials.pastYearZips || []).filter(z =>
            z.name.toLowerCase().includes('practice')
        );
        const practiceGroupCount = numberedKeys.length + (otherKeys.length > 0 ? 1 : 0);

        sectionHtml += `
        <div class="mb-3">
            <h4 class="text-sm font-bold mb-2 text-gray-900 flex items-center cursor-pointer hover:text-gray-700"
                data-toggle-section="${uniqueId}">
                <i data-lucide="${isExpanded ? 'chevron-down' : 'chevron-right'}" data-toggle-icon class="w-4 h-4 mr-1 text-pink-600"></i>
                <i data-lucide="folder-open" class="w-4 h-4 mr-1 text-pink-600"></i>
                Practice Materials (${practiceGroupCount})
    `;
        practiceZips.forEach(zip => {
            sectionHtml += `
            <a href="${zip.downloadUrl}" download onclick="event.stopPropagation()"
               class="inline-flex items-center ml-2 px-2 py-1 bg-yellow-600 text-white text-xs font-medium rounded hover:bg-yellow-700 transition-colors">
                <i data-lucide="archive" class="w-3 h-3 mr-1"></i>ZIP
            </a>`;
        });
        sectionHtml += `</h4><div id="${uniqueId}" class="${isExpanded ? '' : 'hidden'} pl-5">`;

        // Numbered practices
        numberedKeys.forEach(name => {
            const group = practiceData[name];
            // CHANGE: items-start, mt-1
            sectionHtml += `<div class="mb-2 flex items-start flex-wrap gap-2"><span class="text-xs font-semibold text-gray-800 mr-2 mt-1">${name}:</span>`;
            (group.papers || []).forEach(paper => {
                sectionHtml += `<a href="${paper.downloadUrl}" download onclick="event.stopPropagation()" class="inline-flex items-center px-2 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors"><i data-lucide="download" class="w-3 h-3 mr-1"></i>Question</a>`;
            });
            sectionHtml += renderSolutions(group.solutions);
            sectionHtml += `</div>`;
        });

        // Other practices
        if (otherKeys.length > 0) {
            const otherFolderId = `${uniqueId}-other`;
            const otherExpanded = expandedSections.has(otherFolderId);
            const otherPapers = [];
            const otherSolutions = [];
            otherKeys.forEach(k => {
                const g = practiceData[k];
                (g.papers || []).forEach(p => otherPapers.push(p));
                (g.solutions || []).forEach(s => otherSolutions.push(s));
            });

            sectionHtml += `
            <div class="mb-2">
                <div class="flex items-center cursor-pointer hover:text-gray-700" data-toggle-section="${otherFolderId}">
                    <i data-lucide="${otherExpanded ? 'chevron-down' : 'chevron-right'}" data-toggle-icon class="w-3 h-3 mr-1 text-pink-600"></i>
                    <i data-lucide="folder" class="w-4 h-4 mr-2 text-pink-600"></i>
                    <span class="text-xs font-semibold text-gray-800">Other Practices</span>
                </div>
                <div id="${otherFolderId}" class="${otherExpanded ? '' : 'hidden'} pl-6 mt-1 flex flex-wrap items-start gap-2">
            `;
            otherPapers.forEach(item => {
                sectionHtml += `<a href="${item.downloadUrl}" download onclick="event.stopPropagation()" class="inline-flex items-center px-2 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors"><i data-lucide="download" class="w-3 h-3 mr-1"></i>Question</a>`;
            });
            sectionHtml += renderSolutions(otherSolutions);
            sectionHtml += `</div></div>`;
        }
        sectionHtml += `</div></div>`;
    }

    // Revision Notes
    if (course.materials.revisionNotes && course.materials.revisionNotes.length > 0) {
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