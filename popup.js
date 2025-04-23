document.addEventListener('DOMContentLoaded', function() {
    const savePageButton = document.getElementById('savePage');
    const viewSavedButton = document.getElementById('viewSaved');
    const savedPagesDiv = document.getElementById('savedPages');

    // Function to show toast in the main window
    function showToast(message, type = 'success') {
        // Get the active tab
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs[0]) {
                // Inject the toast script
                chrome.scripting.executeScript({
                    target: {tabId: tabs[0].id},
                    function: (message, type) => {
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
                    },
                    args: [message, type]
                });
            }
        });
    }

    savePageButton.addEventListener('click', function() {
        chrome.runtime.sendMessage({action: "savePage"}, function(response) {
            if (response && response.success) {
                showToast('Page saved successfully!', 'success');
            } else {
                showToast('Failed to save page. Please try again.', 'error');
            }
        });
    });

    viewSavedButton.addEventListener('click', function() {
        chrome.runtime.openOptionsPage();
    });

    // Load auto-remember settings
    chrome.storage.sync.get(['autoRemember', 'autoRememberDelay'], function(result) {
        const autoRememberCheckbox = document.getElementById('autoRemember');
        const autoRememberDelay = document.getElementById('autoRememberDelay');
        
        autoRememberCheckbox.checked = result.autoRemember || false;
        autoRememberDelay.value = result.autoRememberDelay || 10;
        autoRememberDelay.disabled = !autoRememberCheckbox.checked;
    });

    // Save auto-remember settings when changed
    document.getElementById('autoRemember').addEventListener('change', function(e) {
        const delay = document.getElementById('autoRememberDelay');
        delay.disabled = !e.target.checked;
        
        chrome.storage.sync.set({ 
            autoRemember: e.target.checked,
            autoRememberDelay: parseInt(delay.value, 10)
        });
    });

    // Handle delay input changes
    document.getElementById('autoRememberDelay').addEventListener('change', function(e) {
        // Ensure minimum value of 10
        let value = parseInt(e.target.value, 10);
        if (value < 10) {
            value = 10;
            e.target.value = '10';
        }
        
        if (document.getElementById('autoRemember').checked) {
            chrome.storage.sync.set({ autoRememberDelay: value });
        }
    });
}); 