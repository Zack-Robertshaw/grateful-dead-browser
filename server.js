// server.js
const express = require('express');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { parse } = require('csv-parse');
const dayjs = require('dayjs');
const { extractDatesFromFolders } = require('./utils/extractDates');
const { combineShowTables } = require('./utils/combineShows');
const { findTextFiles, readTextFile, findAudioFiles, findImageFile, formatFileSize, findShowArtwork, extractShowMetadata } = require('./utils/fileUtils');
const { spawn, exec } = require('child_process');
const axios = require('axios');

// Initialize Express app
const app = express();
const port = process.env.PORT || 3000;

// Track current foobar2000 process
let currentFoobar2000Process = null;

// Set up EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Body parser for form data
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Simple file cache for performance
const fileCache = new Map();
const CACHE_TTL = 5000; // 5 seconds

function getCachedFileContent(filePath) {
  const cached = fileCache.get(filePath);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.content;
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  fileCache.set(filePath, { content, timestamp: Date.now() });
  return content;
}

// Store preferences in memory
const userPrefs = {
  rootDirectory: '',
  analyzedData: null
};

// Home page - render index with tabs
app.get('/', (req, res) => {
  res.render('index', { 
    activeTab: 'show-browser',
    data: userPrefs
  });
});

// Show browser tab
app.get('/show-browser', (req, res) => {
  res.render('index', { 
    activeTab: 'show-browser',
    data: userPrefs
  });
});

// Folder analysis tab
app.get('/folder-analysis', (req, res) => {
  res.render('index', { 
    activeTab: 'folder-analysis',
    data: userPrefs
  });
});

// About tab
app.get('/about', (req, res) => {
  res.render('index', { 
    activeTab: 'about',
    data: userPrefs
  });
});

// API endpoint to run folder analysis
app.post('/api/analyze', async (req, res) => {
  try {
    const { rootDirectory, outputFilename } = req.body;
    
    // Store directory paths
    userPrefs.rootDirectory = rootDirectory;
    
    // Validate paths
    if (!fs.existsSync(rootDirectory)) {
      return res.status(400).json({ error: `Could not find the root directory: ${rootDirectory}` });
    }
    
    // Extract folder information
    const extractedDates = extractDatesFromFolders(rootDirectory);
    
    // Combine with show dates using hard-coded data
    const finalTable = await combineShowTables(extractedDates);
    
    // Store data for other endpoints
    userPrefs.analyzedData = finalTable;
    
    // Save to CSV file using native fs
    const csvContent = [
      Object.keys(finalTable[0]).join(','),
      ...finalTable.map(row => Object.values(row).join(','))
    ].join('\n');
    
    // Save to Downloads folder
    const os = require('os');
    const downloadsPath = path.join(os.homedir(), 'Downloads', outputFilename);
    fs.writeFileSync(downloadsPath, csvContent);
    
    // Generate statistics
    const totalShows = finalTable.length;
    const showsWithFolders = finalTable.filter(row => row.folder_name).length;
    const missingShows = totalShows - showsWithFolders;
    const noDateFound = finalTable.filter(row => row.ShowDate === 'No date found').length;
    const invalidDates = finalTable.filter(row => row.ShowDate && row.ShowDate.includes('Invalid date')).length;
    const unmatchedDates = finalTable.filter(row => row.ShowDate && row.ShowDate.includes('Unmatched:')).length;
    
    const coverage = (showsWithFolders - noDateFound - invalidDates - unmatchedDates) / 
                    (totalShows - noDateFound - invalidDates - unmatchedDates) * 100;
    
    const statistics = {
      totalShows: totalShows - noDateFound - invalidDates - unmatchedDates,
      showsWithFolders: showsWithFolders - noDateFound - invalidDates - unmatchedDates,
      missingShows,
      coverage: coverage.toFixed(1),
      noDateFound,
      invalidDates,
      unmatchedDates
    };
    
    res.json({
      success: true,
      message: `Analysis complete - saved to Downloads/${outputFilename}`,
      statistics,
      outputFilename,
      filePath: downloadsPath
    });
  } catch (error) {
    console.error('Error during analysis:', error);
    res.status(500).json({ error: `Analysis failed: ${error.message}` });
  }
});

// Download endpoint for CSV files
app.get('/download/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const downloadsPath = path.join(os.homedir(), 'Downloads', filename);
    
    if (!fs.existsSync(downloadsPath)) {
      return res.status(404).json({ error: 'File not found in Downloads folder' });
    }
    
    res.download(downloadsPath, filename);
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({ error: `Download failed: ${error.message}` });
  }
});

