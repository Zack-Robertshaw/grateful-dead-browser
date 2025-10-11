// public/js/main.js
// DOM Elements
const showBrowserElements = {
  useAnalysis: document.getElementById('use-analysis'),
  analysisCheckContainer: document.getElementById('analysis-check-container'),
  musicLibraryPathInput: document.getElementById('music-library-path'), // New
  artistSelect: document.getElementById('artist-select'),
  yearCarouselContainer: document.getElementById('year-carousel-container'),
  yearCarousel: document.getElementById('year-carousel'),
  artistDropdownContainer: document.getElementById('artist-dropdown-container'),
  artistDropdown: document.getElementById('artist-dropdown'),
  showSelect: document.getElementById('show-select'),
  showSelectContainer: document.getElementById('show-select-container'),
  showTimelineContainer: document.getElementById('show-timeline-container'),
  showTimeline: document.getElementById('show-timeline'),
  showContent: document.getElementById('show-content'),
  noShowSelected: document.getElementById('no-show-selected'),
  textFileSelect: document.getElementById('text-file-select'),
  textFileContent: document.getElementById('text-file-content'),
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
let currentYear = null; // Track the selected year for timeline
let isTimelineMode = false; // Track if we're using timeline view

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
  const selectedArtistName = showBrowserElements.artistSelect.options[showBrowserElements.artistSelect.selectedIndex].text.trim();

  // Reset UI
  showBrowserElements.yearCarousel.innerHTML = '<div style="padding: 10px; text-align: center;">Loading...</div>';
  showBrowserElements.artistDropdown.innerHTML = '<option value="">Loading...</option>';
  showBrowserElements.showSelect.innerHTML = '<option value="">Select a library first</option>';
  showBrowserElements.showSelect.disabled = true;

  try {
    const useAnalysis = showBrowserElements.useAnalysis && showBrowserElements.useAnalysis.checked;
    const response = await fetch(`/api/years?useAnalysis=${useAnalysis}&artistPath=${encodeURIComponent(artistPath)}`);
    const data = await response.json();

    if (data.error) {
      showBrowserElements.yearCarousel.innerHTML = `<div style="padding: 10px; text-align: center;">${data.error}</div>`;
      showBrowserElements.artistDropdown.innerHTML = `<option value="">${data.error}</option>`;
      return;
    }

    // Hide both containers by default
    showBrowserElements.yearCarouselContainer.style.display = 'none';
    showBrowserElements.artistDropdownContainer.style.display = 'none';

    if (data.structure === 'years') {
      // Case 1: Grateful Dead (or any artist with Year subfolders) - USE CAROUSEL
      showBrowserElements.yearCarouselContainer.style.display = 'block';
      renderYearCarousel(data.years);
      window.genericPaths = data.paths;
      showBrowserElements.showSelect.innerHTML = '<option value="">Select a year first</option>';

    } else if (data.structure === 'artists') {
      // Case 2: Other Flac (with Artist subfolders) - USE DROPDOWN
      showBrowserElements.artistDropdownContainer.style.display = 'block';
      showBrowserElements.artistDropdown.innerHTML = '<option value="">Select an artist</option>';
      data.artists.forEach(artist => {
        const option = document.createElement('option');
        option.value = artist;
        option.textContent = artist;
        showBrowserElements.artistDropdown.appendChild(option);
      });
      window.genericPaths = data.paths;
      showBrowserElements.artistDropdown.disabled = false;
      showBrowserElements.showSelect.innerHTML = '<option value="">Select an artist first</option>';

    } else if (data.structure === 'shows') {
      // Case 3: Artist with Show subfolders directly
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
    showBrowserElements.yearCarousel.innerHTML = '<div style="padding: 10px; text-align: center;">Error loading content</div>';
    showBrowserElements.artistDropdown.innerHTML = '<option value="">Error loading content</option>';
  }
}

// Render year carousel
function renderYearCarousel(years) {
  showBrowserElements.yearCarousel.innerHTML = '';
  showBrowserElements.yearCarousel.className = 'year-carousel';
  
  years.forEach(year => {
    const yearCard = document.createElement('div');
    yearCard.className = 'year-card';
    yearCard.textContent = year;
    yearCard.setAttribute('data-year', year);
    yearCard.addEventListener('click', () => {
      // Remove selected class from all year cards
      const allYearCards = showBrowserElements.yearCarousel.querySelectorAll('.year-card');
      allYearCards.forEach(card => card.classList.remove('selected'));
      
      // Add selected class to clicked card
      yearCard.classList.add('selected');
      
      loadShows(year);
    });
    showBrowserElements.yearCarousel.appendChild(yearCard);
  });
}

// Load shows for the selected year or artist
async function loadShows(selection) {
  try {
    // Determine path from the generic paths map
    const folderPath = window.genericPaths ? window.genericPaths[selection] : '';
    if (!folderPath) {
      showBrowserElements.showSelect.innerHTML = '<option value="">Could not find path for selection</option>';
      return;
    }
    
    // Check if we're in Grateful Dead mode (year-based structure)
    const selectedArtistName = showBrowserElements.artistSelect.options[showBrowserElements.artistSelect.selectedIndex].text.trim();
    isTimelineMode = selectedArtistName === 'Grateful Dead' && /^\d{4}$/.test(selection);
    
    if (isTimelineMode) {
      // Hide dropdown, show timeline
      showBrowserElements.showSelectContainer.style.display = 'none';
      showBrowserElements.showTimelineContainer.style.display = 'block';
      showBrowserElements.showTimeline.innerHTML = '<div class="timeline-loading">Loading shows...</div>';
      currentYear = selection;
    } else {
      // Show dropdown, hide timeline
      showBrowserElements.showSelectContainer.style.display = 'block';
      showBrowserElements.showTimelineContainer.style.display = 'none';
      showBrowserElements.showSelect.innerHTML = '<option value="">Loading shows...</option>';
      showBrowserElements.showSelect.disabled = true;
    }
    
    const response = await fetch(`/api/shows/${selection}?folderPath=${encodeURIComponent(folderPath)}`);
    const data = await response.json();
    
    if (data.error) {
      if (isTimelineMode) {
        showBrowserElements.showTimeline.innerHTML = `<div class="timeline-empty">${data.error}</div>`;
      } else {
        showBrowserElements.showSelect.innerHTML = `<option value="">${data.error}</option>`;
      }
      return;
    }
    
    if (data.shows && data.shows.length > 0) {
      if (isTimelineMode) {
        // Render monthly timeline for Grateful Dead
        renderMonthlyTimeline(data.shows, selection);
      } else {
        // Populate dropdown for other artists
        showBrowserElements.showSelect.innerHTML = '<option value="">Select a show</option>';
        data.shows.forEach(show => {
          const option = document.createElement('option');
          option.value = show.path;
          option.textContent = show.label;
          showBrowserElements.showSelect.appendChild(option);
        });
        showBrowserElements.showSelect.disabled = false;
      }
    } else {
      if (isTimelineMode) {
        showBrowserElements.showTimeline.innerHTML = '<div class="timeline-empty">No shows found for this year</div>';
      } else {
        showBrowserElements.showSelect.innerHTML = '<option value="">No shows found for this selection</option>';
      }
    }
  } catch (error) {
    console.error('Error loading shows:', error);
    if (isTimelineMode) {
      showBrowserElements.showTimeline.innerHTML = `<div class="timeline-empty">Error loading shows: ${error.message}</div>`;
    } else {
      showBrowserElements.showSelect.innerHTML = '<option value="">Error loading shows</option>';
    }
  }
}

// Render card carousel for Grateful Dead shows
function renderMonthlyTimeline(shows, year) {
  const parseableShows = [];
  const unparseableShows = [];
  
  // Parse dates from show folder names
  shows.forEach(show => {
    // Try to extract date from folder name
    // Supports: gd77-05-04, gd1977-05-04, 1977-05-04, 1974.06.20, gd74-01-xx, 1974-09-09,10,11
    let dateMatch = show.label.match(/gd?(\d{2,4})[-.](\d{2})[-.](\d{2})/); // With hyphens or dots
    
    // Handle "xx" wildcard day (e.g., gd74-01-xx)
    if (!dateMatch) {
      dateMatch = show.label.match(/gd?(\d{2,4})[-.](\d{2})[-.]xx/i);
      if (dateMatch) {
        // Use day 01 as placeholder for "xx"
        dateMatch = [dateMatch[0], dateMatch[1], dateMatch[2], '01'];
      }
    }
    
    // Handle multiple dates (e.g., 1974-09-09,10,11 - just use first date)
    if (!dateMatch) {
      dateMatch = show.label.match(/(\d{4})[-.](\d{2})[-.](\d{2}),\d+/);
    }
    
    if (dateMatch) {
      let [, showYear, month, day] = dateMatch;
      
      // Convert 2-digit year to 4-digit year
      if (showYear.length === 2) {
        showYear = '19' + showYear;
      }
      
      if (showYear === year) {
        parseableShows.push({
          path: show.path,
          label: show.label,
          date: `${showYear}-${month}-${day}`,
          ...parseShowMetadata(show.label)
        });
      }
    } else {
      unparseableShows.push(show);
    }
  });
  
  // Sort shows by date
  parseableShows.sort((a, b) => a.date.localeCompare(b.date));
  
  // Build carousel HTML
  let html = `
    <div class="carousel-header">
      <div class="carousel-title">Shows in ${year}</div>
      <div class="carousel-stats">${parseableShows.length} show${parseableShows.length !== 1 ? 's' : ''}${unparseableShows.length > 0 ? ` • ${unparseableShows.length} other${unparseableShows.length !== 1 ? 's' : ''}` : ''}</div>
    </div>
    <div class="show-carousel">
  `;
  
  // Add cards for each parseable show
  parseableShows.forEach(show => {
    // Create venue text - use folder label if no venue extracted
    const venueText = show.venue || show.label.replace(/gd?\d{2,4}-\d{2}-\d{2}\./, '').replace(/\s+/g, ' ').trim();
    
    html += `
      <div class="show-card" data-path="${escapeHtml(show.path)}">
        <div class="show-card-date">${formatDateShort(show.date)}</div>
        <div class="show-card-venue">${escapeHtml(venueText)}</div>
        <div class="show-card-meta">
          ${show.recordingType ? `<span class="show-card-badge recording-type">${escapeHtml(show.recordingType)}</span>` : ''}
          ${show.bitrate ? `<span class="show-card-badge bitrate">${escapeHtml(show.bitrate)}</span>` : ''}
          ${show.shnid ? `<span class="show-card-badge shnid">${escapeHtml(show.shnid)}</span>` : ''}
        </div>
      </div>
    `;
  });
  
  html += `</div>`; // Close carousel
  
  // Add unparseable shows section if any exist
  if (unparseableShows.length > 0) {
    html += `
      <div class="timeline-unparseable">
        <div class="timeline-unparseable-header">
          <span class="timeline-unparseable-icon">⚠️</span>
          <span class="timeline-unparseable-label">Shows with unrecognized dates (${unparseableShows.length}):</span>
        </div>
        <select class="timeline-unparseable-select" id="timeline-unparseable-select">
          <option value="">Select a show...</option>
    `;
    
    unparseableShows.forEach(show => {
      html += `<option value="${escapeHtml(show.path)}">${escapeHtml(show.label)}</option>`;
    });
    
    html += `
        </select>
      </div>
    `;
  }
  
  showBrowserElements.showTimeline.innerHTML = html;
  
  // Add click event listeners to all cards
  const cards = showBrowserElements.showTimeline.querySelectorAll('.show-card');
  cards.forEach(card => {
    card.addEventListener('click', () => {
      const showPath = card.getAttribute('data-path');
      loadShowContent(showPath);
    });
  });
  
  // Add event listener for unparseable shows dropdown
  if (unparseableShows.length > 0) {
    const unparseableSelect = document.getElementById('timeline-unparseable-select');
    if (unparseableSelect) {
      unparseableSelect.addEventListener('change', () => {
        const selectedPath = unparseableSelect.value;
        if (selectedPath) {
          loadShowContent(selectedPath);
          // Reset dropdown after selection
          setTimeout(() => {
            unparseableSelect.value = '';
          }, 100);
        }
      });
    }
  }
}

// Parse show metadata from folder name
function parseShowMetadata(label) {
  let venue = '';
  let city = '';
  let shnid = '';
  let recordingType = '';
  let bitrate = '';
  
  // Extract shnid (number after date)
  const shnidMatch = label.match(/\.(\d+)\./);
  if (shnidMatch) shnid = shnidMatch[1];
  
  // Extract recording type (sbd, aud, mtx, etc.)
  if (label.match(/\.sbd\./i)) recordingType = 'SBD';
  else if (label.match(/\.aud\./i)) recordingType = 'AUD';
  else if (label.match(/\.mtx\./i)) recordingType = 'MTX';
  else if (label.match(/ultramatrix/i)) recordingType = 'Ultramatrix';
  else if (label.match(/\bSBD\b/i)) recordingType = 'SBD';
  else if (label.match(/\.ecm\d+p\./i)) recordingType = 'AUD';
  
  // Extract bitrate
  if (label.match(/flac24/i)) bitrate = '24-bit';
  else if (label.match(/flac16/i)) bitrate = '16-bit';
  else if (label.match(/t-flac2448/i)) bitrate = '24-bit';
  
  // Try to extract venue from remaining text
  // Handle both hyphen and dot date separators
  const remaining = label
    .replace(/gd?\d{2,4}[-\.]\d{2}[-\.]\d{2}\.?/, '') // Remove date
    .replace(/gd?\d{2,4}[-\.]\d{2}[-\.]xx\.?/i, '') // Remove date with xx
    .replace(/\d{4}[-\.]\d{2}[-\.]\d{2},\d+/, '') // Remove multiple dates
    .replace(/\.\d+\..*?\..*?\.flac\d+/, ''); // Remove other metadata
    
  if (remaining && remaining.length > 0) {
    // Clean up the venue name
    venue = remaining
      .replace(/_/g, ' ')
      .replace(/\./g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Try to extract city (usually after venue)
    // Look for patterns like "Boston MA" or "Ithaca NY"
    const cityMatch = venue.match(/([A-Z][a-z]+)\s+([A-Z]{2})$/);
    if (cityMatch) {
      city = cityMatch[0];
      venue = venue.replace(cityMatch[0], '').trim();
    }
  }
  
  return { venue, city, shnid, recordingType, bitrate };
}

// Format date for display
function formatDate(dateStr) {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                  'July', 'August', 'September', 'October', 'November', 'December'];
  const [year, month, day] = dateStr.split('-');
  const monthName = months[parseInt(month, 10) - 1];
  return `${monthName} ${parseInt(day, 10)}, ${year}`;
}

// Format date short for card display
function formatDateShort(dateStr) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const [year, month, day] = dateStr.split('-');
  const monthName = months[parseInt(month, 10) - 1];
  return `${monthName} ${parseInt(day, 10)}, ${year}`;
}

