# Memory - Chrome Extension

A Chrome extension that helps you remember and search through web pages and tweets using semantic search.

## Features

- Remember web pages and tweets with a single click
- Semantic search through your saved content
- Keyboard shortcuts for quick access
- Debug panel for understanding search results
- Modern, clean interface

## Installation

1. Clone this repository
```bash
git clone https://github.com/YOUR_USERNAME/memory.git
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

4. Load the extension in Chrome
- Open Chrome and navigate to `chrome://extensions/`
- Enable "Developer mode" in the top right
- Click "Load unpacked" and select the `dist` directory

## Development

- `npm run build`: Build the extension
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
- WebAssembly for efficient model inference
- Chrome Storage API for persistence
- Webpack for bundling

## License

MIT 