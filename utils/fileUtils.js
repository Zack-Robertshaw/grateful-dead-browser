// utils/fileUtils.js
const fs = require('fs-extra');
const path = require('path');

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
  
  // Function to process a directory
  function processDirectory(dir, isRoot) {
    try {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const itemPath = path.join(dir, item);
        const stats = fs.statSync(itemPath);
        
        if (stats.isFile() && path.extname(item).toLowerCase() === '.txt') {
          const relativePath = path.relative(folderPath, itemPath);
          
          // Determine if it's in the root or a subfolder
          const location = isRoot ? "root" : "subfolder";
          
          textFiles.push({
            filename: item,
            full_path: itemPath,
            relative_path: relativePath,
            size: stats.size,
            location: location
          });
        } else if (stats.isDirectory() && isRoot) {
          // Only process immediate subdirectories
          processDirectory(itemPath, false);
        }
      }
    } catch (err) {
      console.error(`Error processing directory ${dir}:`, err);
    }
  }
  
  // Start processing from the root
  processDirectory(folderPath, true);
  
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
  const audioExtensions = ['.flac', '.mp3', '.wav', '.ogg', '.shn'];
  
  // Check if the folder exists
  if (!fs.existsSync(folderPath)) {
    return audioFiles;
  }
  
  // Function to process a directory
  function processDirectory(dir, isRoot) {
    try {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const itemPath = path.join(dir, item);
        const stats = fs.statSync(itemPath);
        
        if (stats.isFile()) {
          const ext = path.extname(item).toLowerCase();
          
          if (audioExtensions.includes(ext)) {
            const relativePath = path.relative(folderPath, itemPath);
            
            // Determine if it's in the root or a subfolder
            const location = isRoot ? "root" : "subfolder";
            
            audioFiles.push({
              filename: item,
              full_path: itemPath,
              relative_path: relativePath,
              size: stats.size,
              format: ext.substring(1), // Remove the dot from extension
              location: location
            });
          }
        } else if (stats.isDirectory() && isRoot) {
          // Only process immediate subdirectories
          processDirectory(itemPath, false);
        }
      }
    } catch (err) {
      console.error(`Error processing directory ${dir}:`, err);
    }
  }
  
  // Start processing from the root
  processDirectory(folderPath, true);
  
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
  
  // Handle the case when size is 0
  if (sizeBytes === 0) {
    return '0 B';
  }
  
  // Calculate the appropriate unit
  let i = 0;
  let size = sizeBytes;
  
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024.0;
    i++;
  }
  
  // Format the size with appropriate decimal places
  if (size >= 100) {
    return `${Math.round(size)} ${units[i]}`;
  } else if (size >= 10) {
    return `${size.toFixed(1)} ${units[i]}`;
  } else {
    return `${size.toFixed(2)} ${units[i]}`;
  }
}

module.exports = {
  findTextFiles,
  readTextFile,
  findAudioFiles,
  formatFileSize
};