// Show tooltip for timeline dot
function showTimelineTooltip(event, dot) {
  const date = dot.getAttribute('data-date');
  const label = dot.getAttribute('data-label');
  
  // Parse show info from label
  // Supports both 2-digit (gd77-05-04) and 4-digit (gd1977-05-04) year formats
  const parts = label.match(/gd(\d{2,4})-(\d{2})-(\d{2})\.(\d+)\.(.*?)\.flac(\d+)/i) || 
                label.match(/gd?(\d{2,4})-(\d{2})-(\d{2})(.*)/);
  
  let venue = 'Venue info not available';
  let shnid = '';
  let recordingType = '';
  let bitrate = '';
  
  if (parts) {
    // Try to extract venue from remaining text
    const remaining = label.replace(/gd?\d{2,4}-\d{2}-\d{2}\./, '').replace(/\.\d+\..*?\..*?\.flac\d+/, '');
    if (remaining && remaining.length > 0) {
      venue = remaining.replace(/_/g, ' ').replace(/\./g, ' ');
    }
    
    // Extract shnid (number after date)
    const shnidMatch = label.match(/\.(\d+)\./);
    if (shnidMatch) shnid = shnidMatch[1];
    
    // Extract recording type (sbd, aud, mtx, etc.)
    if (label.match(/\.sbd\./i)) recordingType = 'SBD';
    else if (label.match(/\.aud\./i)) recordingType = 'AUD';
    else if (label.match(/\.mtx\./i)) recordingType = 'MTX';
    else if (label.match(/ultramatrix/i)) recordingType = 'Ultramatrix';
    else if (label.match(/\bSBD\b/i)) recordingType = 'SBD';
    
    // Extract bitrate
    if (label.match(/flac24/i)) bitrate = '24-bit';
    else if (label.match(/flac16/i)) bitrate = '16-bit';
  }
  
  // Create tooltip element
  const tooltip = document.createElement('div');
  tooltip.className = 'timeline-tooltip';
  tooltip.id = 'timeline-tooltip';
  
  let tooltipContent = `<div class="timeline-tooltip-date">${date}</div>`;
  if (venue !== 'Venue info not available') {
    tooltipContent += `<div class="timeline-tooltip-venue">${venue}</div>`;
  }
  
  let metaInfo = '';
  if (recordingType) metaInfo += `<span class="timeline-tooltip-badge">${recordingType}</span>`;
  if (bitrate) metaInfo += `<span class="timeline-tooltip-badge">${bitrate}</span>`;
  if (shnid) metaInfo += `<span class="timeline-tooltip-badge">shnid: ${shnid}</span>`;
  
  if (metaInfo) {
    tooltipContent += `<div class="timeline-tooltip-meta">${metaInfo}</div>`;
  }
  
  tooltip.innerHTML = tooltipContent;
  document.body.appendChild(tooltip);
  
  // Position tooltip near cursor
  positionTooltip(event, tooltip);
  
  // Update position on mouse move
  dot.addEventListener('mousemove', (e) => {
    positionTooltip(e, tooltip);
  });
}

