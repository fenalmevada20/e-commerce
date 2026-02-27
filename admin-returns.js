// Returns Management Module
let currentFilter = 'all';
let allReturns = [];
let filteredReturns = [];
let currentReturnPage = 1;
const returnsPerPage = 5;

// Initialize returns section on page load
document.addEventListener('DOMContentLoaded', function() {
    loadReturns();
});

// Set active nav item
function setActiveNav(element) {
    event.preventDefault();
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    element.classList.add('active');
}

// Load returns from API
async function loadReturns() {
    try {
        const url = currentFilter === 'all' 
            ? '/api/admin/returns'
            : `/api/admin/returns?status=${currentFilter}`;

        const response = await fetch(url, {
            credentials: 'include'
        });

        if (response.status === 401) {
            window.location.href = '/admin/login';
            return;
        }

        const data = await response.json();
        allReturns = data.returns || [];
        filteredReturns = allReturns;
        currentReturnPage = 1;

        if (allReturns.length === 0) {
            document.getElementById('returnsGrid').innerHTML = '';
            document.getElementById('noReturns').style.display = 'block';
            updateReturnPaginationButtons(0);
            return;
        }

        document.getElementById('noReturns').style.display = 'none';
        displayReturnPage(currentReturnPage);
        updateReturnPaginationButtons(allReturns.length);
    } catch (error) {
        console.error('Error loading returns:', error);
        showAlert('Error loading returns', 'error');
    }
}

// Display returns in the grid
function displayReturns() {
    filteredReturns = allReturns;
    currentReturnPage = 1;
    displayReturnPage(currentReturnPage);
    updateReturnPaginationButtons(allReturns.length);
}

