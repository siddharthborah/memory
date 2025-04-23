# Memory - Chrome Extension

A Chrome extension that helps you remember and search through web pages and tweets using semantic search. Built with modern web technologies and powered by AI.

## Features

- Remember web pages and tweets with a single click
- Semantic search through your saved content
- Keyboard shortcuts for quick access
- Debug panel for understanding search results
- Modern, clean interface
- Support for both text-based and semantic search
- Automatic content extraction and summarization
- Persistent storage of your memories

## Installation

1. Clone this repository
```bash
git clone https://github.com/siddharthborah/memory.git
cd memory
```

2. Install dependencies
```bash
npm install
```

3. Build the extension
```bash
npm run build
```
The build process will automatically:
- Copy required WebAssembly (WASM) files from the transformers package
- Bundle all assets and dependencies
- Create the distribution in the `dist` directory

4. Load the extension in Chrome
- Open Chrome and navigate to `chrome://extensions/`
- Enable "Developer mode" in the top right
- Click "Load unpacked" and select the `dist` directory

## Development

- `npm run build`: Build the extension (automatically handles WASM files)
- `npm run watch`: Build and watch for changes
- `npm run clean`: Clean the build directory

## Usage

- Click the extension icon to open the popup
- Use `⌘M` (Mac) or `Ctrl+M` (Windows) to remember the current page
- Use `⌘J` (Mac) or `Ctrl+J` (Windows) to view your memories
- Search through your memories using text or semantic search
- Right-click on any page to remember it
- On Twitter, right-click to remember specific tweets

## Architecture

The extension uses:
- Semantic search powered by MiniLM-L6-v2
- WebAssembly (WASM) for efficient model inference
  - Uses ONNX Runtime for model execution
  - Automatically bundles required WASM files during build
- Chrome Storage API for persistence
- Webpack for bundling
- Transformers.js for AI model inference
- Readability.js for content extraction

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

## Troubleshooting

If you encounter any issues with the build:
1. Make sure all dependencies are installed: `npm install`
2. Check that the WASM files are present in the root directory after building
3. If WASM files are missing, you can manually copy them: `node copy-wasm.js`

## License

MIT 