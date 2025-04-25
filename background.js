import { storePageEmbedding } from './embeddings.js';

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "ping") {
        sendResponse({ status: "ready" });
        return true;
    }
    
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
                            args: ['Added to memory']
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
                    
                    // Check if the page already exists (by URL)
                    const existingPageIndex = savedPages.findIndex(page => page.url === response.url);
                    
                    if (existingPageIndex !== -1) {
                        // Update timestamp of existing page
                        savedPages[existingPageIndex].timestamp = new Date().toISOString();
                        console.log('Updated timestamp for existing page:', response.url);
                    } else {
                        // Add new page data
                        response.id = 'page_' + Date.now();
                        savedPages.push(response);
                        
                        // Generate and store embedding for new page
                        const text = response.excerpt || response.textContent || '';
                        if (text) {
                            storePageEmbedding(response.id, text).catch(error => {
                                console.error('Error storing embedding:', error);
                            });
                        }
                    }
                    
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
    // Regular page save
    chrome.contextMenus.create({
        id: 'savePage',
        title: 'Remember Page    ⌘M',
        contexts: ['page']
    });

    // Tweet save
    chrome.contextMenus.create({
        id: 'saveTweet',
        title: 'Remember Tweet',
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
            const [tweetData] = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                function: () => {
                    // Find the closest tweet
                    const tweetContainers = Array.from(document.querySelectorAll('article[data-testid="tweet"]'));
                    if (tweetContainers.length === 0) {
                        throw new Error('No tweets found on this page');
                    }

                    // Find the tweet container that's closest to the viewport center
                    const viewportCenter = {
                        x: window.innerWidth / 2,
                        y: window.innerHeight / 2
                    };

                    // Find the tweet container that's most visible in the viewport
                    const visibleTweets = tweetContainers.filter(tweet => {
                        const rect = tweet.getBoundingClientRect();
                        return (
                            rect.top >= 0 &&
                            rect.left >= 0 &&
                            rect.bottom <= window.innerHeight &&
                            rect.right <= window.innerWidth
                        );
                    });

                    // If we have visible tweets, find the one closest to the viewport center
                    const tweetContainer = visibleTweets.length > 0
                        ? visibleTweets.reduce((closest, tweet) => {
                            const rect = tweet.getBoundingClientRect();
                            const tweetCenter = {
                                x: rect.left + rect.width / 2,
                                y: rect.top + rect.height / 2
                            };
                            const closestRect = closest.getBoundingClientRect();
                            const closestCenter = {
                                x: closestRect.left + closestRect.width / 2,
                                y: closestRect.top + closestRect.height / 2
                            };
                            
                            const distanceToTweet = Math.sqrt(
                                Math.pow(tweetCenter.x - viewportCenter.x, 2) +
                                Math.pow(tweetCenter.y - viewportCenter.y, 2)
                            );
                            const distanceToClosest = Math.sqrt(
                                Math.pow(closestCenter.x - viewportCenter.x, 2) +
                                Math.pow(closestCenter.y - viewportCenter.y, 2)
                            );
                            
                            return distanceToTweet < distanceToClosest ? tweet : closest;
                        })
                        : tweetContainers[0];

                    // Extract tweet data
                    const tweetText = tweetContainer.querySelector('[data-testid="tweetText"]')?.textContent || '';
                    const authorName = tweetContainer.querySelector('[data-testid="User-Name"]')?.textContent || '';
                    const authorHandle = tweetContainer.querySelector('[data-testid="User-Name"] a')?.textContent || '';
                    const timestamp = tweetContainer.querySelector('time')?.getAttribute('datetime') || new Date().toISOString();
                    const tweetLink = tweetContainer.querySelector('a[href*="/status/"]')?.href || window.location.href;
                    const mediaContainer = tweetContainer.querySelector('[data-testid="tweetPhoto"]');
                    const mediaUrl = mediaContainer?.querySelector('img')?.src || '';

                    return {
                        title: `Tweet by ${authorName}`,
                        url: tweetLink,
                        favicon: 'https://abs.twimg.com/favicons/twitter.ico',
                        textContent: tweetText,
                        excerpt: `Tweet by ${authorHandle}: ${tweetText}`,
                        timestamp: new Date(timestamp).getTime(),
                        type: 'tweet',
                        author: authorName,
                        handle: authorHandle,
                        mediaUrl: mediaUrl
                    };
                }
            });

            console.log('Script execution result:', tweetData);

            if (tweetData && tweetData.result) {
                const tweet = tweetData.result;
                console.log('Processing tweet data:', tweet);
                
                // Get existing pages
                const { savedPages = [] } = await chrome.storage.local.get(['savedPages']);
                console.log('Current saved pages:', savedPages.length);
                
                // Check if the tweet already exists (by URL)
                const existingTweetIndex = savedPages.findIndex(page => page.url === tweet.url);
                
                if (existingTweetIndex !== -1) {
                    // Update timestamp of existing tweet
                    savedPages[existingTweetIndex].timestamp = new Date().toISOString();
                    console.log('Updated timestamp for existing tweet:', tweet.url);
                } else {
                    // Generate unique ID for new tweet
                    tweet.id = 'tweet_' + Date.now();
                    // Add new tweet
                    savedPages.push(tweet);
                    
                    // Generate and store embedding for new tweet
                    await storePageEmbedding(tweet.id, tweet.textContent || tweet.excerpt);
                    console.log('Generated and stored embedding');
                }
                
                // Save to storage
                await chrome.storage.local.set({ savedPages });
                console.log('Saved/updated tweet in storage');
                
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
                    args: ['Added to memory', 'success']
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
                args: ['Failed to add tweet to memory. Please try again.', 'error']
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
                    args: ['Added to memory', 'success']
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
                args: ['Error adding page to memory', 'error']
            });
        }
    }
}); 