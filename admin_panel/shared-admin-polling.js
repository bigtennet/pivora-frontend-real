// Shared Admin Polling System for Pending Orders
// Include this file in all admin pages to enable background polling

// Use existing SERVER_URL if available, otherwise define it
const POLLING_SERVER_URL = window.SERVER_URL || 'https://pivora-back-end.pxxl.xyz';

// Background polling for pending orders - only declare if not already declared
if (typeof window.pendingOrdersPollingInterval === 'undefined') {
    window.pendingOrdersPollingInterval = null;
}
if (typeof window.lastPendingOrdersCheck === 'undefined') {
    window.lastPendingOrdersCheck = 0;
}
if (typeof window.hasPendingOrders === 'undefined') {
    window.hasPendingOrders = false; // Track if we have pending orders
}

function initPendingOrdersPolling() {
    console.log('initPendingOrdersPolling called');
    
    // Check immediately on page load
    console.log('Checking orders immediately...');
    checkPendingOrders();
    
    // Set up polling every 30 minutes (30 * 60 * 1000 = 1,800,000 ms)
    console.log('Setting up polling interval (30 minutes)');
    window.pendingOrdersPollingInterval = setInterval(checkPendingOrders, 30 * 60 * 1000);
    
    // Also check when page becomes visible (user comes back to tab)
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden) {
            // Check if it's been more than 30 minutes since last check
            const now = Date.now();
            if (now - window.lastPendingOrdersCheck > 30 * 60 * 1000) {
                console.log('Page became visible, checking orders...');
                checkPendingOrders();
            }
        }
    });
    
    console.log('Polling system initialized successfully');
}

