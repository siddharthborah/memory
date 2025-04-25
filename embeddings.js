import { pipeline, env } from '@xenova/transformers';
import { SEMANTIC_SIMILARITY_THRESHOLD, OPENAI_EMBEDDING_MODEL } from './constants.js';

// Configure environment for Chrome extension
env.useBrowserCache = false;
env.allowLocalModels = false;

// Set up WASM paths
const wasmPaths = {
    'ort-wasm.wasm': 'ort-wasm.wasm',
    'ort-wasm-simd.wasm': 'ort-wasm-simd.wasm',
    'ort-wasm-threaded.wasm': 'ort-wasm-threaded.wasm'
};

// Initialize WASM backend
env.backends.onnx.wasm.wasmPaths = wasmPaths;
env.backends.onnx.wasm.numThreads = 1; // Use single thread for better compatibility

// Store embeddings in memory and storage
const embeddings = new Map(); // Map of pageId to Float32Array

// Load embeddings from storage
async function loadEmbeddings() {
    try {
        const result = await chrome.storage.local.get(['embeddings']);
        if (result.embeddings) {
            // Convert stored arrays back to Float32Array
            Object.entries(result.embeddings).forEach(([pageId, array]) => {
                embeddings.set(pageId, new Float32Array(array));
            });
        }
    } catch (error) {
        console.error('Error loading embeddings:', error);
    }
}

// Save embeddings to storage
async function saveEmbeddings() {
    try {
        // Convert Float32Array to regular array for storage
        const embeddingsObj = {};
        embeddings.forEach((array, pageId) => {
            embeddingsObj[pageId] = Array.from(array);
        });
        await chrome.storage.local.set({ embeddings: embeddingsObj });
    } catch (error) {
        console.error('Error saving embeddings:', error);
    }
}

// Initialize the model
let modelPromise = null;
async function initializeModel() {
    if (modelPromise) {
        return modelPromise;
    }

    try {
        modelPromise = pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
            quantized: true,
            progress_callback: null,
            config: {
                revision: 'default',
                cache_dir: 'models',
                local_files_only: false,
                use_worker: false,
                use_cache: false
            }
        });
        return modelPromise;
    } catch (error) {
        console.error('Error initializing model:', error);
        modelPromise = null; // Reset on error
        throw error;
    }
}

// Generate embeddings using OpenAI API
async function generateOpenAIEmbedding(text) {
    try {
        const result = await chrome.storage.sync.get(['openAIKey']);
        const apiKey = result.openAIKey;
        
        if (!apiKey) {
            throw new Error('OpenAI API key not found');
        }

        // Log OpenAI API request
        console.log('Making OpenAI API request:', {
            textLength: text.length,
            estimatedTokens: Math.ceil(text.length / 4),
            timestamp: new Date().toISOString()
        });

        const response = await fetch('https://api.openai.com/v1/embeddings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                input: text,
                model: OPENAI_EMBEDDING_MODEL
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('OpenAI API error:', {
                status: response.status,
                statusText: response.statusText,
                error: errorData
            });
            throw new Error(`OpenAI API error: ${response.statusText}`);
        }

        const data = await response.json();
        
        // Log successful response with more details
        console.log('OpenAI API response:', {
            usage: data.usage,
            timestamp: new Date().toISOString(),
            model: data.model,
            data: {
                object: data.data[0].object,
                embedding_length: data.data[0].embedding.length,
                index: data.data[0].index
            }
        });

        return new Float32Array(data.data[0].embedding);
    } catch (error) {
        console.error('Error generating OpenAI embedding:', error);
        throw error;
    }
}

// Generate embeddings for text
async function generateEmbedding(text) {
    try {
        if (!text || typeof text !== 'string') {
            console.error('Invalid text input:', text);
            return new Float32Array(384).fill(0);
        }

        // Check if OpenAI embeddings are enabled
        const result = await chrome.storage.sync.get(['useOpenAI']);
        if (result.useOpenAI) {
            console.log('Using OpenAI embeddings');
            return await generateOpenAIEmbedding(text);
        }

        console.log('Using local embeddings');
        // Use local model if OpenAI is not enabled
        const pipe = await initializeModel();
        const output = await pipe(text.substring(0, 512), {
            pooling: 'mean',
            normalize: true
        });
        
        if (!output || !output.data) {
            console.error('Invalid output from pipeline:', output);
            return new Float32Array(384).fill(0);
        }
        
        return new Float32Array(output.data);
    } catch (error) {
        console.error('Error generating embedding:', error);
        return new Float32Array(384).fill(0);
    }
}

