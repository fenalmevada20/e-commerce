let currentOrderId = null;
let scrollPosition = 0;

document.addEventListener('DOMContentLoaded', function() {
    loadReturns();
    setupFileUploads();
});

function setupFileUploads() {
    // Setup image upload
    const imageUploadInput = document.getElementById('imageUpload');
    const imageNameDisplay = document.getElementById('imageNameDisplay');

    if (imageUploadInput) {
        imageUploadInput.addEventListener('change', function () {
            const names = Array.from(this.files).map(f => f.name).join(', ');
            if (imageNameDisplay) {
                imageNameDisplay.textContent = names ? `📁 Selected: ${names}` : '';
            }
        });
    }

    // Setup video upload
    const videoUploadInput = document.getElementById('videoUpload');
    const videoNameDisplay = document.getElementById('videoNameDisplay');

    if (videoUploadInput) {
        videoUploadInput.addEventListener('change', function () {
            const name = this.files[0] ? this.files[0].name : '';
            if (videoNameDisplay) {
                videoNameDisplay.textContent = name ? `📁 Selected: ${name}` : '';
            }
        });
    }
}

async function loadReturns() {
    try {
        const response = await fetch('/api/returns/my-returns', {
            credentials: 'include'
        });

        if (response.status === 401) {
            document.getElementById('returnsContent').innerHTML = '<div class="no-returns"><p>Please login to view your returns.</p><a href="/signin" class="btn-return">Login</a></div>';
            return;
        }

        const data = await response.json();
        const returns = data.returns || [];

        if (returns.length === 0) {
            const ordersLink = '<a href="/myorders" class="btn-return">Back to Orders</a>';
            document.getElementById('returnsContent').innerHTML = `<div class="no-returns"><p>You have no return or exchange requests yet.</p>${ordersLink}</div>`;
            return;
        }

        const returnsHTML = returns.map(ret => `
            <div class="return-card">
                <!-- Header Section -->
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                    <div>
                        <h3 style="margin: 0 0 0.5rem 0; color: #2c3e50;">Order #${ret.order_id}</h3>
                        <span class="return-status status-${ret.status}">${ret.status.toUpperCase()}</span>
                    </div>
                    <div style="text-align: right; font-size: 0.9rem; color: #999;">
                        <div>${new Date(ret.created_at).toLocaleDateString()}</div>
                        <div style="font-size: 0.85rem; margin-top: 4px; color: #666;">Request ID: ${ret.id}</div>
                    </div>
                </div>

                <!-- Compact Summary -->
                <div class="summary-section">
                    <p><strong>Type:</strong> ${ret.return_type === 'return' ? '💰 Return (Refund)' : '🔄 Exchange (Replacement)'}</p>
                    <p style="margin: 0.5rem 0 0 0; color: #666;"><strong>Reason:</strong> ${ret.reason.substring(0, 100)}${ret.reason.length > 100 ? '...' : ''}</p>
                </div>

                <!-- Details Button -->
                <button class="details-toggle-btn" onclick="openDetailsModal(${ret.id})">
                    <span class="btn-text">View Details</span>
                    <span class="btn-icon">→</span>
                </button>
            </div>
        `).join('');

        document.getElementById('returnsContent').innerHTML = returnsHTML;
    } catch (error) {
        console.error('Error loading returns:', error);
        document.getElementById('returnsContent').innerHTML = '<div class="no-returns"><p>Error loading returns. Please try again.</p></div>';
    }
}

