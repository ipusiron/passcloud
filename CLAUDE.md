# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**PassCloud** is a client-side web application for analyzing and visualizing password lists and dictionary files. It's designed as a cybersecurity tool to help security professionals understand password patterns through visual analysis.

### Core Functionality
- **Word Cloud Analysis**: Visual representation of password frequency using font size and color
- **Partial Match Analysis**: Identifies common password stems and their combinations
- **Statistical Analysis**: Detailed metrics on password characteristics  
- **Heatmap Visualization**: 2D matrix showing length vs frequency relationships

## Architecture

This is a pure client-side application with no build process required:

- `index.html` - Main application structure with drag & drop interface
- `script.js` - Core analysis engine (~1,364 lines) handling file processing, frequency analysis, and visualization
- `style.css` - Complete styling with dark/light theme support using CSS custom properties

### Key Dependencies
- **wordcloud2.js**: Main visualization library loaded via CDN (`https://unpkg.com/wordcloud@1.1.1/src/wordcloud2.js`)
- **Google Fonts**: Orbitron (headers) and Space Mono (monospace text)

## Development Commands

**No build process required** - this is a static web application.

### Running the Application
```bash
# Simply open index.html in a web browser
open index.html
# OR serve locally
python -m http.server 8000
```

### Testing
Use the provided sample file:
```bash
# Sample file located at:
sample/passcloud_sample_1000.txt
```

## Code Architecture Details

### Theme System
- Uses CSS custom properties (`--bg-primary`, `--text-primary`, etc.)
- Theme switching via `data-theme` attribute on document root
- Persisted in localStorage with key `'theme'`
- Toggle functionality in `toggleTheme()` function

### Analysis Engine (`script.js`)
- **File Processing**: Handles UTF-8 text files, parses line-by-line
- **Frequency Analysis**: Creates hash maps for password occurrence counting
- **Stem Analysis**: Uses predefined list of 50+ common stems (pass, admin, 123, etc.)
- **Pattern Detection**: Identifies sequential, keyboard, and year patterns
- **Visualization Integration**: Canvas-based rendering with high-DPI support

### Key Global Variables
- `wordList`: Array of [password, count] tuples from current analysis
- `currentFile`: File object from drag & drop or file input
- `originalLineCount`: Total lines in uploaded file (for statistics)

### Canvas Rendering
- High-resolution display support via `devicePixelRatio`
- Custom color schemes for dark/light modes
- Interactive tooltips and click handlers
- Background grid patterns for visual enhancement

## Important Implementation Notes

### Security & Privacy
- **Client-side only**: No data transmitted to external servers
- **Local processing**: All analysis happens in browser memory
- **No persistence**: Passwords are never stored permanently

### Performance Considerations
- Files limited to ~10,000 lines for browser performance
- Efficient algorithms using frequency maps and hash tables
- Canvas optimization with proper scaling and cleanup

### Multi-language Support
- Primary language: Japanese
- UI labels and descriptions in Japanese
- Comments and console logs in Japanese/English mix

### File Format Requirements
- UTF-8 encoded `.txt` files
- One password per line
- Empty lines automatically filtered out
- Case normalization applied during processing

## Common Modifications

### Adding New Analysis Modes
1. Add new view panel in `index.html`
2. Create corresponding `draw[ModeName]()` function in `script.js`
3. Update `switchView()` function to handle new mode
4. Add CSS styles for new panel

### Modifying Color Schemes
- Update `colorSchemes` object in `drawWordCloud()` function
- Modify CSS custom properties in `:root` and `[data-theme="dark"]`

### Extending Stem Analysis
- Modify `knownStems` array at top of `script.js`
- Update `analyzePartialMatches()` function for new patterns

## Debugging

### Common Issues
- WordCloud library not loading: Check CDN connectivity, fallback to local file
- Canvas rendering issues: Verify `devicePixelRatio` calculations
- Theme switching problems: Check localStorage and `data-theme` attribute

### Console Debugging
- Enable verbose logging by checking browser console
- Key debug points: file processing, word list generation, canvas rendering