// API endpoint to get the list of artists by scanning a directory
app.get('/api/artists', (req, res) => {
  try {
    const { libraryPath } = req.query;

    if (!libraryPath || !fs.existsSync(libraryPath)) {
      return res.status(400).json({ error: 'Music library path is not valid.' });
    }

    const artists = fs.readdirSync(libraryPath)
      .map(item => {
        const itemPath = path.join(libraryPath, item);
        if (fs.statSync(itemPath).isDirectory() && !item.startsWith('.')) {
          // --- NEW LOGIC: Clean up artist names ---
          let displayName = item;
          if (item.toLowerCase().includes('grateful_dead')) {
            displayName = 'Grateful Dead';
          } else if (item.toLowerCase().includes('other_flac')) {
            displayName = 'Other Flac';
          } else {
            // A simple fallback to convert underscores to spaces and capitalize words
            displayName = item.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          }
          return { name: displayName, path: itemPath };
        }
        return null;
      })
      .filter(Boolean)
      .sort((a, b) => a.name.localeCompare(b.name));
      
    res.json(artists);
  } catch (error) {
    console.error('Error fetching artists:', error);
    res.status(500).json({ error: `Failed to fetch artists: ${error.message}` });
  }
});

// API endpoint to get years (for browser tab)
app.get('/api/years', (req, res) => {
  try {
    const { useAnalysis, artistPath } = req.query;
    
    // Using analysis results
    if (useAnalysis === 'true') {
      if (userPrefs.analyzedData) {
        const validShows = userPrefs.analyzedData.filter(show => show.year);
        const years = [...new Set(validShows.map(show => show.year))].sort();
        return res.json({ years, structure: 'years' });
      } else {
        // If analysis is requested but not run, return empty
        return res.json({ years: [], structure: 'years' });
      }
    } 
    // Direct folder browsing
    else {
      if (!artistPath || !fs.existsSync(artistPath)) {
        return res.status(400).json({ error: `Artist directory not found: ${artistPath}` });
      }
      
      const items = fs.readdirSync(artistPath).filter(item => {
        const itemPath = path.join(artistPath, item);
        return fs.statSync(itemPath).isDirectory() && !item.startsWith('.');
      });

      const yearPattern = /^(19\d{2}|20\d{2})$/;
      const yearCount = items.filter(item => yearPattern.test(item)).length;
      
      // Heuristic: If at least half the folders are years, or there are at least 5 year folders, assume a year structure.
      const isYearBased = yearCount > 0 && (yearCount / items.length > 0.5 || yearCount >= 5);

      if (isYearBased) {
        // Structure is Artist -> Year -> Show
        const yearFolders = items
          .filter(item => yearPattern.test(item)) // Only include folders that match the year pattern
          .map(item => ({
            year: item,
            path: path.join(artistPath, item)
          })).sort((a, b) => a.year.localeCompare(b.year));
        
        return res.json({
          structure: 'years',
          years: yearFolders.map(folder => folder.year),
          paths: yearFolders.reduce((acc, folder) => {
            acc[folder.year] = folder.path;
            return acc;
          }, {})
        });
      } else {
        // Structure is Artist -> Sub-folder (e.g. another Artist) -> Show
        const subFolders = items.map(item => ({
          label: item,
          path: path.join(artistPath, item)
        })).sort((a, b) => a.label.localeCompare(b.label));

        return res.json({
          structure: 'artists', // This is for the "Other Flac" case
          artists: subFolders.map(f => f.label),
          paths: subFolders.reduce((acc, folder) => {
            acc[folder.label] = folder.path;
            return acc;
          }, {})
        });
      }
    }
  } catch (error) {
    console.error('Error fetching years:', error);
    res.status(500).json({ error: `Failed to fetch years: ${error.message}` });
  }
});

