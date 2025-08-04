# Greatest Story Ever Told

A Node.js application for browsing and playing your Grateful Dead show recordings with an intuitive web interface, featuring seamless **foobar2000** integration for high-quality audio playback.

## Features

- 🎵 **Intuitive browser interface** to explore show details and setlists
- ▶️ **One-click concert playback** with foobar2000 in perfect track order
  - Smart process management (auto-closes previous show)
  - Temporary playlist generation for reliable playback
  - Automatic metadata file filtering (removes `._` files)
  - Preserves exact concert sequence
- 📁 **Smart folder analysis** to extract show dates from any naming format
- 🗓️ **Built-in show database** - 2,087 verified shows with no external dependencies
- 📝 Browse and view text files with show details
- 📊 Show statistics and coverage information
- 🔍 Filter by year and show date
- ⚡ Optimized for local playback and browsing
- 🗄️ File caching for improved performance

## Prerequisites

- [Node.js](https://nodejs.org/) (v14 or newer)
- [foobar2000](https://www.foobar2000.org/mac) (for concert playback)
  - **macOS**: Download from [foobar2000.org/mac](https://www.foobar2000.org/mac)
  - **Windows**: Download from [foobar2000.org](https://www.foobar2000.org/)
  - **Linux**: Not officially supported (requires Wine compatibility layer)
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

The application intelligently extracts dates from any folder naming pattern - whether it's archive.org downloads, etree folders, or custom names. Organizing by year is required.

## Setting Up Your Music Collection Path

### 🎯 **Quick Start**
1. **Locate your collection**: Find the root directory containing your year-organized Grateful Dead folders
2. **Run the app**: Start with `npm start` and open `http://localhost:3000`
3. **Configure path**: Go to the "Show Browser" or "Folder Analysis" tabs and enter your root directory path
4. **Analyze & Browse**: Click "Run Analysis" to scan your collection. In "Show Browser" year choices will display below. 

### 📂 **Specifying Your Root Directory**

The application needs to know where your Grateful Dead show collection is stored. This is done through the **Folder Analysis** tab in the web interface.

**Your root directory path should point to the folder containing your year-organized shows:**

#### **Example Paths by Platform:**

**macOS:**
```
/Users/YourUsername/Music/GratefulDead
/Volumes/ExternalDrive/Music/grateful_dead
```

**Windows:**
```
C:\Users\YourUsername\Music\GratefulDead
D:\Music\grateful_dead
```

**Linux:**
```
/home/username/Music/GratefulDead
/media/username/external-drive/grateful_dead
```

#### **What the Path Should Contain:**
Your root directory must be organized by year, like this:
```
YourRootDirectory/
├── 1965/
├── 1966/
├── 1977/
│   ├── gd1977-05-08.sbd.hicks.4982.sbeok.shnf/
│   ├── Dead Set - 1977-10-29 - Evans Field House/
│   └── ...
├── 1985/
│   ├── gd85-02-19.akgC422.walker.scotton.miller.106685.sbeok.flac16/
│   └── ...
└── ...
```

### 🔄 **Analysis vs. Playback**

**Analysis Phase:**
- Navigate to the "Folder Analysis" tab
- Enter your root directory path in the "Root Directory Path" field
- Click "Run Analysis" to scan your collection
- Results are saved to your Downloads folder as a CSV file

**Playback Phase:**
- Switch to the "Show Browser" tab (available after analysis)
- Browse shows by year and date
- Click the concert ticket icon to play entire shows in foobar2000
- The app automatically handles file paths and playlist creation

### ⚠️ **Important Notes**

- **Path Requirements**: Must point to the directory containing year folders (1965, 1977, etc.)
- **No Renaming Needed**: Works with any folder naming convention from archive.org, etree, or custom names
- **One-Time Setup**: Path is remembered between sessions
- **Cross-Platform**: Same interface works on macOS, Windows, and Linux

## Installation

1. **Install foobar2000** on your system first (see Prerequisites above)

2. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/grateful-dead-browser.git
   cd grateful-dead-browser
   ```

3. Install dependencies:
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
   - Click the ticket to listen to entire shows in foobar2000 with proper track ordering
   - The app automatically creates temporary playlists for seamless concert playback
   - Optionally use the "Folder Analysis" tab to analyze your collection and get coverage statistics
   - Analysis results automatically save to your Downloads folder

## foobar2000 Integration

This application uses **foobar2000** for superior audio playback with the following advantages:

### 🎵 **Playback Features**
- **Perfect track ordering**: Maintains the exact concert sequence
- **Gapless playback**: Seamless transitions between tracks
- **High-quality audio**: Supports FLAC and other lossless formats
- **Auto-cleanup**: Closes previous instances when starting new shows

### ⚙️ **Technical Implementation**
- **Temporary M3U playlists**: Creates playlist files for reliable multi-track playback
- **Metadata filtering**: Automatically excludes macOS `._` files and hidden files
- **Process management**: Smart handling of foobar2000 instances
- **Cross-platform paths**: Supports macOS, Windows, and Linux (via Wine)

### 🚀 **User Experience**
- **One-click playback**: Just click the ticket image to start any show
- **Automatic switching**: Selecting a new show closes the current one and starts the new one
- **No manual playlist creation**: The app handles all playlist management automatically

## About the Data

The application includes a complete database of 2,087 verified Grateful Dead shows spanning from 1965 to 1995. The show database was created from the comprehensive **"Every Time Played" Excel spreadsheet**, which catalogs every known Grateful Dead performance. This authoritative reference is available for download at [gratefuldeadbook.com](https://www.gratefuldeadbook.com/product-page/every-time-played-excel-spreadsheet).

This built-in database eliminates the need for external files and ensures consistent, reliable show information.

## Development

For development with automatic server restart on file changes:

```bash
npm run dev
```

## Performance & Optimization

The application is optimized for local use with:
- **File system caching** for faster directory scanning
- **Efficient audio file discovery** with format filtering
- **Smart foobar2000 process management** to prevent resource conflicts
- **Temporary file cleanup** to maintain system cleanliness
- **Minimal dependencies** for faster startup
- **Built-in show database** (no external file dependencies)

## Supported Audio Formats

Optimized for **FLAC** files, but foobar2000 supports many formats including:
- FLAC (primary focus)
- MP3, MP4, AAC
- WAV, AIFF
- WavPack, Monkey's Audio (APE)
- Ogg Vorbis, Opus
- And many more with foobar2000 components

## Platform Compatibility

- ✅ **macOS**: Full native support
- ✅ **Windows**: Full native support  
- ⚠️ **Linux**: Requires Wine compatibility layer for foobar2000

## License

MIT
