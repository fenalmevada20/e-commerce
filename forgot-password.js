// Forgot Password Handler
async function handleForgotPassword(event) {
    event.preventDefault();
    
    const email = document.getElementById('email').value;
    const messageDiv = document.getElementById('message');
    const submitBtn = event.target.querySelector('button[type="submit"]');
    
    // Change button to orange (processing)
    if (submitBtn) {
        submitBtn.style.backgroundColor = '#f39c12';
        submitBtn.style.color = 'white';
        submitBtn.textContent = 'Sending...';
        submitBtn.disabled = true;
    }
    
    try {
        const response = await fetch('/api/customer/forgot-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email: email })
        });
        
        const data = await response.json();
        
        // Change button to green (success)
        if (submitBtn) {
            submitBtn.style.backgroundColor = '#27ae60';
            submitBtn.textContent = '✓ Link Sent!';
        }
        
        messageDiv.style.display = 'block';
        messageDiv.style.backgroundColor = '#d4edda';
        messageDiv.style.color = '#155724';
        messageDiv.style.border = '1px solid #c3e6cb';
        messageDiv.innerHTML = `
            <h4>Success!</h4>
            <p>${data.message}</p>
            <p style="font-size: 0.9em; margin-top: 10px;">Please check your email for the reset link. If you don't see it, check your spam folder.</p>
        `;
        
        // Reset form
        document.getElementById('forgotPasswordForm').reset();
        
        // Reset button after 2 seconds, then redirect
        setTimeout(() => {
            if (submitBtn) {
                submitBtn.style.backgroundColor = '';
                submitBtn.textContent = 'Send Reset Link';
                submitBtn.disabled = false;
            }
            
            // Redirect to signin after 3 seconds total
            setTimeout(() => {
                const signinUrl = document.querySelector('a[href*="/signin"]')?.href || '/signin';
                window.location.href = signinUrl;
            }, 1000);
        }, 2000);
        
    } catch (error) {
        console.error('Error:', error);
        
        // Change button to red (error)
        if (submitBtn) {
            submitBtn.style.backgroundColor = '#e74c3c';
            submitBtn.textContent = '✗ Failed!';
            
            setTimeout(() => {
                submitBtn.style.backgroundColor = '';
                submitBtn.textContent = 'Send Reset Link';
                submitBtn.disabled = false;
            }, 2000);
        }
        
        messageDiv.style.display = 'block';
        messageDiv.style.backgroundColor = '#f8d7da';
        messageDiv.style.color = '#721c24';
        messageDiv.style.border = '1px solid #f5c6cb';
        messageDiv.innerHTML = `<h4>Error!</h4><p>Something went wrong. Please try again.</p>`;
    }
}
