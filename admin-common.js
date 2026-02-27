(function() {
    // Common admin utilities
    window.showAdminAlert = function(message, type) {
        const alertBox = document.getElementById('adminAlert');
        if (!alertBox) return;
        alertBox.textContent = message;
        alertBox.className = `alert ${type}`;
        alertBox.style.display = 'block';
        setTimeout(() => alertBox.style.display = 'none', 3000);
    }
})();

// Mobile hamburger menu toggle
window.toggleAdminMenu = function() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.admin-overlay');
    
    if (sidebar && overlay) {
        sidebar.classList.toggle('show');
        overlay.classList.toggle('show');
    }
};

// Close menu when overlay is clicked
document.addEventListener('DOMContentLoaded', function() {
    const overlay = document.querySelector('.admin-overlay');
    if (overlay) {
        overlay.addEventListener('click', function() {
            const sidebar = document.querySelector('.sidebar');
            sidebar.classList.remove('show');
            overlay.classList.remove('show');
        });
    }
    
    // Close menu when nav item is clicked on mobile
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function() {
            if (window.innerWidth <= 768) {
                const sidebar = document.querySelector('.sidebar');
                const overlay = document.querySelector('.admin-overlay');
                sidebar.classList.remove('show');
                overlay.classList.remove('show');
            }
        });
    });
});

// Show alert message
function showAdminAlert(message, type = 'success') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `admin-alert alert-${type}`;
    alertDiv.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">×</button>
    `;
    alertDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 1rem;
        animation: slideIn 0.3s;
    `;
    
    if (type === 'success') {
        alertDiv.style.backgroundColor = '#d4edda';
        alertDiv.style.color = '#155724';
    } else if (type === 'error') {
        alertDiv.style.backgroundColor = '#f8d7da';
        alertDiv.style.color = '#721c24';
    } else if (type === 'info') {
        alertDiv.style.backgroundColor = '#d1ecf1';
        alertDiv.style.color = '#0c5460';
    }
    
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        alertDiv.remove();
    }, 3000);
}

// Check if admin is logged in
function isAdminLoggedIn() {
    try {
        const adminJson = localStorage.getItem('adminUser');
        return adminJson !== null;
    } catch (error) {
        return false;
    }
}

// Get current admin
function getCurrentAdmin() {
    try {
        const adminJson = localStorage.getItem('adminUser');
        return adminJson ? JSON.parse(adminJson) : null;
    } catch (error) {
        return null;
    }
}

// Set current admin
function setCurrentAdmin(admin) {
    try {
        localStorage.setItem('adminUser', JSON.stringify(admin));
    } catch (error) {
        console.error('Error saving admin:', error);
    }
}

