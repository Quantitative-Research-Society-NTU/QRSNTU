// Renders the Events page from data/events.json. Events here means
// industrial/external activity only — never internal programme lectures.
import { loadData, escapeHtml } from './qrs-data.js';

function formatDateRange(ev) {
    const opts = { day: 'numeric', month: 'short', year: 'numeric' };
    const start = new Date(ev.start_date).toLocaleDateString('en-SG', opts);
    if (!ev.end_date || ev.end_date === ev.start_date) return start;
    const end = new Date(ev.end_date).toLocaleDateString('en-SG', opts);
    return `${start} – ${end}`;
}

function eventCard(ev) {
    const orgList = (ev.organizers || []).join(', ');
    const partnerList = (ev.partners || []).join(', ');
    return `
        <article id="event-${ev.id}" class="event-card">
            <div class="project-badges">
                <span class="badge">${escapeHtml(ev.type)}</span>
                <span class="badge badge-status">${ev.status === 'past' ? 'Past' : 'Upcoming'}</span>
            </div>
            <h3 class="card-title">${escapeHtml(ev.title)}</h3>
            <p class="event-meta">${formatDateRange(ev)} &middot; ${escapeHtml(ev.location)}</p>
            ${ev.qrs_role ? `<p class="event-meta">QRS role: ${escapeHtml(ev.qrs_role)}</p>` : ''}
            <p class="card-description">${escapeHtml(ev.summary)}</p>
            ${orgList ? `<p class="event-meta"><span class="label">Organisers:</span> ${escapeHtml(orgList)}</p>` : ''}
            ${partnerList ? `<p class="event-meta"><span class="label">Partners:</span> ${escapeHtml(partnerList)}</p>` : ''}
            ${ev.url ? `<a href="${escapeHtml(ev.url)}" target="_blank" rel="noopener noreferrer" class="card-link">Event details <i data-lucide="arrow-right" class="inline-block h-4 w-4 ml-1"></i></a>` : ''}
        </article>`;
}

async function renderEvents() {
    const upcomingContainer = document.getElementById('events-upcoming');
    const pastContainer = document.getElementById('events-past');
    try {
        const { events } = await loadData({ events: '../data/events.json' });
        const upcoming = events.filter(e => e.status !== 'past').sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
        const past = events.filter(e => e.status === 'past').sort((a, b) => new Date(b.start_date) - new Date(a.start_date));

        if (upcoming.length) {
            upcomingContainer.innerHTML = upcoming.map(eventCard).join('');
        } else {
            document.getElementById('events-upcoming-section').classList.add('hidden');
        }

        pastContainer.innerHTML = past.length
            ? past.map(eventCard).join('')
            : `<p class="text-gray-600">No past events yet.</p>`;

        if (window.lucide) lucide.createIcons();
    } catch (err) {
        console.error('Error loading events:', err);
        pastContainer.innerHTML = `<p class="text-gray-600">Events could not be loaded.</p>`;
    }
}

document.addEventListener('DOMContentLoaded', renderEvents);
