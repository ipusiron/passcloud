# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**PassCloud** is a client-side web application for analyzing and visualizing password lists and dictionary files. It helps security professionals understand password patterns through visual analysis (word clouds, partial match analysis, statistics, and heatmaps).

## Development Commands

**No build process required** - this is a static web application.

```bash
# Serve locally
python -m http.server 8000

# Test with sample file
sample/passcloud_sample_1000.txt
```

## Architecture

### File Structure
```
index.html              # Main application entry point
css/
  main.css             # CSS entry point (imports all modules)
  base.css             # CSS variables, typography, layout
  wordcloud.css        # Word cloud view styles
  partial.css          # Partial match view styles
  stats.css            # Statistics view styles
  heatmap.css          # Heatmap view styles
  modal.css            # Help modal styles
js/
  main.js              # PassCloudApp class (orchestration)
  utils.js             # PassCloudUtils class + knownStems array
  wordcloud2.js        # Bundled wordcloud2 library
  wordcloud-analysis.js # WordCloudAnalysis class
  partial-analysis.js   # PartialAnalysis class
  stats-analysis.js     # StatsAnalysis class
  heatmap-analysis.js   # HeatmapAnalysis class
```

### Module Architecture

**PassCloudApp** (`js/main.js`) - Main orchestrator
- Manages application state (`currentFile`, `wordList`, `originalLineCount`)
- Initializes and coordinates four analysis modules
- Handles theme switching, file input, view switching

**PassCloudUtils** (`js/utils.js`) - Shared utilities
- `processText()`: Parses password files into `[word, count]` tuples
- `setupCanvas()`: High-DPI canvas configuration
- `isDarkMode()`, `getColorScheme()`, `getBarColor()`: Theme-aware rendering
- Pattern detection: `hasSequentialPattern()`, `hasKeyboardPattern()`, `hasYearPattern()`
- `knownStems` array: 50+ common password stems for analysis

**Analysis Modules** - Each follows the same interface:
- `constructor(wordList)` / `updateData(wordList)`
- `draw()` - Renders the visualization
- `cleanup()` - Removes event listeners/tooltips

### Theme System
- CSS custom properties defined in `css/base.css`
- Theme stored in localStorage key `'theme'`
- Toggle via `data-theme` attribute on `<html>`
- Each analysis module reads `PassCloudUtils.isDarkMode()` for colors

### Canvas Rendering Pattern
All canvas-based modules use:
```javascript
const { ctx, rect, scale } = PassCloudUtils.setupCanvas(canvas);
// scale handles devicePixelRatio for retina displays
```

## Key Implementation Details

### Adding a New Analysis View
1. Create `js/[name]-analysis.js` with class following existing pattern
2. Add view panel in `index.html`: `<div id="[name]View" class="viewPanel">`
3. Add tab button: `<button data-tab="[name]" onclick="switchView('[name]')">`
4. Add CSS file and import in `css/main.css`
5. Initialize in `PassCloudApp.updateAnalysisModules()`
6. Add case in `PassCloudApp.drawCurrentMode()`

### Modifying Stem Analysis
- Edit `knownStems` array in `js/utils.js`
- Stems are used by both word cloud stemming mode and partial match analysis

### Color Schemes
- Dark mode: Cyan, magenta, neon colors for visibility
- Light mode: Navy, maroon, forest green for contrast
- Defined in `PassCloudUtils.getColorScheme()`

## Constraints
- Client-side only: No server communication
- UTF-8 `.txt` files, one password per line
- Performance limit: ~10,000 lines recommended
- Japanese UI labels throughout
