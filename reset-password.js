// Reset Password Handler
async function handleResetPassword(event) {
    event.preventDefault();
    
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const messageDiv = document.getElementById('message');
    const form = event.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    
    // Extract token from URL path
    const pathParts = window.location.pathname.split('/');
    let token = pathParts[pathParts.length - 1];
    
    console.log('[Reset Password] Token:', token);
    
    // Validate token
    if (!token || token === "" || token.includes("{{")) {
        displayErrorMessage('Invalid reset link. Please request a new password reset link.');
        return;
    }
    
    // Validate password match
    if (password !== confirmPassword) {
        displayErrorMessage('Passwords do not match.');
        return;
    }
    
    // Validate password length
    if (password.length < 6) {
        displayErrorMessage('Password must be at least 6 characters long.');
        return;
    }
    
    // Change button to show processing state
    if (submitBtn) {
        submitBtn.textContent = 'Resetting...';
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.7';
    }
    
    try {
        const response = await fetch('/api/customer/reset-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                token: token.trim(), 
                password: password.trim() 
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Success
            if (submitBtn) {
                submitBtn.textContent = '✓ Password Reset!';
                submitBtn.disabled = true;
                submitBtn.style.backgroundColor = '#27ae60';
                submitBtn.style.color = 'white';
            }
            
            messageDiv.style.display = 'block';
            messageDiv.style.backgroundColor = '#d4edda';
            messageDiv.style.color = '#155724';
            messageDiv.style.border = '1px solid #c3e6cb';
            messageDiv.style.padding = '15px';
            messageDiv.style.borderRadius = '5px';
            messageDiv.innerHTML = `
                <h4>Success!</h4>
                <p>${data.message || 'Password reset successful!'}</p>
                <p style="font-size: 0.9em; margin-top: 10px;">Redirecting to Sign In...</p>
            `;
            
            // Redirect to signin after 2 seconds
            setTimeout(() => {
                window.location.href = '/signin';
            }, 2000);
        } else {
            // Error
            const errorMsg = data.error || 'Failed to reset password. Please try again.';
            displayErrorMessage(errorMsg);
            
            if (submitBtn) {
                submitBtn.textContent = '✗ Failed!';
                submitBtn.style.backgroundColor = '#e74c3c';
                submitBtn.style.color = 'white';
                
                setTimeout(() => {
                    submitBtn.textContent = 'Reset Password';
                    submitBtn.disabled = false;
                    submitBtn.style.opacity = '1';
                    submitBtn.style.backgroundColor = '';
                }, 2000);
            }
        }
        
    } catch (error) {
        console.error('[Reset Password] Error:', error);
        
        displayErrorMessage('Something went wrong. Please check your connection and try again.');
        
        // Reset button state
        if (submitBtn) {
            submitBtn.textContent = '✗ Error!';
            submitBtn.style.backgroundColor = '#e74c3c';
            submitBtn.style.color = 'white';
            
            setTimeout(() => {
                submitBtn.textContent = 'Reset Password';
                submitBtn.disabled = false;
                submitBtn.style.opacity = '1';
                submitBtn.style.backgroundColor = '';
            }, 2000);
        }
    }
}

// Helper function to display error messages
function displayErrorMessage(message) {
    const messageDiv = document.getElementById('message');
    if (messageDiv) {
        messageDiv.style.display = 'block';
        messageDiv.style.backgroundColor = '#f8d7da';
        messageDiv.style.color = '#721c24';
        messageDiv.style.border = '1px solid #f5c6cb';
        messageDiv.style.padding = '15px';
        messageDiv.style.borderRadius = '5px';
        messageDiv.innerHTML = `<h4>Error!</h4><p>${message}</p>`;
    }
}
