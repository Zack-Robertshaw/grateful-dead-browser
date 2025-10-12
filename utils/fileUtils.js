// utils/fileUtils.js
const fs = require('fs');
const path = require('path');

// Simple cache implementation
const dirCache = new Map();
const CACHE_TTL = 5000; // 5 seconds

function getCachedDirContents(dir) {
  const cached = dirCache.get(dir);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.contents;
  }
  const contents = fs.readdirSync(dir, { withFileTypes: true });
  dirCache.set(dir, { contents, timestamp: Date.now() });
  return contents;
}

/**
 * Find all text files in a folder path and its immediate subfolders
 * 
 * @param {string} folderPath - Path to the folder to search
 * @returns {Array} - List of objects with file information
 */
function findTextFiles(folderPath) {
  const textFiles = [];
  
  // Check if the folder exists
  if (!fs.existsSync(folderPath)) {
    return textFiles;
  }
  
  try {
    // Get root directory contents
    const rootItems = getCachedDirContents(folderPath);
    
    // Process root files and collect subdirectories
    const subdirs = [];
    
    for (const item of rootItems) {
      // Skip hidden files (starting with . or ._) and shntool files
      if (item.name.startsWith('.')) continue;
      if (item.name.toLowerCase().includes('shntool')) continue;
      
      const itemPath = path.join(folderPath, item.name);
      
      if (item.isFile() && path.extname(item.name).toLowerCase() === '.txt') {
        const stats = fs.statSync(itemPath);
        textFiles.push({
          filename: item.name,
          full_path: itemPath,
          relative_path: item.name,
          size: stats.size,
          location: "root"
        });
      } else if (item.isDirectory()) {
        subdirs.push(itemPath);
      }
    }
    
    // Process immediate subdirectories
    for (const subdir of subdirs) {
      const items = getCachedDirContents(subdir);
      
      for (const item of items) {
        // Skip hidden files (starting with . or ._) and shntool files
        if (item.name.startsWith('.')) continue;
        if (item.name.toLowerCase().includes('shntool')) continue;
        
        if (item.isFile() && path.extname(item.name).toLowerCase() === '.txt') {
          const itemPath = path.join(subdir, item.name);
          const stats = fs.statSync(itemPath);
          textFiles.push({
            filename: item.name,
            full_path: itemPath,
            relative_path: path.relative(folderPath, itemPath),
            size: stats.size,
            location: "subfolder"
          });
        }
      }
    }
  } catch (err) {
    console.error(`Error processing directory ${folderPath}:`, err);
  }
  
  return textFiles;
}

/**
 * Read a text file and return its content
 * 
 * @param {string} filePath - Path to the text file
 * @returns {string} - Content of the text file
 */
function readTextFile(filePath) {
  try {
    return fs.readFileSync(filePath, { encoding: 'utf-8' });
  } catch (err) {
    return `Error reading file: ${err.message}`;
  }
}

/**
 * Find all audio files (FLAC, MP3, etc.) in a folder path and its immediate subfolders
 * 
 * @param {string} folderPath - Path to the folder to search
 * @returns {Array} - List of objects with file information
 */
function findAudioFiles(folderPath) {
  const audioFiles = [];
  const audioExtensions = new Set(['.flac', '.mp3', '.wav', '.ogg', '.shn']);
  
  // Check if the folder exists
  if (!fs.existsSync(folderPath)) {
    return audioFiles;
  }
  
  try {
    // Get root directory contents
    const rootItems = getCachedDirContents(folderPath);
    
    // Process root files and collect subdirectories
    const subdirs = [];
    
    for (const item of rootItems) {
      const itemPath = path.join(folderPath, item.name);
      
      if (item.isFile()) {
        const ext = path.extname(item.name).toLowerCase();
        if (audioExtensions.has(ext)) {
          const stats = fs.statSync(itemPath);
          audioFiles.push({
            filename: item.name,
            full_path: itemPath,
            relative_path: item.name,
            size: stats.size,
            format: ext.substring(1),
            location: "root"
          });
        }
      } else if (item.isDirectory()) {
        subdirs.push(itemPath);
      }
    }
    
    // Process immediate subdirectories
    for (const subdir of subdirs) {
      const items = getCachedDirContents(subdir);
      
      for (const item of items) {
        if (item.isFile()) {
          const ext = path.extname(item.name).toLowerCase();
          if (audioExtensions.has(ext)) {
            const itemPath = path.join(subdir, item.name);
            const stats = fs.statSync(itemPath);
            audioFiles.push({
              filename: item.name,
              full_path: itemPath,
              relative_path: path.relative(folderPath, itemPath),
              size: stats.size,
              format: ext.substring(1),
              location: "subfolder"
            });
          }
        }
      }
    }
  } catch (err) {
    console.error(`Error processing directory ${folderPath}:`, err);
  }
  
  return audioFiles;
}

