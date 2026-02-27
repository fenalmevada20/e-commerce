// Contact page JavaScript

// Handle contact form submission
function handleContactSubmit(event) {
    event.preventDefault();
    
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const phone = document.getElementById('phone').value;
    const subject = document.getElementById('subject').value;
    const message = document.getElementById('message').value;
    
    // Validate form
    if (!name || !email || !phone || !subject || !message) {
        showAlert('Please fill in all fields', 'error');
        return;
    }
    
    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showAlert('Please enter a valid email', 'error');
        return;
    }
    
    // Validate phone
    if (!/^\d{10}$/.test(phone)) {
        showAlert('Please enter a valid 10-digit phone number', 'error');
        return;
    }
    
    // Prepare payload matching the server DB (server expects name, email, phone/contact, subject, message)
    const payload = {
        name: name,
        email: email,
        phone: phone,
        subject: subject,
        message: message
    };

    // Send to server API
    fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => {
        if (data && data.message) {
            showAlert('Thank you for contacting us! We will get back to you soon.', 'success');
            document.getElementById('contactForm').reset();
        } else if (data && data.error) {
            showAlert(data.error, 'error');
        } else {
            showAlert('Unexpected server response', 'error');
        }
    })
    .catch(err => {
        console.error('Feedback submit error:', err);
        showAlert('Failed to send feedback. Please try again later.', 'error');
    });
}

// Initialize contact page
document.addEventListener('DOMContentLoaded', function() {
    // Add form validation listeners
    const form = document.getElementById('contactForm');
    
    if (form) {
        const inputs = form.querySelectorAll('input, textarea');
        
        inputs.forEach(input => {
            input.addEventListener('blur', function() {
                validateContactField(this);
            });
        });
    }
});

// Validate contact form fields
function validateContactField(field) {
    const formGroup = field.closest('.form-group');
    let isValid = true;
    let errorMessage = '';
    
    // Remove existing error
    formGroup.classList.remove('error', 'success');
    let existingError = formGroup.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }
    
    // Check if empty
    if (field.hasAttribute('required') && !field.value.trim()) {
        isValid = false;
        errorMessage = 'This field is required';
    }
    
    // Email validation
    if (field.type === 'email' && field.value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(field.value)) {
            isValid = false;
            errorMessage = 'Please enter a valid email';
        }
    }
    
    // Phone validation
    if (field.type === 'tel' && field.value) {
        if (!/^\d{10}$/.test(field.value)) {
            isValid = false;
            errorMessage = 'Please enter a 10-digit phone number';
        }
    }
    
    // Show error or success
    if (!isValid && errorMessage) {
        formGroup.classList.add('error');
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = errorMessage;
        formGroup.appendChild(errorDiv);
    } else if (field.value) {
        formGroup.classList.add('success');
    }
    
    return isValid;
}