// API endpoint to get shows for a year or artist subfolder
app.get('/api/shows/:folderName', async (req, res) => {
  try {
    const { folderPath } = req.query;
    
    if (!folderPath) {
      return res.status(400).json({ error: 'Folder path not provided' });
    }
    
    if (!fs.existsSync(folderPath)) {
      return res.status(400).json({ error: `Folder not found: ${folderPath}` });
    }
    
    // Scan the year folder for show folders
    const showFolders = fs.readdirSync(folderPath)
      .map(item => {
        const itemPath = path.join(folderPath, item);
        if (fs.statSync(itemPath).isDirectory() && !item.startsWith('.')) {
          return { name: item, path: itemPath };
        }
        return null;
      })
      .filter(Boolean)
      .sort((a, b) => a.name.localeCompare(b.name));
    
    // Extract metadata from each show folder
    const showsWithMetadata = await Promise.all(
      showFolders.map(async (folder) => {
        const metadata = await extractShowMetadata(folder.path, folder.name);
        return {
          label: folder.name,
          path: folder.path,
          ...metadata
        };
      })
    );
    
    return res.json({
      shows: showsWithMetadata
    });
  } catch (error) {
    console.error('Error fetching shows:', error);
    res.status(500).json({ error: `Failed to fetch shows: ${error.message}` });
  }
});

// API endpoint to get show content (text files and audio files)
app.get('/api/show-content', async (req, res) => {
  try {
    const { path: showPath } = req.query;
    
    if (!showPath) {
      return res.status(400).json({ error: 'Show path not provided' });
    }
    
    if (!fs.existsSync(showPath)) {
      return res.status(400).json({ error: `Show folder not found: ${showPath}` });
    }
    
    // Find text files in the selected folder
    const textFiles = findTextFiles(showPath);
    
    // Find audio files in the selected folder
    const audioFiles = findAudioFiles(showPath);
    
    // Find artwork using 3-tier priority system (FLAC metadata, folder images, default)
    console.log(`🎨 Artwork Debug: Looking for artwork in ${showPath}`);
    const artwork = await findShowArtwork(showPath);
    console.log(`🎨 Artwork Debug: Found artwork:`, artwork ? `${artwork.type} artwork` : 'No artwork found');
    
    // Format text files for display
    const formattedTextFiles = textFiles.map(file => ({
      filename: file.filename,
      path: file.full_path,
      size: formatFileSize(file.size),
      location: file.location
    }));
    
    // Format audio files for display and group by format
    const formattedAudioFiles = audioFiles.map(file => ({
      filename: file.filename,
      path: file.full_path,
      format: file.format.toUpperCase(),
      size: formatFileSize(file.size),
      location: file.location
    }));
    
    // Group audio files by format
    const audioByFormat = {};
    formattedAudioFiles.forEach(file => {
      if (!audioByFormat[file.format]) {
        audioByFormat[file.format] = [];
      }
      audioByFormat[file.format].push(file);
    });
    
    // Sort files alphabetically for playback order
    const sortedFiles = [...formattedAudioFiles].sort((a, b) => 
      a.filename.localeCompare(b.filename)
    );
    
    return res.json({
      textFiles: formattedTextFiles,
      audioFiles: formattedAudioFiles,
      audioByFormat,
      sortedPlaylist: sortedFiles.map(file => file.path),
      trackOrder: sortedFiles.map((file, index) => ({
        number: index + 1,
        name: file.filename,
        path: file.path
      })),
      artwork
    });
  } catch (error) {
    console.error('Error fetching show content:', error);
    res.status(500).json({ error: `Failed to fetch show content: ${error.message}` });
  }
});

// API endpoint to read a text file
app.get('/api/read-text-file', (req, res) => {
  try {
    const { path: filePath } = req.query;
    
    if (!filePath) {
      return res.status(400).json({ error: 'File path not provided' });
    }
    
    if (!fs.existsSync(filePath)) {
      return res.status(400).json({ error: `File not found: ${filePath}` });
    }
    
    const content = readTextFile(filePath);
    
    return res.json({ content });
  } catch (error) {
    console.error('Error reading text file:', error);
    res.status(500).json({ error: `Failed to read text file: ${error.message}` });
  }
});

// API endpoint to serve an image file
app.get('/api/image', (req, res) => {
  try {
    const { path: imagePath } = req.query;

    if (!imagePath) {
      return res.status(400).send('Image path not provided');
    }

    // Security check: Ensure the path is likely safe,
    // though more robust validation might be needed in a real-world app
    if (!fs.existsSync(imagePath)) {
      return res.status(404).send('Image not found');
    }

    res.sendFile(imagePath);
  } catch (error) {
    console.error('Error serving image:', error);
    res.status(500).send('Error serving image');
  }
});

