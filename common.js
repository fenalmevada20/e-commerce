// Common functions used across all pages

// Update cart count in header
function updateCartCount() {
    const cart = getCart();
    const cartCount = document.querySelector('.cart-count');
    if (cartCount) {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        cartCount.textContent = totalItems;
    }
}

// Get cart from localStorage
function getCart() {
    try {
        const cartJson = localStorage.getItem('cartData');
        return cartJson ? JSON.parse(cartJson) : [];
    } catch (error) {
        console.error('Error loading cart:', error);
        return [];
    }
}

// Save cart to localStorage
function saveCart(cart) {
    try {
        localStorage.setItem('cartData', JSON.stringify(cart));
        updateCartCount();
    } catch (error) {
        console.error('Error saving cart:', error);
    }
}

// Check if user is logged in
function isLoggedIn() {
    try {
        const userJson = localStorage.getItem('currentUser');
        return userJson !== null;
    } catch (error) {
        return false;
    }
}

// Get current user
function getCurrentUser() {
    try {
        const userJson = localStorage.getItem('currentUser');
        return userJson ? JSON.parse(userJson) : null;
    } catch (error) {
        return null;
    }
}

// Set current user
function setCurrentUser(user) {
    try {
        localStorage.setItem('currentUser', JSON.stringify(user));
    } catch (error) {
        console.error('Error saving user:', error);
    }
}

