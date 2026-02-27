// Orders page JavaScript

let currentFilter = 'all';

// Check if user is logged in
document.addEventListener('DOMContentLoaded', async function() {
    if (!isLoggedIn()) {
        showAlert('Please login to view your orders', 'error');
        setTimeout(() => {
            window.location.href = '/signin';
        }, 1500);
        return;
    }
    
    await loadOrders();
});

// Load and display orders
async function loadOrders() {
    try {
        const response = await fetch('/api/customer/orders', {
            method: 'GET',
            credentials: 'include'
        });
        const data = await response.json();
        
        if (!response.ok) {
            if (response.status === 401) {
                showAlert('Please login to view your orders', 'error');
                setTimeout(() => {
                    window.location.href = '/signin';
                }, 1500);
                return;
            }
            throw new Error(data.error || 'Failed to load orders');
        }
        
        const orders = data.orders || [];
        const ordersList = document.getElementById('ordersList');
        const emptyOrders = document.getElementById('emptyOrders');
        
        // Filter orders based on current filter
        let filteredOrders = orders;
        if (currentFilter !== 'all') {
            filteredOrders = orders.filter(order => 
                order.status.toLowerCase() === currentFilter
            );
        }
        
        if (filteredOrders.length === 0) {
            ordersList.style.display = 'none';
            emptyOrders.style.display = 'block';
            return;
        }
        
        ordersList.style.display = 'flex';
        emptyOrders.style.display = 'none';
    
        ordersList.innerHTML = filteredOrders.map(order => {
            const orderDate = order.created_at ? new Date(order.created_at).toLocaleDateString() : 'N/A';
            const items = order.items || [];
            
            return `
            <div class="order-card">
                <div class="order-header">
                    <div>
                        <div class="order-id">Order #${order.id}</div>
                        <div class="order-date">${orderDate}</div>
                    </div>
                    <div class="order-status status-${order.status.toLowerCase()}">
                        ${order.status}
                    </div>
                </div>
                
                <div class="order-items">
                    ${items.slice(0, 2).map(item => {
                        const imageUrl = item.product_image || '/static/images/placeholder.jpg';
                        return `
                        <div class="order-item">
                            <img src="${imageUrl}" alt="${item.product_name || 'Product'}" class="order-item-image">
                            <div class="order-item-details">
                                <div class="order-item-name">${item.product_name || 'Product'}</div>
                                <div class="order-item-price">${formatPrice(item.price)}</div>
                                <div class="order-item-quantity">Quantity: ${item.quantity}</div>
                            </div>
                        </div>
                    `;
                    }).join('')}
                    ${items.length > 2 ? `<p style="color: #666; font-size: 0.9rem; margin-top: 0.5rem;">+ ${items.length - 2} more items</p>` : ''}
                </div>
                
                <div class="order-footer">
                    <div class="order-total">Total: ${formatPrice(order.total_price)}</div>
                    <div class="order-actions">
                        <button class="btn-view-order" onclick="viewOrderDetails(${order.id})">View Details</button>
                    </div>
                </div>
            </div>
        `;
        }).join('');
    } catch (error) {
        console.error('Error loading orders:', error);
        showAlert('Failed to load orders. Please try again.', 'error');
    }
}

// Filter orders by status
function filterOrders(status) {
    currentFilter = status;
    
    // Update active button
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    if (event && event.target) {
        event.target.classList.add('active');
    }
    
    loadOrders();
}

