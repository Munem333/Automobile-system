(function initTheme() {
  const STORAGE_KEY = 'autohub-theme';
  const MODES = ['light', 'dark', 'system'];

  function getStoredTheme() {
    const saved = localStorage.getItem(STORAGE_KEY);
    return MODES.includes(saved) ? saved : 'system';
  }

  function getEffectiveTheme() {
    const mode = getStoredTheme();
    if (mode === 'light' || mode === 'dark') return mode;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function applyTheme(mode) {
    const root = document.documentElement;
    if (mode === 'light') {
      root.setAttribute('data-theme', 'light');
    } else if (mode === 'dark') {
      root.setAttribute('data-theme', 'dark');
    } else {
      root.removeAttribute('data-theme');
    }
    localStorage.setItem(STORAGE_KEY, mode);
    updateThemeUI();
  }

  function updateThemeUI() {
    const mode = getStoredTheme();
    const effective = getEffectiveTheme();

    document.querySelectorAll('[data-theme-mode]').forEach((btn) => {
      const active = btn.dataset.themeMode === mode;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });

    const toggle = document.getElementById('themeToggle');
    if (toggle) {
      toggle.setAttribute('data-effective-theme', effective);
      const label = mode === 'system' ? 'System' : mode === 'dark' ? 'Dark' : 'Light';
      toggle.setAttribute('aria-label', `Theme: ${label}`);
    }
  }

  function closeThemeMenu() {
    const menu = document.getElementById('themeMenu');
    if (menu) menu.hidden = true;
  }

  function bindThemeControls() {
    const toggle = document.getElementById('themeToggle');
    const menu = document.getElementById('themeMenu');

    if (toggle && menu && !toggle.dataset.bound) {
      toggle.dataset.bound = '1';

      toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        menu.hidden = !menu.hidden;
      });

      document.addEventListener('click', (e) => {
        if (!menu.hidden && !e.target.closest('.theme-switcher')) {
          closeThemeMenu();
        }
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeThemeMenu();
      });
    }

    document.querySelectorAll('[data-theme-mode]:not([data-theme-bound])').forEach((btn) => {
      btn.dataset.themeBound = '1';
      btn.addEventListener('click', () => {
        applyTheme(btn.dataset.themeMode);
        closeThemeMenu();
      });
    });

    updateThemeUI();
  }

  window.Theme = {
    get: getStoredTheme,
    getEffective: getEffectiveTheme,
    set: applyTheme,
    initControls: bindThemeControls,
  };

  applyTheme(getStoredTheme());

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (getStoredTheme() === 'system') {
      applyTheme('system');
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindThemeControls);
  } else {
    bindThemeControls();
  }
})();
