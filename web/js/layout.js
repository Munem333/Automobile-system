const ICONS = {
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3-3"/></svg>',
  cart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 6h15l-1.5 9H8L6 6z"/><circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/><path d="M6 6L5 3H2"/></svg>',
  account: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  chevron: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 6l6 6-6 6"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M15 6l-6 6 6 6"/></svg>',
  facebook: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>',
  instagram: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>',
  youtube: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>',
  sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>',
  moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 14.5A8.5 8.5 0 1112.5 3a6.5 6.5 0 008.5 11.5z"/></svg>',
  monitor: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="20" height="14" rx="1"/><path d="M8 21h8M12 17v4"/></svg>',
};

function renderThemeSwitcher() {
  return `
    <div class="theme-switcher">
      <button class="icon-btn theme-toggle" id="themeToggle" type="button" aria-label="Theme" aria-haspopup="true" data-effective-theme="light">
        <span class="theme-icon theme-icon--light">${ICONS.sun}</span>
        <span class="theme-icon theme-icon--dark">${ICONS.moon}</span>
      </button>
      <div class="theme-menu" id="themeMenu" hidden role="menu">
        <button type="button" class="theme-option" data-theme-mode="light" role="menuitem">${ICONS.sun} Light</button>
        <button type="button" class="theme-option" data-theme-mode="dark" role="menuitem">${ICONS.moon} Dark</button>
        <button type="button" class="theme-option" data-theme-mode="system" role="menuitem">${ICONS.monitor} System</button>
      </div>
    </div>
  `;
}

function renderMobileThemeOptions() {
  return `
    <div class="mobile-theme">
      <p class="mobile-theme__label">Appearance</p>
      <div class="theme-options-row">
        <button type="button" class="theme-option" data-theme-mode="light">${ICONS.sun} Light</button>
        <button type="button" class="theme-option" data-theme-mode="dark">${ICONS.moon} Dark</button>
        <button type="button" class="theme-option" data-theme-mode="system">${ICONS.monitor} System</button>
      </div>
    </div>
  `;
}

const MEGA_MENUS = {
  cars: {
    columns: [
      {
        title: 'By Brand',
        links: [
          { label: 'Toyota', href: 'brand.html?slug=toyota', class: 'brand-toyota' },
          { label: 'Hyundai', href: 'brand.html?slug=hyundai', class: 'brand-hyundai' },
          { label: 'Nissan', href: 'brand.html?slug=nissan', class: 'brand-nissan' },
          { label: 'BAW (EV)', href: 'brand.html?slug=baw', class: 'brand-ev' },
        ],
      },
      {
        title: 'Browse',
        links: [
          { label: 'All Cars', href: 'cars.html' },
          { label: 'EV Electric', href: 'ev.html', class: 'nav-ev' },
          { label: 'SUVs', href: 'cars.html?bodyType=SUV' },
          { label: 'Sedans', href: 'cars.html?bodyType=SEDAN' },
        ],
      },
      {
        title: 'Discover',
        links: [
          { label: 'Featured', href: 'cars.html?featured=1' },
          { label: 'All Brands', href: 'brands.html' },
        ],
      },
    ],
  },
  parts: {
    columns: [
      {
        title: 'Categories',
        links: [
          { label: 'Engine', href: 'parts.html?category=engine' },
          { label: 'Brakes', href: 'parts.html?category=brakes' },
          { label: 'Wheels & Tires', href: 'parts.html?category=wheels-tires' },
          { label: 'Electronics', href: 'parts.html?category=electronics' },
          { label: 'EV & Electric', href: 'parts.html?category=ev', class: 'nav-ev' },
        ],
      },
      {
        title: 'More',
        links: [
          { label: 'Suspension', href: 'parts.html?category=suspension' },
          { label: 'Interior', href: 'parts.html?category=interior' },
          { label: 'Exterior', href: 'parts.html?category=exterior' },
          { label: 'Lubricants', href: 'parts.html?category=lubricants' },
        ],
      },
      {
        title: 'Shop',
        links: [
          { label: 'All Parts', href: 'parts.html' },
        ],
      },
    ],
  },
  services: {
    columns: [
      {
        title: 'Service',
        links: [
          { label: 'Book Appointment', href: 'service.html' },
          { label: 'Service Centers', href: 'service.html#locations' },
        ],
      },
      {
        title: 'Care',
        links: [
          { label: 'Maintenance', href: 'service.html?type=maintenance' },
          { label: 'Repairs', href: 'service.html?type=repair' },
        ],
      },
    ],
  },
  support: {
    columns: [
      {
        title: 'Help',
        links: [
          { label: 'FAQ', href: 'support.html' },
          { label: 'Contact Us', href: 'support.html#contact' },
          { label: 'Live Chat', href: 'javascript:void(0)', attrs: 'onclick="openChatWidget()"' },
        ],
      },
      {
        title: 'Orders',
        links: [
          { label: 'Track Order', href: 'support.html#track' },
          { label: 'My Account', href: 'account.html' },
        ],
      },
    ],
  },
};