// View order details
async function viewOrderDetails(orderId) {
    try {
        const response = await fetch(`/api/customer/orders/${orderId}`, {
            method: 'GET',
            credentials: 'include'
        });
        const data = await response.json();
        
        if (!response.ok) {
            showAlert(data.error || 'Failed to load order details', 'error');
            return;
        }
        
        const order = data.order;
        if (!order) return;
    
        const orderDetails = document.getElementById('orderDetails');
        const orderDate = order.created_at ? new Date(order.created_at).toLocaleDateString() : 'N/A';
        const items = order.items || [];
        
        orderDetails.innerHTML = `
            <div class="detail-section">
                <h3>Order Information</h3>
                <div class="detail-row">
                    <span>Order ID:</span>
                    <strong>#${order.id}</strong>
                </div>
                <div class="detail-row">
                    <span>Order Date:</span>
                    <strong>${orderDate}</strong>
                </div>
                <div class="detail-row">
                    <span>Status:</span>
                    <strong><span class="order-status status-${order.status.toLowerCase()}">${order.status}</span></strong>
                </div>
                <div class="detail-row">
                    <span>Payment Method:</span>
                    <strong>${(order.payment_method || 'cod').toUpperCase()}</strong>
                </div>
            </div>
            
            <div class="detail-section">
                <h3>Delivery Information</h3>
                <div class="detail-row">
                    <span>Contact:</span>
                    <strong>${order.contact || 'N/A'}</strong>
                </div>
                <div class="detail-row">
                    <span>Address:</span>
                    <strong>${order.address || 'N/A'}</strong>
                </div>
            </div>
        
            <div class="detail-section">
                <h3>Order Items</h3>
                <div class="modal-items-list">
                    ${items.map(item => {
                        const imageUrl = item.product_image || '/static/images/placeholder.jpg';
                        return `
                        <div class="order-item">
                            <img src="${imageUrl}" alt="${item.product_name || 'Product'}" class="order-item-image">
                            <div class="order-item-details">
                                <div class="order-item-name">${item.product_name || 'Product'}</div>
                                <div class="order-item-price">${formatPrice(item.price)}</div>
                                <div class="order-item-quantity">Quantity: ${item.quantity}</div>
                                ${item.design ? `
                                    <div style="margin-top:10px;padding:10px;background:#f8fafc;border-radius:6px;border:1px solid #eef2f7;">
                                        <div style="font-weight:600;margin-bottom:8px;">Customization Details:</div>
                                        ${item.design.image ? `<div style="margin-bottom:8px;"><img src="${item.design.image.replace(/"/g,'')}" style="max-width:100%;max-height:150px;border-radius:4px;cursor:pointer;" onclick="zoomDesignImage('${item.design.image.replace(/"/g,'').replace(/'/g,'\\\\\'')}')" title="Click to zoom"/></div>` : ''}
                                        ${item.design.text ? `<div style="margin-bottom:4px;color:#374151;">Text: ${(item.design.text || '').toString().slice(0,100)}</div>` : ''}
                                        ${item.design.textColor ? `<div style="margin-bottom:4px;color:#6b7280;font-size:0.9rem;">Text Color: <span style="display:inline-block;width:14px;height:14px;background:${item.design.textColor};border:1px solid #ddd;vertical-align:middle;border-radius:3px;"></span></div>` : ''}
                                        ${item.design.size ? `<div style="margin-bottom:4px;color:#6b7280;font-size:0.9rem;">Size: ${item.design.size}</div>` : ''}
                                        ${item.design.mobileModel ? `<div style="color:#6b7280;font-size:0.9rem;">Mobile Model: ${item.design.mobileModel}</div>` : ''}
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    `;
                    }).join('')}
                </div>
            </div>
            
            <div class="detail-section">
                <h3>Payment Summary</h3>
                <div class="detail-row">
                    <span>Total Quantity:</span>
                    <strong>${order.total_qty || 0}</strong>
                </div>
                <div class="detail-row" style="font-size: 1.2rem; color: #2c3e50; border-top: 2px solid #f8f9fa; padding-top: 1rem; margin-top: 1rem;">
                    <span>Total Amount:</span>
                    <strong>${formatPrice(order.total_price || 0)}</strong>
                </div>
            </div>
            
            <div class="detail-section" style="display:flex;gap:1rem;">
                ${order.status.toLowerCase() === 'pending' ? `
                    <button onclick="cancelOrder(${order.id})" style="flex:1;padding:12px;background:#ff6b6b;color:white;border:none;border-radius:6px;cursor:pointer;font-weight:600;font-size:1rem;">Cancel Order</button>
                ` : ''}
                ${order.status.toLowerCase() === 'delivered' ? `
                    <button onclick="openReturnModal(${order.id}, {total_price: ${order.total_price}, total_qty: ${order.total_qty}})" style="flex:1;padding:12px;background:#667eea;color:white;border:none;border-radius:6px;cursor:pointer;font-weight:600;font-size:1rem;">Return/Exchange</button>
                ` : ''}
            </div>
        `;
        
        document.getElementById('orderModal').style.display = 'block';
    } catch (error) {
        console.error('Error loading order details:', error);
        showAlert('Failed to load order details. Please try again.', 'error');
    }
}

