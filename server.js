// server.js
const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const multer = require('multer');
const fastCsv = require('fast-csv');
const { extractDatesFromFolders } = require('./utils/extractDates');
const { combineShowTables } = require('./utils/combineShows');
const { findTextFiles, readTextFile, findAudioFiles, formatFileSize } = require('./utils/fileUtils');
const { spawn } = require('child_process');

// Initialize Express app
const app = express();
const port = process.env.PORT || 3000;

// Set up EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Body parser for form data
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Set up file upload middleware
const upload = multer({ dest: 'uploads/' });

// Store session data
const sessionData = {
  analyzedData: null,
  rootDirectory: '',
  allDatesFile: ''
};

// Home page - render index with tabs
app.get('/', (req, res) => {
  res.render('index', { 
    activeTab: 'show-browser',
    data: sessionData
  });
});

// Show browser tab
app.get('/show-browser', (req, res) => {
  res.render('index', { 
    activeTab: 'show-browser',
    data: sessionData
  });
});

// Folder analysis tab
app.get('/folder-analysis', (req, res) => {
  res.render('index', { 
    activeTab: 'folder-analysis',
    data: sessionData
  });
});

// About tab
app.get('/about', (req, res) => {
  res.render('index', { 
    activeTab: 'about',
    data: sessionData
  });
});

// API endpoint to run folder analysis
app.post('/api/analyze', async (req, res) => {
  try {
    const { rootDirectory, allDatesFile, outputFilename } = req.body;
    
    // Store directory paths
    sessionData.rootDirectory = rootDirectory;
    sessionData.allDatesFile = allDatesFile;
    
    // Validate paths
    if (!fs.existsSync(rootDirectory)) {
      return res.status(400).json({ error: `Could not find the root directory: ${rootDirectory}` });
    }
    
    if (!fs.existsSync(allDatesFile)) {
      return res.status(400).json({ error: `Could not find the all_dates.csv file: ${allDatesFile}` });
    }
    
    // Extract folder information
    const extractedDates = extractDatesFromFolders(rootDirectory);
    
    // Combine with show dates
    const finalTable = await combineShowTables(allDatesFile, extractedDates);
    
    // Store data in session for other endpoints to use
    sessionData.analyzedData = finalTable;
    
    // Save to CSV file
    const ws = fs.createWriteStream(outputFilename);
    fastCsv.write(finalTable, { headers: true })
      .pipe(ws)
      .on('finish', () => {
        console.log(`Analysis results saved to ${outputFilename}`);
      });
    
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
      message: 'Analysis complete',
      statistics,
      outputFilename
    });
  } catch (error) {
    console.error('Error during analysis:', error);
    res.status(500).json({ error: `Analysis failed: ${error.message}` });
  }
});

// API endpoint to get years (for browser tab)
app.get('/api/years', (req, res) => {
  try {
    const { useAnalysis, rootDirectory } = req.query;
    
    // Option 1: Using analysis results
    if (useAnalysis === 'true' && sessionData.analyzedData) {
      // Extract years from analyzed data
      const validShows = sessionData.analyzedData.filter(show => show.year);
      const years = [...new Set(validShows.map(show => show.year))].sort();
      
      return res.json({ years });
    } 
    // Option 2: Direct folder browsing
    else {
      const directory = rootDirectory || sessionData.rootDirectory;
      
      if (!fs.existsSync(directory)) {
        return res.status(400).json({ error: `Root directory not found: ${directory}` });
      }
      
      // Scan for year folders
      const yearFolders = [];
      const yearPattern = /^(19\d{2}|20\d{2})$/;
      
      const items = fs.readdirSync(directory);
      
      for (const item of items) {
        const itemPath = path.join(directory, item);
        if (fs.statSync(itemPath).isDirectory() && yearPattern.test(item)) {
          yearFolders.push({
            year: item,
            path: itemPath
          });
        }
      }
      
      // Sort years
      yearFolders.sort((a, b) => a.year - b.year);
      
      return res.json({
        years: yearFolders.map(folder => folder.year),
        paths: yearFolders.reduce((acc, folder) => {
          acc[folder.year] = folder.path;
          return acc;
        }, {})
      });
    }
  } catch (error) {
    console.error('Error fetching years:', error);
    res.status(500).json({ error: `Failed to fetch years: ${error.message}` });
  }
});

