let allReviews = [];
let filteredReviews = [];
let currentReviewPage = 1;
const reviewsPerPage = 5;

async function loadReviews() {
    try {
        const response = await fetch('/api/admin/reviews');
        const data = await response.json();

        if (response.ok) {
            allReviews = data.reviews || [];
            filteredReviews = allReviews;
            currentReviewPage = 1;
            updateStats();
            displayReviewPage(currentReviewPage);
            updateReviewPaginationButtons(allReviews.length);
        } else {
            showAlert(data.error || 'Failed to load reviews', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('Error loading reviews', 'error');
    }
}

function updateReviewPaginationButtons(totalReviews) {
    const totalPages = Math.ceil(totalReviews / reviewsPerPage);
    const paginationDiv = document.getElementById('reviewPaginationControls');
    
    if (!paginationDiv) return;
    
    paginationDiv.style.display = 'flex';
    
    const prevBtn = document.getElementById('reviewPrevBtn');
    const nextBtn = document.getElementById('reviewNextBtn');
    const pageInfo = document.getElementById('reviewPageInfo');
    
    if (prevBtn) prevBtn.disabled = currentReviewPage === 1;
    if (nextBtn) nextBtn.disabled = currentReviewPage === totalPages;
    if (pageInfo) pageInfo.textContent = `Page ${currentReviewPage} of ${totalPages}`;
}

function reviewPreviousPage() {
    if (currentReviewPage > 1) {
        currentReviewPage--;
        displayReviewPage(currentReviewPage);
        updateReviewPaginationButtons(filteredReviews.length);
    }
}

function reviewNextPage() {
    const totalPages = Math.ceil(filteredReviews.length / reviewsPerPage);
    if (currentReviewPage < totalPages) {
        currentReviewPage++;
        displayReviewPage(currentReviewPage);
        updateReviewPaginationButtons(filteredReviews.length);
    }
}

function updateStats() {
    const pending = allReviews.filter(r => r.status === 'pending').length;
    const approved = allReviews.filter(r => r.status === 'approved').length;
    const rejected = allReviews.filter(r => r.status === 'rejected').length;

    document.getElementById('pendingCount').textContent = pending;
    document.getElementById('approvedCount').textContent = approved;
    document.getElementById('rejectedCount').textContent = rejected;
    document.getElementById('totalCount').textContent = allReviews.length;
}

function filterReviews(status) {
    const filtered = status ? allReviews.filter(r => r.status === status) : allReviews;
    
    filteredReviews = filtered;
    currentReviewPage = 1;
    displayReviewPage(currentReviewPage);
    updateReviewPaginationButtons(filtered.length);
    
    // Update active button
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
}

function displayReviewPage(page) {
    const container = document.getElementById('reviewsContainer');
    if (!container || !filteredReviews) return;

    const startIdx = (page - 1) * reviewsPerPage;
    const endIdx = startIdx + reviewsPerPage;
    const pageReviews = filteredReviews.slice(startIdx, endIdx);
    
    if (pageReviews.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 2rem; color: #999;">No reviews found</div>';
        return;
    }

    container.innerHTML = pageReviews.map(review => `
        <div class="review-card">
            <div class="review-header">
                <div>
                    <div class="customer-info">${review.customer_name || 'Anonymous'}</div>
                    <div class="rating">${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</div>
                </div>
                <div class="review-status status-${review.status}">${review.status.toUpperCase()}</div>
            </div>
            <div class="review-text"><strong>${review.product_name}</strong></div>
            <div class="review-text">${review.review_text}</div>
            <div class="action-buttons">
                <button class="btn-approve" onclick="approveReview(${review.id})">Approve</button>
                <button class="btn-reject" onclick="rejectReview(${review.id})">Reject</button>
                <button class="btn-delete" onclick="deleteReview(${review.id})">Delete</button>
            </div>
        </div>
    `).join('');
}

async function approveReview(reviewId) {
    try {
        const response = await fetch(`/api/admin/reviews/${reviewId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'approved' })
        });

        if (response.ok) {
            showAlert('Review approved', 'success');
            loadReviews();
        } else {
            showAlert('Failed to approve review', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('Error approving review', 'error');
    }
}

async function rejectReview(reviewId) {
    try {
        const response = await fetch(`/api/admin/reviews/${reviewId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'rejected' })
        });

        if (response.ok) {
            showAlert('Review rejected', 'success');
            loadReviews();
        } else {
            showAlert('Failed to reject review', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('Error rejecting review', 'error');
    }
}

async function deleteReview(reviewId) {
    if (!confirm('Are you sure you want to delete this review?')) return;

    try {
        const response = await fetch(`/api/admin/reviews/${reviewId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        });

        if (response.ok) {
            showAlert('Review deleted', 'success');
            loadReviews();
        } else {
            showAlert('Failed to delete review', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('Error deleting review', 'error');
    }
}

function openReviewModal(review) {
    const modal = document.getElementById('reviewDetailsModal');
    const content = document.getElementById('reviewDetailContent');
    
    content.innerHTML = `
        <div class="review-detail-item">
            <div class="review-detail-label">Customer</div>
            <div class="review-detail-value">${review.customer_name || 'Anonymous'}</div>
        </div>
        <div class="review-detail-item">
            <div class="review-detail-label">Product</div>
            <div class="review-detail-value">${review.product_name}</div>
        </div>
        <div class="review-detail-item">
            <div class="review-detail-label">Rating</div>
            <div class="review-detail-value">${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</div>
        </div>
        <div class="review-detail-item">
            <div class="review-detail-label">Review</div>
            <div class="review-detail-value">${review.review_text}</div>
        </div>
        <div class="review-detail-item">
            <div class="review-detail-label">Status</div>
            <div class="review-detail-value">${review.status}</div>
        </div>
    `;
    
    modal.classList.add('show');
}

function closeReviewModal() {
    const modal = document.getElementById('reviewDetailsModal');
    modal.classList.remove('show');
}

document.addEventListener('DOMContentLoaded', loadReviews);
