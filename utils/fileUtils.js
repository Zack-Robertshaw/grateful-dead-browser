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

module.exports = {
  findTextFiles,
  readTextFile,
  findAudioFiles,
  formatFileSize,
  findImageFile,
  extractFlacArtwork,
  findShowArtwork
};