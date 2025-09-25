// Authentication Utilities
class AuthManager {
    constructor() {
        this.SERVER_URL = 'https://pivora-back-end.pxxl.xyz';
        this.tokenRefreshInterval = null;
        this.init();
    }

    init() {
        // Check token validity on page load
        this.checkTokenValidity();
        
        // Set up periodic token validation
        this.startTokenValidation();
    }

    // Get stored token
    getToken() {
        return localStorage.getItem('authToken');
    }

    // Check if token exists and is valid
    async checkTokenValidity() {
        const token = this.getToken();
        if (!token) {
            this.redirectToLogin();
            return false;
        }

        try {
            const response = await fetch(`${this.SERVER_URL}/api/user/profile`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.status === 401) {
                console.log('Token is invalid or expired');
                this.clearAuthData();
                this.redirectToLogin();
                return false;
            }

            return true;
        } catch (error) {
            console.error('Error checking token validity:', error);
            return false;
        }
    }

    // Make authenticated API call with automatic retry
    async makeAuthenticatedRequest(url, options = {}) {
        const token = this.getToken();
        if (!token) {
            this.redirectToLogin();
            throw new Error('No authentication token');
        }

        const defaultOptions = {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                ...options.headers
            }
        };

        const finalOptions = { ...defaultOptions, ...options };

        try {
            const response = await fetch(url, finalOptions);
            
            if (response.status === 401) {
                console.log('Token expired, clearing auth data');
                this.clearAuthData();
                this.redirectToLogin();
                throw new Error('Authentication failed');
            }

            return response;
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    // Clear authentication data
    clearAuthData() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
    }

    // Redirect to login page
    redirectToLogin() {
        if (window.location.pathname !== '/x7k9m2n4p8q3r5s1t6u9v2w4y7z0.html' && !window.location.pathname.includes('x7k9m2n4p8q3r5s1t6u9v2w4y7z0.html')) {
            window.location.href = 'x7k9m2n4p8q3r5s1t6u9v2w4y7z0.html';
        }
    }

    // Start periodic token validation
    startTokenValidation() {
        // Check token every 5 minutes
        this.tokenRefreshInterval = setInterval(() => {
            this.checkTokenValidity();
        }, 5 * 60 * 1000);
    }

    // Stop token validation
    stopTokenValidation() {
        if (this.tokenRefreshInterval) {
            clearInterval(this.tokenRefreshInterval);
            this.tokenRefreshInterval = null;
        }
    }

    // Logout user
    logout() {
        this.clearAuthData();
        this.stopTokenValidation();
        this.redirectToLogin();
    }
}

// Create global auth manager instance
window.authManager = new AuthManager();

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthManager;
} 