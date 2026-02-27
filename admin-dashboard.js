// Admin dashboard

// Admin dashboard

console.log('admin-dashboard.js loaded');
document.addEventListener('DOMContentLoaded', async function() {
    await loadDashboardStats();
    await loadRecentOrders();
    await loadRecentCustomers();
    await loadRecentReviews();
});

// Load dashboard statistics
async function loadDashboardStats() {
    try {
        const response = await fetch('/api/admin/dashboard/stats', {
            method: 'GET',
            credentials: 'include' // Include cookies for session
        });
        const data = await response.json();
        
        if (response.ok) {
            document.getElementById('totalProducts').textContent = data.total_products || 0;
            document.getElementById('totalOrders').textContent = data.total_orders || 0;
            document.getElementById('totalCustomers').textContent = data.total_customers || 0;
            document.getElementById('totalRevenue').textContent = formatPrice(data.total_revenue || 0);
        } else {
            showAdminAlert('Failed to load dashboard stats', 'error');
        }
    } catch (error) {
        console.error('Error loading stats:', error);
        showAdminAlert('Failed to load dashboard stats', 'error');
    }

    // Load returns statistics
    try {
        const returnsResponse = await fetch('/api/admin/returns', {
            method: 'GET',
            credentials: 'include'
        });
        const returnsData = await returnsResponse.json();
        
        if (returnsResponse.ok) {
            const allReturns = returnsData.returns || [];
            const pendingReturns = allReturns.filter(r => r.status === 'pending').length;
            
            document.getElementById('totalReturns').textContent = allReturns.length || 0;
            document.getElementById('pendingReturns').textContent = pendingReturns || 0;
        }
    } catch (error) {
        console.error('Error loading returns stats:', error);
    }
}

