// Admin Feedback JavaScript (clean implementation)

let allFeedback = [];
let filteredFeedback = [];
let currentFilter = 'all';
let currentFeedbackId = null;
let currentFeedbackPage = 1;
const feedbackPerPage = 5;

document.addEventListener('DOMContentLoaded', function() {
    loadFeedback();
});

async function loadFeedback() {
    try {
        // Try admin endpoint first (requires login). If unauthorized, fall back to public endpoint.
        let response = await fetch('/api/admin/feedback', { method: 'GET', credentials: 'include' });
        if (response.status === 401) {
            response = await fetch('/api/feedback/all', { method: 'GET' });
        }
        const data = await response.json();

        if (response.ok && data.feedbacks) {
            allFeedback = data.feedbacks;
            filterFeedback(currentFilter);
        } else {
            showAdminAlert(data.error || 'Failed to load feedback', 'error');
            document.getElementById('feedbackTable').innerHTML = '<tr><td colspan="8" style="text-align: center;">No feedback found</td></tr>';
        }
    } catch (error) {
        console.error('Error loading feedback:', error);
        showAdminAlert('Failed to load feedback', 'error');
        document.getElementById('feedbackTable').innerHTML = '<tr><td colspan="8" style="text-align: center;">Error loading feedback</td></tr>';
    }
}

function filterFeedback(status) {
    currentFilter = status;

    // Update active button
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        const text = btn.textContent.trim().toLowerCase();
        if ((status === 'all' && text.includes('all')) || (status !== 'all' && text.includes(status))) {
            btn.classList.add('active');
        }
    });

    // Map UI filter keywords to DB status values
    // UI: 'pending' -> DB 'show', 'resolved' -> DB 'hide'
    let mapped = status;
    if (status === 'pending') mapped = 'show';
    if (status === 'resolved') mapped = 'hide';

    let filtered = allFeedback;
    if (status !== 'all') {
        filtered = allFeedback.filter(fb => (fb.status || '').toLowerCase() === mapped.toLowerCase());
    }

    filteredFeedback = filtered;
    currentFeedbackPage = 1;
    displayFeedbackPage(currentFeedbackPage);
    updateFeedbackPaginationButtons(filtered.length);
}

