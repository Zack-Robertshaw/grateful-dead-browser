// public/js/main.js
// DOM Elements
const showBrowserElements = {
  useAnalysis: document.getElementById('use-analysis'),
  analysisCheckContainer: document.getElementById('analysis-check-container'),
  musicLibraryPathInput: document.getElementById('music-library-path'), // New
  artistSelect: document.getElementById('artist-select'),
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
let currentArtistPath = null; // New
let currentYearPath = null;
let currentShowPath = null;
let currentPlaylist = [];

// Run folder analysis
async function runAnalysis() {
  try {
    // Find the Grateful Dead artist path from the dropdown in the Show Browser tab
    const artistOptions = showBrowserElements.artistSelect.options;
    let gratefulDeadPath = null;
    for (let i = 0; i < artistOptions.length; i++) {
      if (artistOptions[i].text.trim() === 'Grateful Dead') {
        gratefulDeadPath = artistOptions[i].value;
        break;
      }
    }

    if (!gratefulDeadPath) {
      alert('Could not find the "Grateful Dead" artist. Please ensure it is available in the artist dropdown on the "Show Browser" tab before running the analysis.');
      return;
    }

    // Get form values
    const rootDirectory = gratefulDeadPath;
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

// Load artists into the dropdown based on the library path
async function loadArtists() {
  try {
    const libraryPath = showBrowserElements.musicLibraryPathInput.value;
    if (!libraryPath) {
      showBrowserElements.artistSelect.innerHTML = '<option value="">Enter a library path</option>';
      return;
    }

    showBrowserElements.artistSelect.innerHTML = '<option value="">Loading libraries...</option>';
    showBrowserElements.artistSelect.disabled = true;

    const response = await fetch(`/api/artists?libraryPath=${encodeURIComponent(libraryPath)}`);
    const artists = await response.json();

    if (artists.error) {
      showBrowserElements.artistSelect.innerHTML = `<option value="">${artists.error}</option>`;
      return;
    }

    if (artists && artists.length > 0) {
      showBrowserElements.artistSelect.innerHTML = '<option value="">Select a library</option>';
      artists.forEach(artist => {
        const option = document.createElement('option');
        option.value = artist.path;
        option.textContent = artist.name;
        showBrowserElements.artistSelect.appendChild(option);
      });
      showBrowserElements.artistSelect.disabled = false;
    } else {
      showBrowserElements.artistSelect.innerHTML = '<option value="">No libraries found</option>';
    }
  } catch (error) {
    console.error('Error loading artists:', error);
    showBrowserElements.artistSelect.innerHTML = '<option value="">Error loading libraries</option>';
  }
}

// Load content for the selected artist (years or shows)
async function loadArtistContent(artistPath) {
  currentArtistPath = artistPath;
  const yearSelectContainer = showBrowserElements.yearSelect.parentElement;
  const yearSelectLabel = document.getElementById('year-select-label');
  const selectedArtistName = showBrowserElements.artistSelect.options[showBrowserElements.artistSelect.selectedIndex].text.trim();

  // Reset dropdowns
  showBrowserElements.yearSelect.innerHTML = '<option value="">Loading...</option>';
  showBrowserElements.yearSelect.disabled = true;
  showBrowserElements.showSelect.innerHTML = '<option value="">Select a library first</option>';
  showBrowserElements.showSelect.disabled = true;

  try {
    const useAnalysis = showBrowserElements.useAnalysis && showBrowserElements.useAnalysis.checked;
    const response = await fetch(`/api/years?useAnalysis=${useAnalysis}&artistPath=${encodeURIComponent(artistPath)}`);
    const data = await response.json();

    if (data.error) {
      showBrowserElements.yearSelect.innerHTML = `<option value="">${data.error}</option>`;
      return;
    }

    // Hide year/artist dropdown by default
    yearSelectContainer.style.display = 'none';

    if (data.structure === 'years') {
      // Case 1: Grateful Dead (or any artist with Year subfolders)
      yearSelectContainer.style.display = 'block';
      yearSelectLabel.textContent = 'Pick a Year:';
      showBrowserElements.yearSelect.innerHTML = '<option value="">Select a year</option>';
      data.years.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        showBrowserElements.yearSelect.appendChild(option);
      });
      window.genericPaths = data.paths;
      showBrowserElements.yearSelect.disabled = false;
      showBrowserElements.showSelect.innerHTML = '<option value="">Select a year first</option>';

    } else if (data.structure === 'artists') {
      // Case 2: Other Flac (with Artist subfolders)
      yearSelectContainer.style.display = 'block';
      yearSelectLabel.textContent = 'Select Artist:';
      showBrowserElements.yearSelect.innerHTML = '<option value="">Select an artist</option>';
      data.artists.forEach(artist => {
        const option = document.createElement('option');
        option.value = artist;
        option.textContent = artist;
        showBrowserElements.yearSelect.appendChild(option);
      });
      window.genericPaths = data.paths;
      showBrowserElements.yearSelect.disabled = false;
      showBrowserElements.showSelect.innerHTML = '<option value="">Select an artist first</option>';

    } else if (data.structure === 'shows') {
      // Case 3: Artist with Show subfolders directly
      yearSelectContainer.style.display = 'none';
      showBrowserElements.showSelect.innerHTML = '<option value="">Select a show</option>';
      data.shows.forEach(show => {
        const option = document.createElement('option');
        option.value = show.path;
        option.textContent = show.label;
        showBrowserElements.showSelect.appendChild(option);
      });
      showBrowserElements.showSelect.disabled = false;
    }
  } catch (error) {
    console.error('Error loading artist content:', error);
    showBrowserElements.yearSelect.innerHTML = '<option value="">Error loading content</option>';
  }
}

// Load shows for the selected year or artist
async function loadShows(selection) {
  // Clear and disable show select while loading
  showBrowserElements.showSelect.innerHTML = '<option value="">Loading shows...</option>';
  showBrowserElements.showSelect.disabled = true;
  
  try {
    // Determine path from the generic paths map
    const folderPath = window.genericPaths ? window.genericPaths[selection] : '';
    if (!folderPath) {
      showBrowserElements.showSelect.innerHTML = '<option value="">Could not find path for selection</option>';
      return;
    }
    
    const response = await fetch(`/api/shows/${selection}?folderPath=${encodeURIComponent(folderPath)}`);
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
      showBrowserElements.showSelect.innerHTML = '<option value="">No shows found for this selection</option>';
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
      // Default image based on selected library
      const selectedArtistName = showBrowserElements.artistSelect.options[showBrowserElements.artistSelect.selectedIndex].text;
      if (selectedArtistName === 'Other Flac') {
        playButtonImg.src = '/images/tickets.jpeg';
        playButtonImg.alt = 'Tickets - Click to Play Show';
      } else {
        playButtonImg.src = '/images/hamptonTicket.jpg';
        playButtonImg.alt = 'Hampton Ticket - Click to Play Show';
      }
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
  await checkAnalysisAvailable();
  
  // Load saved library path from localStorage
  const savedLibraryPath = localStorage.getItem('musicLibraryPath');
  if (savedLibraryPath && showBrowserElements.musicLibraryPathInput) {
    showBrowserElements.musicLibraryPathInput.value = savedLibraryPath;
  }

  // Initialize show browser by loading artists from the default or saved path
  loadArtists();

  if (showBrowserElements.musicLibraryPathInput) {
    showBrowserElements.musicLibraryPathInput.addEventListener('change', () => {
      // Save the new path to localStorage
      localStorage.setItem('musicLibraryPath', showBrowserElements.musicLibraryPathInput.value);
      loadArtists();
    });
  }

  if (showBrowserElements.artistSelect) {
    showBrowserElements.artistSelect.addEventListener('change', () => {
      const selectedArtistPath = showBrowserElements.artistSelect.value;
      const selectedArtistName = showBrowserElements.artistSelect.options[showBrowserElements.artistSelect.selectedIndex].text;
      const playButtonImg = showBrowserElements.playConcert.querySelector('img');

      if (selectedArtistName === 'Other Flac') {
        playButtonImg.src = '/images/tickets.jpeg';
        playButtonImg.alt = 'Tickets - Click to Play Show';
      } else {
        playButtonImg.src = '/images/hamptonTicket.jpg';
        playButtonImg.alt = 'Hampton Ticket - Click to Play Show';
      }

      if (selectedArtistPath) {
        loadArtistContent(selectedArtistPath);
      } else {
        // Reset and disable year/show selects if no artist is chosen
        showBrowserElements.yearSelect.innerHTML = '<option value="">Select a library first</option>';
        showBrowserElements.yearSelect.disabled = true;
        showBrowserElements.showSelect.innerHTML = '<option value="">Select a library first</option>';
        showBrowserElements.showSelect.disabled = true;
        showBrowserElements.yearSelect.parentElement.style.display = 'block'; // Show year select again
      }
    });
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
});