const MOBILE_NAV = [
  { label: 'Cars', panel: 'cars' },
  { label: 'EV Electric', href: 'ev.html' },
  { label: 'Parts & Accessories', panel: 'parts' },
  { label: 'Services', panel: 'services' },
  { label: 'Support', panel: 'support' },
  { label: 'Track Order', href: 'support.html#track' },
  { label: 'Account', href: 'account.html' },
];

const TRENDING_SEARCHES = [
  'Toyota Corolla Cross',
  'Hyundai Tucson',
  'Brake pads',
  'Engine oil',
  'Book service',
  'Nissan X-Trail',
];

function renderMegaMenu(key) {
  const menu = MEGA_MENUS[key];
  if (!menu) return '';
  return `
    <div class="mega-menu">
      <div class="mega-menu-grid">
        ${menu.columns.map((col) => `
          <div class="mega-menu-col">
            <h5>${col.title}</h5>
            <ul>
              ${col.links.map((l) => `<li><a href="${l.href}" class="${l.class || ''}" ${l.attrs || ''}>${l.label}</a></li>`).join('')}
            </ul>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderHeader() {
  const header = document.getElementById('site-header');
  if (!header) return;

  header.innerHTML = `
    <a href="#main-content" class="skip-link">Skip to main content</a>
    <div class="container header-inner">
      <a href="index.html" class="logo" aria-label="AutoHub BD Home">
        <div class="logo-mark">AH</div>
        <span class="logo-text">AutoHub<span class="bd">BD</span></span>
      </a>

      <nav aria-label="Main navigation">
        <ul class="nav-links">
          <li>
            <a href="cars.html">Cars</a>
            ${renderMegaMenu('cars')}
          </li>
          <li>
            <a href="parts.html">Parts &amp; Accessories</a>
            ${renderMegaMenu('parts')}
          </li>
          <li>
            <a href="service.html">Services</a>
            ${renderMegaMenu('services')}
          </li>
          <li>
            <a href="support.html">Support</a>
            ${renderMegaMenu('support')}
          </li>
          <li><a href="support.html#track">Track Order</a></li>
        </ul>
      </nav>

      <div class="header-actions">
        <button class="icon-btn" id="searchToggle" aria-label="Search">${ICONS.search}</button>
        <a href="cart.html" class="icon-btn" aria-label="Cart">
          ${ICONS.cart}
          <span class="cart-badge" id="cartBadge" style="display:none">0</span>
        </a>
        <a href="account.html" class="icon-btn" id="accountLink" aria-label="Account">${ICONS.account}</a>
        ${renderThemeSwitcher()}
        <button class="lang-toggle" id="langToggle" aria-label="Toggle language">EN</button>
        <button class="icon-btn menu-toggle" id="menuToggle" aria-label="Menu">${ICONS.menu}</button>
      </div>
    </div>
  `;

  document.getElementById('menuToggle')?.addEventListener('click', openMobileDrawer);
  document.getElementById('searchToggle')?.addEventListener('click', openSearchOverlay);
  document.getElementById('langToggle')?.addEventListener('click', toggleLanguage);

  initHeaderScroll();
  setActiveNav();
  updateCartBadge();
  window.Theme?.initControls();
}

function renderMobileDrawer() {
  if (document.getElementById('mobileDrawer')) return;

  const overlay = document.createElement('div');
  overlay.className = 'mobile-drawer-overlay';
  overlay.id = 'mobileDrawerOverlay';
  overlay.addEventListener('click', closeMobileDrawer);

  const drawer = document.createElement('div');
  drawer.className = 'mobile-drawer';
  drawer.id = 'mobileDrawer';
  drawer.setAttribute('role', 'dialog');
  drawer.setAttribute('aria-modal', 'true');
  drawer.innerHTML = `
    <div class="mobile-drawer-header">
      <button class="mobile-drawer-back" id="mobileDrawerBack">${ICONS.back} Back</button>
      <button class="mobile-drawer-close" id="mobileDrawerClose" aria-label="Close">${ICONS.close}</button>
    </div>
    <div class="mobile-nav-panel" id="mobileNavRoot">
      ${MOBILE_NAV.map((item) =>
        item.href
          ? `<a href="${item.href}">${item.label}</a>`
          : `<button class="nav-item" data-panel="${item.panel}">${item.label} ${ICONS.chevron}</button>`
      ).join('')}
      ${renderMobileThemeOptions()}
    </div>
    ${Object.entries(MEGA_MENUS).map(([key, menu]) => `
      <div class="mobile-nav-panel hidden" id="mobilePanel-${key}" data-panel="${key}">
        ${menu.columns.flatMap((col) =>
          col.links.map((l) => `<a href="${l.href}" class="sub-link">${l.label}</a>`)
        ).join('')}
      </div>
    `).join('')}
  `;

  document.body.appendChild(overlay);
  document.body.appendChild(drawer);

  document.getElementById('mobileDrawerClose')?.addEventListener('click', closeMobileDrawer);
  document.getElementById('mobileDrawerBack')?.addEventListener('click', showMobileRoot);

  drawer.querySelectorAll('[data-panel]').forEach((btn) => {
    if (btn.classList.contains('nav-item')) {
      btn.addEventListener('click', () => showMobilePanel(btn.dataset.panel));
    }
  });

  window.Theme?.initControls();
}

function openMobileDrawer() {
  renderMobileDrawer();
  document.getElementById('mobileDrawer')?.classList.add('open');
  document.getElementById('mobileDrawerOverlay')?.classList.add('open');
  document.body.style.overflow = 'hidden';
  showMobileRoot();
}

function closeMobileDrawer() {
  document.getElementById('mobileDrawer')?.classList.remove('open');
  document.getElementById('mobileDrawerOverlay')?.classList.remove('open');
  document.body.style.overflow = '';
}

function showMobileRoot() {
  document.getElementById('mobileNavRoot')?.classList.remove('hidden');
  document.querySelectorAll('[id^="mobilePanel-"]').forEach((p) => p.classList.add('hidden'));
  document.getElementById('mobileDrawerBack')?.classList.remove('visible');
}

function showMobilePanel(key) {
  document.getElementById('mobileNavRoot')?.classList.add('hidden');
  document.querySelectorAll('[id^="mobilePanel-"]').forEach((p) => p.classList.add('hidden'));
  document.getElementById(`mobilePanel-${key}`)?.classList.remove('hidden');
  document.getElementById('mobileDrawerBack')?.classList.add('visible');
}

function renderSearchOverlay() {
  if (document.getElementById('searchOverlay')) return;

  const overlay = document.createElement('div');
  overlay.className = 'search-overlay';
  overlay.id = 'searchOverlay';
  overlay.innerHTML = `
    <div class="search-overlay-header">
      <span class="logo-text">Search</span>
      <button class="icon-btn" id="searchClose" aria-label="Close search">${ICONS.close}</button>
    </div>
    <div class="search-overlay-input-wrap">
      <input type="search" class="search-overlay-input" id="searchOverlayInput"
        placeholder="Search cars, parts, brands…" autocomplete="off" />
    </div>
    <div class="search-trending">
      <h4>Trending Topics</h4>
      <ul>
        ${TRENDING_SEARCHES.map((t) => `<li><a href="cars.html?q=${encodeURIComponent(t)}">${t}</a></li>`).join('')}
      </ul>
    </div>
  `;

  document.body.appendChild(overlay);

  document.getElementById('searchClose')?.addEventListener('click', closeSearchOverlay);
  document.getElementById('searchOverlayInput')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.value.trim()) {
      window.location.href = `cars.html?q=${encodeURIComponent(e.target.value.trim())}`;
    }
    if (e.key === 'Escape') closeSearchOverlay();
  });
}

