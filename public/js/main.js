// public/js/main.js
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
  playConcert: document.getElementById('play-concert')
};

const folderAnalysisElements = {
  analysisForm: document.getElementById('analysis-form'),
  rootDirectory: document.getElementById('root-directory'),
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
    const outputFilename = folderAnalysisElements.outputFilename.value;
    
    // Validate inputs
    if (!rootDirectory || !outputFilename) {
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
    
    // Show the setlist section in the left column
    const setlistSection = document.getElementById('setlist-section');
    if (setlistSection) {
      setlistSection.style.display = 'block';
    }
    
    showBrowserElements.textFileContent.textContent = 'Loading show content...';
    showBrowserElements.trackList.textContent = 'Loading tracks...';
    
    const response = await fetch(`/api/show-content?path=${encodeURIComponent(showPath)}`);
    const data = await response.json();
    
    if (data.error) {
      showBrowserElements.textFileContent.textContent = data.error;
      return;
    }
    
    // Update the play button image using 3-tier priority system
    const playButtonImg = showBrowserElements.playConcert.querySelector('img');
    if (data.artwork) {
      if (data.artwork.type === 'embedded') {
        // Use embedded FLAC artwork
        playButtonImg.src = data.artwork.dataUri;
        playButtonImg.alt = `Embedded artwork from ${data.artwork.source} - Click to Play Show`;
      } else if (data.artwork.type === 'file') {
        // Use folder image file
        playButtonImg.src = `/api/image?path=${encodeURIComponent(data.artwork.path)}`;
        playButtonImg.alt = 'Custom show image - Click to Play Show';
      }
    } else {
      // Default Hampton ticket
      playButtonImg.src = '/images/hamptonTicket.jpg';
      playButtonImg.alt = 'Hampton Ticket - Click to Play Show';
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
    
    // Update track list
    if (data.audioFiles && data.audioFiles.length > 0) {
      let trackListText = '';
      data.audioFiles.forEach((file, index) => {
        trackListText += `${index + 1}. ${file.filename}\n`;
      });
      showBrowserElements.trackList.textContent = trackListText;
    } else {
      showBrowserElements.trackList.textContent = 'No audio files found';
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

// Play concert with foobar2000
async function playConcert(startIndex = 0) {
  try {
    if (currentPlaylist.length === 0) {
      alert('No audio files to play');
      return;
    }
    
    // Get the button and store original content
    const playButton = showBrowserElements.playConcert;
    const originalContent = playButton.innerHTML;
    
    // Add overlay and disable button
    playButton.disabled = true;
    const buttonContainer = document.createElement('div');
    buttonContainer.style.position = 'relative';
    buttonContainer.innerHTML = originalContent + 
      '<div class="overlay">Starting player...</div>';
    playButton.innerHTML = '';
    playButton.appendChild(buttonContainer);
    
    // Make the API call to play the concert
    const response = await fetch('/api/play-concert', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        filePaths: currentPlaylist,
        startIndex
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Update overlay with success message
      const overlay = playButton.querySelector('.overlay');
      if (overlay) {
        overlay.textContent = 'Now Playing...';
      }
      
      // Remove overlay and re-enable button after delay
      setTimeout(() => {
        playButton.innerHTML = originalContent;
        playButton.disabled = false;
      }, 3000);
    } else {
      alert(data.error || 'Error playing concert');
      playButton.innerHTML = originalContent;
      playButton.disabled = false;
    }
  } catch (error) {
    console.error('Error playing concert:', error);
    alert(`Error playing concert: ${error.message}`);
    const playButton = showBrowserElements.playConcert;
    playButton.innerHTML = originalContent; // Restore original content
    playButton.disabled = false;
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
        
        // Hide the setlist section when no show is selected
        const setlistSection = document.getElementById('setlist-section');
        if (setlistSection) {
          setlistSection.style.display = 'none';
        }
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
    showBrowserElements.playConcert.addEventListener('click', () => playConcert(0));
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