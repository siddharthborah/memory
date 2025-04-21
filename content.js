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
    
    // Get favicon URL
    let faviconUrl = '';
    const faviconLink = document.querySelector("link[rel*='icon']");
    if (faviconLink) {
        faviconUrl = faviconLink.href;
    } else {
        // Fallback to default favicon location
        faviconUrl = new URL('/favicon.ico', url).href;
    }
    
    return {
        url: url,
        title: title,
        content: bodyText,
        timestamp: timestamp,
        favicon: faviconUrl
    };
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getPageContent") {
        try {
            // Get favicon URL
            let faviconUrl = '';
            const faviconLink = document.querySelector("link[rel*='icon']");
            if (faviconLink) {
                faviconUrl = faviconLink.href;
            } else {
                // Fallback to default favicon location
                faviconUrl = new URL('/favicon.ico', window.location.href).href;
            }
            
            // Limit title length to 100 characters
            const title = document.title.length > 100 
                ? document.title.substring(0, 100) + '...' 
                : document.title;
            
            // Create a clone of the document for processing
            const docClone = document.cloneNode(true);
            
            // Get the main content using Readability
            let articleContent = '';
            try {
                const article = new Readability(docClone).parse();
                if (article && article.textContent) {
                    // Clean up the text content while preserving meaningful whitespace
                    articleContent = article.textContent
                        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
                        .replace(/([.!?])\s+/g, '$1\n\n') // Add double newline after sentences
                        .replace(/\n\s*\n/g, '\n\n') // Normalize line breaks
                        .replace(/([a-z])([A-Z])/g, '$1 $2') // Add space between camelCase words
                        .replace(/([a-z])([0-9])/g, '$1 $2') // Add space between letters and numbers
                        .replace(/([0-9])([A-Z])/g, '$1 $2') // Add space between numbers and capital letters
                        .trim(); // Remove leading/trailing whitespace
                }
            } catch (e) {
                console.error('Error using Readability:', e);
                // Fallback to basic text extraction if Readability fails
                articleContent = docClone.body.innerText
                    .replace(/\s+/g, ' ')
                    .replace(/([.!?])\s+/g, '$1\n\n')
                    .replace(/\n\s*\n/g, '\n\n')
                    .replace(/([a-z])([A-Z])/g, '$1 $2')
                    .replace(/([a-z])([0-9])/g, '$1 $2')
                    .replace(/([0-9])([A-Z])/g, '$1 $2')
                    .trim();
            }
            
            // Send back basic page information
            sendResponse({
                url: window.location.href,
                title: title,
                textContent: articleContent,
                timestamp: new Date().toISOString(),
                favicon: faviconUrl
            });
        } catch (error) {
            console.error('Error in content script:', error);
            sendResponse({
                url: window.location.href,
                title: document.title.length > 100 
                    ? document.title.substring(0, 100) + '...' 
                    : document.title,
                textContent: document.body.innerText
                    .replace(/\s+/g, ' ')
                    .replace(/([.!?])\s+/g, '$1\n\n')
                    .replace(/\n\s*\n/g, '\n\n')
                    .replace(/([a-z])([A-Z])/g, '$1 $2')
                    .replace(/([a-z])([0-9])/g, '$1 $2')
                    .replace(/([0-9])([A-Z])/g, '$1 $2')
                    .trim(),
                timestamp: new Date().toISOString(),
                favicon: ''
            });
        }
    }
    return true; // Required for async response
}); 