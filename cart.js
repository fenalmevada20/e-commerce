// Cart page JavaScript

// Load cart on page load
document.addEventListener('DOMContentLoaded', function() {
    loadCart();
    calculateTotals();
});

// Load and display cart items
function loadCart() {
    const cart = getCart();
    const cartItemsList = document.getElementById('cartItemsList');
    const emptyCart = document.getElementById('emptyCart');
    
    if (cart.length === 0) {
        cartItemsList.style.display = 'none';
        emptyCart.style.display = 'block';
        return;
    }
    
    cartItemsList.style.display = 'block';
    emptyCart.style.display = 'none';
    
    cartItemsList.innerHTML = cart.map(item => `
        <div class="cart-item" data-id="${item.id}">
            <img src="${item.image}" alt="${item.name}" class="item-image">
            <div class="item-details">
                <h3 class="item-name">${item.name}</h3>
                <p class="item-price">${formatPrice(item.price)}</p>
                <div class="item-actions">
                    <div class="quantity-control">
                        <button onclick="updateQuantity(${item.id}, -1)">-</button>
                        <input type="number" value="${item.quantity}" readonly>
                        <button onclick="updateQuantity(${item.id}, 1)">+</button>
                    </div>
                    <button class="btn-remove" onclick="removeFromCart(${item.id})">Remove</button>
                </div>
            </div>
        </div>
    `).join('');
}

// Update item quantity
function updateQuantity(productId, change) {
    const cart = getCart();
    const item = cart.find(i => i.id === productId);
    
    if (item) {
        item.quantity += change;
        
        if (item.quantity <= 0) {
            removeFromCart(productId);
            return;
        }
        
        saveCart(cart);
        loadCart();
        calculateTotals();
    }
}

// Remove item from cart
function removeFromCart(productId) {
    if (!confirm('Are you sure you want to remove this item?')) {
        return;
    }
    
    const cart = getCart();
    const updatedCart = cart.filter(item => item.id !== productId);
    
    saveCart(updatedCart);
    loadCart();
    calculateTotals();
    showAlert('Item removed from cart', 'info');
}

// Calculate totals
function calculateTotals() {
    const cart = getCart();
    
    if (cart.length === 0) {
        document.getElementById('subtotal').textContent = formatPrice(0);
        document.getElementById('delivery').textContent = formatPrice(0);
        document.getElementById('gst').textContent = formatPrice(0);
        document.getElementById('total').textContent = formatPrice(0);
        return;
    }
    
    // Calculate subtotal
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // Calculate delivery charges (free for orders above 500)
    const delivery = subtotal > 500 ? 0 : 50;
    
    // Calculate GST (18%)
    const gst = subtotal * 0.18;
    
    // Calculate total
    const total = subtotal + delivery + gst;
    
    // Update display
    document.getElementById('subtotal').textContent = formatPrice(subtotal);
    document.getElementById('delivery').textContent = formatPrice(delivery);
    document.getElementById('gst').textContent = formatPrice(gst);
    document.getElementById('total').textContent = formatPrice(total);
}

// Proceed to checkout
async function proceedToCheckout() {
    const cart = getCart();
    
    if (cart.length === 0) {
        showAlert('Your cart is empty', 'error');
        return;
    }
    
    // Check if user is logged in (check both localStorage and session)
    if (!isLoggedIn()) {
        showAlert('Please login to continue', 'error');
        setTimeout(() => {
            window.location.href = '/signin';
        }, 1500);
        return;
    }
    
    // Verify session is still valid
    try {
        const response = await fetch('/api/customer/profile', {
            method: 'GET',
            credentials: 'include'
        });
        
        if (!response.ok && response.status === 401) {
            showAlert('Your session has expired. Please login again', 'error');
            localStorage.removeItem('currentUser');
            setTimeout(() => {
                window.location.href = '/signin';
            }, 1500);
            return;
        }
        
        const data = await response.json();
        if (response.ok && data.customer) {
            // Update user in localStorage
            setCurrentUser(data.customer);
        }
    } catch (error) {
        console.error('Error verifying session:', error);
        showAlert('Please login to continue', 'error');
        setTimeout(() => {
            window.location.href = '/signin';
        }, 1500);
        return;
    }
    
    // Show checkout modal
    const modal = document.getElementById('checkoutModal');
    modal.style.display = 'block';
    
    // Pre-fill user address if available
    const user = getCurrentUser();
    if (user && user.address) {
        document.getElementById('deliveryAddress').value = user.address;
    }
    if (user && user.phone) {
        document.getElementById('contactNumber').value = user.phone;
    }
    
    // Update modal total
    const total = document.getElementById('total').textContent;
    document.getElementById('modalTotal').textContent = total.replace('₹', '').replace(',', '');
}

