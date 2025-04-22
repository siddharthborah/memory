import { storePageEmbedding } from './embeddings.js';
import { saveTweet } from './tweet-handler.js';

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

// Create context menu items
chrome.runtime.onInstalled.addListener(() => {
    // Create a parent menu for Memory
    chrome.contextMenus.create({
        id: 'memory',
        title: 'Memory',
        contexts: ['page']
    });

    // Regular page save
    chrome.contextMenus.create({
        id: 'savePage',
        title: 'Save page',
        parentId: 'memory',
        contexts: ['page']
    });

    // Tweet save
    chrome.contextMenus.create({
        id: 'saveTweet',
        title: 'Save tweet',
        parentId: 'memory',
        contexts: ['page'],
        documentUrlPatterns: ['*://twitter.com/*', '*://x.com/*']
    });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    console.log('Context menu clicked:', {
        menuItemId: info.menuItemId,
        parentMenuItemId: info.parentMenuItemId,
        pageUrl: tab.url
    });
    
    if (info.menuItemId === 'saveTweet') {
        console.log('Save tweet handler invoked for URL:', tab.url);
        try {
            // Get tweet content
            console.log('Executing script to get tweet content');
            const [result] = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                function: saveTweet
            });

            console.log('Script execution result:', result);

            if (result && result.result) {
                const tweetData = result.result;
                console.log('Processing tweet data:', tweetData);
                
                // Generate unique ID
                tweetData.id = 'tweet_' + Date.now();
                
                // Get existing pages
                const { savedPages = [] } = await chrome.storage.local.get(['savedPages']);
                console.log('Current saved pages:', savedPages.length);
                
                // Add new tweet
                savedPages.push(tweetData);
                
                // Save to storage
                await chrome.storage.local.set({ savedPages });
                console.log('Saved tweet to storage');
                
                // Generate and store embedding
                await storePageEmbedding(tweetData.id, tweetData.textContent || tweetData.excerpt);
                console.log('Generated and stored embedding');
                
                // Show success notification
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
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
                            background-color: ${type === 'success' ? '#4CAF50' : '#f44336'};
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
                    args: ['Tweet saved successfully!', 'success']
                });
            }
        } catch (error) {
            console.error('Error saving tweet:', error);
            // Show error notification
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
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
                        background-color: ${type === 'success' ? '#4CAF50' : '#f44336'};
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
                args: ['Error saving tweet', 'error']
            });
        }
    } else if (info.menuItemId === 'savePage') {
        try {
            // Get page content
            const [result] = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                function: () => {
                    const title = document.title;
                    const url = window.location.href;
                    const favicon = document.querySelector('link[rel="icon"]')?.href || 
                                  document.querySelector('link[rel="shortcut icon"]')?.href || '';
                    
                    // Get page content
                    const content = document.body.innerText;
                    
                    // Get meta description if available
                    const description = document.querySelector('meta[name="description"]')?.content || '';
                    
                    return {
                        title,
                        url,
                        favicon,
                        textContent: content,
                        excerpt: description,
                        timestamp: Date.now()
                    };
                }
            });

            if (result && result.result) {
                const pageData = result.result;
                
                // Generate unique ID
                pageData.id = 'page_' + Date.now();
                
                // Get existing pages
                const { savedPages = [] } = await chrome.storage.local.get(['savedPages']);
                
                // Add new page
                savedPages.push(pageData);
                
                // Save to storage
                await chrome.storage.local.set({ savedPages });
                
                // Generate and store embedding
                await storePageEmbedding(pageData.id, pageData.textContent);
                
                // Show success notification
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
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
                            background-color: ${type === 'success' ? '#4CAF50' : '#f44336'};
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
                    args: ['Page saved successfully!', 'success']
                });
            }
        } catch (error) {
            console.error('Error saving page:', error);
            // Show error notification
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
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
                        background-color: ${type === 'success' ? '#4CAF50' : '#f44336'};
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
                args: ['Error saving page', 'error']
            });
        }
    }
}); 