import { generateEmbedding, cosineSimilarity, semanticSearch, embeddings } from './embeddings.js';

// Test function to verify embedding generation and retrieval
async function testEmbeddings() {
    console.log('Starting embedding tests...');
    
    // Test data
    const testTexts = [
        'This is a test document about machine learning',
        'Machine learning is a subset of artificial intelligence',
        'Python is a popular programming language',
        'JavaScript is used for web development',
        'The weather is nice today'
    ];
    
    // Store embeddings for reuse
    const textEmbeddings = new Map();
    
    // Test 1: Generate embeddings
    console.log('\nTest 1: Generating embeddings...');
    for (const text of testTexts) {
        try {
            const embedding = await generateEmbedding(text);
            textEmbeddings.set(text, embedding);
            console.log(`✓ Generated embedding for: "${text.substring(0, 30)}..."`);
        } catch (error) {
            console.error(`✗ Failed to generate embedding for: "${text}"`, error);
        }
    }
    
    // Generate query embedding once for all tests
    const query = 'machine learning and AI';
    const queryEmbedding = await generateEmbedding(query);
    console.log(`✓ Generated query embedding for: "${query}"`);
    
    // Test 2: Test cosine similarity
    console.log('\nTest 2: Testing cosine similarity...');
    try {
        // Calculate similarities using stored embeddings
        const similarities = [];
        for (const [text, embedding] of textEmbeddings.entries()) {
            const similarity = cosineSimilarity(queryEmbedding, embedding);
            similarities.push({ text, similarity });
        }
        
        // Sort by similarity
        similarities.sort((a, b) => b.similarity - a.similarity);
        
        console.log('\nTop matches:');
        similarities.forEach(({ text, similarity }) => {
            console.log(`- "${text.substring(0, 30)}..." (similarity: ${similarity.toFixed(4)})`);
        });
    } catch (error) {
        console.error('✗ Failed to test similarity:', error);
    }
    
    // Test 3: Test semantic search
    console.log('\nTest 3: Testing semantic search...');
    try {
        // Create test pages with IDs
        const testPages = testTexts.map((text, index) => ({
            id: `test_${index}`,
            text: text
        }));
        
        console.log('Created test pages:', testPages);
        
        // Store embeddings for each page using pre-generated embeddings
        for (const page of testPages) {
            const embedding = textEmbeddings.get(page.text);
            if (embedding) {
                embeddings.set(page.id, embedding);
                console.log(`Stored embedding for page ${page.id}`);
            }
        }
        
        console.log('Total embeddings stored:', embeddings.size);
        
        const results = await semanticSearch(query, testPages, 5, queryEmbedding);
        console.log('\nSemantic search results:');
        if (results.length > 0) {
            results.forEach(({ page, similarity }) => {
                console.log(`- "${page.text.substring(0, 30)}..." (similarity: ${similarity.toFixed(4)})`);
            });
        } else {
            console.log('No results found (similarity threshold might be too high)');
            console.log('Try lowering the threshold in semanticSearch function');
            
            // Log all similarities to help debug threshold
            console.log('\nAll similarities (including below threshold):');
            const allSimilarities = [];
            for (const page of testPages) {
                // Use stored embedding instead of generating new one
                const embedding = embeddings.get(page.id);
                if (embedding) {
                    const similarity = cosineSimilarity(queryEmbedding, embedding);
                    allSimilarities.push({ text: page.text, similarity });
                }
            }
            // Sort by similarity
            allSimilarities.sort((a, b) => b.similarity - a.similarity);
            allSimilarities.forEach(({ text, similarity }) => {
                console.log(`- "${text.substring(0, 30)}..." (similarity: ${similarity.toFixed(4)})`);
            });
        }
    } catch (error) {
        console.error('✗ Failed to test semantic search:', error);
    }
    
    console.log('\nTests completed!');
}

// Helper function to run tests in the console
function runTests() {
    console.clear();
    console.log('Running embedding tests...');
    testEmbeddings().catch(error => {
        console.error('Test suite failed:', error);
    });
}

// Add event listener when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const testButton = document.getElementById('runTests');
    if (testButton) {
        testButton.addEventListener('click', runTests);
    }
});

// Export for use in console
window.runEmbeddingTests = runTests; 