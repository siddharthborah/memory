// Function to find the tweet closest to the viewport center
function findClosestTweet() {
    // Get all tweet containers
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
    return visibleTweets.length > 0
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
        : tweetContainers[0]; // Fallback to first tweet if none are visible
}

// Function to extract tweet data from a tweet container
function extractTweetData(tweetContainer) {
    // Get tweet text
    const tweetText = tweetContainer.querySelector('[data-testid="tweetText"]')?.textContent || '';
    
    // Get author info
    const authorName = tweetContainer.querySelector('[data-testid="User-Name"]')?.textContent || '';
    const authorHandle = tweetContainer.querySelector('[data-testid="User-Name"] a')?.textContent || '';
    
    // Get timestamp
    const timestamp = tweetContainer.querySelector('time')?.getAttribute('datetime') || new Date().toISOString();
    
    // Get tweet URL
    const tweetLink = tweetContainer.querySelector('a[href*="/status/"]')?.href || window.location.href;
    
    // Get media if any
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

// Function to save a tweet
async function saveTweet() {
    console.log('Script executing in page context');
    
    try {
        // Find the closest tweet
        const tweetContainer = findClosestTweet();
        console.log('Selected tweet container:', tweetContainer);
        
        // Extract tweet data
        const tweetData = extractTweetData(tweetContainer);
        console.log('Tweet data:', tweetData);
        
        return tweetData;
    } catch (error) {
        console.error('Error saving tweet:', error);
        throw error;
    }
}

// Export functions
export {
    saveTweet,
    findClosestTweet,
    extractTweetData
}; 