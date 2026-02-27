// Products page JavaScript

let currentProducts = [];
let selectedProduct = null;
let allProducts = [];

// Load products on page load
document.addEventListener('DOMContentLoaded', async function() {
    // Make sure footer is visible
    setTimeout(() => {
        const footer = document.querySelector('footer');
        if (footer) {
            footer.style.display = 'block';
            footer.style.visibility = 'visible';
        }
    }, 100);
    
    await loadProductsFromAPI();
    
    // Check for category from URL
    const urlParams = new URLSearchParams(window.location.search);
    const category = urlParams.get('cat');
    
    if (category) {
        document.getElementById('categorySelect').value = category;
        filterByCategory();
    } else {
        displayProducts(currentProducts);
    }
});

// Load products from API
async function loadProductsFromAPI() {
    try {
        const response = await fetch('/api/products', {
            method: 'GET',
            credentials: 'include'
        });
        const data = await response.json();
        
        if (response.ok && data.products) {
            allProducts = data.products.map(p => ({
                id: p.id,
                name: p.name,
                category: p.category_slug || (p.category ? p.category.toLowerCase().replace(/\s+/g, '').replace(/-/g, '') : 'all'),
                price: p.price,
                image: p.image,
                description: p.description || 'No description available'
            }));
            currentProducts = [...allProducts];
            
            // Update category dropdown dynamically
            updateCategoryDropdown();
            
            displayProducts(currentProducts);
        } else {
            console.error('Failed to load products:', data.error);
            document.getElementById('productsGrid').innerHTML = '<div class="no-products">No products found. Please try again later.</div>';
        }
    } catch (error) {
        console.error('Error loading products:', error);
        document.getElementById('productsGrid').innerHTML = '<div class="no-products">Error loading products. Please refresh the page.</div>';
    }
}

