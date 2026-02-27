// Admin Orders JavaScript

console.log('admin-orders.js loaded');
let allOrders = [];
let filteredOrders = [];
let currentPage = 1;
const ordersPerPage = 5;

document.addEventListener('DOMContentLoaded', async function() {
    await loadOrders();
});

// Load orders from API
async function loadOrders() {
    try {
        const response = await fetch('/api/admin/orders', { method: 'GET', credentials: 'include' });
        if (response.status === 401) {
            window.location.href = '/admin-login.html';
            return;
        }

        const data = await response.json();
        if (response.ok && data.orders) {
            allOrders = data.orders;
            displayOrders(allOrders);
        } else {
            showAdminAlert('Failed to load orders', 'error');
            document.getElementById('ordersTable').innerHTML = '<tr><td colspan="7" style="text-align: center;">No orders found</td></tr>';
        }
    } catch (error) {
        console.error('Error loading orders:', error);
        showAdminAlert('Failed to load orders', 'error');
        document.getElementById('ordersTable').innerHTML = '<tr><td colspan="7" style="text-align: center;">Error loading orders</td></tr>';
    }
}

// Display orders in table
function displayOrders(orders) {
    const tableBody = document.getElementById('ordersTable');
    if (!tableBody) return;

    if (!orders || orders.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="8" style="text-align: center;">No orders found</td></tr>';
        updatePaginationButtons(0);
        return;
    }

    filteredOrders = orders;
    currentPage = 1;
    displayPage(currentPage);
    updatePaginationButtons(orders.length);
}