// Close checkout modal
function closeCheckoutModal() {
    document.getElementById('checkoutModal').style.display = 'none';
}

// Place order
async function placeOrder(event) {
    event.preventDefault();
    
    try {
        // Disable submit button to prevent double submission
        const submitBtn = event.target.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Placing Order...';
        }
        
        const address = document.getElementById('deliveryAddress').value.trim();
        const contact = document.getElementById('contactNumber').value.trim();
        const paymentMethod = document.getElementById('paymentMethod').value;
        
        // Validation
        if (!address || address.length < 10) {
            showAlert('Please enter a complete delivery address (at least 10 characters)', 'error');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Place Order';
            }
            return;
        }
        
        if (!contact || !/^\d{10}$/.test(contact)) {
            showAlert('Please enter a valid 10-digit contact number', 'error');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Place Order';
            }
            return;
        }
        
        // Get cart and validate
        const cart = getCart();
        if (!cart || cart.length === 0) {
            showAlert('Your cart is empty. Please add products before placing an order.', 'error');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Place Order';
            }
            closeCheckoutModal();
            return;
        }
        
        // Calculate totals
        const totalElement = document.getElementById('total');
        if (!totalElement) {
            showAlert('Error calculating total. Please refresh the page.', 'error');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Place Order';
            }
            return;
        }
        
        let totalAmountText = totalElement.textContent.trim();
        // Remove ₹, commas, and any whitespace
        totalAmountText = totalAmountText.replace(/₹/g, '').replace(/,/g, '').trim();
        const totalAmount = parseFloat(totalAmountText);
        
        if (isNaN(totalAmount) || totalAmount <= 0) {
            console.error('Invalid total amount:', totalAmountText);
            showAlert('Error calculating order total. Please refresh the page and try again.', 'error');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Place Order';
            }
            return;
        }
        
        const totalQty = cart.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0);
        
        if (totalQty <= 0) {
            showAlert('Invalid cart. Please add products to cart.', 'error');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Place Order';
            }
            return;
        }
        
        // Prepare order items with validation
        const items = cart.map(item => {
            if (!item.id || !item.quantity || !item.price) {
                throw new Error('Invalid cart item');
            }
            return {
                product_id: parseInt(item.id),
                quantity: parseInt(item.quantity),
                price: parseFloat(item.price),
                design: item.design || null
            };
        }).filter(item => item.product_id && item.quantity > 0 && item.price > 0);
        
        if (items.length === 0) {
            showAlert('No valid items in cart. Please add products to cart.', 'error');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Place Order';
            }
            return;
        }
        
        // Make API request
        const response = await fetch('/api/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                total_qty: totalQty,
                total_price: totalAmount,
                address: address,
                contact: contact,
                payment_method: paymentMethod || 'cod',
                items: items
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Clear cart
            saveCart([]);
            
            // Close modal
            closeCheckoutModal();
            
            // Show success message
            showAlert('Order placed successfully! Redirecting to orders page...', 'success');
            
            // Redirect to orders page after 2 seconds
            setTimeout(() => {
                window.location.href = '/myorders';
            }, 2000);
        } else {
            console.error('Order placement error:', data);
            const errorMsg = data.error || data.message || 'Failed to place order. Please try again.';
            showAlert(errorMsg, 'error');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Place Order';
            }
        }
    } catch (error) {
        console.error('Order placement error:', error);
        showAlert('An error occurred while placing order: ' + error.message, 'error');
        
        // Re-enable submit button
        const submitBtn = event.target.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Place Order';
        }
    }
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('checkoutModal');
    if (event.target === modal) {
        closeCheckoutModal();
    }
}