// Check if foobar2000 is already running via Beefweb API
async function isFoobar2000Running() {
  try {
    console.log('Checking if foobar2000 is running via Beefweb API...');
    const response = await axios.get('http://localhost:8888/api/player', {
      timeout: 1000
    });
    console.log('✅ foobar2000 is running (Beefweb API responded)');
    return true; // If we get a response, foobar2000 is running
  } catch (error) {
    console.log('❌ foobar2000 is not running or Beefweb API not available:', error.message);
    
    // Fallback: Check if foobar2000 process is running
    return await isFoobar2000ProcessRunning();
  }
}

// Alternative method: Check if foobar2000 process is running
async function isFoobar2000ProcessRunning() {
  return new Promise((resolve) => {
    const { exec } = require('child_process');
    const platform = process.platform;
    let command;
    
    if (platform === 'darwin') {
      command = 'pgrep -f foobar2000';
    } else if (platform === 'win32') {
      command = 'tasklist /FI "IMAGENAME eq foobar2000.exe"';
    } else {
      command = 'pgrep -f foobar2000';
    }
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.log('❌ No foobar2000 process found');
        resolve(false);
      } else {
        console.log('✅ foobar2000 process is running');
        resolve(true);
      }
    });
  });
}

// Kill existing foobar2000 instance
async function killExistingFoobar2000() {
  return new Promise((resolve, reject) => {
    const { exec } = require('child_process');
    const platform = process.platform;
    let killCommand;
    
    if (platform === 'darwin') {
      killCommand = 'killall foobar2000';
    } else if (platform === 'win32') {
      killCommand = 'taskkill /F /IM foobar2000.exe';
    } else {
      killCommand = 'pkill -f foobar2000';
    }
    
    console.log(`Killing existing foobar2000 instance with: ${killCommand}`);
    
    exec(killCommand, (error, stdout, stderr) => {
      if (error) {
        // If the process wasn't running, that's actually fine
        if (error.message.includes('not found') || error.message.includes('No such process')) {
          console.log('✅ No existing foobar2000 instance to kill');
          resolve();
        } else {
          console.error('Error killing foobar2000:', error);
          reject(error);
        }
      } else {
        console.log('✅ Successfully killed existing foobar2000 instance');
        resolve();
      }
    });
  });
}

// Load playlist into existing foobar2000 instance using Beefweb API
async function loadPlaylistIntoExistingInstance(filePaths) {
  try {
    console.log(`Loading playlist into existing foobar2000 instance with ${filePaths.length} files`);
    
    // Create a temporary playlist file
    const os = require('os');
    const tempPlaylistPath = path.join(os.tmpdir(), `grateful_dead_playlist_${Date.now()}.m3u`);
    const playlistContent = filePaths.join('\n');
    fs.writeFileSync(tempPlaylistPath, playlistContent);
    
    // Method 1: Try to add files to the current playlist using Beefweb API
    try {
      console.log('Attempting to add files to current playlist via Beefweb API...');
      
      // Add files to the current playlist
      const addData = {
        paths: filePaths
      };
      
      await axios.post('http://localhost:8888/api/playlist/add', addData);
      
      // Clear current playlist first, then add new files
      await axios.post('http://localhost:8888/api/playlist/clear');
      await axios.post('http://localhost:8888/api/playlist/add', addData);
      
      // Start playback
      await axios.post('http://localhost:8888/api/player/play');
      
      console.log('✅ Successfully loaded playlist via Beefweb API');
      
    } catch (beefwebError) {
      console.log('Beefweb API failed, trying alternative method:', beefwebError.message);
      
      // Method 2: Use foobar2000 command line to load playlist into existing instance
      const { spawn } = require('child_process');
      const platform = process.platform;
      
      let foobarCmd;
      if (platform === 'darwin') {
        foobarCmd = '/Applications/foobar2000.app/Contents/MacOS/foobar2000';
      } else if (platform === 'win32') {
        foobarCmd = 'C:\\Program Files\\foobar2000\\foobar2000.exe';
      } else {
        foobarCmd = 'foobar2000';
      }
      
      console.log('Attempting to add files using command line...');
      
      // Try different command line approaches
      const commands = [
        ['--add', tempPlaylistPath],
        ['--load', tempPlaylistPath],
        ['--playlist', tempPlaylistPath]
      ];
      
      let success = false;
      
      for (const cmdArgs of commands) {
        try {
          console.log(`Trying command: ${foobarCmd} ${cmdArgs.join(' ')}`);
          
          const foobarProcess = spawn(foobarCmd, cmdArgs, {
            detached: true,
            stdio: 'ignore'
          });
          
          await new Promise((resolve, reject) => {
            foobarProcess.on('error', (err) => {
              console.log(`Command failed: ${err.message}`);
              reject(err);
            });
            
            // Give the command time to execute
            setTimeout(() => {
              console.log('Command completed');
              resolve();
            }, 2000);
          });
          
          success = true;
          console.log('✅ Successfully loaded playlist via command line');
          break;
          
        } catch (cmdError) {
          console.log(`Command failed: ${cmdError.message}`);
          continue;
        }
      }
      
      if (!success) {
        throw new Error('All command line methods failed');
      }
    }
    
    // Clean up playlist file after a delay
    setTimeout(() => {
      try {
        if (fs.existsSync(tempPlaylistPath)) {
          fs.unlinkSync(tempPlaylistPath);
          console.log('Temporary playlist file cleaned up');
        }
      } catch (err) {
        console.log('Warning: Could not clean up temporary playlist file:', err);
      }
    }, 5000);
    
  } catch (error) {
    console.error('Error loading playlist into existing foobar2000:', error);
    throw error;
  }
}

