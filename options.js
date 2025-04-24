import { storePageEmbedding, semanticSearch, clearEmbeddings, clearEmbedding, generateEmbedding, cosineSimilarity } from './embeddings.js';
import { SEMANTIC_SIMILARITY_THRESHOLD } from './constants.js';

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
                        ${pages.map(page => {
                            if (page.type === 'tweet') {
                                return `
                                    <div class="page-card tweet-card" data-url="${page.url}">
                                        <button class="delete-btn" data-page-id="${page.id}" title="Delete tweet">
                                            <svg class="delete-icon" viewBox="0 0 24 24">
                                                <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z" />
                                            </svg>
                                        </button>
                                        ${page.thumbnail ? `<img class="page-thumbnail" src="${page.thumbnail}" alt="Tweet thumbnail">` : ''}
                                        <div class="tweet-header">
                                            <img class="tweet-avatar" src="https://x.com/favicon.ico" alt="X">
                                            <div class="tweet-author">
                                                <div class="tweet-name">${page.author}</div>
                                                <div class="tweet-handle">${page.handle}</div>
                                            </div>
                                        </div>
                                        <div class="tweet-content">${page.textContent}</div>
                                        ${page.mediaUrl ? `<img class="tweet-media" src="${page.mediaUrl}" alt="Tweet media">` : ''}
                                        <div class="tweet-timestamp">${new Date(page.timestamp).toLocaleString()}</div>
                                    </div>
                                `;
                            } else {
                                return `
                                    <div class="page-card" data-url="${page.url}">
                                        <button class="delete-btn" data-page-id="${page.id}" title="Delete page">
                                            <svg class="delete-icon" viewBox="0 0 24 24">
                                                <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z" />
                                            </svg>
                                        </button>
                                        ${page.thumbnail ? `<img class="page-thumbnail" src="${page.thumbnail}" alt="Page thumbnail">` : ''}
                                        <div class="page-content-wrapper">
                                            <div class="page-header">
                                                <img class="page-favicon" src="${page.favicon || ''}" alt="Favicon">
                                                <div class="page-title">${page.title}</div>
                                            </div>
                                            <div class="page-url">${page.url}</div>
                                            <div class="page-excerpt">${page.excerpt || page.textContent || ''}</div>
                                        </div>
                                        <div class="page-timestamp">${new Date(page.timestamp).toLocaleString()}</div>
                                    </div>
                                `;
                            }
                        }).join('')}
                    </div>
                </div>
            `;
        }

        // Add each group to the HTML
        Object.keys(groups).forEach(groupName => {
            html += createGroupHtml(groupName, groups[groupName]);
        });

        pageList.innerHTML = html;

        // Add event listeners after updating the HTML
        document.querySelectorAll('.page-card').forEach(card => {
            card.addEventListener('click', function(e) {
                // Don't open URL if clicking delete button
                if (e.target.closest('.delete-btn')) {
                    return;
                }
                const url = this.getAttribute('data-url');
                if (url) {
                    window.open(url, '_blank');
                }
            });
        });

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                const pageId = this.getAttribute('data-page-id');
                if (pageId) {
                    deletePage(pageId);
                }
            });
        });

        // Handle image errors
        document.querySelectorAll('img').forEach(img => {
            img.addEventListener('error', function() {
                this.style.display = 'none';
            });
        });
    }
    
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
                const title = page.title?.toLowerCase() || '';
                const content = page.textContent?.toLowerCase() || '';
                const excerpt = page.excerpt?.toLowerCase() || '';
                const url = page.url?.toLowerCase() || '';
                
                // Check for text match
                const hasTextMatch = title.includes(searchTerm) || 
                                   content.includes(searchTerm) || 
                                   excerpt.includes(searchTerm) || 
                                   url.includes(searchTerm);

                if (text) {
                    const embedding = await generateEmbedding(text);
                    const similarity = cosineSimilarity(queryEmbedding, embedding);
                    similarities.push({ page, similarity, hasTextMatch });
                }
            }
            
            // Sort by similarity
            similarities.sort((a, b) => b.similarity - a.similarity);
            
            // Update debug panel
            similarityList.innerHTML = similarities.map(({ page, similarity, hasTextMatch }) => `
                <div class="similarity-item">
                    <div class="similarity-text ${similarity >= SEMANTIC_SIMILARITY_THRESHOLD ? 'above-threshold' : ''}">${page.title.substring(0, 50)}...</div>
                    <div class="similarity-info">
                        <span class="text-match ${hasTextMatch ? 'match' : 'no-match'}">${hasTextMatch ? '✓' : '✗'}</span>
                        <span class="similarity-score ${similarity >= SEMANTIC_SIMILARITY_THRESHOLD ? 'above-threshold' : ''}">${similarity.toFixed(4)}</span>
                    </div>
                </div>
            `).join('');

            // Get text search results
            const textResults = pages.filter(page => {
                const title = page.title?.toLowerCase() || '';
                const content = page.textContent?.toLowerCase() || '';
                const excerpt = page.excerpt?.toLowerCase() || '';
                const url = page.url?.toLowerCase() || '';
                return title.includes(searchTerm) || 
                       content.includes(searchTerm) || 
                       excerpt.includes(searchTerm) || 
                       url.includes(searchTerm);
            });

            // Update threshold info in debug panel
            document.querySelector('.debug-info').innerHTML = `
                <p>Showing similarity scores for current search term</p>
                <p>Threshold: ${SEMANTIC_SIMILARITY_THRESHOLD} (bold items meet or exceed this threshold)</p>
                <p>Total webpages: ${pages.length}</p>
                <p>Text search results: ${textResults.length}</p>
                <p>Semantic search results: ${similarities.length}</p>
                <p>Combined results: ${new Set([...textResults, ...similarities.map(s => s.page)]).size}</p>
            `;
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
                
                // Perform text-based search
                const textResults = savedPages.filter(page => {
                    const title = page.title?.toLowerCase() || '';
                    const content = page.textContent?.toLowerCase() || '';
                    const excerpt = page.excerpt?.toLowerCase() || '';
                    const url = page.url?.toLowerCase() || '';
                    return title.includes(searchTerm) || 
                           content.includes(searchTerm) || 
                           excerpt.includes(searchTerm) || 
                           url.includes(searchTerm);
                });

                console.log('Text search found', textResults.length, 'results');
                
                // Perform semantic search
                console.log('Performing semantic search...');
                const semanticResults = await semanticSearch(searchTerm, savedPages);
                console.log('Semantic search results:', semanticResults.length);

                // Combine and rank results
                const allResults = new Map();

                // Add text matches first with a high base score
                textResults.forEach(page => {
                    allResults.set(page.id, {
                        page,
                        score: 1.0, // Base score for text match
                        hasTextMatch: true,
                        semanticScore: 0
                    });
                });

                // Add or update with semantic results
                semanticResults.forEach(({page, score}) => {
                    if (allResults.has(page.id)) {
                        // If it's also a text match, boost the score
                        const existing = allResults.get(page.id);
                        existing.semanticScore = score;
                        existing.score = existing.score + score; // Combine scores
                    } else {
                        // If it's only a semantic match
                        allResults.set(page.id, {
                            page,
                            score: score,
                            hasTextMatch: false,
                            semanticScore: score
                        });
                    }
                });

                // Convert to array and sort by combined score
                const combinedResults = Array.from(allResults.values())
                    .sort((a, b) => b.score - a.score);

                console.log('Combined results:', combinedResults.length);
                
                // Display results
                if (combinedResults.length > 0) {
                    console.log('Displaying combined results');
                    displayPages(combinedResults.map(r => r.page));
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