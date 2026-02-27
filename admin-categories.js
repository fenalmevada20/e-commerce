// Admin Categories JavaScript

document.addEventListener('DOMContentLoaded', async function() {
    await loadCategories();
});

// Load categories from API
async function loadCategories() {
    try {
        const response = await fetch('/api/admin/categories', {
            method: 'GET',
            credentials: 'include'
        });
        const data = await response.json();
        
        if (response.ok && data.categories) {
            displayCategories(data.categories);
        } else {
            showAdminAlert('Failed to load categories', 'error');
            document.getElementById('categoriesGrid').innerHTML = '<p style="text-align: center;">No categories found</p>';
        }
    } catch (error) {
        console.error('Error loading categories:', error);
        showAdminAlert('Failed to load categories', 'error');
        document.getElementById('categoriesGrid').innerHTML = '<p style="text-align: center;">Error loading categories</p>';
    }
}

// Display categories in grid
function displayCategories(categories) {
    const grid = document.getElementById('categoriesGrid');
    
    if (!categories || categories.length === 0) {
        grid.innerHTML = '<p style="text-align: center;">No categories found</p>';
        return;
    }
    
    grid.innerHTML = categories.map(category => {
        const imageUrl = category.image || '/static/images/placeholder.jpg';
        return `
            <div class="category-card">
                <img src="${imageUrl}" alt="${category.name}">
                <div class="category-info">
                    <h3>${category.name}</h3>
                    <p>${category.description || ''}</p>
                    <div class="category-actions">
                        <button class="btn-edit" onclick="editCategory(${category.id})">Edit</button>
                        <button class="btn-delete" onclick="deleteCategory(${category.id})">Delete</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Show add category modal
function showAddCategoryModal() {
    document.getElementById('categoryModal').style.display = 'block';
    document.getElementById('categoryForm').reset();
    document.getElementById('categoryForm').dataset.mode = 'add';
    document.getElementById('modalTitle').textContent = 'Add New Category';
}

// Close category modal
function closeCategoryModal() {
    document.getElementById('categoryModal').style.display = 'none';
}

// Edit category
async function editCategory(categoryId) {
    try {
        const response = await fetch(`/api/admin/categories`, {
            method: 'GET',
            credentials: 'include'
        });
        const data = await response.json();
        
        if (response.ok && data.categories) {
            const category = data.categories.find(c => c.id === categoryId);
            if (category) {
                document.getElementById('categoryName').value = category.name;
                document.getElementById('categorySlug').value = category.slug;
                document.getElementById('categoryImage').value = category.image || '';
                document.getElementById('categoryDescription').value = category.description || '';
                document.getElementById('categoryForm').dataset.mode = 'edit';
                document.getElementById('categoryForm').dataset.categoryId = categoryId;
                document.getElementById('modalTitle').textContent = 'Edit Category';
                document.getElementById('categoryModal').style.display = 'block';
            }
        } else {
            showAdminAlert('Failed to load category details', 'error');
        }
    } catch (error) {
        console.error('Error loading category:', error);
        showAdminAlert('Failed to load category details', 'error');
    }
}

// Delete category
async function deleteCategory(categoryId) {
    if (!confirm('Are you sure you want to delete this category?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/categories/${categoryId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        const data = await response.json();
        
        if (response.ok) {
            showAdminAlert('Category deleted successfully', 'success');
            loadCategories();
        } else {
            // If category has products, offer to delete its products first
            if (response.status === 400 && data && typeof data.error === 'string' && data.error.toLowerCase().includes('cannot delete category')) {
                if (confirm('Category has products. Delete all products in this category and then delete the category?')) {
                    // Fetch all products (admin) and delete those in this category
                    try {
                        const prodRes = await fetch('/api/admin/products', { method: 'GET', credentials: 'include' });
                        const prodData = await prodRes.json();
                        const products = (prodRes.ok && prodData.products) ? prodData.products : [];
                        for (const p of products) {
                            if (p.category_id == categoryId || p.category == categoryId) {
                                // attempt to delete product
                                const del = await fetch(`/api/admin/products/${p.id}`, { method: 'DELETE', credentials: 'include' });
                                if (!del.ok) {
                                    const delBody = await del.json().catch(()=>({}));
                                    showAdminAlert(delBody.error || 'Failed to delete a product', 'error');
                                    return;
                                }
                            }
                        }

                        // Try deleting category again
                        const retry = await fetch(`/api/admin/categories/${categoryId}`, { method: 'DELETE', credentials: 'include' });
                        const retryBody = await retry.json().catch(()=>({}));
                        if (retry.ok) {
                            showAdminAlert('Category and its products deleted', 'success');
                            loadCategories();
                        } else {
                            showAdminAlert(retryBody.error || 'Failed to delete category after removing products', 'error');
                        }
                    } catch (err) {
                        console.error('Error deleting child products:', err);
                        showAdminAlert('Error deleting child products', 'error');
                    }
                }
            } else {
                showAdminAlert(data.error || 'Failed to delete category', 'error');
            }
        }
    } catch (error) {
        console.error('Error deleting category:', error);
        showAdminAlert('Failed to delete category', 'error');
    }
}

// Handle category form submission
async function saveCategory(event) {
    event.preventDefault();
    
    const form = event.target;
    const mode = form.dataset.mode;
    const categoryId = form.dataset.categoryId;
    
    const categoryData = {
        name: document.getElementById('categoryName').value,
        slug: document.getElementById('categorySlug').value,
        image: document.getElementById('categoryImage').value,
        description: document.getElementById('categoryDescription').value
    };
    
    try {
        let response;
        if (mode === 'edit') {
            response = await fetch(`/api/admin/categories/${categoryId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(categoryData)
            });
        } else {
            response = await fetch('/api/admin/categories', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(categoryData)
            });
        }
        
        const data = await response.json();
        
        if (response.ok) {
            showAdminAlert(mode === 'edit' ? 'Category updated successfully' : 'Category added successfully', 'success');
            closeCategoryModal();
            loadCategories();
        } else {
            showAdminAlert(data.error || 'Failed to save category', 'error');
        }
    } catch (error) {
        console.error('Error saving category:', error);
        showAdminAlert('Failed to save category', 'error');
    }
}
