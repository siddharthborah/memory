document.addEventListener('DOMContentLoaded', function() {
    const pageList = document.getElementById('pageList');
    const searchBox = document.getElementById('searchBox');
    const clearAllBtn = document.getElementById('clearAll');
    
    // Load saved pages
    function loadSavedPages() {
        chrome.storage.local.get(['savedPages'], function(result) {
            const savedPages = result.savedPages || [];
            // Add unique ID to each page if it doesn't have one
            savedPages.forEach((page, index) => {
                if (!page.id) {
                    page.id = 'page_' + Date.now() + '_' + index;
                }
            });
            displayPages(savedPages);
        });
    }
    
    // Display pages in the grid
    function displayPages(pages) {
        if (pages.length === 0) {
            pageList.innerHTML = '<div class="no-pages">No pages saved yet.</div>';
            return;
        }
        
        pageList.innerHTML = pages.map((page) => `
            <div class="page-card" data-url="${page.url}">
                <button class="delete-btn" data-page-id="${page.id}" title="Delete page">
                    <svg class="delete-icon" viewBox="0 0 24 24">
                        <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z" />
                    </svg>
                </button>
                <div class="page-header">
                    <img class="page-favicon" src="${page.favicon || ''}" alt="Favicon" onerror="this.style.display='none'">
                    <div class="page-title">${page.title}</div>
                </div>
                <div class="page-url">${page.url}</div>
                <div class="page-timestamp">${new Date(page.timestamp).toLocaleString()}</div>
                <div class="page-content">${(page.textContent || '').substring(0, 200)}...</div>
            </div>
        `).join('');
    }
    
    // Event delegation for page actions
    pageList.addEventListener('click', function(event) {
        const target = event.target;
        
        // Handle page card click
        if (target.closest('.page-card')) {
            const card = target.closest('.page-card');
            const url = card.getAttribute('data-url');
            if (url) {
                window.open(url, '_blank');
            }
        }
        
        // Handle delete button click
        if (target.closest('.delete-btn')) {
            const deleteBtn = target.closest('.delete-btn');
            const pageId = deleteBtn.getAttribute('data-page-id');
            if (pageId) {
                deletePage(pageId);
            }
        }
    });
    
    // Delete a page
    function deletePage(pageId) {
        console.log('Deleting page with ID:', pageId);
        chrome.storage.local.get(['savedPages'], function(result) {
            const savedPages = result.savedPages || [];
            console.log('Current saved pages:', savedPages);
            
            const updatedPages = savedPages.filter(page => {
                console.log('Comparing:', page.id, 'with', pageId);
                return page.id !== pageId;
            });
            
            console.log('Updated pages:', updatedPages);
            
            chrome.storage.local.set({savedPages: updatedPages}, function() {
                console.log('Storage updated');
                loadSavedPages();
            });
        });
    }
    
    // Clear all pages
    clearAllBtn.addEventListener('click', function() {
        if (confirm('Are you sure you want to delete all saved pages? This action cannot be undone.')) {
            chrome.storage.local.set({savedPages: []}, function() {
                loadSavedPages();
            });
        }
    });
    
    // Search functionality
    searchBox.addEventListener('input', function(e) {
        const searchTerm = e.target.value.toLowerCase();
        chrome.storage.local.get(['savedPages'], function(result) {
            const savedPages = result.savedPages || [];
            const filteredPages = savedPages.filter(page => 
                page.title.toLowerCase().includes(searchTerm) ||
                page.url.toLowerCase().includes(searchTerm) ||
                (page.textContent && page.textContent.toLowerCase().includes(searchTerm))
            );
            displayPages(filteredPages);
        });
    });

    // Listen for storage changes
    chrome.storage.onChanged.addListener(function(changes, namespace) {
        if (namespace === 'local' && changes.savedPages) {
            loadSavedPages();
        }
    });

    // Periodic refresh (every 5 seconds)
    const refreshInterval = setInterval(loadSavedPages, 5000);

    // Clean up interval when page is unloaded
    window.addEventListener('unload', function() {
        clearInterval(refreshInterval);
    });
    
    // Initial load
    loadSavedPages();
}); 