/*
 * =============================================================================
 * Safe Bike Ride Planner — Authentication Module
 * K K K Ekanayake — Senior Web Developer
 * =============================================================================
 * Handles Google OAuth flow, session checking, login/logout UI.
 * All auth endpoints are relative to the Express backend.
 * =============================================================================
 */

/**
 * Check current authentication state from the server.
 * GET /auth/current-user returns { user: {...} } or { user: null }.
 * If the URL contains ?login=success (OAuth redirect), reload state after
 * the page finishes loading.
 */
async function checkAuth() {
  try {
    const res = await fetch('/auth/current-user', {
      credentials: 'same-origin',
    });

    if (!res.ok) {
      console.warn('[Auth] Failed to check auth state:', res.status);
      renderAuthState(null);
      return null;
    }

    const data = await res.json();

    // FIX-01: Server returns { success: true, data: {...user} }, not { user: {...} }
    if (data && data.data) {
      window.appState.user = data.data;
      renderAuthState(data.data);
      return data.data;
    }

    window.appState.user = null;
    renderAuthState(null);
    return null;
  } catch (err) {
    console.error('[Auth] Error checking auth state:', err.message);
    window.appState.user = null;
    renderAuthState(null);
    return null;
  }
}

/**
 * Render authentication state in the header.
 * When logged in: show avatar + name + logout button, hide Google sign-in.
 * When logged out: show Google sign-in button, hide user controls.
 * @param {Object|null} user - User object { displayName, photo, email } or null
 */
function renderAuthState(user) {
  const authContainer = document.getElementById('auth-container');
  if (!authContainer) return;

  if (user) {
    authContainer.innerHTML = `
      <img
        class="user-avatar"
        src="${escapeHtml(user.photo || '')}"
        alt="${escapeHtml(user.displayName || 'User')}"
        referrerpolicy="no-referrer"
        onerror="this.style.display='none'"
      />
      <span class="user-name">${escapeHtml(user.displayName || 'User')}</span>
      <button class="btn btn-ghost" onclick="logout()" title="Sign out">
        <span class="btn-icon">
          <svg viewBox="0 0 24 24"><path d="M16 17v-3H9v-4h7V7l5 5-5 5M14 2a2 2 0 012 2v2h-2V4H5v16h9v-2h2v2a2 2 0 01-2 2H5a2 2 0 01-2-2V4a2 2 0 012-2h9z"/></svg>
        </span>
      </button>
    `;

    // Show auth-only sections
    document.querySelectorAll('.auth-hidden').forEach(function (el) {
      el.classList.remove('auth-hidden');
    });
  } else {
    authContainer.innerHTML = `
      <a href="/auth/google" class="btn btn-google">
        <span class="btn-icon">
          <svg viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
            <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
            <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0124 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
            <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 01-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
          </svg>
        </span>
        <span>Sign in with Google</span>
      </a>
    `;

    // Hide auth-only sections
    document.querySelectorAll('.auth-required').forEach(function (el) {
      el.classList.add('auth-hidden');
    });
  }
}

/**
 * Logout: hit the server logout endpoint, then reset state.
 */
async function logout() {
  try {
    const res = await fetch('/auth/logout', {
      credentials: 'same-origin',
    });

    if (!res.ok) {
      console.warn('[Auth] Logout request failed:', res.status);
    }

    // Clear client state regardless
    window.appState.user = null;
    window.appState.history = [];
    renderAuthState(null);

    // Hide report save actions and stats
    const actionsEl = document.getElementById('report-actions');
    if (actionsEl) actionsEl.classList.add('auth-hidden');
    const statsEl = document.getElementById('stats-section');
    if (statsEl) statsEl.classList.remove('active');
  } catch (err) {
    console.error('[Auth] Error during logout:', err.message);
    window.appState.user = null;
    renderAuthState(null);
  }
}

/**
 * Handle OAuth redirect callback.
 * If the URL includes ?login=success, check auth state and clean the URL.
 */
function handleOAuthRedirect() {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('login') === 'success') {
    // Check auth to pick up the newly-logged-in user
    checkAuth().then(function () {
      // Clean URL without reloading the page
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    });
  }
}

/**
 * Simple HTML escaping helper to prevent XSS.
 * @param {string} str - Raw string
 * @returns {string} Escaped string safe for innerHTML
 */
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

// Export to global scope for inline onclick handlers
window.checkAuth = checkAuth;
window.renderAuthState = renderAuthState;
window.logout = logout;
window.handleOAuthRedirect = handleOAuthRedirect;
