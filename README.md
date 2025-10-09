# Greatest Story Ever Told

A flexible Node.js application for browsing and playing your local music collection with an intuitive web interface, featuring seamless **foobar2000** integration for high-quality audio playback.

## Key Features

-   🎵 **Dynamic Music Library Browsing**: The interface adapts to your music collection's structure, offering a customized browsing experience.
-   ▶️ **One-Click Concert Playback**: Play entire albums or shows in foobar2000 with perfect track ordering.
-   📂 **Smart Folder Analysis**: Intelligently scans and processes your Grateful Dead library to provide detailed statistics and show information.
-   🗓️ **Built-in Grateful Dead Show Database**: Includes a comprehensive database of 2,087 verified shows, ensuring accurate metadata and analysis.
-   📝 **Text File Viewer**: Easily view setlists, liner notes, and other text files associated with your music.
-   ⚡ **Optimized for Performance**: Features file caching and efficient processing for a smooth and responsive experience.

## How It Works

This application is designed to handle different types of music libraries with unique structures. Here’s how it adapts to your collection:

### Multi-Level Library Browsing

The app supports two primary browsing paths:

1.  **For Grateful Dead Libraries** (`Library -> Year -> Show`):
    *   When you select the "Grateful Dead" library, the application organizes shows by year, allowing you to navigate through their extensive concert history.

2.  **For Other Music Libraries** (`Library -> Artist -> Show`):
    *   When you choose the "Other Flac" library, the interface lets you browse by artist first, then by album or show, accommodating a more traditional library structure.

### Hardcoded Music Library Paths

To simplify setup, the application uses a dropdown menu with two preset paths for your music library:
### NOTE: YOU MUST DESIGNATE YOUR LOCAL PATHS IN THE CODE BEFORE STARTING.  THERE'S NO BROWSE FEATURE TO FIND YOUR FOLDER PATH

-   **Local Drive**: `/Users/somewhere/your_folder_name`
-   **Network Drive**: `/Volumes/PiMedia/your_folder_name`

This eliminates the need for manual path entry and ensures the application can always locate your collection.

### Configuring for Your Environment

To adapt this application for your own music collection, you will need to update the hardcoded file paths.

1.  Open the `views/index.ejs` file in your editor.
2.  Find the `<select>` element with the `id="music-library-path"`.
3.  Modify the `value` attributes of the `<option>` tags to point to your music library locations.

**Example:**

```html
<select class="form-select" id="music-library-path">
  <option value="/path/to/your/local/music">Local Drive</option>
  <option value="/path/to/your/network/drive">Network Drive</option>
</select>
```

### Scoped "Folder Analysis"

The powerful "Folder Analysis" feature is specifically tailored for Grateful Dead collections. It is hardcoded to operate exclusively on the "Grateful Dead" library, providing detailed insights and statistics about your collection without affecting other music libraries.

## Prerequisites

-   [Node.js](https://nodejs.org/) (v14 or newer)
-   [foobar2000](https://www.foobar2000.org/mac) (for one-click concert playback)

## Installation

1.  **Install foobar2000** on your system.
2.  Clone this repository and navigate into the project directory.
3.  Install the required dependencies:
    ```bash
    npm install
    ```

## Usage

1.  Start the application:
    ```bash
    npm start
    ```
2.  Open your web browser and go to `http://localhost:3000`.

From there, you can use the "Show Browser" tab to explore your music collection or the "Folder Analysis" tab to analyze your Grateful Dead library.

## foobar2000 Integration

The application’s integration with foobar2000 provides a superior listening experience:

-   **Perfect Track Ordering**: Plays files in the correct sequence automatically.
-   **Gapless Playback**: Enjoy seamless transitions between tracks.
-   **High-Quality Audio**: Optimized for lossless formats like FLAC.
-   **Smart Process Management**: Automatically closes the previous show before starting a new one.

## License

MIT
