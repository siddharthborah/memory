// Core toast functionality
function createToast(message, type = 'success') {
    // Create toast container if it doesn't exist
    let container = document.getElementById('page-saver-toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'page-saver-toast-container';
        container.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 999999;
            pointer-events: none;
        `;
        document.body.appendChild(container);
    }

    // Create toast
    const toast = document.createElement('div');
    toast.className = `page-saver-toast ${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        background-color: #333;
        color: white;
        padding: 12px 24px;
        border-radius: 4px;
        margin-bottom: 10px;
        opacity: 0;
        transform: scale(0.8);
        transition: all 0.3s ease;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        text-align: center;
        white-space: nowrap;
    `;
    
    if (type === 'success') {
        toast.style.backgroundColor = '#4CAF50';
    } else if (type === 'error') {
        toast.style.backgroundColor = '#f44336';
    }

    container.appendChild(toast);
    
    // Trigger reflow
    toast.offsetHeight;
    
    // Show toast
    toast.style.opacity = '1';
    toast.style.transform = 'scale(1)';
    
    // Remove toast after animation
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'scale(0.8)';
        setTimeout(() => {
            container.removeChild(toast);
            if (container.children.length === 0) {
                document.body.removeChild(container);
            }
        }, 300);
    }, 1500);
}

// Function to inject and show toast in the main window
function showToastInPage(message, type = 'success') {
    // If we're in the popup context, inject the script
    if (chrome.scripting) {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs[0]) {
                chrome.scripting.executeScript({
                    target: {tabId: tabs[0].id},
                    function: createToast,
                    args: [message, type]
                });
            }
        });
    } 
    // If we're in the content script context, create the toast directly
    else {
        createToast(message, type);
    }
}

// Make the function available globally
window.showToastInPage = showToastInPage; 