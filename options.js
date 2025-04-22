import { storePageEmbedding, semanticSearch, clearEmbeddings, clearEmbedding, generateEmbedding, cosineSimilarity } from './embeddings.js';

document.addEventListener('DOMContentLoaded', function() {
    const pageList = document.getElementById('pageList');
    const searchBox = document.getElementById('searchBox');
    const clearAllBtn = document.getElementById('clearAll');
    const similarityList = document.getElementById('similarityList');
    const debugPanel = document.getElementById('debugPanel');
    
    // Show loading state
    function showLoading() {
        pageList.innerHTML = '<div class="loading">Loading pages...</div>';
    }
    
    // Load saved pages
    async function loadSavedPages() {
        try {
            showLoading();
            
            const result = await chrome.storage.local.get(['savedPages']);
            const savedPages = result.savedPages || [];
            
            // Add unique ID to each page if it doesn't have one
            let needsUpdate = false;
            savedPages.forEach((page, index) => {
                if (!page.id) {
                    page.id = 'page_' + Date.now() + '_' + index;
                    needsUpdate = true;
                }
            });
            
            // Save updated pages back to storage if IDs were added
            if (needsUpdate) {
                await chrome.storage.local.set({ savedPages });
            }
            
            // Display pages immediately
            displayPages(savedPages);
            
            // Generate embeddings in the background
            for (const page of savedPages) {
                const text = page.excerpt || page.textContent || '';
                if (text) {
                    storePageEmbedding(page.id, text).catch(error => {
                        console.error('Error storing embedding:', error);
                    });
                }
            }
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

        // Sort pages by timestamp (newest first)
        pages.sort((a, b) => b.timestamp - a.timestamp);

        // Group pages by time period
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const thisWeek = new Date(today);
        thisWeek.setDate(today.getDate() - today.getDay());
        const lastWeek = new Date(thisWeek);
        lastWeek.setDate(thisWeek.getDate() - 7);
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

        const groups = {
            today: [],
            thisWeek: [],
            lastWeek: [],
            thisMonth: [],
            lastMonth: [],
            older: []
        };

        // Categorize pages
        pages.forEach(page => {
            const pageDate = new Date(page.timestamp);
            if (pageDate >= today) {
                groups.today.push(page);
            } else if (pageDate >= thisWeek) {
                groups.thisWeek.push(page);
            } else if (pageDate >= lastWeek) {
                groups.lastWeek.push(page);
            } else if (pageDate >= thisMonth) {
                groups.thisMonth.push(page);
            } else if (pageDate >= lastMonth) {
                groups.lastMonth.push(page);
            } else {
                groups.older.push(page);
            }
        });

        // Generate HTML for each group
        let html = '';
        
        // Helper function to create group HTML
        function createGroupHtml(groupName, pages) {
            if (pages.length === 0) return '';
            
            const groupTitles = {
                today: 'Today',
                thisWeek: 'This Week',
                lastWeek: 'Last Week',
                thisMonth: 'This Month',
                lastMonth: 'Last Month',
                older: 'Older'
            };

            return `
                <div class="time-group">
                    <h2 class="time-group-title">${groupTitles[groupName]}</h2>
                    <div class="time-group-pages">
                        ${pages.map(page => `
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
                        `).join('')}
                    </div>
                </div>
            `;
        }

        // Add each group to the HTML
        Object.keys(groups).forEach(groupName => {
            html += createGroupHtml(groupName, groups[groupName]);
        });

        pageList.innerHTML = html;
    }
    
    // Event delegation for page actions
    pageList.addEventListener('click', function(event) {
        const target = event.target;
        
        // Handle delete button click
        if (target.closest('.delete-btn')) {
            event.preventDefault();
            event.stopPropagation();
            const deleteBtn = target.closest('.delete-btn');
            const pageId = deleteBtn.getAttribute('data-page-id');
            if (pageId) {
                deletePage(pageId);
            }
            return;
        }
        
        // Handle page card click
        if (target.closest('.page-card')) {
            const card = target.closest('.page-card');
            const url = card.getAttribute('data-url');
            if (url) {
                window.open(url, '_blank');
            }
        }
    });
    
    // Delete a page
    async function deletePage(pageId) {
        try {
            const result = await chrome.storage.local.get(['savedPages']);
            const savedPages = result.savedPages || [];
            const updatedPages = savedPages.filter(page => page.id !== pageId);
            
            // Remove the embedding for the deleted page
            await clearEmbedding(pageId);
            
            // Save the updated pages
            await chrome.storage.local.set({savedPages: updatedPages});
            
            // Regenerate embeddings for remaining pages
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
    
    // Update debug panel with similarity scores
    async function updateDebugPanel(searchTerm, pages) {
        if (!debugPanel.style.display || debugPanel.style.display === 'none') {
            return;
        }

        try {
            const queryEmbedding = await generateEmbedding(searchTerm);
            const similarities = [];
            
            for (const page of pages) {
                const text = page.excerpt || page.textContent || '';
                if (text) {
                    const embedding = await generateEmbedding(text);
                    const similarity = cosineSimilarity(queryEmbedding, embedding);
                    similarities.push({ page, similarity });
                }
            }
            
            // Sort by similarity
            similarities.sort((a, b) => b.similarity - a.similarity);
            
            // Update debug panel
            similarityList.innerHTML = similarities.map(({ page, similarity }) => `
                <div class="similarity-item">
                    <div class="similarity-text">${page.title.substring(0, 50)}...</div>
                    <div class="similarity-score">${similarity.toFixed(4)}</div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Error updating debug panel:', error);
            similarityList.innerHTML = '<div class="similarity-item">Error calculating similarities</div>';
        }
    }
    
    // Search functionality
    let searchTimeout;
    searchBox.addEventListener('input', function(e) {
        const searchTerm = e.target.value.toLowerCase();
        console.log('Search term:', searchTerm);
        
        // Clear previous timeout
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }
        
        // Set new timeout for search
        searchTimeout = setTimeout(async () => {
            try {
                if (searchTerm.length < 3) {
                    console.log('Search term too short, showing all pages');
                    // If search term is too short, show all pages
                    const result = await chrome.storage.local.get(['savedPages']);
                    const pages = result.savedPages || [];
                    console.log('Number of saved pages:', pages.length);
                    displayPages(pages);
                    updateDebugPanel(searchTerm, pages);
                    return;
                }
                
                // Get all pages
                const result = await chrome.storage.local.get(['savedPages']);
                const savedPages = result.savedPages || [];
                console.log('Number of pages to search:', savedPages.length);
                
                // Update debug panel
                updateDebugPanel(searchTerm, savedPages);
                
                // Perform semantic search only
                console.log('Starting semantic search...');
                const results = await semanticSearch(searchTerm, savedPages);
                console.log('Semantic search results:', results);
                
                // Display results
                if (results.length > 0) {
                    console.log('Displaying', results.length, 'results');
                    displayPages(results.map(r => r.page));
                } else {
                    console.log('No results found');
                    displayPages([]);
                }
                
            } catch (error) {
                console.error('Error performing search:', error);
                displayPages([]);
            }
        }, 300);
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