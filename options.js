import { storePageEmbedding, semanticSearch, clearEmbeddings } from './embeddings.js';

document.addEventListener('DOMContentLoaded', function() {
    const pageList = document.getElementById('pageList');
    const searchBox = document.getElementById('searchBox');
    const clearAllBtn = document.getElementById('clearAll');
    
    // Load saved pages
    async function loadSavedPages() {
        try {
            const result = await chrome.storage.local.get(['savedPages']);
            const savedPages = result.savedPages || [];
            
            // Add unique ID to each page if it doesn't have one
            savedPages.forEach((page, index) => {
                if (!page.id) {
                    page.id = 'page_' + Date.now() + '_' + index;
                }
            });
            
            // Generate embeddings for all pages
            for (const page of savedPages) {
                const text = page.excerpt || page.textContent || '';
                if (text) {
                    await storePageEmbedding(page.id, text);
                }
            }
            
            displayPages(savedPages);
        } catch (error) {
            console.error('Error loading saved pages:', error);
            displayPages([]);
        }
    }
    
    // Display pages in the grid
    function displayPages(pages) {
        if (pages.length === 0) {
            pageList.innerHTML = '<div class="no-pages">No pages saved yet.</div>';
            return;
        }
        
        pageList.innerHTML = pages.map(page => `
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
                <div class="page-excerpt">${page.excerpt || page.textContent || ''}</div>
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
    async function deletePage(pageId) {
        try {
            const result = await chrome.storage.local.get(['savedPages']);
            const savedPages = result.savedPages || [];
            const updatedPages = savedPages.filter(page => page.id !== pageId);
            
            await chrome.storage.local.set({savedPages: updatedPages});
            await loadSavedPages();
        } catch (error) {
            console.error('Error deleting page:', error);
        }
    }
    
    // Clear all pages
    clearAllBtn.addEventListener('click', async function() {
        if (confirm('Are you sure you want to delete all saved pages? This action cannot be undone.')) {
            try {
                await chrome.storage.local.set({savedPages: []});
                await clearEmbeddings();
                await loadSavedPages();
            } catch (error) {
                console.error('Error clearing pages:', error);
            }
        }
    });
    
    // Search functionality
    let searchTimeout;
    searchBox.addEventListener('input', function(e) {
        const searchTerm = e.target.value.toLowerCase();
        
        // Clear previous timeout
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }
        
        // Set new timeout for search
        searchTimeout = setTimeout(async () => {
            try {
                if (searchTerm.length < 3) {
                    // If search term is too short, show all pages
                    const result = await chrome.storage.local.get(['savedPages']);
                    displayPages(result.savedPages || []);
                    return;
                }
                
                // Perform semantic search
                const result = await chrome.storage.local.get(['savedPages']);
                const savedPages = result.savedPages || [];
                const results = await semanticSearch(searchTerm, savedPages);
                
                // Display results
                if (results.length > 0) {
                    displayPages(results.map(r => r.page));
                } else {
                    // Fallback to text search if no semantic results
                    const filteredPages = savedPages.filter(page => 
                        page.title.toLowerCase().includes(searchTerm) ||
                        page.url.toLowerCase().includes(searchTerm) ||
                        (page.textContent && page.textContent.toLowerCase().includes(searchTerm)) ||
                        (page.excerpt && page.excerpt.toLowerCase().includes(searchTerm))
                    );
                    displayPages(filteredPages);
                }
            } catch (error) {
                console.error('Error performing search:', error);
                displayPages([]);
            }
        }, 300); // Debounce search for 300ms
    });

    // Listen for storage changes
    chrome.storage.onChanged.addListener(function(changes, namespace) {
        if (namespace === 'local' && changes.savedPages) {
            loadSavedPages();
        }
    });

    // Initial load
    loadSavedPages();
}); 