// Admin logout
async function adminLogout() {
    if (confirm('Are you sure you want to logout?')) {
        try {
            await fetch('/api/admin/logout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        } catch (error) {
            console.error('Logout error:', error);
        }
        
        localStorage.removeItem('adminUser');
        window.location.href = '/admin/login';
    }
}

// Check admin authentication on page load
document.addEventListener('DOMContentLoaded', async function() {
    const currentPage = window.location.pathname;
    
    // Skip check for login page
    if (currentPage.includes('/admin/login')) {
        return;
    }
    
    // Check if we have admin in localStorage first
    const admin = getCurrentAdmin();
    if (!admin) {
        // No admin in localStorage, redirect to login
        window.location.href = '/admin/login';
        return;
    }
    
    // Update admin name in header immediately (don't wait for API)
    const adminNameEl = document.getElementById('adminName');
    if (adminNameEl) {
        adminNameEl.textContent = admin.username || 'Admin';
    }
    
    // Inject hamburger into the top header (visibility controlled via CSS media queries)
    (function ensureAdminHamburger() {
        const topHeader = document.querySelector('.top-header');
        const sidebar = document.querySelector('.sidebar');
        if (!topHeader) return;

        // Avoid injecting multiple times
        if (topHeader.querySelector('.admin-hamburger')) return;

        const btn = document.createElement('button');
        btn.className = 'admin-hamburger';
        btn.setAttribute('aria-label', 'Toggle menu');
        btn.innerHTML = '<span></span><span></span><span></span>';
        btn.style.cursor = 'pointer';
        topHeader.appendChild(btn);

        // Create an on-page debug box (visible on mobile) to show actions
        let debugBox = document.getElementById('adminDebugBox');
        if (!debugBox) {
            debugBox = document.createElement('div');
            debugBox.id = 'adminDebugBox';
            debugBox.style.cssText = 'position:fixed;right:12px;bottom:12px;z-index:11000;padding:8px 10px;background:rgba(0,0,0,0.6);color:#fff;font-size:12px;border-radius:6px;display:none;max-width:60%;word-break:break-word;';
            document.body.appendChild(debugBox);
        }

        function debug(msg) {
            if (!debugBox) return;
            debugBox.textContent = msg;
            debugBox.style.display = 'block';
            clearTimeout(debugBox._hideTimer);
            debugBox._hideTimer = setTimeout(() => { debugBox.style.display = 'none'; }, 2500);
        }

        if (sidebar) {
            // Only create one overlay
            let overlay = document.querySelector('.admin-overlay');
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.className = 'admin-overlay';
                document.body.appendChild(overlay);
            }

            function openSidebar() {
                try { document.body.classList.add('admin-panel-open'); } catch (e) {}
                sidebar.classList.add('show');
                overlay.classList.add('show');
                debug('Opening sidebar');

                // Force explicit inline styles so mobile browsers render the sidebar above overlay
                try {
                    sidebar.style.transform = 'translateX(0)';
                    sidebar.style.left = '0';
                    sidebar.style.display = 'block';
                    sidebar.style.visibility = 'visible';
                    sidebar.style.zIndex = '11001';
                    sidebar.style.outline = '3px solid rgba(13,110,253,0.18)';

                    overlay.style.display = 'block';
                    overlay.style.zIndex = '11000';
                } catch (err) {
                    console.warn('[admin-hamburger] openSidebar inline style failed', err);
                }
            }

            function closeSidebar() {
                try { document.body.classList.remove('admin-panel-open'); } catch (e) {}
                sidebar.classList.remove('show');
                overlay.classList.remove('show');
                debug('Closing sidebar');

                try {
                    sidebar.style.transform = 'translateX(-100%)';
                    sidebar.style.outline = '';
                    overlay.style.display = 'none';
                } catch (err) {
                    console.warn('[admin-hamburger] closeSidebar inline style failed', err);
                }
            }

            btn.addEventListener('click', function (e) {
                e.stopPropagation();

                const onDashboard = window.location.pathname && window.location.pathname.indexOf('/admin/dashboard') !== -1;

                if (!onDashboard) {
                    // If user isn't on dashboard, navigate there (opens admin panel)
                    window.location.href = '/admin/dashboard';
                    return;
                }

                // If already on dashboard, toggle sidebar like before
                try {
                    if (sidebar.classList.contains('show')) closeSidebar();
                    else {
                        openSidebar();
                        try {
                            // Force inline styles to ensure sidebar becomes visible on mobile
                            const prev = sidebar.getAttribute('style') || '';
                            sidebar.setAttribute('style', prev + ' transform: translateX(0) !important; left: 0 !important;');
                            if (typeof overlay !== 'undefined' && overlay && overlay.classList) {
                                overlay.classList.add('show');
                                overlay.style.display = 'block';
                            }
                        } catch (err2) {
                            console.warn('[admin-hamburger] force-style failed', err2);
                        }
                    }
                } catch (err) {
                    console.error('[admin-hamburger] toggle error', err);
                    // Fallback: navigate to dashboard root
                    window.location.href = '/admin/dashboard';
                }
            });

            overlay.addEventListener('click', closeSidebar);

            // Close when a sidebar link is clicked
            sidebar.addEventListener('click', function (e) {
                if (e.target && e.target.tagName === 'A') closeSidebar();
            });

            // Reset classes on resize to desktop
            window.addEventListener('resize', function () {
                if (window.innerWidth > 768) {
                    sidebar.classList.remove('show');
                    overlay.classList.remove('show');
                }
            });
        } else {
            // If no sidebar exists on this page, clicking should go to the dashboard (mobile UX)
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                window.location.href = '/admin/dashboard';
            });
        }
    })();
    
    // Verify session is still valid by checking API (in background, don't block page load)
    // Add a delay to prevent immediate redirect
    setTimeout(() => {
        fetch('/api/admin/dashboard/stats', {
            method: 'GET',
            credentials: 'include' // Include cookies for session
        })
            .then(response => {
                if (!response.ok && response.status === 401) {
                    // Only redirect if we get 401 (unauthorized), not for other errors
                    localStorage.removeItem('adminUser');
                    window.location.href = '/admin/login';
                }
            })
            .catch(error => {
                console.error('Auth check error:', error);
                // If API call fails, don't redirect - allow page to load
                // This handles cases where API might be temporarily unavailable
            });
    }, 2000); // Wait 2 seconds before checking session
});

