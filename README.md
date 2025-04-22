# Page Content Saver Chrome Extension

A Chrome extension that allows you to save and search web page content using semantic search capabilities. The extension uses the Transformers.js library to generate embeddings for semantic search.

## Features

- Save web page content with a single click
- Semantic search through saved pages
- Beautiful and intuitive user interface
- Keyboard shortcuts for quick access
- Persistent storage of page content and embeddings

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)
- Google Chrome browser

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd page-content-saver
```

2. Install dependencies:
```bash
npm install
```

3. Build the extension:
```bash
npm run build
```

This will create a `dist` directory containing the built extension.

## Loading the Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right corner
3. Click "Load unpacked"
4. Select the `dist` directory from your project folder

## Development

For development with hot reloading:
```bash
npm run watch
```

This will watch for file changes and rebuild automatically.

## Project Structure

```
├── dist/                  # Built extension files
├── src/                   # Source files
│   ├── options.js         # Options page logic
│   ├── popup.js          # Popup page logic
│   ├── content.js        # Content script
│   ├── background.js     # Background script
│   └── embeddings.js     # Semantic search implementation
├── manifest.json         # Extension manifest
├── options.html         # Options page
├── popup.html           # Popup page
├── webpack.config.js    # Webpack configuration
└── package.json         # Project dependencies
```

## Usage

1. **Saving Pages**:
   - Click the extension icon and click "Save Page"
   - Or use the keyboard shortcut: `Ctrl+M` (Windows/Linux) or `Cmd+M` (Mac)

2. **Viewing Saved Pages**:
   - Click the extension icon and click "View Saved Pages"
   - Or use the keyboard shortcut: `Ctrl+J` (Windows/Linux) or `Cmd+J` (Mac)

3. **Searching**:
   - Open the options page
   - Use the search box to find pages
   - Search works with both semantic and text-based matching

## Building for Production

1. Update the version in `manifest.json`
2. Run the build command:
```bash
npm run build
```
3. The production-ready files will be in the `dist` directory

## Troubleshooting

If you encounter any issues:

1. **Extension not loading**:
   - Make sure all dependencies are installed
   - Check the browser console for errors
   - Verify the manifest.json is valid

2. **Search not working**:
   - Check if the WASM files are properly loaded
   - Verify the model is downloaded correctly
   - Check the browser console for any errors

3. **Build errors**:
   - Clear the `dist` directory
   - Run `npm install` again
   - Check for any missing dependencies

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 