// Display a specific page of orders
function displayPage(page) {
    const tableBody = document.getElementById('ordersTable');
    if (!tableBody || !filteredOrders) return;

    const startIdx = (page - 1) * ordersPerPage;
    const endIdx = startIdx + ordersPerPage;
    const pageOrders = filteredOrders.slice(startIdx, endIdx);

    if (pageOrders.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="8" style="text-align: center;">No orders found</td></tr>';
        return;
    }

    tableBody.innerHTML = pageOrders.map(order => {
        const orderDate = order.created_at ? new Date(order.created_at).toLocaleString() : 'N/A';
        const paymentText = order.payment_done ? 'Done' : 'Pending';
        const paymentColor = order.payment_done ? '#27ae60' : '#e74c3c';
        return `
            <tr>
                <td>#${order.id}</td>
                <td>${order.customer_name || 'Unknown'}</td>
                <td>${order.items ? order.items.length : 0}</td>
                <td>${formatPrice(order.total_price || 0)}</td>
                <td>${orderDate}</td>
                <td>${order.status || 'pending'}</td>
                <td><span style="color: ${paymentColor}; font-weight: bold;">${paymentText}</span></td>
                <td style="display: flex; flex-direction: column; gap: 8px;">
                    <button class="btn-view" onclick="viewOrderDetails(${order.id})">Details</button>
                    <button class="btn-edit" onclick="openStatusModal(${order.id})">Change Status</button>
                    <button style="background-color: #3498db; color: white; padding: 0.4rem 0.8rem; border: none; border-radius: 5px; cursor: pointer; font-size: 0.85rem; transition: all 0.3s ease; font-weight: bold;" onclick="togglePaymentDone(${order.id})">
                        ${order.payment_done ? 'Undo' : 'Mark Done'}
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// Populate and open order details modal
function viewOrderDetails(orderId) {
    const order = allOrders.find(o => o.id === orderId);
    if (!order) return;

    const container = document.getElementById('orderDetailsContent');
    if (!container) {
        alert('Order details: ' + JSON.stringify(order, null, 2));
        return;
    }

    let html = `
        <div class="order-summary">
            <h3>Order #${order.id}</h3>
            <p><strong>Customer:</strong> ${order.customer_name || 'Guest'}</p>
            <p><strong>Contact:</strong> ${order.contact || 'N/A'}</p>
            <p><strong>Address:</strong> ${order.address || 'N/A'}</p>
            <p><strong>Total Qty:</strong> ${order.total_qty || 0}</p>
            <p><strong>Total Price:</strong> ${formatPrice(order.total_price || 0)}</p>
            <p><strong>Payment:</strong> ${order.payment_method || 'cod'}</p>
            <p><strong>Status:</strong> ${order.status || 'pending'}</p>
            <hr />
            <h4>Items</h4>
            <ul class="order-items">
    `;

    if (order.items && order.items.length > 0) {
        order.items.forEach(item => {
            const img = item.product_image || '';
            html += `
                <li style="display:flex;align-items:flex-start;gap:12px;margin-bottom:12px;">
                    <img src="${img}" alt="" style="width:64px;height:64px;object-fit:cover;border-radius:6px;" />
                    <div style="flex:1">
                        <div><strong>${item.product_name || 'Unknown'}</strong></div>
                        <div style="color:#6b7280;font-size:0.95rem">Qty: ${item.quantity} • ${formatPrice(item.price)}</div>
                        ${item.design ? `<div style="margin-top:8px;padding:8px;border-radius:8px;background:#f8fafc;border:1px solid #eef2f7;display:flex;gap:8px;align-items:center;"><div style="flex:0 0 64px"><img class="zoom-design-img" src="${(item.design.image||'').replace(/"/g,'')}" style="width:64px;height:64px;object-fit:cover;border-radius:4px;cursor:pointer;" onclick="zoomDesignImage('${(item.design.image||'').replace(/"/g,'').replace(/'/g,'\\\\\'')}')" title="Click to zoom"/></div><div style="flex:1"><div style="font-weight:600">Customized</div><div style="color:#374151">${(item.design.text||'').toString().slice(0,200)}</div>${item.design.textColor ? `<div style="color:#6b7280;font-size:0.85rem;margin-top:4px;">Text Color: <span style="display:inline-block;width:16px;height:16px;background:${item.design.textColor};border:1px solid #ddd;vertical-align:middle;border-radius:3px;"></span></div>` : ''}${item.design.size ? `<div style="color:#6b7280;font-size:0.85rem;margin-top:4px;">Size: ${item.design.size}</div>` : ''}${item.design.mobileModel ? `<div style="color:#6b7280;font-size:0.85rem;margin-top:4px;">Mobile Model: ${item.design.mobileModel}</div>` : ''}</div></div>` : ''}
                    </div>
                </li>
            `;
        });
    } else {
        html += '<li>No items found for this order.</li>';
    }

    html += `</ul>`;

    container.innerHTML = html;
    const modal = document.getElementById('orderModal');
    if (modal) modal.style.display = 'block';
}

function closeOrderModal() {
    const modal = document.getElementById('orderModal');
    if (modal) modal.style.display = 'none';
}

function openStatusModal(orderId) {
    const modal = document.getElementById('statusModal');
    if (!modal) return;
    document.getElementById('statusOrderId').value = orderId;
    modal.style.display = 'block';
}

function closeStatusModal() {
    const modal = document.getElementById('statusModal');
    if (modal) modal.style.display = 'none';
}

// Update order status — handles both inline calls and modal form submit
async function updateOrderStatus(orderId, newStatus) {
    try {
        let statusButton = document.getElementById('updateStatusBtn');
        console.log('Starting status update. Button:', statusButton);
        
        // If called as form submit, `orderId` is the event
        if (orderId && orderId.preventDefault) {
            const evt = orderId;
            evt.preventDefault();
            const id = document.getElementById('statusOrderId').value;
            const status = document.getElementById('orderStatus').value;
            orderId = parseInt(id, 10);
            newStatus = status;
            console.log('Form submitted. Order ID:', orderId, 'New Status:', newStatus);
        }
        
        // Change button color to show it's processing
        if (statusButton) {
            statusButton.style.backgroundColor = '#f39c12';
            statusButton.style.opacity = '1';
            statusButton.textContent = 'Updating...';
            statusButton.disabled = true;
            console.log('Button changed to orange');
        }

        console.log('Fetching /api/admin/orders/' + orderId + '/status');
        const response = await fetch(`/api/admin/orders/${orderId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ status: newStatus })
        });

        console.log('Response received. Status:', response.status);
        const data = await response.json();
        console.log('Response data:', data);

        if (response.ok) {
            console.log('Update successful!');
            // Change button to green to indicate success
            if (statusButton) {
                statusButton.style.backgroundColor = '#27ae60';
                statusButton.textContent = '✓ Updated!';
                statusButton.style.color = 'white';
                console.log('Button changed to green');
                
                // Wait 2 seconds before closing and resetting
                setTimeout(() => {
                    console.log('Resetting button to blue');
                    statusButton.style.backgroundColor = '#2980b9';
                    statusButton.textContent = 'Update Status';
                    statusButton.disabled = false;
                    closeStatusModal();
                    loadOrders();
                    if (newStatus) filterOrders(newStatus);
                }, 2000);
            }
            
            showAdminAlert('Order status updated successfully', 'success');
        } else {
            console.log('Update failed:', data.error);
            // Change button to red to indicate error
            if (statusButton) {
                statusButton.style.backgroundColor = '#e74c3c';
                statusButton.textContent = '✗ Failed!';
                statusButton.style.color = 'white';
                console.log('Button changed to red');
                
                setTimeout(() => {
                    statusButton.style.backgroundColor = '#2980b9';
                    statusButton.textContent = 'Update Status';
                    statusButton.disabled = false;
                }, 2000);
            }
            
            showAdminAlert(data.error || 'Failed to update order status', 'error');
        }
    } catch (error) {
        console.error('Error updating order status:', error);
        let statusButton = document.getElementById('updateStatusBtn');
        if (statusButton) {
            statusButton.style.backgroundColor = '#e74c3c';
            statusButton.textContent = '✗ Error!';
            statusButton.style.color = 'white';
            console.log('Button changed to red (error):', error.message);
            
            setTimeout(() => {
                statusButton.style.backgroundColor = '#2980b9';
                statusButton.textContent = 'Update Status';
                statusButton.disabled = false;
            }, 2000);
        }
        showAdminAlert('Error: ' + error.message, 'error');
    }
}