// Position tooltip near cursor
function positionTooltip(event, tooltip) {
  const offset = 15;
  let left = event.clientX + offset;
  let top = event.clientY + offset;
  
  // Keep tooltip on screen
  const tooltipRect = tooltip.getBoundingClientRect();
  if (left + tooltipRect.width > window.innerWidth) {
    left = event.clientX - tooltipRect.width - offset;
  }
  if (top + tooltipRect.height > window.innerHeight) {
    top = event.clientY - tooltipRect.height - offset;
  }
  
  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
}

// Hide timeline tooltip
function hideTimelineTooltip() {
  const tooltip = document.getElementById('timeline-tooltip');
  if (tooltip) {
    tooltip.remove();
  }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
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
    
    const response = await fetch(`/api/show-content?path=${encodeURIComponent(showPath)}`);
    const data = await response.json();
    
    if (data.error) {
      showBrowserElements.textFileContent.textContent = data.error;
      return;
    }
    
    // Update the play button image if artwork is available
    const playButtonImg = showBrowserElements.playConcert.querySelector('img');
    if (data.artwork) {
      if (data.artwork.type === 'embedded') {
        // Use embedded FLAC artwork
        playButtonImg.src = data.artwork.dataUri;
        playButtonImg.alt = `Embedded artwork from ${data.artwork.source}`;
        console.log('📀 Using embedded FLAC artwork');
      } else if (data.artwork.type === 'file') {
        // Use folder image file
        playButtonImg.src = `/api/image?path=${encodeURIComponent(data.artwork.path)}`;
        playButtonImg.alt = 'Show artwork';
        console.log('🖼️ Using folder image:', data.artwork.path);
      }
    } else {
      // Use static default image
      playButtonImg.src = '/images/hamptonTicket.jpg';
      playButtonImg.alt = 'Hampton Ticket';
      console.log('🎫 No artwork found, using default ticket');
    }
    
    // Update text files dropdown and auto-select best file
    let autoSelectFile = null;
    
    if (data.textFiles && data.textFiles.length > 0) {
      showBrowserElements.textFileSelect.innerHTML = '<option value="">Select a text file</option>';
      data.textFiles.forEach(file => {
        const option = document.createElement('option');
        option.value = file.path;
        option.textContent = `${file.filename} (${file.size})`;
        showBrowserElements.textFileSelect.appendChild(option);
      });
      
      // Smart auto-selection logic
      if (data.textFiles.length === 1) {
        // Only one file - automatically select it
        autoSelectFile = data.textFiles[0].path;
        console.log('📄 Auto-selecting only text file:', data.textFiles[0].filename);
      } else {
        // Multiple files - try to find best match
        // Extract folder name from show path
        const folderName = showPath.split('/').pop().toLowerCase();
        
        // Try to find a file that matches the folder name
        const matchingFile = data.textFiles.find(file => {
          const fileName = file.filename.toLowerCase().replace(/\.txt$/i, '');
          return folderName.includes(fileName) || fileName.includes(folderName.split('.')[0]);
        });
        
        if (matchingFile) {
          autoSelectFile = matchingFile.path;
          console.log('📄 Auto-selecting matching text file:', matchingFile.filename);
        } else {
          // No match found, select first file as fallback
          autoSelectFile = data.textFiles[0].path;
          console.log('📄 Auto-selecting first text file:', data.textFiles[0].filename);
        }
      }
      
      // Set the dropdown value and load the file
      if (autoSelectFile) {
        showBrowserElements.textFileSelect.value = autoSelectFile;
        loadTextFileContent(autoSelectFile);
      }
    } else {
      showBrowserElements.textFileSelect.innerHTML = '<option value="">No text files found</option>';
      showBrowserElements.textFileContent.textContent = 'No text files available for this show';
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

      if (selectedArtistPath) {
        loadArtistContent(selectedArtistPath);
      } else {
        // Reset UI if no artist is chosen
        showBrowserElements.yearCarouselContainer.style.display = 'none';
        showBrowserElements.yearCarousel.innerHTML = '';
        showBrowserElements.artistDropdownContainer.style.display = 'none';
        showBrowserElements.artistDropdown.innerHTML = '<option value="">Select a library first</option>';
        showBrowserElements.showSelect.innerHTML = '<option value="">Select a library first</option>';
        showBrowserElements.showSelect.disabled = true;
      }
    });
  }
  
  if (showBrowserElements.artistDropdown) {
    showBrowserElements.artistDropdown.addEventListener('change', () => {
      const selectedArtist = showBrowserElements.artistDropdown.value;
      if (selectedArtist) {
        loadShows(selectedArtist);
      } else {
        showBrowserElements.showSelect.innerHTML = '<option value="">Select an artist first</option>';
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
    showBrowserElements.playConcert.addEventListener('click', () => playConcert(0));
  }
  
  // Initialize folder analysis
  if (folderAnalysisElements.analysisForm) {
    folderAnalysisElements.analysisForm.addEventListener('submit', (event) => {
      event.preventDefault();
      runAnalysis();
    });
  }

  // Hide the analysis check container initially
  const analysisCheckContainer = showBrowserElements.analysisCheckContainer;
  if (analysisCheckContainer) {
    analysisCheckContainer.style.display = 'none';
  }

});