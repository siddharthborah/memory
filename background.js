// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "savePage") {
        saveCurrentPage(sendResponse);
        return true; // Required for async response
    }
    
    if (request.action === "getSavedPages") {
        chrome.storage.local.get(['savedPages'], function(result) {
            sendResponse(result.savedPages || []);
        });
        return true; // Required for async response
    }
});

// Listen for keyboard shortcut commands
chrome.commands.onCommand.addListener((command) => {
    if (command === "save-current-page") {
        saveCurrentPage((response) => {
            if (response && response.success) {
                // Show toast notification
                chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                    if (tabs[0]) {
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
                                toast.className = `page-saver-toast success`;
                                toast.textContent = message;
                                toast.style.cssText = `
                                    background-color: #4CAF50;
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
                            args: ['Page saved successfully!']
                        });
                    }
                });
            }
        });
    } else if (command === "open-saved-pages") {
        // Open the options page in a new tab
        chrome.runtime.openOptionsPage();
    }
});

// Function to save the current page
function saveCurrentPage(callback) {
    // Get the current active tab
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        // Send message to content script to get page content
        chrome.tabs.sendMessage(tabs[0].id, {action: "getPageContent"}, function(response) {
            if (response) {
                // Get existing data from storage
                chrome.storage.local.get(['savedPages'], function(result) {
                    const savedPages = result.savedPages || [];
                    
                    // Add new page data
                    savedPages.push(response);
                    
                    // Save updated data
                    chrome.storage.local.set({savedPages: savedPages}, function() {
                        if (callback) {
                            callback({success: true});
                        }
                    });
                });
            } else if (callback) {
                callback({success: false});
            }
        });
    });
} 