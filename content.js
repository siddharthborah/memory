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

// Function to get the main image from the page
function getMainImage() {
    // Try to get Open Graph image first
    const ogImage = document.querySelector('meta[property="og:image"]')?.content;
    if (ogImage) return ogImage;

    // Try to get Twitter card image
    const twitterImage = document.querySelector('meta[name="twitter:image"]')?.content;
    if (twitterImage) return twitterImage;

    // Try to get the largest image from the page
    const images = Array.from(document.getElementsByTagName('img'));
    if (images.length > 0) {
        // Filter out small images, icons, and tracking pixels
        const validImages = images.filter(img => {
            const width = img.naturalWidth || img.width;
            const height = img.naturalHeight || img.height;
            return width > 100 && height > 100 && !img.src.includes('icon') && !img.src.includes('logo');
        });

        if (validImages.length > 0) {
            // Sort by size and get the largest
            validImages.sort((a, b) => {
                const sizeA = (a.naturalWidth || a.width) * (a.naturalHeight || a.height);
                const sizeB = (b.naturalWidth || b.width) * (b.naturalHeight || b.height);
                return sizeB - sizeA;
            });
            return validImages[0].src;
        }
    }

    return null;
}

let autoRememberTimeout;

// Function to check if extension is ready
function isExtensionReady() {
    return new Promise((resolve) => {
        if (chrome.runtime && chrome.storage) {
            resolve(true);
        } else {
            // Try to ping the background script
            chrome.runtime.sendMessage({ action: "ping" }, (response) => {
                resolve(!!response);
            });
        }
    });
}

// Check if auto-remember is enabled and set up timer if needed
async function setupAutoRemember() {
    try {
        const isReady = await isExtensionReady();
        if (!isReady) {
            console.error('Extension not ready');
            return;
        }
        
        chrome.storage.sync.get(['autoRemember'], function(result) {
            if (result.autoRemember) {
                startAutoRememberTimer();
            }
        });
    } catch (error) {
        console.error('Error in setupAutoRemember:', error);
    }
}

// Function to start the auto-remember timer
async function startAutoRememberTimer() {
    try {
        const isReady = await isExtensionReady();
        if (!isReady) {
            console.error('Extension not ready');
            return;
        }
        
        // Clear any existing timeout first
        if (autoRememberTimeout) {
            clearTimeout(autoRememberTimeout);
        }
        
        // Get the configured delay
        chrome.storage.sync.get(['autoRememberDelay'], function(result) {
            const delay = (result.autoRememberDelay || 10) * 1000; // Convert to milliseconds
            
            // Set new timeout using configured delay
            autoRememberTimeout = setTimeout(() => {
                chrome.runtime.sendMessage({action: "savePage"}, function(response) {
                    if (response && response.success) {
                        console.log('Page auto-remembered successfully');
                    }
                });
            }, delay);
        });
    } catch (error) {
        console.error('Error in startAutoRememberTimer:', error);
    }
}

// Handle tab visibility changes
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Clear timer when tab becomes inactive
        if (autoRememberTimeout) {
            clearTimeout(autoRememberTimeout);
            autoRememberTimeout = null;
        }
    } else {
        // Restart timer when tab becomes active again
        chrome.storage.sync.get(['autoRemember'], function(result) {
            if (result.autoRemember) {
                startAutoRememberTimer();
            }
        });
    }
});

// Call setupAutoRemember when the page loads and is visible
if (!document.hidden) {
    setupAutoRemember();
}

// Clear timeout if page is being unloaded
window.addEventListener('beforeunload', () => {
    if (autoRememberTimeout) {
        clearTimeout(autoRememberTimeout);
    }
});

// Listen for changes to auto-remember setting
chrome.storage.onChanged.addListener((changes) => {
    if (changes.autoRemember) {
        if (changes.autoRemember.newValue && !document.hidden) {
            startAutoRememberTimer();
        } else if (autoRememberTimeout) {
            clearTimeout(autoRememberTimeout);
            autoRememberTimeout = null;
        }
    }
});

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
            let excerpt = '';
            try {
                const article = new Readability(docClone).parse();
                if (article) {
                    // Get the excerpt
                    excerpt = article.excerpt || '';
                    
                    // Clean up the text content while preserving meaningful whitespace
                    articleContent = article.textContent
                        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
                        .replace(/([.!?])\s+/g, '$1\n\n') // Add double newline after sentences
                        .replace(/\n\s*\n/g, '\n\n') // Normalize line breaks
                        .replace(/([a-z])([A-Z])/g, '$1 $2') // Add space between camelCase words
                        .replace(/([a-z])([0-9])/g, '$1 $2') // Add space between letters and numbers
                        .replace(/([0-9])([A-Z])/g, '$1 $2') // Add space between numbers and capital letters
                        .trim(); // Remove leading/trailing whitespace

                    // Get root URL
                    const urlObj = new URL(window.location.href);
                    const rootUrl = urlObj.hostname;

                    // Combine title, URL, and content for better context
                    const combinedContent = [
                        article.title,
                        `Source: ${rootUrl}`,
                        articleContent
                    ].filter(Boolean).join('\n\n');

                    // Estimate tokens (roughly 4 chars per token) and limit to ~1000 tokens
                    const maxChars = 4000; // ~1000 tokens
                    articleContent = combinedContent.substring(0, maxChars);
                    
                    // Log token estimation
                    const estimatedTokens = Math.ceil(articleContent.length / 4);
                    console.log('Content token estimation:', {
                        totalChars: articleContent.length,
                        estimatedTokens,
                        title: article.title,
                        source: rootUrl
                    });
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
                
                // Create a basic excerpt from the first paragraph
                const firstParagraph = docClone.body.querySelector('p');
                excerpt = firstParagraph ? firstParagraph.textContent.trim() : '';

                // Get root URL
                const urlObj = new URL(window.location.href);
                const rootUrl = urlObj.hostname;

                // Combine title, URL, and content
                const combinedContent = [
                    docClone.title,
                    `Source: ${rootUrl}`,
                    articleContent
                ].filter(Boolean).join('\n\n');

                // Estimate tokens (roughly 4 chars per token) and limit to ~1000 tokens
                const maxChars = 4000; // ~1000 tokens
                articleContent = combinedContent.substring(0, maxChars);
                
                // Log token estimation
                const estimatedTokens = Math.ceil(articleContent.length / 4);
                console.log('Content token estimation (fallback):', {
                    totalChars: articleContent.length,
                    estimatedTokens,
                    title: docClone.title,
                    source: rootUrl
                });
            }
            
            // Get the main image
            const thumbnail = getMainImage();
            
            // Send back basic page information
            sendResponse({
                url: window.location.href,
                title: title,
                textContent: articleContent,
                excerpt: excerpt,
                timestamp: new Date().toISOString(),
                favicon: faviconUrl,
                thumbnail: thumbnail
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
                excerpt: document.body.querySelector('p')?.textContent.trim() || '',
                timestamp: new Date().toISOString(),
                favicon: '',
                thumbnail: getMainImage()
            });
        }
    }
    return true; // Required for async response
}); 