function displayFeedbackPage(page) {
    const tableBody = document.getElementById('feedbackTable');
    if (!tableBody || !filteredFeedback) return;

    const startIdx = (page - 1) * feedbackPerPage;
    const endIdx = startIdx + feedbackPerPage;
    const pageFeedback = filteredFeedback.slice(startIdx, endIdx);

    if (pageFeedback.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="8" style="text-align: center;">No feedback found</td></tr>';
        return;
    }

    tableBody.innerHTML = pageFeedback.map(fb => {

function displayFeedback(feedbacks) {
    const tableBody = document.getElementById('feedbackTable');

    if (!feedbacks || feedbacks.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="8" style="text-align: center;">No feedback found</td></tr>';
        updateFeedbackPaginationButtons(0);
        return;
    }

    filteredFeedback = feedbacks;
    currentFeedbackPage = 1;
    displayFeedbackPage(currentFeedbackPage);
    updateFeedbackPaginationButtons(feedbacks.length);
}

function updateFeedbackPaginationButtons(totalFeedback) {
    const totalPages = Math.ceil(totalFeedback / feedbackPerPage);
    const paginationDiv = document.getElementById('feedbackPaginationControls');
    
    if (!paginationDiv) return;
    
    paginationDiv.style.display = 'flex';
    
    const prevBtn = document.getElementById('feedbackPrevBtn');
    const nextBtn = document.getElementById('feedbackNextBtn');
    const pageInfo = document.getElementById('feedbackPageInfo');
    
    if (prevBtn) prevBtn.disabled = currentFeedbackPage === 1;
    if (nextBtn) nextBtn.disabled = currentFeedbackPage === totalPages;
    if (pageInfo) pageInfo.textContent = `Page ${currentFeedbackPage} of ${totalPages}`;
}

function feedbackPreviousPage() {
    if (currentFeedbackPage > 1) {
        currentFeedbackPage--;
        displayFeedbackPage(currentFeedbackPage);
        updateFeedbackPaginationButtons(filteredFeedback.length);
    }
}

function feedbackNextPage() {
    const totalPages = Math.ceil(filteredFeedback.length / feedbackPerPage);
    if (currentFeedbackPage < totalPages) {
        currentFeedbackPage++;
        displayFeedbackPage(currentFeedbackPage);
        updateFeedbackPaginationButtons(filteredFeedback.length);
    }
}
        const feedbackDate = fb.created_at ? new Date(fb.created_at).toLocaleString() : 'N/A';
        const email = fb.email || 'N/A';
        const phone = fb.phone || '';
        const subject = fb.subject || '';
        const statusText = fb.status || '';
        const statusLabel = statusText.toLowerCase() === 'show' ? 'Pending' : (statusText.toLowerCase() === 'hide' ? 'Resolved' : statusText);
        return `
            <tr>
                <td>#${fb.id}</td>
                <td>${escapeHtml(fb.name)}</td>
                <td>${escapeHtml(email)}</td>
                <td>${escapeHtml(phone)}</td>
                <td>${escapeHtml(subject)}</td>
                <td>${escapeHtml(feedbackDate)}</td>
                <td><span class="status-badge status-${statusText.toLowerCase()}">${escapeHtml(statusLabel)}</span></td>
                <td>
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        <button class="btn-view" onclick="viewFeedback(${fb.id})">View</button>
                        <button class="btn-edit" onclick="updateFeedbackStatus(${fb.id}, 'resolved')">Mark Resolved</button>
                        <button class="btn-delete" onclick="updateFeedbackStatus(${fb.id}, 'deleted')">Delete</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function viewFeedback(feedbackId) {
    const feedback = allFeedback.find(f => f.id === feedbackId);
    if (!feedback) return;
    currentFeedbackId = feedbackId;

    const modal = document.getElementById('feedbackModal');
    const content = document.getElementById('feedbackDetailsContent');
    if (modal && content) {
        content.innerHTML = `
            <p><strong>Name:</strong> ${escapeHtml(feedback.name)}</p>
            <p><strong>Email:</strong> ${escapeHtml(feedback.email || '')}</p>
            <p><strong>Phone:</strong> ${escapeHtml(feedback.phone || '')}</p>
            <p><strong>Subject:</strong> ${escapeHtml(feedback.subject || '')}</p>
            <p><strong>Message:</strong><br>${escapeHtml(feedback.message)}</p>
        `;
        modal.style.display = 'block';
    } else {
        alert(`Feedback:\n\nName: ${feedback.name}\nEmail: ${feedback.email || ''}\nPhone: ${feedback.phone || ''}\n\nMessage:\n${feedback.message}`);
    }
}

function closeFeedbackModal() {
    const modal = document.getElementById('feedbackModal');
    if (modal) modal.style.display = 'none';
}

async function updateFeedbackStatus(feedbackId, status) {
    try {
        // Map explicit actions to API status values expected by server
        // Accepts 'hide' (resolved), 'show' (pending), 'deleted'
        let payloadStatus = status;
        if (status === 'resolved') payloadStatus = 'hide';
        if (status === 'pending') payloadStatus = 'show';

        // Try admin-protected endpoint first
        let response = await fetch(`/api/admin/feedback/${feedbackId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ status: payloadStatus })
        });

        // If not authorized, fall back to public dev endpoints where possible
        if (response.status === 401) {
            if (payloadStatus === 'deleted') {
                response = await fetch(`/api/feedback/${feedbackId}`, { method: 'DELETE' });
            } else if (payloadStatus === 'hide') {
                response = await fetch(`/api/feedback/${feedbackId}/resolve`, { method: 'POST' });
            } else if (payloadStatus === 'show') {
                // no public endpoint to un-hide — require admin
                // treat as unauthorized
                response = new Response(JSON.stringify({ error: 'Not authorized' }), { status: 401 });
            }
        }

        const data = await response.json();
        if (response.ok) {
            showAdminAlert(data.message || 'Feedback updated', 'success');
            await loadFeedback();
            closeFeedbackModal();
        } else {
            showAdminAlert(data.error || 'Failed to update feedback', 'error');
        }
    } catch (error) {
        console.error('Error updating feedback status:', error);
        showAdminAlert('Failed to update feedback', 'error');
    }
}

// Explicit action wrappers used by modal buttons
function markAsResolved() {
    if (!currentFeedbackId) return;
    updateFeedbackStatus(currentFeedbackId, 'resolved');
}

function markAsPending() {
    if (!currentFeedbackId) return;
    updateFeedbackStatus(currentFeedbackId, 'pending');
}

function searchFeedback() {
    const query = document.getElementById('searchFeedback').value.toLowerCase();
    const rows = document.querySelectorAll('#feedbackTable tr');
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(query) ? '' : 'none';
    });
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, function (s) {
        return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[s];
    });
}