// API endpoint to play concert with system player
app.post('/api/play-concert', async (req, res) => {
  try {
    const { filePaths, startIndex = 0 } = req.body;

    if (!filePaths || !Array.isArray(filePaths) || filePaths.length === 0) {
      return res.status(400).json({ error: 'No files to play' });
    }

    // Ensure startIndex is a valid number and handle potential edge cases
    const start = Math.max(0, Math.min(parseInt(startIndex, 10) || 0, filePaths.length - 1));

    // Filter out macOS metadata files and other problematic files
    const cleanFilePaths = filePaths.filter(filePath => {
      const fileName = path.basename(filePath);
      // Exclude macOS metadata files (._filename) and hidden files
      return !fileName.startsWith('._') && !fileName.startsWith('.');
    });

    if (cleanFilePaths.length === 0) {
      return res.status(400).json({ error: 'No valid audio files found after filtering' });
    }

    // Update the start index to account for filtered files
    const adjustedStart = Math.max(0, Math.min(parseInt(startIndex, 10) || 0, cleanFilePaths.length - 1));

    // Reorder the playlist to start at the correct index
    const orderedFilePaths = [
      ...cleanFilePaths.slice(adjustedStart),
      ...cleanFilePaths.slice(0, adjustedStart)
    ];

    // Try to find foobar2000 on different platforms
    let foobarCmd;
    const platform = process.platform;
    
    if (platform === 'darwin') {
      // macOS
      if (fs.existsSync('/Applications/foobar2000.app/Contents/MacOS/foobar2000')) {
        foobarCmd = '/Applications/foobar2000.app/Contents/MacOS/foobar2000';
      }
    } else if (platform === 'win32') {
      // Windows
      const windowsPaths = [
        'C:\\Program Files\\foobar2000\\foobar2000.exe',
        'C:\\Program Files (x86)\\foobar2000\\foobar2000.exe'
      ];
      
      for (const p of windowsPaths) {
        if (fs.existsSync(p)) {
          foobarCmd = p;
          break;
        }
      }
    } else if (platform === 'linux') {
      // Linux - foobar2000 is not officially supported on Linux
      // Users would need to use Wine or similar compatibility layer
      const linuxPaths = ['/usr/bin/foobar2000', '/usr/local/bin/foobar2000'];
      
      for (const p of linuxPaths) {
        if (fs.existsSync(p)) {
          foobarCmd = p;
          break;
        }
      }
    }
    
    // Fall back to 'foobar2000' command if no specific path was found
    if (!foobarCmd) {
      foobarCmd = 'foobar2000';
    }

    // Function to start new foobar2000 process
    const startNewFoobar2000 = () => {
      return new Promise((resolve, reject) => {
        try {
          // Create a temporary M3U playlist file for reliable playback
          const os = require('os');
          const tempPlaylistPath = path.join(os.tmpdir(), `grateful_dead_playlist_${Date.now()}.m3u`);
          
          // Create M3U playlist content
          const playlistContent = orderedFilePaths.join('\n');
          fs.writeFileSync(tempPlaylistPath, playlistContent);
          
          console.log(`Loading playlist into foobar2000 with ${orderedFilePaths.length} files`);
          
          // Start foobar2000 with the playlist file
          // This will load the playlist into the currently running instance.
          const foobarProcess = spawn(foobarCmd, [tempPlaylistPath], {
            detached: true,
            stdio: 'ignore'
          });

          // We no longer track the process, as we are not killing it.
          // The user is responsible for managing the main foobar2000 instance.
          
          // Clean up playlist file after a delay
          setTimeout(() => {
            try {
              if (fs.existsSync(tempPlaylistPath)) {
                fs.unlinkSync(tempPlaylistPath);
                console.log('Temporary playlist file cleaned up');
              }
            } catch (err) {
              console.log('Warning: Could not clean up temporary playlist file:', err);
            }
          }, 5000); // Clean up after 5 seconds

          foobarProcess.on('error', (err) => {
            console.error('Failed to start foobar2000:', err);
            reject(err);
          });

          // Assume success after a short delay
          setTimeout(() => {
            resolve();
          }, 1000);

        } catch (error) {
          console.error('Error starting foobar2000 process:', error);
          reject(error);
        }
      });
    };

    // Check if foobar2000 is already running and handle accordingly
    const foobarRunning = await isFoobar2000Running();
    console.log(`foobar2000 running status: ${foobarRunning}`);
    
    if (foobarRunning) {
      // foobar2000 is already running - kill it and start a new instance
      console.log('foobar2000 is already running. Killing existing instance and starting new one.');
      
      try {
        // Kill existing foobar2000 instance
        await killExistingFoobar2000();
        
        // Wait a moment for the process to fully terminate
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Start new instance
        await startNewFoobar2000();
        
        res.json({
          success: true,
          message: `Killed existing foobar2000 instance and started new one with ${orderedFilePaths.length} tracks`
        });
        
      } catch (error) {
        console.error('Error killing existing foobar2000 instance:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to restart foobar2000 instance'
        });
      }
    } else {
      // foobar2000 is not running, start new instance
      startNewFoobar2000()
        .then(() => {
          res.json({
            success: true,
            message: `Playing ${orderedFilePaths.length} tracks with foobar2000`
          });
        })
        .catch((error) => {
          console.error('Error managing foobar2000 process:', error);
          res.status(500).json({ 
            success: false, 
            error: `Failed to start playback: ${error.message}` 
          });
        });
    }

  } catch (error) {
    console.error('Error playing concert:', error);
    res.status(500).json({ 
      success: false, 
      error: `Error playing concert: ${error.message}` 
    });
  }
});