// Logout user
async function logoutUser() {
    try {
        await fetch('/api/customer/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
    } catch (error) {
        console.error('Logout error:', error);
    }
    
    localStorage.removeItem('currentUser');
    window.location.href = '/';
}

// Show alert message
function showAlert(message, type = 'success') {
    // Remove any existing alerts first
    const existingAlerts = document.querySelectorAll('.alert-message');
    existingAlerts.forEach(alert => alert.remove());
    
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert-message alert-${type}`;
    alertDiv.textContent = message;
    
    // Style the alert
    alertDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        max-width: 400px;
        word-wrap: break-word;
        transform: translateX(400px);
        transition: transform 0.3s ease;
    `;
    
    // Trigger animation
    setTimeout(() => {
        alertDiv.style.transform = 'translateX(0)';
    }, 10);
    
    if (type === 'success') {
        alertDiv.style.backgroundColor = '#d4edda';
        alertDiv.style.color = '#155724';
        alertDiv.style.border = '1px solid #c3e6cb';
    } else if (type === 'error') {
        alertDiv.style.backgroundColor = '#f8d7da';
        alertDiv.style.color = '#721c24';
        alertDiv.style.border = '1px solid #f5c6cb';
    } else if (type === 'info') {
        alertDiv.style.backgroundColor = '#d1ecf1';
        alertDiv.style.color = '#0c5460';
        alertDiv.style.border = '1px solid #bee5eb';
    }
    
    // Add to body
    document.body.appendChild(alertDiv);
    
    // Remove after 5 seconds
    setTimeout(() => {
        alertDiv.style.transform = 'translateX(400px)';
        setTimeout(() => {
            alertDiv.remove();
        }, 300);
    }, 5000);
}

// Format price
function formatPrice(price) {
    return `₹${parseFloat(price).toFixed(2)}`;
}

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    updateCartCount();

    // Check if user is logged in and update header
    // Don't modify header on admin pages (admin uses same header file)
    const path = window.location.pathname || '/';
    if (path.startsWith('/admin')) {
        return; // leave admin pages untouched so admin login works
    }

    const user = getCurrentUser();
    const loginBtn = document.querySelector('.btn-login');

    if (user && loginBtn) {
        loginBtn.textContent = user.name.split(' ')[0];
        loginBtn.href = '#';
        loginBtn.onclick = function(e) {
            e.preventDefault();
            if (confirm('Do you want to logout?')) {
                logoutUser();
            }
        };
    }

    // Mobile-only: inject hamburger at top-left and toggle nav
    if (window.innerWidth <= 768) {
        const headerContainer = document.querySelector('.header .container');
        if (headerContainer) {
            const nav = headerContainer.querySelector('.navbar');
            if (nav && !headerContainer.querySelector('.hamburger')) {
                const btn = document.createElement('button');
                btn.className = 'hamburger';
                btn.type = 'button';
                btn.setAttribute('aria-label', 'Toggle menu');
                btn.setAttribute('aria-expanded', 'false');
                btn.innerHTML = '<span></span><span></span><span></span>';
                headerContainer.insertBefore(btn, headerContainer.firstChild);

                btn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    const isShown = nav.classList.toggle('show');
                    btn.setAttribute('aria-expanded', String(isShown));
                });

                // Close nav when clicking a link
                nav.querySelectorAll('a').forEach(a => {
                    a.addEventListener('click', () => nav.classList.remove('show'));
                });

                // Close nav when tapping outside
                document.addEventListener('click', (ev) => {
                    if (!headerContainer.contains(ev.target)) {
                        nav.classList.remove('show');
                        btn.setAttribute('aria-expanded', 'false');
                    }
                });
            }
        }
    }

    // Add color change effect to all form submit buttons
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
            const originalColor = window.getComputedStyle(submitBtn).backgroundColor;
            const originalText = submitBtn.textContent;
            form.addEventListener('submit', function(e) {
                submitBtn.style.backgroundColor = '#f39c12';
                submitBtn.style.color = 'white';
                submitBtn.textContent = 'Processing...';
                submitBtn.disabled = true;
            });
        }
    });

    // Add success/error feedback to fetch responses
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
        const promise = originalFetch.apply(this, args);
        return promise.then(response => {
            const activeForm = document.querySelector('form');
            if (activeForm) {
                const submitBtn = activeForm.querySelector('button[type="submit"]');
                if (submitBtn && submitBtn.disabled) {
                    if (response.ok) {
                        submitBtn.style.backgroundColor = '#27ae60';
                        submitBtn.textContent = '✓ Success!';
                        submitBtn.style.color = 'white';
                        setTimeout(() => {
                            submitBtn.style.backgroundColor = '';
                            submitBtn.textContent = submitBtn.getAttribute('data-original-text') || 'Submit';
                            submitBtn.disabled = false;
                        }, 2000);
                    } else {
                        submitBtn.style.backgroundColor = '#e74c3c';
                        submitBtn.textContent = '✗ Failed!';
                        submitBtn.style.color = 'white';
                        setTimeout(() => {
                            submitBtn.style.backgroundColor = '';
                            submitBtn.textContent = submitBtn.getAttribute('data-original-text') || 'Submit';
                            submitBtn.disabled = false;
                        }, 2000);
                    }
                }
            }
            return response;
        }).catch(error => {
            const activeForm = document.querySelector('form');
            if (activeForm) {
                const submitBtn = activeForm.querySelector('button[type="submit"]');
                if (submitBtn && submitBtn.disabled) {
                    submitBtn.style.backgroundColor = '#e74c3c';
                    submitBtn.textContent = '✗ Error!';
                    submitBtn.style.color = 'white';
                    setTimeout(() => {
                        submitBtn.style.backgroundColor = '';
                        submitBtn.textContent = submitBtn.getAttribute('data-original-text') || 'Submit';
                        submitBtn.disabled = false;
                    }, 2000);
                }
            }
            throw error;
        });
    };
});


// Sample reviews data
const reviewsData = [
    {
        id: 1,
        name: "Rahul Sharma",
        rating: 5,
        text: "Amazing quality! The print on my t-shirt is excellent and delivery was quick.",
        date: "2024-01-15"
    },
    {
        id: 2,
        name: "Priya Patel",
        rating: 5,
        text: "Very satisfied with the mug quality. Great service and affordable prices!",
        date: "2024-01-10"
    },
    {
        id: 3,
        name: "Amit Kumar",
        rating: 4,
        text: "Good products and fast delivery. Will definitely order again.",
        date: "2024-01-05"
    }
];

// Get product by ID
function getProductById(id) {
    return productsData.find(product => product.id === parseInt(id));
}

// Get products by category
function getProductsByCategory(category) {
    if (category === 'all') {
        return productsData;
    }
    return productsData.filter(product => product.category === category);
}

// Search products
function searchProductsByName(query) {
    return productsData.filter(product => 
        product.name.toLowerCase().includes(query.toLowerCase())
    );
}

/* Merged form submit color-change and fetch-feedback logic into the main DOMContentLoaded handler above. */