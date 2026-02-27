// Admin Login JavaScript

// Handle admin login
async function handleAdminLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    if (!username || !password) {
        showAdminAlert('Please fill in all fields', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/admin/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include', // Include cookies for session
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Set admin user in localStorage
            setCurrentAdmin(data.admin);
            showAdminAlert('Login successful!', 'success');
            
            // Redirect to dashboard immediately (session is set on server)
            setTimeout(() => {
                window.location.href = '/admin/dashboard';
            }, 500);
        } else {
            showAdminAlert(data.error || 'Invalid username or password', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showAdminAlert('An error occurred. Please try again.', 'error');
    }
}

// Check if already logged in
document.addEventListener('DOMContentLoaded', async function() {
    // Check if admin is already logged in via session
    // Add a small delay to prevent immediate redirect
    setTimeout(async () => {
        try {
            const response = await fetch('/api/admin/dashboard/stats', {
                method: 'GET',
                credentials: 'include' // Include cookies for session
            });
            if (response.ok) {
                // Already logged in, redirect to dashboard
                window.location.href = '/admin/dashboard';
            }
        } catch (error) {
            // Not logged in, stay on login page
        }
    }, 500);
});