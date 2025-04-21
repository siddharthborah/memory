// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "savePage") {
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
                            sendResponse({success: true});
                        });
                    });
                }
            });
        });
        return true; // Required for async response
    }
    
    if (request.action === "getSavedPages") {
        chrome.storage.local.get(['savedPages'], function(result) {
            sendResponse(result.savedPages || []);
        });
        return true; // Required for async response
    }
}); 