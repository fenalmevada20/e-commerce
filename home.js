// Home page specific JavaScript

// Load reviews on page load
document.addEventListener('DOMContentLoaded', function() {
    loadReviews();
});

// Load and display reviews
function loadReviews() {
    const reviewsContainer = document.getElementById('reviewsContainer');
    
    if (!reviewsContainer) return;
    
    // Display reviews
    reviewsContainer.innerHTML = reviewsData.map(review => `
        <div class="review-card">
            <div class="review-header">
                <div class="review-avatar">${review.name.charAt(0)}</div>
                <div class="review-info">
                    <h4>${review.name}</h4>
                    <div class="review-rating">${getStarRating(review.rating)}</div>
                </div>
            </div>
            <p class="review-text">${review.text}</p>
        </div>
    `).join('');
}

// Generate star rating HTML
function getStarRating(rating) {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= rating) {
            stars += '⭐';
        } else {
            stars += '☆';
        }
    }
    return stars;
}

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});