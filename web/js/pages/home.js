const STATIC_NEWS = [
  {
    date: '2026-07-01',
    dateLabel: '01 Jul 2026',
    tag: 'Offer',
    title: 'Summer service package — 15% off maintenance at all centers',
    thumb: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=240&q=80',
    href: 'service.html',
  },
  {
    date: '2026-06-28',
    dateLabel: '28 Jun 2026',
    tag: 'New Arrival',
    title: 'Toyota Corolla Cross 2025 now available for test drive',
    thumb: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=240&q=80',
    href: 'brand.html?slug=toyota',
  },
  {
    date: '2026-06-20',
    dateLabel: '20 Jun 2026',
    tag: 'Parts',
    title: 'Genuine brake pads for Toyota & Hyundai — free fitting',
    thumb: 'https://images.unsplash.com/photo-1487754180451-cde2e9a0c6c0?w=240&q=80',
    href: 'parts.html?category=brakes',
  },
  {
    date: '2026-06-15',
    dateLabel: '15 Jun 2026',
    tag: 'Company',
    title: 'AutoHub BD opens third service center in Sylhet',
    thumb: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=240&q=80',
    href: 'support.html',
  },
];

function duplicateLiveStrip() {
  const strip = document.getElementById('liveStrip');
  if (!strip) return;
  strip.innerHTML += strip.innerHTML;
}

async function loadHome() {
  duplicateLiveStrip();

  const brandTicker = document.getElementById('brandTicker');
  const featuredStories = document.getElementById('featuredStories');
  const categoryGrid = document.getElementById('categoryGrid');
  const newsList = document.getElementById('newsList');

  try {
    const [brands, featured, categories] = await Promise.all([
      api.getBrands(),
      api.getFeaturedProducts({ type: 'CAR', limit: '6' }),
      api.getPartCategories().catch(() => []),
    ]);

    let carProducts = featured.filter((p) => p.type === 'CAR');

    if (carProducts.length === 0) {
      try {
        const carsRes = await api.getCars({ pageSize: '6' });
        carProducts = carsRes.items || [];
      } catch {
        carProducts = [];
      }
    }

    const evGrid = document.getElementById('evSpotlightGrid');
    if (evGrid) {
      try {
        const evCars = await api.getCars({ fuelType: 'ELECTRIC', pageSize: '4' });
        evGrid.innerHTML = evCars.items.length
          ? evCars.items.slice(0, 4).map(renderProductCard).join('')
          : '<div class="empty-state">BAW electric vehicles coming soon.</div>';
      } catch {
        evGrid.innerHTML = '';
      }
    }

    if (brandTicker) {
      brandTicker.innerHTML = brands.map(renderBrandTickerLink).join('')
        + '<a href="brands.html" class="brand-ticker__more">+ More</a>';
    }

    if (featuredStories) {
      const teasers = carProducts.slice(0, 3);
      featuredStories.innerHTML = teasers.length
        ? teasers.map(renderStoryTeaser).join('')
        : '<div class="empty-state">No featured cars yet. Check back soon.</div>';
    }

    if (categoryGrid) {
      categoryGrid.innerHTML = categories.length
        ? categories.map(renderCategoryCard).join('')
        : '<div class="empty-state">Categories coming soon.</div>';
    }

    if (newsList) {
      newsList.innerHTML = STATIC_NEWS.map(renderNewsItem).join('');
    }

    if (typeof refreshScrollReveals === 'function') {
      refreshScrollReveals();
    }
    markRevealed();
  } catch (err) {
    const msg = err.message || 'Could not load data. Make sure the API is running on port 4000.';
    if (brandTicker) brandTicker.innerHTML = `<div class="empty-state alert alert-info">${escapeHtml(msg)}</div>`;
    if (featuredStories) {
      featuredStories.innerHTML = `<div class="empty-state alert alert-info">${escapeHtml(msg)}</div>`;
    }
    if (categoryGrid) categoryGrid.innerHTML = '';
    if (newsList) newsList.innerHTML = STATIC_NEWS.map(renderNewsItem).join('');
  }
}

document.addEventListener('DOMContentLoaded', loadHome);