// Update category dropdown with actual categories from API
async function updateCategoryDropdown() {
    try {
        const response = await fetch('/api/products', {
            method: 'GET',
            credentials: 'include'
        });
        const data = await response.json();
        
        if (response.ok && data.products) {
            // Extract unique categories from products
            const categories = [...new Set(data.products.map(p => p.category || 'Other'))];
            const categorySelect = document.getElementById('categorySelect');
            if (categorySelect) {
                categorySelect.innerHTML = '<option value="all">All Products</option>' + 
                    categories.map(cat => {
                        const slug = cat.toLowerCase().replace(/\s+/g, '');
                        return `<option value="${slug}">${cat}</option>`;
                    }).join('');
            }
        }
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

// Display products
function displayProducts(products) {
    const productsGrid = document.getElementById('productsGrid');
    
    if (products.length === 0) {
        productsGrid.innerHTML = '<div class="no-products">No products found</div>';
        return;
    }
    
    productsGrid.innerHTML = products.map(product => `
        <div class="product-card" onclick="showProductDetails(${product.id})">
            <img src="${product.image}" alt="${product.name}" class="product-image">
            <div class="product-info">
                <h3 class="product-name">${product.name}</h3>
                <p class="product-price">${formatPrice(product.price)}</p>
                <p class="product-description">${product.description}</p>
                <div class="product-actions">
                    <button class="btn-add-cart" onclick="addToCartFromList(event, ${product.id})">Add to Cart</button>
                    <button class="btn-view-details" onclick="showProductDetails(${product.id})">View Details</button>
                </div>
            </div>
        </div>
    `).join('');
}

// Filter by category
function filterByCategory() {
    const category = document.getElementById('categorySelect').value;
    if (category === 'all') {
        currentProducts = [...allProducts];
    } else {
        currentProducts = allProducts.filter(p => {
            const productCategory = p.category || '';
            return productCategory === category || productCategory.includes(category);
        });
    }
    displayProducts(currentProducts);
}

// Sort products
function sortProducts() {
    const sortBy = document.getElementById('sortSelect').value;
    
    switch(sortBy) {
        case 'price-low':
            currentProducts.sort((a, b) => a.price - b.price);
            break;
        case 'price-high':
            currentProducts.sort((a, b) => b.price - a.price);
            break;
        case 'name':
            currentProducts.sort((a, b) => a.name.localeCompare(b.name));
            break;
        default:
            currentProducts = [...allProducts];
    }
    
    displayProducts(currentProducts);
}

// Search products
function searchProducts() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    if (!query) {
        filterByCategory(); // Reset to category filter
        return;
    }
    currentProducts = allProducts.filter(p => 
        p.name.toLowerCase().includes(query) || 
        (p.description && p.description.toLowerCase().includes(query))
    );
    displayProducts(currentProducts);
}

// Show product details in modal
function showProductDetails(productId) {
    selectedProduct = allProducts.find(p => p.id === parseInt(productId));
    
    if (!selectedProduct) return;
    
    // Set the current product ID for reviews
    window.currentProductId = parseInt(productId);
    
    document.getElementById('modalImage').src = selectedProduct.image;
    document.getElementById('modalTitle').textContent = selectedProduct.name;
    document.getElementById('modalPrice').textContent = formatPrice(selectedProduct.price);
    document.getElementById('modalDescription').textContent = selectedProduct.description || 'No description available';
    
    const modal = document.getElementById('productModal');
    modal.style.display = 'flex';
    modal.classList.add('active');
    
    // Hide footer and disable background scroll when modal opens
    const footer = document.querySelector('footer');
    if (footer) footer.style.display = 'none';
    document.body.style.overflow = 'hidden';

    // Set design link to open design page for this product
    const designLink = document.getElementById('designLink');
    if (designLink) {
        designLink.href = `/designproduct?id=${productId}`;
    }
    
    // Load reviews for this product
    setTimeout(() => {
        loadReviews();
    }, 100);
}

// Close modal
function closeModal() {
    const modal = document.getElementById('productModal');
    modal.style.display = 'none';
    modal.classList.remove('active');
    
    // Show footer and re-enable background scroll when modal closes
    const footer = document.querySelector('footer');
    if (footer) footer.style.display = 'block';
    document.body.style.overflow = 'auto';
}

// Add to cart from product list
function addToCartFromList(event, productId) {
    event.stopPropagation();
    const product = allProducts.find(p => p.id === parseInt(productId));
    if (product) {
        addProductToCart(product);
    }
}

// Add to cart from modal
function addToCart() {
    if (selectedProduct) {
        addProductToCart(selectedProduct);
        closeModal();
    }
}

// Add product to cart
function addProductToCart(product) {
    const cart = getCart();
    const existingItem = cart.find(item => item.id === product.id);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.image,
            quantity: 1
        });
    }
    
    saveCart(cart);
    showAlert('Product added to cart!', 'success');
}

// Design product (redirect to design page or show message)
// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('productModal');
    if (event.target === modal) {
        closeModal();
    }
}

function designProduct() {
    document.getElementById('designSection').style.display = 'block';
    document.getElementById('baseProductImage').src = selectedProduct.image;
}

document.getElementById('designImageInput')?.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(ev) {
        document.getElementById('uploadedDesignImage').src = ev.target.result;
    };
    reader.readAsDataURL(file);
});

document.getElementById('designTextInput')?.addEventListener('input', function(e) {
    document.getElementById('designText').textContent = e.target.value;
});

document.getElementById('textColorInput')?.addEventListener('input', function(e) {
    document.getElementById('designText').style.color = e.target.value;
});

function saveDesignAndAddToCart() {
    const cart = getCart();

    cart.push({
        id: selectedProduct.id,
        name: selectedProduct.name,
        price: selectedProduct.price,
        image: selectedProduct.image,
        quantity: 1,
        design: {
            text: document.getElementById('designText').textContent,
            image: document.getElementById('uploadedDesignImage').src
        }
    });

    saveCart(cart);
    showAlert('Customized product added to cart!', 'success');
    closeModal();
}

