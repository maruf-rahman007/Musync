// content.js

// --- Parse Logic (Kept same) ---
function parseSongTitle(title) {
  if (!title) return null;
  let cleaned = title
    .replace(/\s*(official|music|video|lyrics|lyric|audio|hd|4k|remix|live|performance|full|version|clip|hq|\[.*?\]|\(.*?\))/gi, '')
    .replace(/\s*[\|\-–—]\s*/g, ' - ')
    .replace(/\s+/g, ' ')
    .trim();

  const patterns = [
    /^(.+?)\s*-\s*(.+)$/,
    /^(.+?)\s*:\s*(.+)$/,
    /^(.+?)\s*by\s*(.+)$/i
  ];

  for (const re of patterns) {
    const m = cleaned.match(re);
    if (m) {
      let [, p1, p2] = m;
      p1 = p1.trim(); p2 = p2.trim();
      return p1.length > p2.length * 2.5 ? { artist: p2, song: p1 } : { artist: p1, song: p2 };
    }
  }
  return null;
}

// --- UI Logic ---
function showAddPopup(song) {
  if (document.getElementById('add-popup')) return;

  const popup = document.createElement('div');
  popup.id = 'add-popup';
  popup.innerHTML = `
    <h3>Add to Spotify?</h3>
    <div style="margin:10px 0;">
      <strong>${song.song}</strong><br>
      <small>by ${song.artist}</small>
    </div>
    <select id="playlist-select" style="width:100%; padding:5px;">
      <option value="">Loading...</option>
    </select>
    <div style="margin-top:12px;">
      <button id="add-btn" style="background:#1DB954; color:white; border:none; padding:5px 10px; cursor:pointer;">Add</button>
      <button id="cancel-btn" style="margin-left:8px; background:#555; color:white; border:none; padding:5px 10px; cursor:pointer;">Cancel</button>
    </div>
  `;
  document.body.appendChild(popup);

  // Load playlists from Chrome Storage (set by popup)
  chrome.storage.local.get(['spotifyCache'], (data) => {
    const select = document.getElementById('playlist-select');
    if (data.spotifyCache?.playlists) {
      select.innerHTML = '<option value="">Select playlist...</option>';
      data.spotifyCache.playlists.forEach(pl => {
        const opt = document.createElement('option');
        opt.value = pl.id;
        opt.textContent = pl.name;
        select.appendChild(opt);
      });
    } else {
      select.innerHTML = '<option value="">Open Extension Popup first</option>';
    }
  });

  // Add Button Logic
  document.getElementById('add-btn').addEventListener('click', async () => {
    const playlistId = document.getElementById('playlist-select').value;
    if (!playlistId) return alert('Select a playlist!');

    const query = `${song.artist} ${song.song}`;
    const addBtn = document.getElementById('add-btn');
    addBtn.textContent = "Searching...";
    addBtn.disabled = true;

    // Step 1: Search Track (via background)
    chrome.runtime.sendMessage({ type: 'SEARCH_TRACK', query }, (searchRes) => {
      if (!searchRes.success || !searchRes.track?.uri) {
        alert('Song not found on Spotify.');
        addBtn.textContent = "Add";
        addBtn.disabled = false;
        return;
      }

      const trackUri = searchRes.track.uri;

      // Step 2: Add to Playlist (via background)
      addBtn.textContent = "Adding...";
      chrome.runtime.sendMessage({ type: 'ADD_TO_PLAYLIST', playlistId, trackUri }, (addRes) => {
        if (addRes.success) {
          alert('Added to playlist!');
          popup.remove();
        } else {
          alert('Failed to add: ' + (addRes.error || 'Unknown error'));
          addBtn.textContent = "Add";
          addBtn.disabled = false;
        }
      });
    });
  });

  document.getElementById('cancel-btn').addEventListener('click', () => popup.remove());
}

// --- Detection Logic ---
function detectVideo() {
  const videoId = new URLSearchParams(window.location.search).get('v');
  if (!videoId) return;
  if (sessionStorage.getItem(`yt2sp_${videoId}`)) return;

  // YouTube title selectors change often, trying multiple
  const titleElem = document.querySelector('h1.ytd-watch-metadata yt-formatted-string, h1.title yt-formatted-string');
  
  if (!titleElem?.textContent) return;

  const song = parseSongTitle(titleElem.textContent.trim());
  if (song) {
    sessionStorage.setItem(`yt2sp_${videoId}`, 'true');
    showAddPopup(song);
  }
}

// Observer
const observer = new MutationObserver(detectVideo);
observer.observe(document.body, { childList: true, subtree: true });
detectVideo();