const fs = require('fs');
const path = require('path');

const sourceDir = path.join(__dirname, 'node_modules', '@xenova', 'transformers', 'dist');
const targetDir = __dirname;

const wasmFiles = [
    'ort-wasm.wasm',
    'ort-wasm-simd.wasm',
    'ort-wasm-threaded.wasm'
];

wasmFiles.forEach(file => {
    const sourcePath = path.join(sourceDir, file);
    const targetPath = path.join(targetDir, file);
    
    if (fs.existsSync(sourcePath)) {
        fs.copyFileSync(sourcePath, targetPath);
        console.log(`Copied ${file} to extension directory`);
    } else {
        console.error(`Could not find ${file} in ${sourceDir}`);
    }
}); 