// Admin Products JavaScript (cleaned)

console.log('admin-products.js loaded');

document.addEventListener('DOMContentLoaded', async function() {
    await loadProducts();
    await loadCategories();
});

// Modal helpers
function showAddProductModal() {
    const modal = document.getElementById('productModal');
    if (!modal) return;
    document.getElementById('modalTitle').textContent = 'Add New Product';
    document.getElementById('productForm').dataset.mode = 'add';
    document.getElementById('productForm').dataset.productId = '';
    document.getElementById('productForm').reset();
    modal.style.display = 'block';
}

function closeProductModal() {
    const modal = document.getElementById('productModal');
    if (!modal) return;
    modal.style.display = 'none';
}

async function loadProducts() {
    try {
        const res = await fetch('/api/admin/products', { method: 'GET', credentials: 'include' });
        const data = await res.json();
        if (res.ok && data.products) {
            displayProducts(data.products);
        } else {
            document.getElementById('productsTable').innerHTML = '<tr><td colspan="7" style="text-align:center">No products found</td></tr>';
        }
    } catch (err) {
        console.error('Error loading products:', err);
        document.getElementById('productsTable').innerHTML = '<tr><td colspan="7" style="text-align:center">Error loading products</td></tr>';
    }
}

async function loadCategories() {
    try {
        const res = await fetch('/api/categories', { method: 'GET' });
        const data = await res.json();
        if (res.ok && data.categories) {
            const sel = document.getElementById('productCategory');
            if (sel) sel.innerHTML = '<option value="">Select Category</option>' + data.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        }
    } catch (err) {
        console.error('Error loading categories:', err);
    }
}

function displayProducts(products) {
    const tbody = document.getElementById('productsTable');
    if (!tbody) return;
    if (!products || products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center">No products found</td></tr>';
        return;
    }

    tbody.innerHTML = products.map(p => `
        <tr>
            <td>${p.id}</td>
            <td><img src="${p.image || '/static/img/pf.webp'}" style="width:50px;height:50px;object-fit:cover;border-radius:4px;"/></td>
            <td>${p.name}</td>
            <td>${p.category || p.category_id || 'N/A'}</td>
            <td>${formatPrice(p.price || 0)}</td>
            <td>${p.status || 'active'}</td>
            <td>
                <button onclick="editProduct(${p.id})">Edit</button>
                <button onclick="deleteProduct(${p.id})">Delete</button>
            </td>
        </tr>
    `).join('');
}

function editProduct(id) {
    // Open modal and populate form for editing
    (async function() {
        try {
            const res = await fetch(`/api/products/${id}`, { method: 'GET' });
            if (!res.ok) {
                const err = await res.json().catch(()=>({error:'Failed to fetch product'}));
                showAdminAlert(err.error || 'Failed to load product', 'error');
                return;
            }
            const data = await res.json();
            const p = data.product;
            if (!p) {
                showAdminAlert('Product not found', 'error');
                return;
            }

            // Populate modal fields
            document.getElementById('productName').value = p.name || '';
            document.getElementById('productPrice').value = p.price || 0;
            document.getElementById('productImage').value = p.image || '';
            document.getElementById('productDescription').value = p.description || '';
            const sel = document.getElementById('productCategory');
            if (sel) sel.value = p.category_id || '';
            const statusEl = document.getElementById('productStatus');
            if (statusEl) statusEl.value = p.status || 'active';

            const form = document.getElementById('productForm');
            if (form) {
                form.dataset.mode = 'edit';
                form.dataset.productId = id;
            }

            document.getElementById('modalTitle').textContent = 'Edit Product';
            const modal = document.getElementById('productModal');
            if (modal) modal.style.display = 'block';
        } catch (err) {
            console.error('Error loading product for edit:', err);
            showAdminAlert('Failed to load product', 'error');
        }
    })();
}

async function deleteProduct(id) {
    if (!confirm('Delete product?')) return;
    try {
        const res = await fetch(`/api/admin/products/${id}`, { method: 'DELETE', credentials: 'include' });

        // Try to parse JSON safely; fall back to text if not JSON
        let data = null;
        try { data = await res.json(); } catch (e) { data = { error: await res.text().catch(()=>null) }; }

        if (res.ok) {
            // server may return a helpful message (e.g., marked inactive)
            showAdminAlert((data && (data.message || data.error)) || 'Product deleted', 'success');
            await loadProducts();
            return;
        }

        // Handle specific statuses
        if (res.status === 401) {
            showAdminAlert('Not authorized. Please login as admin.', 'error');
            // Clear local admin and redirect to login to ensure cookie/session re-sync
            try { localStorage.removeItem('adminUser'); } catch(e){}
            setTimeout(()=> window.location.href = '/admin/login', 800);
            return;
        }

        if (res.status === 400) {
            // Bad request - show server message if present
            showAdminAlert((data && data.error) || 'Bad request. Cannot delete product.', 'error');
            return;
        }

        // Generic error handling
        showAdminAlert((data && (data.error || data.message)) || 'Failed to delete product', 'error');
    } catch (err) {
        console.error('Error deleting product:', err);
        showAdminAlert('Error deleting product', 'error');
    }
}

async function saveProduct(event) {
    event.preventDefault();
    const form = event.target;
    const mode = form.dataset.mode;
    const productId = form.dataset.productId;

    const productData = {
        name: document.getElementById('productName').value,
        price: parseFloat(document.getElementById('productPrice').value) || 0,
        category_id: parseInt(document.getElementById('productCategory').value) || null,
        image: document.getElementById('productImage').value,
        description: document.getElementById('productDescription').value,
        status: document.getElementById('productStatus').value || 'active'
    };

    try {
        let res;
        if (mode === 'edit') {
            res = await fetch(`/api/admin/products/${productId}`, { method: 'PUT', headers: {'Content-Type':'application/json'}, credentials: 'include', body: JSON.stringify(productData) });
        } else {
            res = await fetch('/api/admin/products', { method: 'POST', headers: {'Content-Type':'application/json'}, credentials: 'include', body: JSON.stringify(productData) });
        }
        const data = await res.json();
        if (res.ok) {
            showAdminAlert('Product saved', 'success');
            // close modal if present
            const modal = document.getElementById('productModal'); if (modal) modal.style.display = 'none';
            setTimeout(() => loadProducts(), 400);
        } else {
            showAdminAlert(data.error || 'Failed to save product', 'error');
        }
    } catch (err) {
        console.error('Error saving product:', err);
        showAdminAlert('Error saving product', 'error');
    }
}