// Close order modal
function closeOrderModal() {
    document.getElementById('orderModal').style.display = 'none';
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return date.toLocaleDateString('en-IN', options);
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('orderModal');
    if (event.target === modal) {
        closeOrderModal();
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

async function cancelOrder(orderId) {
    if (!confirm('Are you sure you want to cancel this order?')) return;
    
    try {
        const response = await fetch(`/api/orders/${orderId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        const data = await response.json();
        
        if (!response.ok) {
            showAlert(data.error || 'Failed to cancel order', 'error');
            return;
        }
        
        showAlert('Order cancelled successfully', 'success');
        closeOrderModal();
        loadOrders();
    } catch (error) {
        console.error('Error cancelling order:', error);
        showAlert('Failed to cancel order. Please try again.', 'error');
    }
}

// Add some sample orders for demonstration (remove in production)
if (!window.ordersData || window.ordersData.length === 0) {
    // This is just for demo purposes
    const currentUser = getCurrentUser();
    if (currentUser) {
        window.ordersData = [
            {
                id: 1001,
                userId: currentUser.id,
                items: [
                    {
                        id: 1,
                        name: "Custom T-Shirt",
                        price: 299,
                        image: "images/tshirt.jpg",
                        quantity: 2
                    },
                    {
                        id: 2,
                        name: "Printed Mug",
                        price: 199,
                        image: "images/mug.jpg",
                        quantity: 1
                    }
                ],
                address: currentUser.address || "Gandhinagar, Gujarat",
                contact: currentUser.phone || "1234567890",
                paymentMethod: "cod",
                totalAmount: 945.24,
                status: "Delivered",
                orderDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
            },
            {
                id: 1002,
                userId: currentUser.id,
                items: [
                    {
                        id: 3,
                        name: "Custom Keychain",
                        price: 99,
                        image: "images/keychain.jpg",
                        quantity: 3
                    }
                ],
                address: currentUser.address || "Gandhinagar, Gujarat",
                contact: currentUser.phone || "1234567890",
                paymentMethod: "cod",
                totalAmount: 351.18,
                status: "Processing",
                orderDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
            }
        ];
    }
}

// Open return modal with order details
function openReturnModal(orderId, orderDetails) {
    const modal = document.createElement('div');
    modal.id = 'returnModal';
    modal.style.cssText = `
        position: fixed;
        z-index: 1000;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
    `;
    
    modal.innerHTML = `
        <div style="background-color: white; margin: auto; padding: 2rem; border-radius: 10px; max-width: 600px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); width: 90%; max-height: 90vh; overflow-y: auto;">
            <span style="color: #999; float: right; font-size: 2rem; font-weight: bold; cursor: pointer; transition: color 0.3s;" onclick="this.parentElement.parentElement.remove()">&times;</span>
            <h2 style="color: #2c3e50; margin-bottom: 1.5rem; margin-top: 0;">Request Return/Exchange</h2>
            
            <div style="background: #f9f9f9; padding: 1rem; border-radius: 5px; margin-bottom: 1.5rem;">
                <p style="margin: 0.5rem 0; color: #666;"><strong>Order ID:</strong> #${orderId}</p>
                <p style="margin: 0.5rem 0; color: #666;"><strong>Amount:</strong> ₹${orderDetails.total_price}</p>
                <p style="margin: 0.5rem 0; color: #666;"><strong>Items:</strong> ${orderDetails.total_qty}</p>
            </div>

            <form onsubmit="submitReturnRequest(event, ${orderId}, this.parentElement.parentElement)" enctype="multipart/form-data">
                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; color: #333;" for="return_type">Request Type</label>
                    <select id="return_type" name="return_type" required style="width: 100%; padding: 0.8rem; border: 1px solid #ddd; border-radius: 5px; font-family: Arial, sans-serif; font-size: 1rem;">
                        <option value="return">Return (Refund)</option>
                        <option value="exchange">Exchange (Replacement)</option>
                    </select>
                </div>

                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; color: #333;">📸 Upload Images (Optional)</label>
                    <input type="file" name="images" accept="image/*" multiple style="width: 100%; padding: 0.8rem; border: 2px dashed #667eea; border-radius: 5px; background: #f9f9f9; cursor: pointer; box-sizing: border-box;">
                    <div id="imageNameDisplay" style="margin-top: 0.5rem; font-size: 0.85rem; color: #667eea; font-weight: 500;"></div>
                </div>

                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; color: #333;">🎥 Upload Video (Optional)</label>
                    <input type="file" name="video" accept="video/*" style="width: 100%; padding: 0.8rem; border: 2px dashed #667eea; border-radius: 5px; background: #f9f9f9; cursor: pointer; box-sizing: border-box;">
                    <div id="videoNameDisplay" style="margin-top: 0.5rem; font-size: 0.85rem; color: #667eea; font-weight: 500;"></div>
                </div>

                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; color: #333;" for="returnReason">Reason for Return/Exchange</label>
                    <textarea id="returnReason" name="reason" placeholder="Please describe the reason for your return..." required style="width: 100%; padding: 0.8rem; border: 1px solid #ddd; border-radius: 5px; font-family: Arial, sans-serif; font-size: 1rem; resize: vertical; min-height: 120px; box-sizing: border-box;"></textarea>
                </div>

                <div style="display: flex; gap: 1rem; margin-top: 2rem;">
                    <button type="submit" style="flex: 1; padding: 0.8rem; background: #667eea; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: 600; transition: background 0.3s;">Submit Request</button>
                    <button type="button" style="flex: 1; padding: 0.8rem; background: #e0e0e0; color: #333; border: none; border-radius: 5px; cursor: pointer; font-weight: 600; transition: background 0.3s;" onclick="this.parentElement.parentElement.parentElement.remove()">Cancel</button>
                </div>
            </form>
        </div>
    `;
    
    // Add event listeners for file inputs
    const imageInput = modal.querySelector('input[name="images"]');
    const videoInput = modal.querySelector('input[name="video"]');
    const imageDisplay = modal.querySelector('#imageNameDisplay');
    const videoDisplay = modal.querySelector('#videoNameDisplay');

    if (imageInput) {
        imageInput.addEventListener('change', function() {
            const names = Array.from(this.files).map(f => f.name).join(', ');
            imageDisplay.textContent = names ? `📁 Selected: ${names}` : '';
        });
    }

    if (videoInput) {
        videoInput.addEventListener('change', function() {
            const name = this.files[0] ? this.files[0].name : '';
            videoDisplay.textContent = name ? `📁 Selected: ${name}` : '';
        });
    }
    
    // Close on background click
    modal.onclick = function(event) {
        if (event.target === modal) {
            modal.remove();
        }
    };
    
    document.body.appendChild(modal);
}

// Submit return request
async function submitReturnRequest(event, orderId, modalElement) {
    event.preventDefault();

    const form = event.target;
    const returnType = form.querySelector('select[name="return_type"]').value;
    const reason = form.querySelector('textarea[name="reason"]').value.trim();
    const imageInput = form.querySelector('input[name="images"]');
    const videoInput = form.querySelector('input[name="video"]');

    if (!reason) {
        alert('Please provide a reason for the return.');
        return;
    }

    try {
        // Use FormData to handle both text and file uploads
        const formData = new FormData();
        formData.append('order_id', orderId);
        formData.append('return_type', returnType);
        formData.append('reason', reason);

        // Add image files if selected
        if (imageInput && imageInput.files.length > 0) {
            for (let file of imageInput.files) {
                formData.append('images', file);
            }
        }

        // Add video file if selected
        if (videoInput && videoInput.files.length > 0) {
            formData.append('video', videoInput.files[0]);
        }

        console.log('Submitting return request with:', {
            order_id: orderId,
            return_type: returnType,
            reason: reason,
            images: imageInput?.files.length || 0,
            video: videoInput?.files.length || 0
        });

        const response = await fetch('/api/returns/submit', {
            method: 'POST',
            credentials: 'include',
            body: formData
        });

        const data = await response.json();
        console.log('Response status:', response.status, 'Data:', data);

        if (response.ok) {
            showAlert('Return request submitted successfully!', 'success');
            modalElement.remove(); // Close modal
            closeOrderModal(); // Close order details modal
            loadOrders(); // Reload orders
        } else {
            console.error('Server error:', data);
            showAlert(data.error || 'Error submitting return request', 'error');
        }
    } catch (error) {
        console.error('Fetch error:', error);
        showAlert('Error submitting return request: ' + error.message, 'error');
    }
}

// Return functionality
function requestReturnFromOrder(orderId, orderDetails) {
    // Store order data and redirect to returns page
    sessionStorage.setItem('returnOrderId', orderId);
    sessionStorage.setItem('returnOrderDetails', JSON.stringify(orderDetails));
    window.location.href = "/returns";
}

// Change Password Modal
function openChangePasswordModal() {
    const modal = document.getElementById('changePasswordModal');
    if (modal) modal.style.display = 'block';
}

function closeChangePasswordModal() {
    const modal = document.getElementById('changePasswordModal');
    if (modal) modal.style.display = 'none';
    document.getElementById('changePasswordForm').reset();
}

// Handle Change Password
async function handleChangePassword(event) {
    event.preventDefault();
    
    const oldPassword = document.getElementById('oldPassword').value;
    const newPassword = document.getElementById('newPasswordInput').value;
    const confirmPassword = document.getElementById('confirmPasswordInput').value;
    const messageDiv = document.getElementById('changePasswordMessage');
    const submitBtn = event.target.querySelector('button[type="submit"]');
    
    // Validate
    if (newPassword !== confirmPassword) {
        messageDiv.style.display = 'block';
        messageDiv.style.backgroundColor = '#f8d7da';
        messageDiv.style.color = '#721c24';
        messageDiv.innerHTML = '<p>New passwords do not match!</p>';
        return;
    }
    
    if (newPassword.length < 6) {
        messageDiv.style.display = 'block';
        messageDiv.style.backgroundColor = '#f8d7da';
        messageDiv.style.color = '#721c24';
        messageDiv.innerHTML = '<p>Password must be at least 6 characters!</p>';
        return;
    }
    
    // Change button color to orange
    if (submitBtn) {
        submitBtn.style.backgroundColor = '#f39c12';
        submitBtn.style.color = 'white';
        submitBtn.textContent = 'Changing...';
        submitBtn.disabled = true;
    }
    
    try {
        const response = await fetch('/api/customer/change-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                old_password: oldPassword,
                new_password: newPassword,
                confirm_password: confirmPassword
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Change button to green
            if (submitBtn) {
                submitBtn.style.backgroundColor = '#27ae60';
                submitBtn.textContent = '✓ Password Changed!';
            }
            
            messageDiv.style.display = 'block';
            messageDiv.style.backgroundColor = '#d4edda';
            messageDiv.style.color = '#155724';
            messageDiv.innerHTML = '<p>Password changed successfully!</p>';
            
            document.getElementById('changePasswordForm').reset();
            
            setTimeout(() => {
                closeChangePasswordModal();
                if (submitBtn) {
                    submitBtn.style.backgroundColor = '';
                    submitBtn.textContent = 'Change Password';
                    submitBtn.disabled = false;
                }
            }, 2000);
        } else {
            // Change button to red
            if (submitBtn) {
                submitBtn.style.backgroundColor = '#e74c3c';
                submitBtn.textContent = '✗ Failed!';
                setTimeout(() => {
                    submitBtn.style.backgroundColor = '';
                    submitBtn.textContent = 'Change Password';
                    submitBtn.disabled = false;
                }, 2000);
            }
            
            messageDiv.style.display = 'block';
            messageDiv.style.backgroundColor = '#f8d7da';
            messageDiv.style.color = '#721c24';
            messageDiv.innerHTML = `<p>${data.error || 'Failed to change password'}</p>`;
        }
    } catch (error) {
        console.error('Error:', error);
        
        // Change button to red
        if (submitBtn) {
            submitBtn.style.backgroundColor = '#e74c3c';
            submitBtn.textContent = '✗ Error!';
            setTimeout(() => {
                submitBtn.style.backgroundColor = '';
                submitBtn.textContent = 'Change Password';
                submitBtn.disabled = false;
            }, 2000);
        }
        
        messageDiv.style.display = 'block';
        messageDiv.style.backgroundColor = '#f8d7da';
        messageDiv.style.color = '#721c24';
        messageDiv.innerHTML = '<p>An error occurred. Please try again.</p>';
    }
}

// Close modal when clicking outside
window.onclick = function(event) {
    const changePasswordModal = document.getElementById('changePasswordModal');
    if (event.target === changePasswordModal) {
        closeChangePasswordModal();
    }
}