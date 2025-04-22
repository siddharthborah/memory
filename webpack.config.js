const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
    mode: 'production',
    entry: {
        options: './options.js',
        background: './background.js',
        content: './content.js',
        popup: './popup.js',
        'test-embeddings': './test-embeddings.js',
        'url-params': './url-params.js'
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
                { from: '*.wasm', to: '[name][ext]' },
                { from: 'models', to: 'models', noErrorOnMissing: true },
                { from: 'readability.js', to: 'readability.js' }
            ]
        })
    ],
    resolve: {
        extensions: ['.js']
    }
}; 