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

module.exports = {
  findTextFiles,
  readTextFile,
  findAudioFiles,
  formatFileSize
};