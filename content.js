// Function to get all text content from the page
function getPageContent() {
    // Get the main content of the page
    const bodyText = document.body.innerText;
    
    // Get the page title
    const title = document.title;
    
    // Get the current URL
    const url = window.location.href;
    
    // Get the timestamp
    const timestamp = new Date().toISOString();
    
    return {
        url: url,
        title: title,
        content: bodyText,
        timestamp: timestamp
    };
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getPageContent") {
        const pageData = getPageContent();
        sendResponse(pageData);
    }
    return true; // Required for async response
}); 