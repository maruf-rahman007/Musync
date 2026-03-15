// background.js
const BACKEND_URL = 'http://127.0.0.1:3000';

// Helper to get the auth header
async function getAuthHeader() {
  return new Promise((resolve) => {
    chrome.cookies.get({ url: BACKEND_URL, name: 'spotify_user_id' }, (cookie) => {
      if (cookie) {
        resolve({ 'X-User-ID': cookie.value });
      } else {
        resolve(null);
      }
    });
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  
  // 1. Get Playlists
  if (request.type === 'GET_PLAYLISTS') {
    (async () => {
      const headers = await getAuthHeader();
      if (!headers) return sendResponse({ success: false, error: 'Not logged in' });

      try {
        const res = await fetch(`${BACKEND_URL}/api/playlists`, { headers });
        const data = await res.json();
        sendResponse({ success: true, playlists: data });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true; // Keep channel open for async
  }

  // 2. Search Track
  if (request.type === 'SEARCH_TRACK') {
    (async () => {
      const headers = await getAuthHeader();
      if (!headers) return sendResponse({ success: false, error: 'Not logged in' });

      try {
        const res = await fetch(`${BACKEND_URL}/api/search?q=${encodeURIComponent(request.query)}`, { headers });
        const data = await res.json();
        sendResponse({ success: true, track: data });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }

  // 3. Add to Playlist
  if (request.type === 'ADD_TO_PLAYLIST') {
    (async () => {
      const headers = await getAuthHeader();
      if (!headers) return sendResponse({ success: false, error: 'Not logged in' });

      try {
        const res = await fetch(`${BACKEND_URL}/api/playlist/add`, {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playlistId: request.playlistId,
            trackUri: request.trackUri
          })
        });
        const data = await res.json();
        sendResponse({ success: res.ok, data });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }
});