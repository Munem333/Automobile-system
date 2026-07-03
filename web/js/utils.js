function formatBDT(amount) {
  return '৳' + Number(amount).toLocaleString('en-BD');
}

function slugify(text) {
  return String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function setActiveNav() {
  const path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a, .mobile-nav-panel a').forEach((link) => {
    const href = link.getAttribute('href') || '';
    const linkPath = href.split('?')[0].split('#')[0];
    if (linkPath === path || (path === 'index.html' && linkPath === 'index.html')) {
      link.classList.add('active');
    }
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text == null ? '' : String(text);
  return div.innerHTML;
}

function resolveImageUrl(url) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
  if (url.startsWith('/')) return `${API_URL}${url}`;
  return url;
}

function showAlert(container, message, type = 'error') {
  if (!container) return;
  container.innerHTML = `<div class="alert alert-${type}" role="alert">${escapeHtml(message)}</div>`;
}

function clearAlert(container) {
  if (container) container.innerHTML = '';
}

function markRevealed(root = document) {
  root.querySelectorAll('.reveal').forEach((el) => {
    el.classList.add('revealed');
    if (typeof gsap !== 'undefined') {
      gsap.set(el, { opacity: 1, y: 0, clearProps: 'opacity,transform' });
    }
  });
}

function renderProductCard(product) {
  const image = resolveImageUrl(product.thumbnailUrl || (product.images && product.images[0]))
    || `https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800&h=600&fit=crop&q=85`;
  const brand = product.type === 'CAR' && product.carModel?.brand
    ? product.carModel.brand.name
    : product.type === 'PART' ? 'Parts' : '';
  const href = product.type === 'CAR' && product.carModel
    ? `product.html?slug=${encodeURIComponent(product.slug)}`
    : `product.html?slug=${encodeURIComponent(product.slug)}`;
  const has3d = product.carModel?.model3dUrl;
  const outOfStock = product.stock === 0;

  return `
    <a href="${href}" class="card product-card">
      <div class="card-image">
        <img src="${image}" alt="${product.name}" loading="lazy" />
        ${has3d ? '<span class="badge">3D View</span>' : ''}
        ${product.carVariant?.fuelType === 'ELECTRIC' ? '<span class="badge badge-ev">EV</span>' : ''}
        ${outOfStock ? '<div style="position:absolute;inset:0;background:rgba(0,0,0,.6);display:grid;place-items:center;font-size:.85rem">Out of Stock</div>' : ''}
      </div>
      <div class="card-body">
        <p class="card-brand">${brand}</p>
        <h3 class="card-title">${escapeHtml(product.name)}</h3>
        <p class="card-price">${formatBDT(product.price)}</p>
      </div>
    </a>
  `;
}

function renderBrandCard(brand) {
  const brandImages = {
    toyota: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=800&h=450&fit=crop&q=85',
    hyundai: 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800&h=450&fit=crop&q=85',
    nissan: 'https://images.unsplash.com/photo-1618843479313-40f8afb5110d?w=800&h=450&fit=crop&q=85',
    baw: 'https://images.pexels.com/photos/9190737/pexels-photo-9190737.jpeg?auto=compress&cs=tinysrgb&w=800&h=450&fit=crop&q=85',
  };
  const img = brandImages[brand.slug] || `https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800&h=450&fit=crop&q=85`;
  return `
    <a href="brand.html?slug=${encodeURIComponent(brand.slug)}" class="brand-card">
      <img src="${img}" alt="${brand.name}" loading="lazy" />
      <div class="brand-card-overlay">
        <h3>${brand.name}</h3>
        <p>${brand.description || ''}</p>
      </div>
    </a>
  `;
}

function renderBrandTickerLink(brand) {
  return `<a href="brand.html?slug=${encodeURIComponent(brand.slug)}" class="brand-ticker__link" data-brand="${brand.slug}">${brand.name}</a>`;
}

function renderStoryTeaser(product, index) {
  const image = resolveImageUrl(product.thumbnailUrl || (product.images && product.images[0])
    || product.carModel?.heroImageUrl)
    || `https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=1200&h=750&fit=crop&q=85`;
  const brand = escapeHtml(product.carModel?.brand?.name || 'Cars');
  const desc = escapeHtml(product.carModel?.description || product.description
    || `Explore the ${product.name} — premium engineering and design.`);
  const reverse = index % 2 === 1 ? ' story-teaser--reverse' : '';

  return `
    <article class="story-teaser${reverse}">
      <div class="story-teaser__media reveal">
        <img src="${escapeHtml(image)}" alt="${escapeHtml(product.name)}" loading="lazy" />
        <div class="story-teaser__media-overlay"></div>
      </div>
      <div class="story-teaser__body reveal">
        <p class="story-teaser__category">${brand}</p>
        <h3 class="story-teaser__title">${escapeHtml(product.name)}</h3>
        <p class="story-teaser__desc">${desc}</p>
        <a href="product.html?slug=${encodeURIComponent(product.slug)}" class="story-teaser__link">
          Explore <span aria-hidden="true">→</span>
        </a>
      </div>
    </article>
  `;
}

const CATEGORY_ICONS = {
  engine: '<svg class="category-card__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg>',
  brakes: '<svg class="category-card__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/></svg>',
  suspension: '<svg class="category-card__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 18l8-14 8 14"/></svg>',
  electronics: '<svg class="category-card__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M9 9h6v6H9z"/></svg>',
  interior: '<svg class="category-card__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 16V8a2 2 0 012-2h12a2 2 0 012 2v8"/><path d="M4 16h16v2H4z"/></svg>',
  exterior: '<svg class="category-card__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 12h18M12 3v18"/></svg>',
  'wheels-tires': '<svg class="category-card__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/></svg>',
  lubricants: '<svg class="category-card__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2l6 10H6L12 2z"/><path d="M6 12v8h12v-8"/></svg>',
};

function renderCategoryCard(cat) {
  const icon = CATEGORY_ICONS[cat.slug] || CATEGORY_ICONS.engine;
  const count = cat._count?.parts ?? '';
  return `
    <a href="parts.html?category=${encodeURIComponent(cat.slug)}" class="category-card reveal">
      ${icon}
      <span class="category-card__label">${cat.name}</span>
      ${count ? `<span class="category-card__count">${count} items</span>` : ''}
    </a>
  `;
}

function renderNewsItem(item) {
  return `
    <li>
      <a href="${item.href}" class="news-item">
        <time class="news-item__date" datetime="${item.date}">${item.dateLabel}</time>
        <span class="news-item__tag">${item.tag}</span>
        <h3 class="news-item__title">${item.title}</h3>
        <img class="news-item__thumb" src="${item.thumb}" alt="" loading="lazy" />
      </a>
    </li>
  `;
}
