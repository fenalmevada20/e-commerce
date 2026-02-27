// Authentication JavaScript

// Handle sign in
async function handleSignIn(event) {
    event.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    // Simple validation
    if (!email || !password) {
        showAlert('Please fill in all fields', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/customer/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Set current user
            setCurrentUser(data.customer);
            showAlert('Login successful!', 'success');
            
            // Redirect to home after 1 second
            setTimeout(() => {
                window.location.href = '/';
            }, 1000);
        } else {
            showAlert(data.error || 'Invalid email or password', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showAlert('An error occurred. Please try again.', 'error');
    }
}

// Handle sign up
async function handleSignUp(event) {
    event.preventDefault();
    
    const fullname = document.getElementById('fullname').value;
    const email = document.getElementById('email').value;
    const phone = document.getElementById('phone').value;
    const address = document.getElementById('address').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // Validate form
    if (!fullname || !email || !phone || !address || !password || !confirmPassword) {
        showAlert('Please fill in all fields', 'error');
        return;
    }
    
    // Check if passwords match
    if (password !== confirmPassword) {
        showAlert('Passwords do not match', 'error');
        return;
    }
    
    // Check password length
    if (password.length < 6) {
        showAlert('Password must be at least 6 characters', 'error');
        return;
    }
    
    // Validate phone number
    if (!/^\d{10}$/.test(phone)) {
        showAlert('Please enter a valid 10-digit phone number', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/customer/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                name: fullname,
                email: email,
                phone: phone,
                address: address,
                password: password
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showAlert('Registration successful! Please login.', 'success');
            
            // Redirect to sign in after 2 seconds
            setTimeout(() => {
                window.location.href = '/signin';
            }, 2000);
        } else {
            showAlert(data.error || 'Registration failed. Please try again.', 'error');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showAlert('An error occurred. Please try again.', 'error');
    }
}

// Form validation on input
document.addEventListener('DOMContentLoaded', function() {
    const form = document.querySelector('form');
    
    if (!form) return;
    
    const inputs = form.querySelectorAll('input, textarea');
    
    inputs.forEach(input => {
        input.addEventListener('blur', function() {
            validateField(this);
        });
        
        input.addEventListener('input', function() {
            if (this.classList.contains('error')) {
                validateField(this);
            }
        });
    });
});

// Validate individual field
function validateField(field) {
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
    
    // Password validation
    if (field.type === 'password' && field.value && field.id === 'password') {
        if (field.value.length < 6) {
            isValid = false;
            errorMessage = 'Password must be at least 6 characters';
        }
    }
    
    // Confirm password validation
    if (field.id === 'confirmPassword' && field.value) {
        const password = document.getElementById('password');
        if (password && field.value !== password.value) {
            isValid = false;
            errorMessage = 'Passwords do not match';
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