/**
 * Find the first image file in a folder path and its immediate subfolders
 * 
 * @param {string} folderPath - Path to the folder to search
 * @returns {string|null} - The full path of the first image found, or null
 */
function findImageFile(folderPath) {
  const imageExtensions = new Set(['.jpg', '.jpeg', '.png', '.gif']);

  if (!fs.existsSync(folderPath)) {
    return null;
  }

  try {
    const rootItems = getCachedDirContents(folderPath);
    const subdirs = [];

    for (const item of rootItems) {
      if (item.name.startsWith('.')) continue; // Ignore hidden files
      const itemPath = path.join(folderPath, item.name);
      if (item.isFile()) {
        const ext = path.extname(item.name).toLowerCase();
        if (imageExtensions.has(ext)) {
          return itemPath; // Return the first one found
        }
      } else if (item.isDirectory()) {
        subdirs.push(itemPath);
      }
    }

    for (const subdir of subdirs) {
      const items = getCachedDirContents(subdir);
      for (const item of items) {
        if (item.name.startsWith('.')) continue; // Ignore hidden files
        if (item.isFile()) {
          const ext = path.extname(item.name).toLowerCase();
          if (imageExtensions.has(ext)) {
            const itemPath = path.join(subdir, item.name);
            return itemPath; // Return the first one found
          }
        }
      }
    }
  } catch (err) {
    console.error(`Error processing directory ${folderPath}:`, err);
  }

  return null; // No image found
}

/**
 * Format file size in bytes to a human-readable string
 * 
 * @param {number} sizeBytes - File size in bytes
 * @returns {string} - Formatted file size (e.g., 1.23 MB)
 */
function formatFileSize(sizeBytes) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  
  if (sizeBytes === 0) return '0 B';
  
  const i = Math.floor(Math.log(sizeBytes) / Math.log(1024));
  const size = sizeBytes / Math.pow(1024, i);
  
  return size >= 100 ? 
    `${Math.round(size)} ${units[i]}` : 
    `${size.toFixed(size >= 10 ? 1 : 2)} ${units[i]}`;
}

/**
 * Extract embedded artwork from the first FLAC file found
 * 
 * @param {string} folderPath - Path to the folder to search
 * @returns {Object|null} - The artwork data or null if not found
 */
async function extractFlacArtwork(folderPath) {
  const flacFiles = findAudioFiles(folderPath)
    .filter(file => file.format.toLowerCase() === 'flac')
    .filter(file => !file.filename.startsWith('._')); // Filter out macOS metadata files
  
  console.log(`🎵 FLAC Debug: Found ${flacFiles.length} FLAC files in ${folderPath}`);
  
  if (flacFiles.length === 0) return null;
  
  // Just use the first FLAC file found
  try {
    const mm = require('music-metadata');
    const targetFile = flacFiles[0].full_path;
    console.log(`🎵 FLAC Debug: Attempting to read metadata from ${targetFile}`);
    
    const metadata = await mm.parseFile(targetFile);
    console.log(`🎵 FLAC Debug: Metadata parsed successfully`);
    console.log(`🎵 FLAC Debug: Has common.picture?`, !!metadata.common.picture);
    
    if (metadata.common.picture && metadata.common.picture.length > 0) {
      console.log(`🎵 FLAC Debug: Found ${metadata.common.picture.length} embedded pictures`);
      const picture = metadata.common.picture[0];
      console.log(`🎵 FLAC Debug: Picture format: ${picture.format}, data length: ${picture.data.length}`);
      
      return {
        type: 'embedded',
        dataUri: `data:${picture.format};base64,${picture.data.toString('base64')}`,
        source: flacFiles[0].filename
      };
    } else {
      console.log(`🎵 FLAC Debug: No embedded pictures found`);
    }
  } catch (error) {
    console.error(`🎵 FLAC Debug: Error reading FLAC artwork from ${flacFiles[0].filename}:`, error);
  }
  
  return null;
}

/**
 * Find show artwork using 3-tier priority system:
 * 1. FLAC metadata (first priority)
 * 2. Folder images (second priority)  
 * 3. Default image (handled in frontend)
 * 
 * @param {string} folderPath - Path to the folder to search
 * @returns {Object|null} - The artwork data or null if not found
 */
async function findShowArtwork(folderPath) {
  // Priority 1: Check FLAC metadata
  const flacArtwork = await extractFlacArtwork(folderPath);
  if (flacArtwork) return flacArtwork;
  
  // Priority 2: Check folder images  
  const folderImage = findImageFile(folderPath);
  if (folderImage) return { type: 'file', path: folderImage };
  
  // Priority 3: Default image (handled in frontend)
  return null;
}

