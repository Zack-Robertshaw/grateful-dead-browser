// utils/combineShows.js
const fs = require('fs-extra');
const csv = require('fast-csv');
const { collect } = require('collect.js');

/**
 * Combine the all_dates.csv file with the extracted folder data
 * 
 * @param {string} allDatesFile - Path to the all_dates.csv file
 * @param {Array} extractedFolderData - List of objects containing folder information
 * @returns {Promise<Array>} - Promise resolving to the combined data array
 */
async function combineShowTables(allDatesFile, extractedFolderData) {
  // Read the all_dates CSV file
  const allDatesPromise = new Promise((resolve, reject) => {
    const allDates = [];
    
    fs.createReadStream(allDatesFile)
      .pipe(csv.parse({ headers: true }))
      .on('error', error => reject(error))
      .on('data', row => allDates.push(row))
      .on('end', () => resolve(allDates));
  });
  
  // Wait for the CSV to be fully loaded
  const allDatesData = await allDatesPromise;
  
  // Convert the extracted folder data into a similar format
  const foldersData = extractedFolderData.map(folder => {
    return {
      'flac show date': folder.date,
      'folder_name': folder.folder_name,
      'year': folder.year,
      'full path': folder.full_path,
      'folder_type': folder.folder_type,
      'month': folder.month,
      'day': folder.day
    };
  });
  
  // Create a new combined data array starting with the all_dates data
  const combinedData = [...allDatesData];
  
  // Initialize new columns with null values
  combinedData.forEach(row => {
    row['flac show date'] = null;
    row['folder_name'] = null;
    row['year'] = null;
    row['full path'] = null;
    row['folder_type'] = null;
    row['month'] = null;
    row['day'] = null;
  });
  
  // Keep track of which folders have been matched
  const matchedFolders = new Set();
  
  // For each row in allDates, find matching folder(s) based on date
  combinedData.forEach(row => {
    const showDate = row['ShowDate'];
    
    // Find any folders with matching dates
    const matchingFolders = foldersData.filter(folder => 
      folder['flac show date'] === showDate
    );
    
    if (matchingFolders.length > 0) {
      // Use the first match to fill in the data
      const firstMatch = matchingFolders[0];
      row['flac show date'] = firstMatch['flac show date'];
      row['folder_name'] = firstMatch['folder_name'];
      row['year'] = firstMatch['year'];
      row['full path'] = firstMatch['full path'];
      row['folder_type'] = firstMatch['folder_type'];
      row['month'] = firstMatch['month'];
      row['day'] = firstMatch['day'];
      
      // Mark this folder as matched
      matchedFolders.add(firstMatch['flac show date']);
    }
  });
  
  // Count shows per year using collect.js (similar to Counter in Python)
  const validRows = combinedData.filter(row => row['year']);
  const yearCounts = collect(validRows).groupBy('year').map(group => group.count());
  
  combinedData.forEach(row => {
    if (row['year']) {
      row['<< total shows per year'] = yearCounts.get(row['year']);
    }
  });
  
  // Count shows per date (how many folder entries match each date)
  const dateCounts = {};
  
  // Get unique dates
  const uniqueDates = [...new Set(combinedData
    .map(row => row['ShowDate'])
    .filter(date => date && !date.includes('No date found') && !date.includes('Invalid date'))
  )];
  
  // Count matching folders for each date
  uniqueDates.forEach(date => {
    const matchingCount = foldersData.filter(folder => folder['flac show date'] === date).length;
    if (matchingCount > 0) {
      dateCounts[date] = matchingCount;
    } else {
      dateCounts[date] = '';
    }
  });
  
  // Add date counts to combined data
  combinedData.forEach(row => {
    if (dateCounts[row['ShowDate']]) {
      row['shows per date'] = dateCounts[row['ShowDate']];
    }
  });
  
  // Create arrays for folders that didn't match any show date
  const unmatchedValidFolders = [];
  const noDateOrInvalidFolders = [];
  
  foldersData.forEach(folder => {
    const flacDate = folder['flac show date'];
    
    // Skip if already matched
    if (matchedFolders.has(flacDate)) {
      return;
    }
    
    // Determine if it's a no-date/invalid or just unmatched valid date
    if (flacDate === 'No date found' || flacDate.includes('Invalid date')) {
      noDateOrInvalidFolders.push(folder);
    } else {
      // This is a valid date that doesn't match any show in all_dates.csv
      unmatchedValidFolders.push(folder);
    }
  });
  
  // Add both types of folders to the combined data
  const additionalRows = [];
  
  // Add unmatched valid date folders
  unmatchedValidFolders.forEach(folder => {
    const newRow = {
      'ShowDate': `Unmatched: ${folder['flac show date']}`,
      'flac show date': folder['flac show date'],
      'folder_name': folder['folder_name'],
      'year': folder['year'],
      'month': folder['month'],
      'day': folder['day'],
      'full path': folder['full path'],
      'folder_type': folder['folder_type']
    };
    additionalRows.push(newRow);
  });
  
  // Add no date/invalid date folders
  noDateOrInvalidFolders.forEach(folder => {
    const newRow = {
      'ShowDate': folder['flac show date'],
      'flac show date': folder['flac show date'],
      'folder_name': folder['folder_name'],
      'full path': folder['full path'],
      'folder_type': folder['folder_type']
    };
    
    // Add other values if they exist
    ['year', 'month', 'day'].forEach(col => {
      if (folder[col]) {
        newRow[col] = folder[col];
      }
    });
    
    additionalRows.push(newRow);
  });
  
  // Add all the additional rows
  return [...combinedData, ...additionalRows];
}

module.exports = { combineShowTables };