// Search orders
function searchOrders() {
    const query = document.getElementById('searchOrder').value.toLowerCase();
    const rows = document.querySelectorAll('#ordersTable tr');

    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(query) ? '' : 'none';
    });
}

// Filter orders by status (all, pending, processing, delivered, etc.)
function filterOrders(status) {
    // Update active button appearance
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('onclick') && btn.getAttribute('onclick').includes(`'${status}'`));
    });

    if (!allOrders || allOrders.length === 0) {
        displayOrders([]);
        return;
    }

    if (status === 'all') {
        displayOrders(allOrders);
        return;
    }

    const filtered = allOrders.filter(o => (o.status || '').toLowerCase() === status.toLowerCase());
    displayOrders(filtered);
}

// Pagination functions
function updatePaginationButtons(totalOrders) {
    const totalPages = Math.ceil(totalOrders / ordersPerPage);
    const paginationDiv = document.getElementById('paginationControls');
    
    if (!paginationDiv) return;
    
    paginationDiv.style.display = 'flex';
    
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const pageInfo = document.getElementById('pageInfo');
    
    if (prevBtn) prevBtn.disabled = currentPage === 1;
    if (nextBtn) nextBtn.disabled = currentPage === totalPages;
    if (pageInfo) pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
}

function previousPage() {
    if (currentPage > 1) {
        currentPage--;
        displayPage(currentPage);
        updatePaginationButtons(filteredOrders.length);
    }
}

function nextPage() {
    const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        displayPage(currentPage);
        updatePaginationButtons(filteredOrders.length);
    }
}

// Toggle payment done status
async function togglePaymentDone(orderId) {
    try {
        const response = await fetch(`/api/admin/orders/${orderId}/payment-done`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({})
        });

        const data = await response.json();

        if (response.ok) {
            const status = data.order.payment_done ? 'Done' : 'Pending';
            showAdminAlert(`Payment marked as ${status}`, 'success');
            await loadOrders();
        } else {
            showAdminAlert(data.error || 'Failed to update payment status', 'error');
        }
    } catch (error) {
        console.error('Error updating payment status:', error);
        showAdminAlert('Failed to update payment status', 'error');
    }
}

function zoomDesignImage(imgSrc) {
    if (!imgSrc) return;
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;z-index:10000;cursor:pointer;';
    modal.onclick = function(e) { if (e.target === modal) document.body.removeChild(modal); };
    const img = document.createElement('img');
    img.src = imgSrc;
    img.style.cssText = 'max-width:90%;max-height:90%;border-radius:8px;box-shadow:0 10px 40px rgba(0,0,0,0.3);';
    modal.appendChild(img);
    document.body.appendChild(modal);
}

// Fallback: if orders table still shows "Loading...", replace with a helpful message and log
setTimeout(function() {
    try {
        var ordersTable = document.getElementById('ordersTable');
        if (ordersTable && ordersTable.textContent.includes('Loading')) {
            ordersTable.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#777">Failed to load orders. Open console for errors.</td></tr>';
            console.warn('Orders table did not load — check admin JS console for errors.');
        }
    } catch (e) {
        console.error('Orders fallback error:', e);
    }
}, 2500);