// API endpoint to get shows for a year
app.get('/api/shows/:year', (req, res) => {
  try {
    const { year } = req.params;
    const { useAnalysis, yearPath } = req.query;
    
    // Option 1: Using analysis results
    if (useAnalysis === 'true' && sessionData.analyzedData) {
      const yearShows = sessionData.analyzedData.filter(show => 
        show.year && show.year.toString() === year && 
        show['full path'] // Only include shows with a valid path
      );
      
      // Format the shows for display
      const showOptions = yearShows.map(show => ({
        label: `${show.ShowDate} - ${show.folder_name}`,
        path: show['full path']
      }));
      
      return res.json({ shows: showOptions });
    } 
    // Option 2: Direct folder browsing
    else {
      if (!yearPath) {
        return res.status(400).json({ error: 'Year path not provided' });
      }
      
      if (!fs.existsSync(yearPath)) {
        return res.status(400).json({ error: `Year folder not found: ${yearPath}` });
      }
      
      // Scan the year folder for show folders
      const showFolders = [];
      const items = fs.readdirSync(yearPath);
      
      for (const item of items) {
        const itemPath = path.join(yearPath, item);
        if (fs.statSync(itemPath).isDirectory()) {
          showFolders.push({
            name: item,
            path: itemPath
          });
        }
      }
      
      // Sort show folders
      showFolders.sort((a, b) => a.name.localeCompare(b.name));
      
      return res.json({
        shows: showFolders.map(folder => ({
          label: folder.name,
          path: folder.path
        }))
      });
    }
  } catch (error) {
    console.error('Error fetching shows:', error);
    res.status(500).json({ error: `Failed to fetch shows: ${error.message}` });
  }
});

// API endpoint to get show content (text files and audio files)
app.get('/api/show-content', (req, res) => {
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
        name: file.filename
      }))
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

// API endpoint to play concert with system player
app.post('/api/play-concert', (req, res) => {
  try {
    const { filePaths } = req.body;
    
    if (!filePaths || !Array.isArray(filePaths) || filePaths.length === 0) {
      return res.status(400).json({ error: 'No files to play' });
    }
    
    // Sort files alphabetically to ensure correct concert order
    filePaths.sort();
    
    // Try to find VLC on different platforms
    let vlcCmd;
    const platform = process.platform;
    
    if (platform === 'darwin') {
      // macOS
      if (fs.existsSync('/Applications/VLC.app/Contents/MacOS/VLC')) {
        vlcCmd = '/Applications/VLC.app/Contents/MacOS/VLC';
      }
    } else if (platform === 'win32') {
      // Windows
      const windowsPaths = [
        'C:\\Program Files\\VideoLAN\\VLC\\vlc.exe',
        'C:\\Program Files (x86)\\VideoLAN\\VLC\\vlc.exe'
      ];
      
      for (const p of windowsPaths) {
        if (fs.existsSync(p)) {
          vlcCmd = p;
          break;
        }
      }
    } else if (platform === 'linux') {
      // Linux
      const linuxPaths = ['/usr/bin/vlc', '/usr/local/bin/vlc'];
      
      for (const p of linuxPaths) {
        if (fs.existsSync(p)) {
          vlcCmd = p;
          break;
        }
      }
    }
    
    // Fall back to 'vlc' command if no specific path was found
    if (!vlcCmd) {
      vlcCmd = 'vlc';
    }
    
    // Start VLC process
    const vlcProcess = spawn(vlcCmd, filePaths, {
      detached: true,
      stdio: 'ignore'
    });
    
    // Detach the process so it can run independently
    vlcProcess.unref();
    
    return res.json({ 
      success: true, 
      message: `Playing ${filePaths.length} tracks with VLC` 
    });
  } catch (error) {
    console.error('Error playing concert:', error);
    res.status(500).json({ 
      success: false, 
      error: `Error playing concert: ${error.message}` 
    });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Grateful Dead Show Browser running on http://localhost:${port}`);
});