# Grateful Dead Show Browser

A Node.js application for browsing, organizing, and playing Grateful Dead show recordings.

## Features

- 📁 Analyzes folder names to extract show dates
- 🗓️ Matches recordings with known show database
- 📝 Browse and view text files with show details
- 🎵 Browse audio files by year and show
- ▶️ One-click concert playback with VLC
  - Smart process management (auto-closes previous show)
  - Proper playlist ordering
  - Auto-exits when playlist completes
- 📊 Show statistics and coverage information
- 🔍 Filter by year and show date
- ⚡ Optimized for local playback and browsing
- 🗄️ File caching for improved performance

## Prerequisites

- [Node.js](https://nodejs.org/) (v14 or newer)
- [VLC Media Player](https://www.videolan.org/vlc/) (for concert playback)

## Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/grateful-dead-show-browser.git
   cd grateful-dead-show-browser
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create necessary directories:
   ```bash
   mkdir -p uploads
   ```

## Usage

1. Start the application:
   ```bash
   npm start
   ```

2. Open your web browser and navigate to:
   ```
   http://localhost:3000
   ```

3. Use the application:
   - Set your root directory containing Grateful Dead recordings
   - Specify the path to all_dates.csv reference file
   - Run the analysis to extract and match show information
   - Browse shows by year and explore text files with show details
   - Click the ticket icon to play concerts with VLC
     - Click a different show's ticket to automatically switch playback
     - VLC will close automatically when the show finishes

## Development

For development with automatic server restart on file changes:

```bash
npm run dev
```

## File Structure

The file structure of your Grateful Dead recordings should follow this pattern:

```
RootDirectory/
├── 1969/
│   ├── 1969-01-25 Avalon Ballroom/
│   │   ├── gd69-01-25d1t01.flac
│   │   ├── gd69-01-25d1t02.flac
│   │   └── ...
│   └── 1969-02-11 Fillmore West/
│       └── ...
├── 1970/
│   └── ...
└── ...
```

## Reference File

The application uses a file called `all_dates.csv` that contains information about known Grateful Dead shows. This file should have at least a `ShowDate` column in `YYYY-MM-DD` format.

## Performance

The application is optimized for local use with:
- File system caching
- Efficient directory scanning
- Smart VLC process management
- Minimal dependencies

## License

MIT