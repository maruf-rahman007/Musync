// popup.js
const BACKEND_URL = 'http://127.0.0.1:3000';

document.addEventListener('DOMContentLoaded', () => {
  const loginBtn = document.getElementById('loginBtn');
  const statusDiv = document.getElementById('status');

  loginBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: `${BACKEND_URL}/api/auth/login` });
  });

  // 1. Check Cache First
  chrome.storage.local.get(['spotifyCache'], (result) => {
    const cache = result.spotifyCache;
    const ONE_HOUR = 60 * 60 * 1000;

    if (cache && (Date.now() - cache.timestamp < ONE_HOUR)) {
      console.log("Using cached data");
      updateUI(cache.playlists);
    } else {
      console.log("Fetching fresh data");
      fetchPlaylists();
    }
  });

  function fetchPlaylists() {
    statusDiv.textContent = "Connecting...";
    
    // Send message to background.js
    chrome.runtime.sendMessage({ type: 'GET_PLAYLISTS' }, (response) => {
      if (response.success) {
        // Save to cache
        chrome.storage.local.set({
          spotifyCache: {
            playlists: response.playlists,
            timestamp: Date.now()
          }
        });
        updateUI(response.playlists);
      } else {
        statusDiv.textContent = "Please login.";
        loginBtn.style.display = 'block';
      }
    });
  }

  function updateUI(playlists) {
    loginBtn.style.display = 'none';
    statusDiv.innerHTML = `Connected! <br><small>${playlists.length} playlists synced.</small>`;
    
    // Create a refresh button
    const refreshBtn = document.createElement('button');
    refreshBtn.textContent = "Refresh Playlists";
    refreshBtn.style.marginTop = "10px";
    refreshBtn.style.background = "#555";
    refreshBtn.onclick = () => {
      chrome.storage.local.remove('spotifyCache');
      location.reload();
    };
    
    statusDiv.appendChild(refreshBtn);
  }
});