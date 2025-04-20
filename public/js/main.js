// DOM Elements
const showBrowserElements = {
    useAnalysis: document.getElementById('use-analysis'),
    analysisCheckContainer: document.getElementById('analysis-check-container'),
    rootDirContainer: document.getElementById('root-dir-container'),
    browserRootDir: document.getElementById('browser-root-dir'),
    yearSelect: document.getElementById('year-select'),
    showSelect: document.getElementById('show-select'),
    showContent: document.getElementById('show-content'),
    noShowSelected: document.getElementById('no-show-selected'),
    textFileSelect: document.getElementById('text-file-select'),
    textFileContent: document.getElementById('text-file-content'),
    trackList: document.getElementById('track-list'),
    audioFormatCounts: document.getElementById('audio-format-counts'),
    audioFilesTable: document.getElementById('audio-files-table'),
    playConcert: document.getElementById('play-concert')
  };
  
  const folderAnalysisElements = {
    analysisForm: document.getElementById('analysis-form'),
    rootDirectory: document.getElementById('root-directory'),
    allDatesFile: document.getElementById('all-dates-file'),
    outputFilename: document.getElementById('output-filename'),
    analysisResults: document.getElementById('analysis-results'),
    analysisSuccessMessage: document.getElementById('analysis-success-message'),
    statTotalShows: document.getElementById('stat-total-shows'),
    statShowsWithFolders: document.getElementById('stat-shows-with-folders'),
    statMissingShows: document.getElementById('stat-missing-shows'),
    statCoverage: document.getElementById('stat-coverage'),
    statNoDateFound: document.getElementById('stat-no-date-found'),
    statInvalidDates: document.getElementById('stat-invalid-dates'),
    statUnmatchedDates: document.getElementById('stat-unmatched-dates'),
    downloadResults: document.getElementById('download-results')
  };
  
  // Global variables
  let currentYearPath = null;
  let currentShowPath = null;
  let currentPlaylist = [];
  
  // Run folder analysis
  async function runAnalysis() {
    try {
      // Get form values
      const rootDirectory = folderAnalysisElements.rootDirectory.value;
      const allDatesFile = folderAnalysisElements.allDatesFile.value;
      const outputFilename = folderAnalysisElements.outputFilename.value;
      
      // Validate inputs
      if (!rootDirectory || !allDatesFile || !outputFilename) {
        alert('Please fill in all fields');
        return;
      }
      
      // Show loading state
      folderAnalysisElements.analysisForm.querySelector('button[type="submit"]').textContent = 'Analyzing...';
      folderAnalysisElements.analysisForm.querySelector('button[type="submit"]').disabled = true;
      
      // Run analysis
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          rootDirectory,
          allDatesFile,
          outputFilename
        })
      });
      
      const data = await response.json();
      
      // Reset button state
      folderAnalysisElements.analysisForm.querySelector('button[type="submit"]').textContent = 'Run Analysis';
      folderAnalysisElements.analysisForm.querySelector('button[type="submit"]').disabled = false;
      
      if (data.error) {
        alert(data.error);
        return;
      }
      
      // Show results
      folderAnalysisElements.analysisResults.style.display = 'block';
      folderAnalysisElements.analysisSuccessMessage.textContent = data.message;
      
      // Update statistics
      folderAnalysisElements.statTotalShows.textContent = data.statistics.totalShows;
      folderAnalysisElements.statShowsWithFolders.textContent = data.statistics.showsWithFolders;
      folderAnalysisElements.statMissingShows.textContent = data.statistics.missingShows;
      folderAnalysisElements.statCoverage.textContent = `${data.statistics.coverage}%`;
      folderAnalysisElements.statNoDateFound.textContent = data.statistics.noDateFound;
      folderAnalysisElements.statInvalidDates.textContent = data.statistics.invalidDates;
      folderAnalysisElements.statUnmatchedDates.textContent = data.statistics.unmatchedDates;
      
      // Setup download link
      folderAnalysisElements.downloadResults.href = `/download/${data.outputFilename}`;
      
      // Update show browser availability
      await checkAnalysisAvailable();
    } catch (error) {
      console.error('Error running analysis:', error);
      alert(`Error running analysis: ${error.message}`);
      folderAnalysisElements.analysisForm.querySelector('button[type="submit"]').textContent = 'Run Analysis';
      folderAnalysisElements.analysisForm.querySelector('button[type="submit"]').disabled = false;
    }
  }
  
  // Check if analysis data is available
  async function checkAnalysisAvailable() {
    try {
      const response = await fetch('/api/years?useAnalysis=true');
      const data = await response.json();
      
      if (data.years && data.years.length > 0) {
        showBrowserElements.analysisCheckContainer.style.display = 'block';
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error checking analysis availability:', error);
      return false;
    }
  }
  
  // Load years based on the selected mode (analysis or direct browsing)
  async function loadYears() {
    // Clear and disable year select while loading
    showBrowserElements.yearSelect.innerHTML = '<option value="">Loading years...</option>';
    showBrowserElements.yearSelect.disabled = true;
    
    try {
      const useAnalysis = showBrowserElements.useAnalysis && showBrowserElements.useAnalysis.checked;
      const rootDirectory = showBrowserElements.browserRootDir.value;
      
      const response = await fetch(`/api/years?useAnalysis=${useAnalysis}&rootDirectory=${encodeURIComponent(rootDirectory)}`);
      const data = await response.json();
      
      if (data.error) {
        showBrowserElements.yearSelect.innerHTML = `<option value="">${data.error}</option>`;
        return;
      }
      
      if (data.years && data.years.length > 0) {
        // Populate year select
        showBrowserElements.yearSelect.innerHTML = '';
        data.years.forEach(year => {
          const option = document.createElement('option');
          option.value = year;
          option.textContent = year;
          showBrowserElements.yearSelect.appendChild(option);
        });
        
        // Store year paths if available
        if (data.paths) {
          window.yearPaths = data.paths;
        }
        
        // Enable the select
        showBrowserElements.yearSelect.disabled = false;
      } else {
        showBrowserElements.yearSelect.innerHTML = '<option value="">No years found</option>';
      }
    } catch (error) {
      console.error('Error loading years:', error);
      showBrowserElements.yearSelect.innerHTML = '<option value="">Error loading years</option>';
    }
  }
  
  // Load shows for the selected year
  async function loadShows(year) {
    // Clear and disable show select while loading
    showBrowserElements.showSelect.innerHTML = '<option value="">Loading shows...</option>';
    showBrowserElements.showSelect.disabled = true;
    
    try {
      const useAnalysis = showBrowserElements.useAnalysis && showBrowserElements.useAnalysis.checked;
      
      // Determine year path
      let yearPath = '';
      if (!useAnalysis && window.yearPaths) {
        yearPath = window.yearPaths[year];
        currentYearPath = yearPath;
      }
      
      const response = await fetch(`/api/shows/${year}?useAnalysis=${useAnalysis}&yearPath=${encodeURIComponent(yearPath)}`);
      const data = await response.json();
      
      if (data.error) {
        showBrowserElements.showSelect.innerHTML = `<option value="">${data.error}</option>`;
        return;
      }
      
      if (data.shows && data.shows.length > 0) {
        // Populate show select
        showBrowserElements.showSelect.innerHTML = '<option value="">Select a show</option>';
        data.shows.forEach(show => {
          const option = document.createElement('option');
          option.value = show.path;
          option.textContent = show.label;
          showBrowserElements.showSelect.appendChild(option);
        });
        
        // Enable the select
        showBrowserElements.showSelect.disabled = false;
      } else {
        showBrowserElements.showSelect.innerHTML = '<option value="">No shows found for this year</option>';
      }
    } catch (error) {
      console.error('Error loading shows:', error);
      showBrowserElements.showSelect.innerHTML = '<option value="">Error loading shows</option>';
    }
  }
  
  // Load show content (text files and audio files)
  async function loadShowContent(showPath) {
    try {
      // Store current show path
      currentShowPath = showPath;
      
      // Show loading state
      showBrowserElements.showContent.style.display = 'block';
      showBrowserElements.noShowSelected.style.display = 'none';
      showBrowserElements.textFileContent.textContent = 'Loading show content...';
      showBrowserElements.trackList.textContent = 'Loading tracks...';
      
      const response = await fetch(`/api/show-content?path=${encodeURIComponent(showPath)}`);
      const data = await response.json();
      
      if (data.error) {
        showBrowserElements.textFileContent.textContent = data.error;
        return;
      }
      
      // Update text files dropdown
      if (data.textFiles && data.textFiles.length > 0) {
        showBrowserElements.textFileSelect.innerHTML = '<option value="">Select a text file</option>';
        data.textFiles.forEach(file => {
          const option = document.createElement('option');
          option.value = file.path;
          option.textContent = `${file.filename} (${file.size})`;
          showBrowserElements.textFileSelect.appendChild(option);
        });
      } else {
        showBrowserElements.textFileSelect.innerHTML = '<option value="">No text files found</option>';
      }
      
      // Update audio format counts
      if (data.audioByFormat) {
        let formatCountsHtml = '';
        Object.entries(data.audioByFormat).forEach(([format, files]) => {
          formatCountsHtml += `<span class="badge bg-secondary me-2">${format}: ${files.length} files</span>`;
        });
        showBrowserElements.audioFormatCounts.innerHTML = formatCountsHtml;
      } else {
        showBrowserElements.audioFormatCounts.innerHTML = '<p>No audio files found</p>';
      }
      
      // Update audio files table
      const audioTableBody = showBrowserElements.audioFilesTable.querySelector('tbody');
      audioTableBody.innerHTML = '';
      
      if (data.audioFiles && data.audioFiles.length > 0) {
        data.audioFiles.forEach(file => {
          const row = document.createElement('tr');
          row.innerHTML = `
            <td>${file.filename}</td>
            <td>${file.format}</td>
            <td>${file.size}</td>
            <td>${file.location}</td>
          `;
          audioTableBody.appendChild(row);
        });
      } else {
        audioTableBody.innerHTML = '<tr><td colspan="4" class="text-center">No audio files found</td></tr>';
      }
      
      // Update track list
      if (data.trackOrder && data.trackOrder.length > 0) {
        let trackListText = '';
        data.trackOrder.forEach(track => {
          trackListText += `${track.number}. ${track.name}\n`;
        });
        showBrowserElements.trackList.textContent = trackListText;
      } else {
        showBrowserElements.trackList.textContent = 'No tracks found';
      }
      
      // Store playlist for the play button
      if (data.sortedPlaylist) {
        currentPlaylist = data.sortedPlaylist;
      } else {
        currentPlaylist = [];
      }
      
      // Update play button state
      showBrowserElements.playConcert.disabled = currentPlaylist.length === 0;
    } catch (error) {
      console.error('Error loading show content:', error);
      showBrowserElements.textFileContent.textContent = `Error loading content: ${error.message}`;
    }
  }
  
  // Load text file content
  async function loadTextFileContent(filePath) {
    try {
      showBrowserElements.textFileContent.textContent = 'Loading file content...';
      
      const response = await fetch(`/api/read-text-file?path=${encodeURIComponent(filePath)}`);
      const data = await response.json();
      
      if (data.error) {
        showBrowserElements.textFileContent.textContent = data.error;
        return;
      }
      
      showBrowserElements.textFileContent.textContent = data.content;
    } catch (error) {
      console.error('Error loading text file content:', error);
      showBrowserElements.textFileContent.textContent = `Error loading file content: ${error.message}`;
    }
  }
  
  // Play concert with VLC
  async function playConcert() {
    try {
      if (currentPlaylist.length === 0) {
        alert('No audio files to play');
        return;
      }
      
      showBrowserElements.playConcert.textContent = 'Starting player...';
      showBrowserElements.playConcert.disabled = true;
      
      const response = await fetch('/api/play-concert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          filePaths: currentPlaylist
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        showBrowserElements.playConcert.textContent = data.message;
        setTimeout(() => {
          showBrowserElements.playConcert.textContent = 'Click here to Roll Away the Dew';
          showBrowserElements.playConcert.disabled = false;
        }, 3000);
      } else {
        alert(data.error || 'Error playing concert');
        showBrowserElements.playConcert.textContent = 'Click here to Roll Away the Dew';
        showBrowserElements.playConcert.disabled = false;
      }
    } catch (error) {
      console.error('Error playing concert:', error);
      alert(`Error playing concert: ${error.message}`);
      showBrowserElements.playConcert.textContent = 'Click here to Roll Away the Dew';
      showBrowserElements.playConcert.disabled = false;
    }
  }
  
  // Event Listeners
  document.addEventListener('DOMContentLoaded', async () => {
    // Check if analysis data is available
    const analysisAvailable = await checkAnalysisAvailable();
    
    // Initialize show browser
    if (showBrowserElements.useAnalysis) {
      showBrowserElements.useAnalysis.addEventListener('change', () => {
        const useAnalysis = showBrowserElements.useAnalysis.checked;
        showBrowserElements.rootDirContainer.style.display = useAnalysis ? 'none' : 'block';
        loadYears();
      });
    }
    
    if (showBrowserElements.browserRootDir) {
      showBrowserElements.browserRootDir.addEventListener('change', loadYears);
    }
    
    if (showBrowserElements.yearSelect) {
      showBrowserElements.yearSelect.addEventListener('change', () => {
        const selectedYear = showBrowserElements.yearSelect.value;
        if (selectedYear) {
          loadShows(selectedYear);
        } else {
          showBrowserElements.showSelect.innerHTML = '<option value="">Select a year first</option>';
          showBrowserElements.showSelect.disabled = true;
        }
      });
    }
    
    if (showBrowserElements.showSelect) {
      showBrowserElements.showSelect.addEventListener('change', () => {
        const selectedShow = showBrowserElements.showSelect.value;
        if (selectedShow) {
          loadShowContent(selectedShow);
        } else {
          showBrowserElements.showContent.style.display = 'none';
          showBrowserElements.noShowSelected.style.display = 'block';
        }
      });
    }
    
    if (showBrowserElements.textFileSelect) {
      showBrowserElements.textFileSelect.addEventListener('change', () => {
        const selectedFile = showBrowserElements.textFileSelect.value;
        if (selectedFile) {
          loadTextFileContent(selectedFile);
        } else {
          showBrowserElements.textFileContent.textContent = 'Select a text file to view its content';
        }
      });
    }
    
    if (showBrowserElements.playConcert) {
      showBrowserElements.playConcert.addEventListener('click', playConcert);
    }
    
    // Initialize folder analysis
    if (folderAnalysisElements.analysisForm) {
      folderAnalysisElements.analysisForm.addEventListener('submit', (event) => {
        event.preventDefault();
        runAnalysis();
      });
    }
    
    // Load years when the page loads
    loadYears();
  });