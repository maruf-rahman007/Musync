// popup.js
document.addEventListener('DOMContentLoaded', () => {
  const loginBtn = document.getElementById('loginBtn');
  const statusDiv = document.getElementById('status');
  const refreshBtn = document.createElement('button');
  refreshBtn.textContent = 'Refresh Connection';
  refreshBtn.style.marginTop = '10px';
  refreshBtn.style.background = '#333';

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
      spotifyCache: {
        user,
        playlists,
        cachedAt: Date.now()
      }
    });
  }

  async function checkAuthAndUpdateUI() {
    const cache = await getCache();

    if (cache) {
      statusDiv.innerHTML = `
        <strong>✅ Connected as ${cache.user.display_name}</strong><br>
        <small>${cache.playlists.length} playlists loaded</small>
      `;
      loginBtn.style.display = 'none';
      statusDiv.appendChild(refreshBtn);
      return;
    }

    // No cache → try backend
    try {
      const [meRes, playlistsRes] = await Promise.all([
        fetch('http://127.0.0.1:3000/api/me', { credentials: 'include' }),
        fetch('http://127.0.0.1:3000/api/playlists', { credentials: 'include' })
      ]);

      if (!meRes.ok || !playlistsRes.ok) throw new Error('Not connected');

      const user = await meRes.json();
      const playlists = await playlistsRes.json();

      await saveCache(user, playlists);

      statusDiv.innerHTML = `
        <strong>✅ Connected as ${user.display_name}</strong><br>
        <small>${playlists.length} playlists loaded</small>
      `;
      loginBtn.style.display = 'none';
      statusDiv.appendChild(refreshBtn);
    } catch (err) {
      statusDiv.textContent = 'Not connected. Click below to login.';
      loginBtn.style.display = 'block';
    }
  }

  // Login
  loginBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: 'http://127.0.0.1:3000/api/auth/login' });
    statusDiv.textContent = 'Opening Spotify login... (close tab after approving)';
  });

  // Refresh button
  refreshBtn.addEventListener('click', async () => {
    await chrome.storage.local.remove('spotifyCache');
    statusDiv.textContent = 'Refreshing...';
    checkAuthAndUpdateUI();
  });

  // Initial check
  checkAuthAndUpdateUI();
});