// Calculate cosine similarity between two vectors
function cosineSimilarity(a, b) {
    if (!a || !b || a.length !== b.length) {
        return 0;
    }
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    
    const norm = Math.sqrt(normA) * Math.sqrt(normB);
    return norm === 0 ? 0 : dotProduct / norm;
}

// Generate and store embedding for a page
async function storePageEmbedding(pageId, text) {
    if (!pageId || !text) {
        console.error('Invalid input for storePageEmbedding:', { pageId, text });
        return false;
    }

    try {
        const embedding = await generateEmbedding(text);
        embeddings.set(pageId, embedding);
        await saveEmbeddings(); // Save to storage after updating
        return true;
    } catch (error) {
        console.error('Error storing embedding:', error);
        return false;
    }
}

// Search pages using semantic similarity
async function semanticSearch(query, pages, topK = 5, queryEmbedding = null) {
    if (!query || !pages || !Array.isArray(pages)) {
        console.error('Invalid input for semanticSearch:', { query, pages, topK });
        return [];
    }

    try {
        console.log('Starting semantic search with query:', query);
        console.log('Number of pages to search:', pages.length);
        
        // Use provided query embedding or generate new one
        const finalQueryEmbedding = queryEmbedding || await generateEmbedding(query);
        if (!queryEmbedding) {
            console.log('Generated query embedding:', finalQueryEmbedding);
        }
        
        const results = [];
        
        // Generate embeddings for all pages if not already stored
        for (const page of pages) {
            if (!page.id) {
                console.error('Page missing ID:', page);
                continue;
            }
            
            const text = page.text || page.excerpt || page.textContent || '';
            if (text) {
                let pageEmbedding;
                if (embeddings.has(page.id)) {
                    console.log('Using stored embedding for page:', page.id);
                    pageEmbedding = embeddings.get(page.id);
                } else {
                    console.log('Generating new embedding for page:', page.id);
                    pageEmbedding = await generateEmbedding(text);
                    embeddings.set(page.id, pageEmbedding);
                }
                
                const similarity = cosineSimilarity(finalQueryEmbedding, pageEmbedding);
                console.log(`Similarity for page ${page.id}:`, similarity);
                results.push({ page, similarity });
            }
        }
        
        // Sort by similarity and filter
        const filteredResults = results
            .sort((a, b) => b.similarity - a.similarity)
            .filter(result => result.similarity >= SEMANTIC_SIMILARITY_THRESHOLD)
            .slice(0, topK);
        
        console.log('Final filtered results:', filteredResults);
        
        return filteredResults;
    } catch (error) {
        console.error('Error in semantic search:', error);
        return [];
    }
}

// Clear all embeddings
async function clearEmbeddings() {
    try {
        // Clear in-memory embeddings
        embeddings.clear();
        
        // Clear storage embeddings
        await chrome.storage.local.remove(['embeddings']);
        
        console.log('Cleared all embeddings from memory and storage');
    } catch (error) {
        console.error('Error clearing embeddings:', error);
    }
}

// Clear specific embedding
async function clearEmbedding(pageId) {
    try {
        // Remove from in-memory map
        embeddings.delete(pageId);
        
        // Get current embeddings from storage
        const result = await chrome.storage.local.get(['embeddings']);
        if (result.embeddings) {
            // Remove the specific embedding
            delete result.embeddings[pageId];
            // Save back to storage
            await chrome.storage.local.set({ embeddings: result.embeddings });
        }
        
        console.log('Cleared embedding for page:', pageId);
    } catch (error) {
        console.error('Error clearing embedding:', error);
    }
}

// Initialize embeddings on load
loadEmbeddings();

// Export functions and Map
export {
    generateEmbedding,
    cosineSimilarity,
    semanticSearch,
    storePageEmbedding,
    clearEmbeddings,
    clearEmbedding,
    embeddings
}; 