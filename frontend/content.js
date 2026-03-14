// content.js
// ─────────────────────────────────────────────────────────────────────────────
// Cache helpers (same as popup for consistency)
// ─────────────────────────────────────────────────────────────────────────────
async function getCache() {
  return new Promise(resolve => {
    chrome.storage.local.get(['spotifyCache'], (data) => {
      const cache = data.spotifyCache;
      if (cache && Date.now() - cache.cachedAt < 30 * 60 * 1000) {
        resolve(cache);
      } else {
        resolve(null);
      }
    });
  });
}

async function saveCache(user, playlists) {
  await chrome.storage.local.set({
    spotifyCache: { user, playlists, cachedAt: Date.now() }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Parse song title
// ─────────────────────────────────────────────────────────────────────────────
function parseSongTitle(title) {
  if (!title) return null;
  let cleaned = title
    .replace(/\s*(official|music|video|lyrics|lyric|audio|hd|4k|remix|live|performance|full|version|clip|hq|\[.*?\]|\(.*?\))/gi, '')
    .replace(/\s*[\|\-–—]\s*/g, ' - ')
    .replace(/\s+/g, ' ')
    .trim();

  const patterns = [/^(.+?)\s*-\s*(.+)$/, /^(.+?)\s*:\s*(.+)$/, /^(.+?)\s*by\s*(.+)$/i];
  for (const regex of patterns) {
    const match = cleaned.match(regex);
    if (match) {
      let [, p1, p2] = match;
      p1 = p1.trim(); p2 = p2.trim();
      return p1.length > p2.length * 2.5 ? { artist: p2, song: p1 } : { artist: p1, song: p2 };
    }
  }
  const parts = cleaned.split(/\s*-\s*/);
  if (parts.length >= 2) return { artist: parts[0].trim(), song: parts.slice(1).join(' - ').trim() };
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Show Add Popup (now uses cache first!)
// ─────────────────────────────────────────────────────────────────────────────
function showAddPopup(song) {
  if (document.getElementById('add-popup')) return;

  const popup = document.createElement('div');
  popup.id = 'add-popup';
  popup.innerHTML = `
    <h3>Add to Spotify?</h3>
    <div class="song-info"><strong>${song.song}</strong> <small>by ${song.artist}</small></div>
    <select id="playlist-select"><option value="">Loading playlists...</option></select>
    <div class="buttons">
      <button id="add-btn">Add</button>
      <button id="cancel-btn">Cancel</button>
    </div>
  `;
  document.body.appendChild(popup);

  // Try cache first
  getCache().then(cache => {
    const select = document.getElementById('playlist-select');
    if (cache && cache.playlists.length) {
      select.innerHTML = '<option value="">Select a playlist...</option>';
      cache.playlists.forEach(pl => {
        const opt = document.createElement('option');
        opt.value = pl.id;
        opt.textContent = pl.name;
        select.appendChild(opt);
      });
    } else {
      // Fallback fetch + save
      fetch('http://127.0.0.1:3000/api/playlists', { credentials: 'include' })
        .then(r => r.ok ? r.json() : Promise.reject())
        .then(playlists => {
          select.innerHTML = '<option value="">Select a playlist...</option>';
          playlists.forEach(pl => {
            const opt = document.createElement('option');
            opt.value = pl.id;
            opt.textContent = pl.name;
            select.appendChild(opt);
          });
          // Save for future
          getCache().then(c => saveCache(c?.user || {}, playlists));
        })
        .catch(() => select.innerHTML = '<option value="">Error loading playlists</option>');
    }
  });

  // Add button logic (same as before, but with 401 handling)
  document.getElementById('add-btn').addEventListener('click', () => {
    console.log("Add button clicked");
    const playlistId = document.getElementById('playlist-select').value;
    if (!playlistId) return alert('Select a playlist');

    const query = `${song.artist} ${song.song}`;
    console.log(query);
    fetch(`http://127.0.0.1:3000/api/search?q=${encodeURIComponent(query)}`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : Promise.reject('Search failed'))
      .then(track => {
        if (!track.uri) throw new Error('Track not found');
        return fetch('http://127.0.0.1:3000/api/playlist/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ playlistId, trackUri: track.uri })
        });
      })
      .then(r => {
        if (!r.ok) throw new Error(r.status === 401 ? 'Session expired' : 'Add failed');
        alert('✅ Added to playlist!');
        updateAddHistory(playlistId);
        popup.remove();
      })
      .catch(err => {
        if (err.message.includes('401') || err.message.includes('expired')) {
          chrome.storage.local.remove('spotifyCache');
          alert('Session expired. Open extension popup and click Refresh.');
        } else {
          alert('Error: ' + err.message);
        }
      });
  });

  document.getElementById('cancel-btn').addEventListener('click', () => popup.remove());
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. History + detectVideo (unchanged from last version)
// ─────────────────────────────────────────────────────────────────────────────
function updateAddHistory(playlistId) {
  chrome.storage.sync.get(['addHistory'], (result) => {
    const history = result.addHistory || {};
    history[playlistId] = (history[playlistId] || 0) + 1;
    chrome.storage.sync.set({ addHistory: history });
  });
}

function detectVideo() {
  const videoId = new URLSearchParams(window.location.search).get('v');
  if (!videoId || sessionStorage.getItem(`yt2spotify_processed_${videoId}`)) return;

  const titleElem = document.querySelector('h1.title yt-formatted-string, h1.title, h1.ytd-watch-metadata #title h1');
  if (!titleElem?.textContent) return;

  const song = parseSongTitle(titleElem.textContent.trim());
  if (!song) return;

  sessionStorage.setItem(`yt2spotify_processed_${videoId}`, 'true');
  console.log('[YT→Spotify] Music detected:', song);
  showAddPopup(song);
}

// Setup
const observer = new MutationObserver(detectVideo);
observer.observe(document.body, { childList: true, subtree: true, characterData: true });
detectVideo();

window.addEventListener('beforeunload', () => observer.disconnect());