// Format price
function formatPrice(price) {
    return `₹${parseFloat(price).toFixed(2)}`;
}

// Format date
function formatAdminDate(dateString) {
    const date = new Date(dateString);
    const options = { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return date.toLocaleDateString('en-IN', options);
}

// Get all products
function getAllProducts() {
    if (!window.productsData) {
        window.productsData = [
            {
                id: 1,
                name: "Custom T-Shirt",
                category: "tshirt",
                price: 299,
                image: "images/tshirt.jpg",
                description: "High quality cotton t-shirt with custom printing",
                status: "active"
            },
            {
                id: 2,
                name: "Printed Mug",
                category: "mug",
                price: 199,
                image: "images/mug.jpg",
                description: "Ceramic mug with vibrant custom designs",
                status: "active"
            },
            {
                id: 3,
                name: "Custom Keychain",
                category: "keychain",
                price: 99,
                image: "images/keychain.jpg",
                description: "Durable keychain with personalized design",
                status: "active"
            },
            {
                id: 4,
                name: "Pillow Cover",
                category: "pillow",
                price: 249,
                image: "images/pillow.jpg",
                description: "Soft pillow cover with custom prints",
                status: "active"
            },
            {
                id: 5,
                name: "Mobile Cover",
                category: "mobile",
                price: 149,
                image: "images/mobile.jpg",
                description: "Protective mobile cover with custom design",
                status: "active"
            }
        ];
    }
    return window.productsData;
}

// Get all orders
function getAllOrders() {
    return window.ordersData || [];
}

// Get all customers
function getAllCustomers() {
    return window.registeredUsers || [];
}

// Get all feedback
function getAllFeedback() {
    return window.feedbackData || [];
}

// Get categories
function getCategories() {
    if (!window.categoriesData) {
        window.categoriesData = [
            {
                id: 1,
                name: "T-Shirts",
                slug: "tshirt",
                image: "images/tshirt.jpg",
                description: "Custom printed t-shirts"
            },
            {
                id: 2,
                name: "Mugs",
                slug: "mug",
                image: "images/mug.jpg",
                description: "Personalized mugs"
            },
            {
                id: 3,
                name: "Keychains",
                slug: "keychain",
                image: "images/keychain.jpg",
                description: "Custom keychains"
            },
            {
                id: 4,
                name: "Pillow Covers",
                slug: "pillow",
                image: "images/pillow.jpg",
                description: "Printed pillow covers"
            },
            {
                id: 5,
                name: "Mobile Covers",
                slug: "mobile",
                image: "images/mobile.jpg",
                description: "Custom mobile covers"
            }
        ];
    }
    return window.categoriesData;
}

// Default admin credentials
if (!window.adminCredentials) {
    window.adminCredentials = {
        username: "admin",
        password: "admin123"
    };
}

// Mobile Hamburger Menu - SIMPLE & DIRECT
console.log('=== Admin Menu Script Loaded ===');

// Global toggle function
