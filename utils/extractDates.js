// utils/extractDates.js
const fs = require('fs-extra');
const path = require('path');
const moment = require('moment');

/**
 * Extract dates from all folder names in a file system regardless of date format or prefix
 * @param {string} rootDirectory - The root directory to scan
 * @returns {Array} - Array of folder objects with date information
 */
function extractDatesFromFolders(rootDirectory) {
  const results = [];
  
  // Define date patterns to match various formats
  const datePatterns = [
    // Original formats
    /gd(\d{2})-(\d{2})-(\d{2})(?:\b|\.)/,      // gd82-09-20 (YY-MM-DD)
    /gd(\d{4})-(\d{2})-(\d{2})(?:\b|\.)/,      // gd1981-02-26 (YYYY-MM-DD)
    /(?:^|\b)(\d{4})-(\d{2})-(\d{2})(?:\b|\.)/,  // 1972-10-18 (YYYY-MM-DD)
    /(?:^|\b)(\d{2})-(\d{2})-(\d{2})(?:\b|\.)/,  // 72-10-18 (YY-MM-DD)
    /(?:^|\b)(\d{2})\.(\d{2})\.(\d{2})(?:\b|\.)/,  // 72.10.18 (YY.MM.DD)
    /(?:^|\b)(\d{4})\.(\d{2})\.(\d{2})(?:\b|\.)/,  // 1972.10.18 (YYYY.MM.DD)
    /(?:^|\b)(\d{2})_(\d{2})_(\d{2})(?:\b|\.)/,    // 72_10_18 (YY_MM_DD)
    /(?:^|\b)(\d{4})_(\d{2})_(\d{2})(?:\b|\.)/, // 1972_10_18 (YYYY_MM_DD)
    
    // New patterns
    /gd(\d{2})-(\d{2})-(\d{2})sbd/,      // gd68-11-01sbd
    /gd(\d{4})-(\d{2})-(\d{2})sbd/,      // gd1970-11-23sbd
    /gd(\d{2})-(\d{1})-(\d{2})sbd/,      // gd70-3-24sbd (single digit month)
    /gd(\d{2})-(\d{2})-(\d{2})(?:acoustic|set\d)/,  // gd70-06-06acoustic, gd72-05-07set1
    /(\d{4})(?:\s+\w+\s+-\s+)(\d{1,2})-(\d{2})-(\d{2})/,  // 1969 Extravaganza - 4-06-69
    /gd(\d{4})-(\d{2})-(\d{2})d\d/,      // gd1977-04-27d1
    /gd(\d{4})\.(\d{2})\.(\d{2})(?:\.GEMS|\.SBD)/,  // gd1972.05.23.GEMS.SBD
    /gd(\d{2})-(\d{2})-(\d{2})set\d/,    // gd77-05-01set2
    /jg(\d{4})-(\d{2})-(\d{2})/,         // jg1976-01-09 (Jerry Garcia)
  ];
    
  // Simple pattern to identify year-only folders to handle separately
  const yearOnlyPattern = /^(19\d{2}|20\d{2})$/;
  
  // Function to walk through directories
  function walkDirectories(dir) {
    try {
      // Get list of all items in directory
      const items = fs.readdirSync(dir);
      
      // Process each item
      for (const item of items) {
        const itemPath = path.join(dir, item);
        const stats = fs.statSync(itemPath);
        
        // Only process directories
        if (stats.isDirectory()) {
          // Check if it's just a year folder
          const yearMatch = item.match(yearOnlyPattern);
          if (yearMatch) {
            results.push({
              folder_name: item,
              date: `${yearMatch[1]}-01-01`, // Default to January 1st
              year: parseInt(yearMatch[1]),
              month: 1, // Default
              day: 1,   // Default
              full_path: itemPath,
              folder_type: 'year_folder',
              valid: true
            });
            
            // Still walk this directory to find show folders
            walkDirectories(itemPath);
            continue;
          }
          
          // Try to match each date pattern
          let dateFound = false;
          let folderType = 'unknown';
          
          for (const pattern of datePatterns) {
            const match = item.match(pattern);
            if (match) {
              dateFound = true;
              let year = match[1];
              const month = match[2];
              const day = match[3];
              
              // Determine folder type based on pattern
              if (pattern.toString().includes('gd')) {
                folderType = 'gd_prefix';
              } else {
                folderType = 'date_only';
              }
              
              // Handle 2-digit years
              let fullYear = parseInt(year);
              if (year.length === 2) {
                // Assuming 19xx for years >= 50 and 20xx for years < 50
                if (fullYear < 50) {
                  fullYear += 2000;
                } else {
                  fullYear += 1900;
                }
              }
              
              // Create a date object for consistent representation
              try {
                const dayValue = parseInt(day);
                const monthValue = parseInt(month);
                
                const dateObj = moment(`${fullYear}-${monthValue}-${dayValue}`, 'YYYY-M-D');
                
                if (dateObj.isValid()) {
                  const formattedDate = dateObj.format('YYYY-MM-DD');
                  
                  results.push({
                    folder_name: item,
                    date: formattedDate,
                    year: fullYear,
                    month: monthValue,
                    day: dayValue,
                    full_path: itemPath,
                    folder_type: folderType,
                    valid: true
                  });
                } else {
                  // Handle invalid dates
                  results.push({
                    folder_name: item,
                    date: `${fullYear}-${month}-${day} (Invalid date)`,
                    year: fullYear,
                    month: month,
                    day: day,
                    full_path: itemPath,
                    folder_type: folderType,
                    valid: false
                  });
                }
              } catch (e) {
                // Handle date creation errors
                results.push({
                  folder_name: item,
                  date: `${fullYear}-${month}-${day} (Invalid date: ${e.message})`,
                  year: fullYear,
                  month: month,
                  day: day,
                  full_path: itemPath,
                  folder_type: folderType,
                  valid: false
                });
              }
              
              break; // Stop after finding the first pattern match
            }
          }
          
          // If no date was found in the folder name
          if (!dateFound) {
            results.push({
              folder_name: item,
              date: 'No date found',
              full_path: itemPath,
              folder_type: 'non_date',
              valid: false
            });
          }
          
          // Continue walking this directory
          walkDirectories(itemPath);
        }
      }
    } catch (err) {
      console.error(`Error walking directory ${dir}:`, err);
    }
  }
  
  // Start the directory walk
  walkDirectories(rootDirectory);
  
  return results;
}

module.exports = { extractDatesFromFolders };