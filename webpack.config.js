const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const fs = require('fs');

// Check if WASM files exist in dist
function wasmFilesExist() {
    const wasmFiles = ['ort-wasm.wasm', 'ort-wasm-simd.wasm', 'ort-wasm-threaded.wasm'];
    return wasmFiles.every(file => fs.existsSync(path.join(__dirname, 'dist', file)));
}

module.exports = {
    mode: 'production',
    entry: {
        options: './options.js',
        background: './background.js',
        content: './content.js',
        popup: './popup.js',
        'test-embeddings': './test-embeddings.js',
        'url-params': './url-params.js',
        embeddings: './embeddings.js',
        constants: './constants.js'
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].js',
        clean: true
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env']
                    }
                }
            }
        ]
    },
    plugins: [
        new CopyPlugin({
            patterns: [
                { from: 'manifest.json', to: 'manifest.json' },
                { from: '*.html', to: '[name][ext]' },
                { from: 'images', to: 'images', noErrorOnMissing: true },
                { from: 'icons', to: 'icons', noErrorOnMissing: true },
                { from: 'models', to: 'models', noErrorOnMissing: true },
                { from: 'readability.js', to: 'readability.js' },
                { from: 'toast.js', to: 'toast.js' },
                { from: 'transformers.js', to: 'transformers.js' },
                { from: 'copy-wasm.js', to: 'copy-wasm.js' },
                { from: '*.wasm', to: '[name][ext]' }
            ]
        })
    ],
    resolve: {
        extensions: ['.js']
    },
    optimization: {
        minimize: false // Disable minification to avoid eval
    }
}; 