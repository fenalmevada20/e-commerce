// Admin Reports JavaScript

document.addEventListener('DOMContentLoaded', async function() {
    await loadReports();
});

// Load reports data
async function loadReports() {
    try {
        // Load dashboard stats for reports
        const statsResponse = await fetch('/api/admin/dashboard/stats', {
            method: 'GET',
            credentials: 'include'
        });
        const statsData = await statsResponse.json();
        
        if (statsResponse.ok) {
            displayStats(statsData);
        }
        
        // Load orders for detailed stats
        const ordersResponse = await fetch('/api/admin/orders', {
            method: 'GET',
            credentials: 'include'
        });
        const ordersData = await ordersResponse.json();
        
        if (ordersResponse.ok && ordersData.orders) {
            displayOrderStats(ordersData.orders);
        }
        
        // Load products for product stats
        const productsResponse = await fetch('/api/products', {
            method: 'GET',
            credentials: 'include'
        });
        const productsData = await productsResponse.json();
        
        if (productsResponse.ok && productsData.products) {
            displayProductStats(productsData.products);
        }
        
        // Load categories
        const categoriesResponse = await fetch('/api/admin/categories', {
            method: 'GET',
            credentials: 'include'
        });
        const categoriesData = await categoriesResponse.json();
        
        if (categoriesResponse.ok && categoriesData.categories) {
            const categoriesCount = document.getElementById('reportCategories');
            if (categoriesCount) {
                categoriesCount.textContent = categoriesData.categories.length;
            }
        }
        
        // Load customers for customer stats
        const customersResponse = await fetch('/api/admin/customers', {
            method: 'GET',
            credentials: 'include'
        });
        const customersData = await customersResponse.json();
        
        if (customersResponse.ok && customersData.customers) {
            displayCustomerStats(customersData.customers);
        }
        
        // Load feedback for feedback stats
        const feedbackResponse = await fetch('/api/admin/feedback', {
            method: 'GET',
            credentials: 'include'
        });
        const feedbackData = await feedbackResponse.json();
        
        if (feedbackResponse.ok && feedbackData.feedbacks) {
            displayFeedbackStats(feedbackData.feedbacks);
        }
        
    } catch (error) {
        console.error('Error loading reports:', error);
        showAdminAlert('Failed to load reports', 'error');
    }
}

// Display statistics
function displayStats(stats) {
    const reportProducts = document.getElementById('reportProducts');
    const reportOrders = document.getElementById('reportOrders');
    const reportCustomers = document.getElementById('reportCustomers');
    const reportRevenue = document.getElementById('reportRevenue');
    const reportTotalRevenue = document.getElementById('reportTotalRevenue');
    
    if (reportProducts) reportProducts.textContent = stats.total_products || 0;
    if (reportOrders) reportOrders.textContent = stats.total_orders || 0;
    if (reportCustomers) reportCustomers.textContent = stats.total_customers || 0;
    if (reportRevenue) reportRevenue.textContent = formatPrice(stats.total_revenue || 0);
    if (reportTotalRevenue) reportTotalRevenue.textContent = formatPrice(stats.total_revenue || 0);
}