// Load recent orders
async function loadRecentOrders() {
    try {
        const response = await fetch('/api/admin/orders', {
            method: 'GET',
            credentials: 'include' // Include cookies for session
        });
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to load orders');
        }
        
        const orders = data.orders || [];
        const recentOrders = orders.slice(0, 5);
        const tableBody = document.getElementById('recentOrdersTable');
        
        if (recentOrders.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No orders found</td></tr>';
            return;
        }

        tableBody.innerHTML = recentOrders.map(order => {
            const orderDate = order.created_at ? new Date(order.created_at).toLocaleDateString() : 'N/A';
            return `
                <tr>
                    <td>#${order.id}</td>
                    <td>${order.customer_name || 'Unknown'}</td>
                    <td>${orderDate}</td>
                    <td>${formatPrice(order.total_price || 0)}</td>
                    <td><span class="status-badge status-${order.status.toLowerCase()}">${order.status}</span></td>
                    <td>
                        <button class="btn-view" onclick="window.location.href='/admin/orders'">View</button>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading orders:', error);
        const tableBody = document.getElementById('recentOrdersTable');
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Error loading orders</td></tr>';
    }
}

// Load recent customers
async function loadRecentCustomers() {
    try {
        const response = await fetch('/api/admin/customers', {
            method: 'GET',
            credentials: 'include' // Include cookies for session
        });
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to load customers');
        }
        
        const customers = data.customers || [];
        const recentCustomers = customers.slice(0, 5);
        const tableBody = document.getElementById('recentCustomersTable');
        
        if (recentCustomers.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No customers found</td></tr>';
            return;
        }
        
        tableBody.innerHTML = recentCustomers.map(customer => {
            const createdDate = customer.created_at ? new Date(customer.created_at).toLocaleDateString() : 'N/A';
            return `
                <tr>
                    <td>#${customer.id}</td>
                    <td>${customer.name}</td>
                    <td>${customer.email}</td>
                    <td>${customer.phone}</td>
                    <td>${createdDate}</td>
                </tr>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading customers:', error);
        const tableBody = document.getElementById('recentCustomersTable');
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Error loading customers</td></tr>';
    }
}

// Load recent reviews
async function loadRecentReviews() {
    try {
        const response = await fetch('/api/admin/reviews', {
            method: 'GET',
            credentials: 'include'
        });
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to load reviews');
        }
        
        const reviews = data.reviews || [];
        
        // Calculate stats
        const pendingCount = reviews.filter(r => r.status === 'pending').length;
        const approvedCount = reviews.filter(r => r.status === 'approved').length;
        const rejectedCount = reviews.filter(r => r.status === 'rejected').length;
        const totalCount = reviews.length;
        
        document.getElementById('pendingReviewCount').textContent = pendingCount;
        document.getElementById('approvedReviewCount').textContent = approvedCount;
        document.getElementById('rejectedReviewCount').textContent = rejectedCount;
        document.getElementById('totalReviewCount').textContent = totalCount;
        
        // Display recent reviews (limit to 5)
        const recentReviews = reviews.slice(0, 5);
        const container = document.getElementById('recentReviewsContainer');
        
        if (recentReviews.length === 0) {
            container.innerHTML = '<div style="text-align: center; padding: 2rem; color: #999;">No reviews yet</div>';
            return;
        }
        
        container.innerHTML = recentReviews.map(review => `
            <div style="background: white; border: 1px solid #ddd; border-radius: 8px; padding: 1rem; display: flex; justify-content: space-between; align-items: start;">
                <div style="flex: 1;">
                    <div style="font-weight: 600; color: #333; margin-bottom: 0.5rem;">
                        ${review.product_name || 'Unknown Product'} - ${review.customer_name || 'Anonymous'}
                    </div>
                    <div style="color: #ffc107; margin-bottom: 0.5rem; font-size: 16px; letter-spacing: 1px;">
                        ${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)} (${review.rating}/5)
                    </div>
                    <div style="color: #555; font-size: 14px; margin-bottom: 0.5rem;">
                        ${review.review_text ? review.review_text.substring(0, 100) + (review.review_text.length > 100 ? '...' : '') : '<span style="color: #999;">No text</span>'}
                    </div>
                    <div style="color: #999; font-size: 12px;">
                        ${new Date(review.created_at).toLocaleDateString()}
                    </div>
                </div>
                <div style="margin-left: 1rem; text-align: right;">
                    <span style="display: inline-block; padding: 0.25rem 0.75rem; border-radius: 15px; font-size: 11px; font-weight: 600;
                        ${review.status === 'pending' ? 'background: #fff3cd; color: #856404;' : ''}
                        ${review.status === 'approved' ? 'background: #d4edda; color: #155724;' : ''}
                        ${review.status === 'rejected' ? 'background: #f8d7da; color: #721c24;' : ''}
                    ">
                        ${review.status.toUpperCase()}
                    </span>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading reviews:', error);
        const container = document.getElementById('recentReviewsContainer');
        container.innerHTML = '<div style="text-align: center; padding: 2rem; color: #999;">Error loading reviews</div>';
    }
}

// Fallback: if dashboard tables still show "Loading...", replace with a helpful message and log
setTimeout(function() {
    try {
        var recent = document.getElementById('recentOrdersTable');
        if (recent && recent.textContent.includes('Loading')) {
            recent.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#777">Failed to load orders. Open console for errors.</td></tr>';
            console.warn('Recent orders did not load — check admin JS console for errors.');
        }
        var recentCust = document.getElementById('recentCustomersTable');
        if (recentCust && recentCust.textContent.includes('Loading')) {
            recentCust.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#777">Failed to load customers. Open console for errors.</td></tr>';
            console.warn('Recent customers did not load — check admin JS console for errors.');
        }
        var totalOrders = document.getElementById('totalOrders');
        if (totalOrders && totalOrders.textContent === 'Loading...') {
            totalOrders.textContent = '0';
            console.warn('Total orders widget did not load.');
        }
        var totalRevenue = document.getElementById('totalRevenue');
        if (totalRevenue && totalRevenue.textContent === 'Loading...') {
            totalRevenue.textContent = '₹0';
            console.warn('Total revenue widget did not load.');
        }
        var totalCustomers = document.getElementById('totalCustomers');
        if (totalCustomers && totalCustomers.textContent === 'Loading...') {
            totalCustomers.textContent = '0';
            console.warn('Total customers widget did not load.');
        }
    } catch (e) {
        console.error('Dashboard fallback error:', e);
    }
}, 3000);