function openReturnModal(orderId, orderDetails) {
    currentOrderId = orderId;
    scrollPosition = window.scrollY;
    
    if (orderDetails) {
        document.getElementById('orderInfo').innerHTML = `
            <p><strong>Order ID:</strong> #${orderId}</p>
            <p><strong>Amount:</strong> ₹${orderDetails.total_price}</p>
            <p><strong>Items:</strong> ${orderDetails.total_qty}</p>
        `;
    }
    
    document.getElementById('returnModal').style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeReturnModal() {
    document.getElementById('returnModal').style.display = 'none';
    document.getElementById('returnForm').reset();
    document.getElementById('imageNameDisplay').textContent = '';
    document.getElementById('videoNameDisplay').textContent = '';
    document.body.style.overflow = 'auto';
    window.scrollTo(0, scrollPosition);
    currentOrderId = null;
}

// Submit Form
document.addEventListener('DOMContentLoaded', function() {
    const returnForm = document.getElementById('returnForm');
    if (returnForm) {
        returnForm.addEventListener('submit', async function(event){
            event.preventDefault();

            if (!currentOrderId) {
                alert('Please select an order');
                return;
            }

            const formData = new FormData(this);
            formData.append("order_id", currentOrderId);

            try {
                const response = await fetch("/api/returns/submit", {
                    method: "POST",
                    body: formData,
                    credentials: "include"
                });

                const result = await response.json();

                if (response.ok) {
                    alert("Return request submitted successfully ✅");
                    closeReturnModal();
                    loadReturns();
                } else {
                    alert(result.error || "Error submitting request ❌");
                }

            } catch (error) {
                console.error(error);
                alert("Something went wrong ❌");
            }
        });
    }
});

// Close modal when clicking outside
window.onclick = function(event) {
    const returnModal = document.getElementById('returnModal');
    if (event.target === returnModal) {
        closeReturnModal();
    }
    
    const detailsModal = document.getElementById('detailsModal');
    if (event.target === detailsModal) {
        closeDetailsModal();
    }
}

// Toggle Return Details
function toggleReturnDetails(returnId) {
    const detailsDiv = document.getElementById(`details-${returnId}`);
    const button = event.target.closest('.details-toggle-btn');
    
    // Close all other open details
    const allDetails = document.querySelectorAll('.return-details');
    const allButtons = document.querySelectorAll('.details-toggle-btn');
    
    allDetails.forEach(detail => {
        if (detail.id !== `details-${returnId}`) {
            detail.style.display = 'none';
        }
    });
    
    allButtons.forEach(btn => {
        if (btn !== button) {
            btn.classList.remove('expanded');
        }
    });
    
    // Toggle current
    if (detailsDiv.style.display === 'none' || detailsDiv.style.display === '') {
        detailsDiv.style.display = 'block';
        button.classList.add('expanded');
    } else {
        detailsDiv.style.display = 'none';
        button.classList.remove('expanded');
    }
}

// Open Details Modal
async function openDetailsModal(returnId) {
    try {
        const response = await fetch('/api/returns/my-returns', {
            credentials: 'include'
        });
        
        if (!response.ok) {
            alert('Error loading details');
            return;
        }
        
        const data = await response.json();
        const ret = data.returns.find(r => r.id === returnId);
        
        if (!ret) {
            alert('Return not found');
            return;
        }
        
        const modalContent = `
            <span class="close-modal" onclick="closeDetailsModal()">✖</span>
            
            <!-- Header Section -->
            <div style="margin-bottom: 1.5rem; border-bottom: 2px solid #eee; padding-bottom: 1rem;">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div>
                        <h2 style="margin: 0 0 0.5rem 0; color: #2c3e50;">Order #${ret.order_id}</h2>
                        <span class="return-status status-${ret.status}">${ret.status.toUpperCase()}</span>
                    </div>
                    <div style="text-align: right; font-size: 0.9rem; color: #999;">
                        <div>${new Date(ret.created_at).toLocaleDateString()}</div>
                        <div style="font-size: 0.85rem; margin-top: 4px; color: #666;">Request ID: ${ret.id}</div>
                    </div>
                </div>
            </div>

            <!-- Request Type Section -->
            <div class="request-type-section ${ret.return_type}" style="margin-bottom: 1.5rem;">
                <span class="type-badge">${ret.return_type === 'return' ? '💰 RETURN (REFUND)' : '🔄 EXCHANGE (REPLACEMENT)'}</span>
            </div>

            <!-- Full Reason Section -->
            <div class="info-section">
                <h4 style="margin: 0 0 0.5rem 0; color: #34495e;">📝 Reason for Request</h4>
                <p style="margin: 0; color: #555; line-height: 1.5;">${ret.reason}</p>
            </div>

            <!-- Order Items Section -->
            ${ret.order && ret.order.items && ret.order.items.length > 0 ? `
                <div class="info-section">
                    <h4 style="margin: 0 0 0.5rem 0; color: #34495e;">📦 Order Items</h4>
                    <div class="order-items-list">
                        ${ret.order.items.map(item => `
                            <div class="order-item">
                                ${item.product_image ? `
                                    <img src="${item.product_image}" alt="${item.product_name}" class="item-image">
                                ` : `
                                    <div class="item-image placeholder">No Image</div>
                                `}
                                <div class="item-details">
                                    <div class="item-name">${item.product_name}</div>
                                    <div class="item-qty">Qty: ${item.quantity}</div>
                                    <div class="item-price">₹${item.price.toFixed(2)}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    <div class="order-summary">
                        <div>Total Items: ${ret.order.total_qty}</div>
                        <div><strong>Order Total: ₹${ret.order.total_price.toFixed(2)}</strong></div>
                    </div>
                </div>
            ` : ''}

            <!-- Media Files Section -->
            ${ret.media_list && ret.media_list.length > 0 ? `
                <div class="info-section">
                    <h4 style="margin: 0 0 0.5rem 0; color: #34495e;">📁 Uploaded Files (${ret.media_list.length})</h4>
                    <div class="media-gallery">
                        ${ret.media_list.map(media => `
                            <div class="media-item ${media.type}">
                                ${media.type === 'image' ? `
                                    <img src="${media.url}" alt="Uploaded" class="media-thumbnail" onerror="this.src='/static/img/placeholder.jpg'">
                                ` : `
                                    <div class="video-thumbnail">
                                        <video class="media-thumbnail"><source src="${media.url}" type="video/mp4"></video>
                                        <div class="play-icon">▶️</div>
                                    </div>
                                `}
                                <div class="media-info">
                                    <span class="media-type">${media.type === 'image' ? '📸' : '🎥'}</span>
                                    <a href="${media.url}" download title="Download" class="download-btn">⬇️</a>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}

            <!-- Admin Notes Section -->
            ${ret.admin_notes ? `
                <div style="background: #e8f4f8; padding: 12px; border-left: 4px solid #3498db; border-radius: 4px; margin-top: 1rem;">
                    <strong style="color: #2980b9;">📋 Admin Response:</strong><br>
                    <span style="color: #34495e;">${ret.admin_notes}</span>
                </div>
            ` : ''}

            <!-- Order Status Info -->
            <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #eee; font-size: 0.9rem; color: #666;">
                ${ret.order ? `
                    <div>📍 Delivery Address: ${ret.order.address}</div>
                    <div style="margin-top: 0.3rem;">📦 Order Status: <strong>${ret.order.status.toUpperCase()}</strong></div>
                ` : ''}
            </div>
        `;
        
        document.getElementById('detailsModalContent').innerHTML = modalContent;
        document.getElementById('detailsModal').style.display = 'block';
        document.body.style.overflow = 'hidden';
        
    } catch (error) {
        console.error('Error loading details:', error);
        alert('Error loading details. Please try again.');
    }
}

// Close Details Modal
function closeDetailsModal() {
    document.getElementById('detailsModal').style.display = 'none';
    document.body.style.overflow = 'auto';
}