// API endpoint to stop all playback
app.post('/api/stop', (req, res) => {
  const platform = process.platform;
  const killCommand = platform === 'darwin' ? 'killall foobar2000' : platform === 'win32' ? 'taskkill /F /IM foobar2000.exe' : 'pkill -f foobar2000';

  exec(killCommand, (error) => {
    if (error) {
      console.log('Warning: Could not kill foobar2000 process (it might not be running):', error);
      // Still send a success response, as the goal is to have no foobar2000 running
      return res.json({ success: true, message: 'Playback stopped (foobar2000 may not have been running).' });
    }
    currentFoobar2000Process = null;
    res.json({ success: true, message: 'Playback stopped successfully' });
  });
});

// API endpoint to get the currently playing track from foobar2000 using Beefweb
app.get('/api/now-playing', async (req, res) => {
  try {
    // Query Beefweb API for player state
    const playerResponse = await axios.get('http://localhost:8888/api/player', {
      timeout: 1000,
      params: {
        columns: ['%path%']
      }
    });
    
    const playerData = playerResponse.data.player;

    if (playerData && playerData.activeItem && playerData.activeItem.columns[0]) {
      const path = playerData.activeItem.columns[0];
      console.log('Now Playing:', path); // Server-side logging
      res.json({
        isPlaying: true,
        path: path
      });
    } else {
      console.log('Foobar is open, but nothing is playing.'); // Server-side logging
      res.json({ isPlaying: false });
    }
  } catch (error) {
    // If foobar2000 isn't running or doesn't respond, send isPlaying: false
    // console.log('Could not connect to foobar2000 Beefweb. Is it running with the component installed?'); // Server-side logging
    res.json({ isPlaying: false });
  }
});

// Update the cleanup handler for server shutdown as well
process.on('SIGINT', () => {
  if (currentFoobar2000Process) {
    const platform = process.platform;
    const killCommand = platform === 'darwin' ? 
      'killall foobar2000' : 
      platform === 'win32' ? 
        'taskkill /F /IM foobar2000.exe' : 
        'pkill -f foobar2000';
    
    exec(killCommand, (error) => {
      if (error) {
        console.log('Warning: Could not kill foobar2000 process on shutdown:', error);
      }
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Grateful Dead Show Browser running on http://localhost:${port}`);
});