async function checkPendingOrders() {
    try {
        console.log('Checking for pending orders...');
        const adminToken = localStorage.getItem('adminToken');
        if (!adminToken) {
            console.log('No admin token found, skipping check');
            return; // Not logged in
        }

        console.log('Making request to pending orders endpoint...');
        const response = await fetch(`${POLLING_SERVER_URL}/api/admin/orders?status=active`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('Response status:', response.data);
        if (response.ok) {
            const data = await response.json();
            console.log('Pending orders response:', data);
            
            // Handle the actual backend response structure
            let pendingOrders = [];
            if (data.success && data.data && data.data.orders) {
                console.log('Found orders array with', data.data.orders.length, 'orders');
                
                // Filter for active orders (pending orders) with null checks
                pendingOrders = data.data.orders.filter(order => {
                    console.log('Checking order:', order);
                    if (!order) {
                        console.log('Order is null/undefined, skipping');
                        return false;
                    }
                    if (!order.status) {
                        console.log('Order has no status, skipping');
                        return false;
                    }
                    const isValidStatus = order.status === 'active' || 
                                        order.status === 'pending' || 
                                        order.status === 'pending_profit';
                    console.log('Order status:', order.status, 'isValid:', isValidStatus);
                    return isValidStatus;
                });
                console.log('Filtered active/pending orders:', pendingOrders.length);
            } else if (data.success && data.data && Array.isArray(data.data)) {
                console.log('data.data is an array with', data.data.length, 'items');
                // If data.data is directly an array
                pendingOrders = data.data.filter(order => {
                    if (!order || !order.status) return false;
                    return order.status === 'active' || 
                           order.status === 'pending' || 
                           order.status === 'pending_profit';
                });
            } else if (Array.isArray(data)) {
                console.log('data is an array with', data.length, 'items');
                // If data is directly an array
                pendingOrders = data.filter(order => {
                    if (!order || !order.status) return false;
                    return order.status === 'active' || 
                           order.status === 'pending' || 
                           order.status === 'pending_profit';
                });
            } else {
                console.log('No valid orders array found in response');
            }
            
            console.log('Pending orders found:', pendingOrders.length);
            console.log('Sample pending order:', pendingOrders[0]);
            
            const newHasPendingOrders = pendingOrders.length > 0;
            console.log('Current hasPendingOrders:', window.hasPendingOrders);
            console.log('New hasPendingOrders:', newHasPendingOrders);
            
            // Only show alert and play sound if we didn't have pending orders before
            if (newHasPendingOrders && !window.hasPendingOrders) {
                console.log('Showing alert for new pending orders');
                showPendingOrdersAlert(pendingOrders);
                playAlertSound();
                updateTradingManagementBadge(pendingOrders.length);
            } else if (newHasPendingOrders && window.hasPendingOrders) {
                // Update badge count if we already had pending orders
                console.log('Updating badge count');
                updateTradingManagementBadge(pendingOrders.length);
            } else if (!newHasPendingOrders && window.hasPendingOrders) {
                // Remove badge if no more pending orders
                console.log('Removing badge - no pending orders');
                removeTradingManagementBadge();
            }
            
            window.hasPendingOrders = newHasPendingOrders;
        } else {
            console.error('Response not ok:', response.status, response.statusText);
        }
        
        window.lastPendingOrdersCheck = Date.now();
    } catch (error) {
        console.error('Error checking pending orders:', error);
    }
}

function showPendingOrdersAlert(pendingOrders) {
    console.log('showPendingOrdersAlert called with', pendingOrders.length, 'orders');
    console.log('Sample order structure:', pendingOrders[0]);
    
    // Remove any existing alerts
    const existingAlert = document.querySelector('.pending-orders-alert');
    if (existingAlert) {
        console.log('Removing existing alert');
        existingAlert.remove();
    }

    const alert = document.createElement('div');
    alert.className = 'pending-orders-alert';
    alert.innerHTML = `
        <div class="alert-content">
            <div class="alert-header">
                <i class="fas fa-exclamation-triangle"></i>
                <h4>Pending Orders Alert</h4>
                <button class="close-alert" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
            <div class="alert-body">
                <p><strong>${pendingOrders.length}</strong> pending order(s) require attention</p>
                <div class="orders-preview">
                    ${pendingOrders.slice(0, 3).map(order => `
                        <div class="order-item">
                            <span class="order-user">${order?.user?.email || 'Unknown User'}</span>
                            <span class="order-symbol">${order?.ticker || 'N/A'}</span>
                            <span class="order-amount">$${order?.entryPrice || 'N/A'}</span>
                        </div>
                    `).join('')}
                    ${pendingOrders.length > 3 ? `<p class="more-orders">+${pendingOrders.length - 3} more orders...</p>` : ''}
                </div>
            </div>
            <div class="alert-actions">
                <button class="btn btn-primary btn-sm" onclick="viewAllPendingOrders()">
                    <i class="fas fa-eye"></i> View All Orders
                </button>
                <button class="btn btn-secondary btn-sm" onclick="dismissAlert()">
                    <i class="fas fa-times"></i> Dismiss
                </button>
            </div>
        </div>
    `;

    console.log('Adding alert to DOM');
    document.body.appendChild(alert);
    console.log('Alert added successfully');

    // Auto-dismiss after 5 minutes
    setTimeout(() => {
        if (alert.parentElement) {
            console.log('Auto-dismissing alert');
            alert.remove();
        }
    }, 5 * 60 * 1000);
}

function updateTradingManagementBadge(count) {
    console.log('updateTradingManagementBadge called with count:', count);
    
    // Find the Trading Management link in the sidebar
    const tradingManagementLink = document.querySelector('nav a[href="trading-management.html"]');
    console.log('Trading Management link found:', tradingManagementLink);
    
    if (tradingManagementLink) {
        // Remove existing badge
        const existingBadge = tradingManagementLink.querySelector('.notification-badge');
        if (existingBadge) {
            console.log('Removing existing badge');
            existingBadge.remove();
        }
        
        // Add new badge
        const badge = document.createElement('span');
        badge.className = 'notification-badge';
        badge.textContent = count > 99 ? '99+' : count;
        badge.title = `${count} pending order(s)`;
        
        console.log('Adding badge with text:', badge.textContent);
        tradingManagementLink.appendChild(badge);
        console.log('Badge added successfully');
    } else {
        console.log('Trading Management link not found');
    }
}

function removeTradingManagementBadge() {
    console.log('removeTradingManagementBadge called');
    
    const tradingManagementLink = document.querySelector('nav a[href="trading-management.html"]');
    if (tradingManagementLink) {
        const existingBadge = tradingManagementLink.querySelector('.notification-badge');
        if (existingBadge) {
            console.log('Removing badge');
            existingBadge.remove();
        } else {
            console.log('No badge found to remove');
        }
    } else {
        console.log('Trading Management link not found');
    }
}

function playAlertSound() {
    console.log('playAlertSound called');
    
    try {
        // Create audio context for better browser compatibility
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        // Connect nodes
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Set up the sound (notification beep)
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime); // 800Hz
        oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1); // 600Hz
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2); // 800Hz
        
        // Set volume
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        // Play the sound
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
        
        console.log('Alert sound played successfully');
        
    } catch (error) {
        console.log('Audio not supported, falling back to simple beep');
        // Fallback: Create a simple beep using Web Audio API
        const audio = new Audio();
        audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT';
        audio.volume = 0.3;
        audio.play().catch(e => console.log('Audio play failed:', e));
    }
}

function viewAllPendingOrders() {
    // Navigate to trading management page
    window.location.href = 'trading-management.html';
}

function dismissAlert() {
    const alert = document.querySelector('.pending-orders-alert');
    if (alert) {
        alert.remove();
    }
}

// Clean up polling when page unloads
window.addEventListener('beforeunload', function() {
    if (window.pendingOrdersPollingInterval) {
        clearInterval(window.pendingOrdersPollingInterval);
    }
});

// Initialize polling when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in as admin
    const adminToken = localStorage.getItem('adminToken');
    if (adminToken) {
        initPendingOrdersPolling();
    }
}); 