function openSearchOverlay() {
  renderSearchOverlay();
  const el = document.getElementById('searchOverlay');
  el?.classList.add('open');
  setTimeout(() => document.getElementById('searchOverlayInput')?.focus(), 100);
  document.body.style.overflow = 'hidden';
}

function closeSearchOverlay() {
  document.getElementById('searchOverlay')?.classList.remove('open');
  document.body.style.overflow = '';
}

function initHeaderScroll() {
  const header = document.getElementById('site-header');
  if (!header) return;

  const threshold = 80;
  const onScroll = () => {
    if (window.scrollY > threshold) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  };

  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
}

function toggleLanguage() {
  const btn = document.getElementById('langToggle');
  const current = localStorage.getItem('lang') || 'en';
  const next = current === 'en' ? 'bn' : 'en';
  localStorage.setItem('lang', next);
  if (btn) btn.textContent = next.toUpperCase();
  document.documentElement.lang = next === 'bn' ? 'bn' : 'en';
}

function renderFooter() {
  const footer = document.getElementById('site-footer');
  if (!footer) return;

  const user = typeof getUser === 'function' ? getUser() : null;
  const isAdmin = !!user?.role;

  footer.innerHTML = `
    <div class="container">
      <div class="footer-brands">
        <span class="footer-brands__label">Our Brands</span>
        <a href="brand.html?slug=toyota">Toyota</a>
        <a href="brand.html?slug=hyundai">Hyundai</a>
        <a href="brand.html?slug=nissan">Nissan</a>
        <a href="brands.html">All Brands</a>
      </div>

      <div class="footer-grid">
        <div class="footer-brand">
          <a href="index.html" class="logo">
            <div class="logo-mark">AH</div>
            <span class="logo-text">AutoHub<span class="bd">BD</span></span>
          </a>
          <p>Bangladesh's premium destination for new &amp; used cars, genuine parts, and expert service.</p>
        </div>
        <div class="footer-col">
          <h4>Shop</h4>
          <ul>
            <li><a href="cars.html">All Cars</a></li>
            <li><a href="parts.html">Parts &amp; Accessories</a></li>
            <li><a href="brand.html?slug=toyota">Toyota</a></li>
            <li><a href="brand.html?slug=hyundai">Hyundai</a></li>
            <li><a href="brand.html?slug=nissan">Nissan</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h4>Services</h4>
          <ul>
            <li><a href="service.html">Book a Service</a></li>
            <li><a href="support.html">FAQ</a></li>
            <li><a href="support.html#contact">Contact Us</a></li>
            <li><a href="support.html#track">Track Order</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h4>Contact</h4>
          <ul>
            <li><a href="tel:09612345678">09612-345678</a></li>
            <li><a href="mailto:care@autohub.bd">care@autohub.bd</a></li>
            <li>Dhaka · Chittagong · Sylhet</li>
          </ul>
        </div>
      </div>

      <div class="footer-social">
        <a href="#" aria-label="Facebook">${ICONS.facebook}</a>
        <a href="#" aria-label="Instagram">${ICONS.instagram}</a>
        <a href="#" aria-label="YouTube">${ICONS.youtube}</a>
      </div>

      <div class="footer-bottom">
        <p>&copy; ${new Date().getFullYear()} AutoHub BD. All rights reserved.</p>
        <div class="footer-legal">
          <span>Prices in BDT (৳)</span>
          <a href="support.html#privacy">Privacy</a>
          <a href="support.html#terms">Terms</a>
          ${isAdmin ? '<a href="admin.html">Admin</a>' : ''}
        </div>
      </div>
    </div>
  `;
}

document.addEventListener('DOMContentLoaded', () => {
  const lang = localStorage.getItem('lang') || 'en';
  document.querySelector('main')?.setAttribute('id', 'main-content');
  renderHeader();
  renderFooter();
  const langBtn = document.getElementById('langToggle');
  if (langBtn) langBtn.textContent = lang.toUpperCase();
  loadChatWidget();
});

function loadChatWidget() {
  if (document.querySelector('script[data-chat-widget]')) return;

  const socketScript = document.createElement('script');
  socketScript.src = 'https://cdn.socket.io/4.8.1/socket.io.min.js';
  socketScript.onload = () => {
    const chatScript = document.createElement('script');
    chatScript.src = 'js/chat-widget.js';
    chatScript.dataset.chatWidget = 'true';
    document.body.appendChild(chatScript);
  };
  document.body.appendChild(socketScript);
}
