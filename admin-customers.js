// Admin Customers JavaScript

let allCustomers = [];
let filteredCustomers = [];
let currentPage = 1;
const customersPerPage = 5;

document.addEventListener('DOMContentLoaded', async function() {
    await loadCustomers();
});

// Load customers from API
async function loadCustomers() {
    try {
        const response = await fetch('/api/admin/customers', {
            method: 'GET',
            credentials: 'include'
        });
        const data = await response.json();
        
        if (response.ok && data.customers) {
            allCustomers = data.customers;
            filteredCustomers = [...allCustomers];
            displayCustomers(filteredCustomers);
        } else {
            showAdminAlert('Failed to load customers', 'error');
            document.getElementById('customersTable').innerHTML = '<tr><td colspan="8" style="text-align: center;">No customers found</td></tr>';
        }
    } catch (error) {
        console.error('Error loading customers:', error);
        showAdminAlert('Failed to load customers', 'error');
        document.getElementById('customersTable').innerHTML = '<tr><td colspan="8" style="text-align: center;">Error loading customers</td></tr>';
    }
}

// Display customers in table
function displayCustomers(customers) {
    const tableBody = document.getElementById('customersTable');
    
    if (!customers || customers.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="8" style="text-align: center;">No customers found</td></tr>';
        updateCustomerPaginationButtons(0);
        return;
    }
    
    filteredCustomers = customers;
    currentPage = 1;
    displayCustomerPage(currentPage);
    updateCustomerPaginationButtons(customers.length);
}

// Display a specific page of customers
function displayCustomerPage(page) {
    const tableBody = document.getElementById('customersTable');
    if (!tableBody || !filteredCustomers) return;

    const startIdx = (page - 1) * customersPerPage;
    const endIdx = startIdx + customersPerPage;
    const pageCustomers = filteredCustomers.slice(startIdx, endIdx);

    if (pageCustomers.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="8" style="text-align: center;">No customers found</td></tr>';
        return;
    }
    
    tableBody.innerHTML = pageCustomers.map(customer => {
        const createdDate = customer.created_at ? new Date(customer.created_at).toLocaleDateString() : 'N/A';
        const statusClass = customer.status === 'active' ? 'status-active' : 'status-inactive';
        return `
            <tr>
                <td>#${customer.id}</td>
                <td>${customer.name}</td>
                <td>${customer.email}</td>
                <td>${customer.phone}</td>
                <td>${customer.address || 'N/A'}</td>
                <td>${createdDate}</td>
                <td><span class="status-badge ${statusClass}">${customer.status}</span></td>
                <td>
                    <button class="action-btn" onclick="toggleCustomerStatus(${customer.id}, '${customer.status}')">
                        ${customer.status === 'active' ? 'Deactivate' : 'Activate'}
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// Toggle customer status
async function toggleCustomerStatus(customerId, currentStatus) {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    
    try {
        const response = await fetch(`/api/admin/customers/${customerId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ status: newStatus })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showAdminAlert(`Customer ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`, 'success');
            await loadCustomers();
        } else {
            showAdminAlert(data.error || 'Failed to update customer status', 'error');
        }
    } catch (error) {
        console.error('Error updating customer status:', error);
        showAdminAlert('Failed to update customer status', 'error');
    }
}

// Filter customers by status
function filterCustomers(status) {
    const buttons = document.querySelectorAll('.filter-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    if (status === 'all') {
        filteredCustomers = [...allCustomers];
    } else if (status === 'active') {
        filteredCustomers = allCustomers.filter(c => c.status === 'active');
    } else if (status === 'inactive') {
        filteredCustomers = allCustomers.filter(c => c.status === 'inactive');
    }
    
    currentPage = 1;
    displayCustomerPage(currentPage);
    updateCustomerPaginationButtons(filteredCustomers.length);
}

// Update pagination buttons
function updateCustomerPaginationButtons(totalCustomers) {
    const totalPages = Math.ceil(totalCustomers / customersPerPage);
    const paginationDiv = document.getElementById('customerPaginationControls');
    
    if (!paginationDiv) return;
    
    paginationDiv.style.display = 'flex';
    
    const prevBtn = document.getElementById('customerPrevBtn');
    const nextBtn = document.getElementById('customerNextBtn');
    const pageInfo = document.getElementById('customerPageInfo');
    
    if (prevBtn) prevBtn.disabled = currentPage === 1;
    if (nextBtn) nextBtn.disabled = currentPage === totalPages;
    if (pageInfo) pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
}

function customerPreviousPage() {
    if (currentPage > 1) {
        currentPage--;
        displayCustomerPage(currentPage);
        updateCustomerPaginationButtons(filteredCustomers.length);
    }
}

function customerNextPage() {
    const totalPages = Math.ceil(filteredCustomers.length / customersPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        displayCustomerPage(currentPage);
        updateCustomerPaginationButtons(filteredCustomers.length);
    }
}

// Search customers
function searchCustomers() {
    const query = document.getElementById('searchCustomer').value.toLowerCase();
    const rows = document.querySelectorAll('#customersTable tr');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(query) ? '' : 'none';
    });
}