function displayReturnPage(page) {
    const returnsGrid = document.getElementById('returnsGrid');
    if (!returnsGrid || !filteredReturns) return;

    const startIdx = (page - 1) * returnsPerPage;
    const endIdx = startIdx + returnsPerPage;
    const pageReturns = filteredReturns.slice(startIdx, endIdx);

    if (pageReturns.length === 0) {
        returnsGrid.innerHTML = '';
        return;
    }
    
    const returnsHTML = pageReturns.map(ret => `
        <div class="return-card ${ret.status}">
            <div class="return-header">
                <div>
                    <h3 style="margin: 0 0 0.5rem 0; color: #2c3e50;">Order #${ret.order_id}</h3>
                    <p style="margin: 0; color: #999; font-size: 0.9rem;">Return ID: #${ret.id} | Customer ID: ${ret.customer_id}</p>
                </div>
                <div>
                    <span class="status-badge status-${ret.status}">${ret.status}</span>
                </div>
            </div>

            <div class="return-info">
                <div class="info-item">
                    <div class="info-label">📋 Request Type</div>
                    <div class="info-value">${ret.return_type === 'return' ? '💰 Refund' : '🔄 Exchange'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">📅 Submitted</div>
                    <div class="info-value">${new Date(ret.created_at).toLocaleDateString()}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">⏱️ Status</div>
                    <div class="info-value">${ret.status.charAt(0).toUpperCase() + ret.status.slice(1)}</div>
                </div>
            </div>

            <div class="reason-section">
                <div class="reason-label">📝 Customer Reason</div>
                <div class="reason-text">${ret.reason}</div>
            </div>

            ${ret.media_list && ret.media_list.length > 0 ? `
                <div class="media-section">
                    <div class="media-label">📁 Uploaded Files (${ret.media_list.length})</div>
                    <div class="media-gallery">
                        ${ret.media_list.map(media => `
                            <div class="media-item ${media.type}">
                                ${media.type === 'image' ? `
                                    <img src="${media.url}" alt="Uploaded Image" onerror="this.src='/static/img/placeholder.jpg'" class="media-thumbnail">
                                    <div class="media-info">
                                        <span class="media-type">📸 Image</span>
                                        <a href="${media.url}" download class="download-btn">⬇️</a>
                                    </div>
                                ` : `
                                    <div class="video-thumbnail">
                                        <video width="200" class="media-thumbnail">
                                            <source src="${media.url}" type="video/mp4">
                                        </video>
                                        <div class="play-icon">▶️</div>
                                    </div>
                                    <div class="media-info">
                                        <span class="media-type">🎥 Video</span>
                                        <a href="${media.url}" download class="download-btn">⬇️</a>
                                    </div>
                                `}
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}

            ${ret.image_filenames && !ret.media_list ? `
                <div class="media-section">
                    <div class="media-label">📸 Uploaded Images</div>
                    <div class="image-gallery">
                        ${ret.image_filenames.split(',').map(filename => `
                            <div class="image-item">
                                <img src="/static/uploads/returns/${filename.trim()}" alt="Customer Image" onerror="this.src='/static/img/placeholder.jpg'">
                                <a href="/static/uploads/returns/${filename.trim()}" download class="download-btn">⬇️ Download</a>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}

            ${ret.video_filename && !ret.media_list ? `
                <div class="media-section">
                    <div class="media-label">🎥 Uploaded Video</div>
                    <div class="video-container">
                        <video width="400" controls style="max-width: 100%; border-radius: 8px;">
                            <source src="/static/uploads/returns/${ret.video_filename}" type="video/mp4">
                            Your browser does not support the video tag.
                        </video>
                        <a href="/static/uploads/returns/${ret.video_filename}" download class="download-btn">⬇️ Download Video</a>
                    </div>
                </div>
            ` : ''}

            ${ret.admin_notes ? `
                <div class="admin-notes">
                    <div class="admin-notes-header">📌 Your Notes</div>
                    <div class="admin-notes-text">${ret.admin_notes}</div>
                </div>
            ` : ''}

            ${ret.status === 'pending' || ret.status === 'approved' ? `
                <div class="action-section">
                    <form onsubmit="handleReturnAction(event, ${ret.id})">
                        <div class="form-group">
                            <label>Action</label>
                            <select name="status" required onchange="updateActionPlaceholder(this)">
                                <option value="">Select Action...</option>
                                ${ret.status === 'pending' ? `
                                    <option value="approved">✅ Approve Return</option>
                                    <option value="rejected">❌ Reject Return</option>
                                ` : ''}
                                ${ret.status === 'approved' ? `
                                    <option value="completed">🎉 Mark as Completed</option>
                                ` : ''}
                            </select>
                        </div>

                        <div class="form-group">
                            <label>Notes for Customer</label>
                            <textarea name="notes" placeholder="Add instructions or feedback..."></textarea>
                        </div>

                        <div class="action-buttons">
                            <button type="submit" class="btn-${ret.status === 'pending' ? 'approve' : 'complete'}">
                                ${ret.status === 'pending' ? '✅ Process' : '🎉 Complete'}
                            </button>
                        </div>
                    </form>
                </div>
            ` : ''}
        </div>
    `).join('');

    returnsGrid.innerHTML = returnsHTML;
}

// Pagination functions for returns
function updateReturnPaginationButtons(totalReturns) {
    const totalPages = Math.ceil(totalReturns / returnsPerPage);
    const paginationDiv = document.getElementById('returnPaginationControls');
    
    if (!paginationDiv) return;
    
    paginationDiv.style.display = 'flex';
    
    const prevBtn = document.getElementById('returnPrevBtn');
    const nextBtn = document.getElementById('returnNextBtn');
    const pageInfo = document.getElementById('returnPageInfo');
    
    if (prevBtn) prevBtn.disabled = currentReturnPage === 1;
    if (nextBtn) nextBtn.disabled = currentReturnPage === totalPages;
    if (pageInfo) pageInfo.textContent = `Page ${currentReturnPage} of ${totalPages}`;
}

function returnPreviousPage() {
    if (currentReturnPage > 1) {
        currentReturnPage--;
        displayReturnPage(currentReturnPage);
        updateReturnPaginationButtons(filteredReturns.length);
    }
}

function returnNextPage() {
    const totalPages = Math.ceil(filteredReturns.length / returnsPerPage);
    if (currentReturnPage < totalPages) {
        currentReturnPage++;
        displayReturnPage(currentReturnPage);
        updateReturnPaginationButtons(filteredReturns.length);
    }
}

// Update placeholder text based on selected action
function updateActionPlaceholder(select) {
    const form = select.closest('form');
    const notesField = form.querySelector('textarea[name="notes"]');
    
    if (select.value === 'approved') {
        notesField.placeholder = 'E.g., "Return label sent. Please send item to..."\n\nOr: "Replacement shipped with tracking..."';
    } else if (select.value === 'rejected') {
        notesField.placeholder = 'E.g., "Return not eligible due to..."\n\nOr: "Policy does not cover this..."';
    } else if (select.value === 'completed') {
        notesField.placeholder = 'E.g., "Refund processed. Amount: ₹1,500"\n\nOr: "Exchange completed. Replacement delivered"';
    }
}

// Handle return action (approve/reject/complete)
async function handleReturnAction(event, returnId) {
    event.preventDefault();

    const form = event.target;
    const status = form.querySelector('select[name="status"]').value;
    const notes = form.querySelector('textarea[name="notes"]').value.trim();

    if (!status) {
        showAlert('Please select an action', 'error');
        return;
    }

    try {
        const response = await fetch(`/api/admin/returns/${returnId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                status: status,
                admin_notes: notes || ''
            })
        });

        const data = await response.json();

        if (response.ok) {
            showAlert('Return updated successfully!', 'success');
            loadReturns();
        } else {
            showAlert(data.error || 'Error updating return', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('Error updating return', 'error');
    }
}

// Filter returns by status
function filterReturns(status) {
    currentFilter = status;
    
    // Update active button
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');

    loadReturns();
}