// Rating stars interaction
document.querySelectorAll('.rating-star').forEach(star => {
    star.addEventListener('click', function() {
        const rating = this.getAttribute('data-rating');
        document.getElementById('selectedRating').value = rating;
        
        document.querySelectorAll('.rating-star').forEach((s, idx) => {
            s.style.color = (idx + 1) <= rating ? '#ffc107' : '#ddd';
        });
    });
});

async function submitReview() {
    const productId = window.currentProductId;
    if (!productId) {
        alert('Product not found');
        return;
    }
    
    const rating = parseInt(document.getElementById('selectedRating').value);
    const reviewText = document.getElementById('reviewText').value.trim();
    
    if (rating === 0) {
        alert('Please select a rating');
        return;
    }
    
    try {
        const response = await fetch('/api/reviews/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                product_id: productId,
                rating: rating,
                review_text: reviewText
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert(data.message);
            document.getElementById('selectedRating').value = 0;
            document.getElementById('reviewText').value = '';
            document.querySelectorAll('.rating-star').forEach(s => s.style.color = '#ddd');
            document.getElementById('submitReviewForm').style.display = 'none';
            loadReviews();
        } else {
            alert(data.error || 'Failed to submit review');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error submitting review');
    }
}

async function loadReviews() {
    const productId = window.currentProductId;
    if (!productId) return;
    
    try {
        const response = await fetch(`/api/reviews/product/${productId}`);
        const data = await response.json();
        
        if (response.ok) {
            const reviews = data.reviews || [];
            const reviewsList = document.getElementById('reviewsList');
            
            if (reviews.length === 0) {
                reviewsList.innerHTML = '<p style="color: #999; text-align: center; font-size: 13px;">No reviews yet. Be the first to review!</p>';
                document.getElementById('submitReviewForm').style.display = 'block';
            } else {
                reviewsList.innerHTML = reviews.map(review => `
                    <div style="background: white; padding: 12px; border-radius: 5px; margin-bottom: 8px; border-left: 3px solid #ffc107;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                            <strong style="font-size: 13px;">${review.customer_name || 'Anonymous'}</strong>
                            <span style="color: #ffc107; font-size: 14px;">${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</span>
                        </div>
                        <p style="margin: 6px 0; color: #666; font-size: 13px;">${review.review_text || '(No text provided)'}</p>
                        <small style="color: #999; font-size: 12px;">${new Date(review.created_at).toLocaleDateString()}</small>
                    </div>
                `).join('');
                document.getElementById('submitReviewForm').style.display = 'block';
            }
        }
    } catch (error) {
        console.error('Error loading reviews:', error);
    }
}

// Override showModal to load reviews
const originalShowModal = window.showModal;
window.showModal = function(product) {
    window.currentProductId = product.id;
    originalShowModal(product);
    setTimeout(() => {
        loadReviews();
    }, 100);
};

// Social Media Sharing Functions
function shareOnWhatsApp(event) {
    event.preventDefault();
    const productName = document.getElementById('modalTitle').textContent;
    const productPrice = document.getElementById('modalPrice').textContent;
    const url = window.location.href;
    const text = `Check out this amazing product! 🎁\n\n${productName}\n${productPrice}\n\n${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
}

function shareOnFacebook(event) {
    event.preventDefault();
    const url = window.location.href;
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank', 'width=600,height=400');
}

function shareOnTwitter(event) {
    event.preventDefault();
    const productName = document.getElementById('modalTitle').textContent;
    const text = `Check out this awesome product: ${productName} 🛍️ #PrintOnDemand`;
    const url = window.location.href;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank', 'width=600,height=400');
}

function shareOnTelegram(event) {
    event.preventDefault();
    const productName = document.getElementById('modalTitle').textContent;
    const url = window.location.href;
    const text = `Check out: ${productName}\n${url}`;
    window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, '_blank');
}

function shareOnInstagram(event) {
    event.preventDefault();
    // Instagram doesn't have a direct share URL, so open Instagram homepage
    // Users can share from there
    window.open('https://www.instagram.com/', '_blank');
}