// Display order statistics
function displayOrderStats(orders) {
    const statusCounts = {
        pending: 0,
        processing: 0,
        delivered: 0,
        cancelled: 0
    };
    
    // Calculate sales stats
    const reportSales = document.getElementById('reportSales');
    const reportMonthSales = document.getElementById('reportMonthSales');
    const reportTodaySales = document.getElementById('reportTodaySales');
    
    let totalSales = 0;
    let monthSales = 0;
    let todaySales = 0;
    
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    const today = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
    
    orders.forEach(order => {
        const status = order.status.toLowerCase();
        if (statusCounts.hasOwnProperty(status)) {
            statusCounts[status]++;
        }
        
        // Calculate sales
        totalSales += order.total_price || 0;
        
        // Check if order is from this month
        if (order.created_at) {
            const orderDate = new Date(order.created_at);
            if (orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear) {
                monthSales += order.total_price || 0;
            }
            
            // Check if order is from today
            const orderDay = new Date(orderDate.getFullYear(), orderDate.getMonth(), orderDate.getDate());
            if (orderDay.getTime() === today.getTime()) {
                todaySales += order.total_price || 0;
            }
        }
    });
    
    const reportPendingOrders = document.getElementById('reportPendingOrders');
    const reportDeliveredOrders = document.getElementById('reportDeliveredOrders');
    
    if (reportPendingOrders) reportPendingOrders.textContent = statusCounts.pending;
    if (reportDeliveredOrders) reportDeliveredOrders.textContent = statusCounts.delivered;
    if (reportSales) reportSales.textContent = formatPrice(totalSales);
    if (reportMonthSales) reportMonthSales.textContent = formatPrice(monthSales);
    if (reportTodaySales) reportTodaySales.textContent = formatPrice(todaySales);
}

// Display product statistics
function displayProductStats(products) {
    const activeProducts = products.filter(p => p.status === 'active').length;
    const reportActiveProducts = document.getElementById('reportActiveProducts');
    
    if (reportActiveProducts) reportActiveProducts.textContent = activeProducts;
}

// Display customer statistics
function displayCustomerStats(customers) {
    const activeCustomers = customers.filter(c => c.status === 'active').length;
    const reportActiveCustomers = document.getElementById('reportActiveCustomers');
    const reportNewCustomers = document.getElementById('reportNewCustomers');
    
    if (reportActiveCustomers) reportActiveCustomers.textContent = activeCustomers;
    
    // Count new customers this month
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const newCustomers = customers.filter(c => {
        if (!c.created_at) return false;
        const createdDate = new Date(c.created_at);
        return createdDate.getMonth() === currentMonth && createdDate.getFullYear() === currentYear;
    }).length;
    
    if (reportNewCustomers) reportNewCustomers.textContent = newCustomers;
}

// Display feedback statistics
function displayFeedbackStats(feedbacks) {
    const reportFeedback = document.getElementById('reportFeedback');
    const reportPendingFeedback = document.getElementById('reportPendingFeedback');
    const reportResolvedFeedback = document.getElementById('reportResolvedFeedback');
    
    if (reportFeedback) reportFeedback.textContent = feedbacks.length;
    
    const pending = feedbacks.filter(f => f.status === 'pending').length;
    const resolved = feedbacks.filter(f => f.status === 'resolved').length;
    
    if (reportPendingFeedback) reportPendingFeedback.textContent = pending;
    if (reportResolvedFeedback) reportResolvedFeedback.textContent = resolved;
}

// Download reports (placeholder functions)
function downloadProductReport() {
    window.location.href = "/api/admin/reports/products/pdf";
}

function downloadOrderReport() {
    window.location.href = "/api/admin/reports/orders/pdf";
}

function downloadCustomerReport() {
    window.location.href = "/api/admin/reports/customers/pdf";
}

function downloadFeedbackReport() {
    window.location.href = "/api/admin/reports/feedback/pdf";
}

function downloadRevenueReport() {
    window.location.href = "/api/admin/reports/revenue/pdf";
}

function downloadSalesReport() {
    window.location.href = "/api/admin/reports/sales/pdf";
}

async function generateCustomReport() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    if (!startDate || !endDate) {
        showAdminAlert('Please select both start and end dates', 'error');
        return;
    }
    
    if (new Date(startDate) > new Date(endDate)) {
        showAdminAlert('Start date cannot be after end date', 'error');
        return;
    }
    
    try {
        const url = `/api/admin/reports/custom/pdf?start_date=${startDate}&end_date=${endDate}`;
        window.location.href = url;
    } catch (error) {
        console.error('Error generating custom report:', error);
        showAdminAlert('Failed to generate report', 'error');
    }
}