/**
 * Extract show metadata from FLAC tags
 * Parses ALBUM tag format: "YYYY-MM-DD City, State TYPE (shnid) [bitrate]"
 * Or from folder name as fallback
 */
async function extractShowMetadata(folderPath, folderName) {
  try {
    const mm = require('music-metadata');
    
    // Find first FLAC file
    const flacFiles = findAudioFiles(folderPath)
      .filter(file => file.format.toLowerCase() === 'flac')
      .filter(file => !file.filename.startsWith('._'));
    
    if (flacFiles.length === 0) {
      console.log(`No FLAC files found in ${folderPath}, parsing folder name`);
      return parseFolderName(folderName);
    }
    
    // Read metadata from first FLAC file
    const metadata = await mm.parseFile(flacFiles[0].full_path);
    const album = metadata.common.album || folderName;
    const date = metadata.common.date || metadata.common.year;
    
    // Parse the ALBUM tag
    const parsed = parseAlbumTag(album, date);
    
    return {
      ...parsed,
      folderName,
      folderPath
    };
    
  } catch (error) {
    console.error(`Error reading FLAC metadata from ${folderPath}:`, error.message);
    // Fallback to folder name parsing
    return parseFolderName(folderName);
  }
}

/**
 * Parse ALBUM tag format: "YYYY-MM-DD City, State TYPE (shnid) [bitrate]"
 * Example: "1987-07-02 Red Rocks Amphitheatre, Morrison, CO SBD (12345) [24-96]"
 */
function parseAlbumTag(album, date) {
  const result = {
    date: null,
    venue: null,
    city: null,
    state: null,
    recordingType: null,
    shnid: null,
    bitrate: null
  };
  
  // Extract date (YYYY-MM-DD at start or from DATE tag)
  const dateMatch = album.match(/^(\d{4}-\d{2}-\d{2})/);
  if (dateMatch) {
    result.date = dateMatch[1];
  } else if (date) {
    result.date = date;
  }
  
  // Remove date from string for further parsing
  let remaining = album.replace(/^\d{4}-\d{2}-\d{2}\s*/, '');
  
  // Extract shnid from (####)
  const shnidMatch = remaining.match(/\((\d+)\)/);
  if (shnidMatch) {
    result.shnid = shnidMatch[1];
    remaining = remaining.replace(/\(\d+\)/, '').trim();
  }
  
  // Extract bitrate from [##-##] or [##]
  const bitrateMatch = remaining.match(/\[([^\]]+)\]/);
  if (bitrateMatch) {
    result.bitrate = bitrateMatch[1];
    remaining = remaining.replace(/\[[^\]]+\]/, '').trim();
  }
  
  // Extract recording type (SBD, AUD, MTX, etc.) - usually before parentheses
  const typeMatch = remaining.match(/\b(SBD|AUD|MTX|MATRIX|PCM|FM)\b/i);
  if (typeMatch) {
    result.recordingType = typeMatch[1].toUpperCase();
    remaining = remaining.replace(/\b(SBD|AUD|MTX|MATRIX|PCM|FM)\b/i, '').trim();
  }
  
  // What's left should be venue and location
  // Format can be: "Venue, City, ST" or "Venue City, ST" or "City, ST"
  remaining = remaining.replace(/\s+/g, ' ').trim();
  
  // Try to extract state (2-letter code at end)
  const stateMatch = remaining.match(/,\s*([A-Z]{2})$/);
  if (stateMatch) {
    result.state = stateMatch[1];
    remaining = remaining.replace(/,\s*[A-Z]{2}$/, '').trim();
  }
  
  // Try to extract city (last part before state)
  const cityMatch = remaining.match(/,\s*([^,]+)$/);
  if (cityMatch) {
    result.city = cityMatch[1].trim();
    remaining = remaining.replace(/,\s*[^,]+$/, '').trim();
  } else if (remaining && !result.city) {
    // No comma found, so what remains is the city (not a venue)
    result.city = remaining;
    remaining = '';
  }
  
  // What remains is the venue
  if (remaining) {
    result.venue = remaining.trim();
  }
  
  return result;
}

/**
 * Fallback: Parse folder name when FLAC metadata is not available
 */
function parseFolderName(folderName) {
  // Try to parse using similar logic as ALBUM tag
  const parsed = parseAlbumTag(folderName, null);
  
  return {
    ...parsed,
    venue: parsed.venue || folderName,
    folderName
  };
}

module.exports = {
  findTextFiles,
  readTextFile,
  findAudioFiles,
  formatFileSize,
  findImageFile,
  extractFlacArtwork,
  findShowArtwork,
  extractShowMetadata
};