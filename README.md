# Greatest Story Ever Told

A Node.js application for browsing and playing your Grateful Dead show recordings with an intuitive web interface.

## Features

- 🎵 **Intuitive browser interface** to explore show details and setlists
- ▶️ **One-click concert playback** with VLC in the correct track order
  - Smart process management (auto-closes previous show)
  - Proper playlist ordering
  - Auto-exits when playlist completes
- 📁 **Smart folder analysis** to extract show dates from any naming format
- 🗓️ **Built-in show database** - 2,087 verified shows with no external dependencies
- 📝 Browse and view text files with show details
- 📊 Show statistics and coverage information
- 🔍 Filter by year and show date
- ⚡ Optimized for local playback and browsing
- 🗄️ File caching for improved performance

## Prerequisites

- [Node.js](https://nodejs.org/) (v14 or newer)
- [VLC Media Player](https://www.videolan.org/vlc/) (for concert playback)
- The following Node.js packages (installed via `npm install`):
  - [Express](https://expressjs.com/) for the web server
  - [EJS](https://ejs.co/) for templating
  - [Day.js](https://day.js.org/) for date manipulation

## File Structure

**No renaming required!** The application works with folder names exactly as downloaded. Here's what your collection might look like:

```
RootDirectory/
├── 1985/
│   ├── gd85-02-19.akgC422.walker.scotton.miller.106685.sbeok.flac16/
│   ├── gd85-03-09.sbd.miller.104962.flac16/
│   ├── gd85-03-22.141206.remastered....known.Bryant.Miller.Noel.t-flac16/
│   └── ...
├── 1977/
│   ├── gd1977-05-08.sbd.hicks.4982.sbeok.shnf/
│   ├── Dead Set - 1977-10-29 - Evans Field House/
│   └── ...
└── ...
```

The application intelligently extracts dates from any folder naming pattern - whether it's archive.org downloads, etree folders, or custom names. Organizing by year helps with browsing performance, but isn't required.

## Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/grateful-dead-browser.git
   cd grateful-dead-browser
   ```
2. Install dependencies:
   ```bash
   npm install
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

3. How to use:
   - Use the "Show Browser" tab to explore shows by year and view text files with show details
   - Click the ticket to listen to entire shows in VLC with proper track ordering
   - Optionally use the "Folder Analysis" tab to analyze your collection and get coverage statistics
   - Analysis results automatically save to your Downloads folder

## About the Data

The application includes a complete database of 2,087 verified Grateful Dead shows spanning from 1965 to 1995. The show database was created from the comprehensive **"Every Time Played" Excel spreadsheet**, which catalogs every known Grateful Dead performance. This authoritative reference is available for download at [gratefuldeadbook.com](https://www.gratefuldeadbook.com/product-page/every-time-played-excel-spreadsheet).

This built-in database eliminates the need for external files and ensures consistent, reliable show information.

## Development

For development with automatic server restart on file changes:

```bash
npm run dev
```

## Performance

The application is optimized for local use with:
- File system caching
- Efficient directory scanning
- Smart VLC process management
- Minimal dependencies
- Built-in show database (no external file dependencies)

## License

MIT
