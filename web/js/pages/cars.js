function renderBrandCarSection(brand, items) {
  if (!items.length) return '';
  const accent = brand.slug === 'toyota' ? 'var(--accent-toyota)'
    : brand.slug === 'hyundai' ? 'var(--accent-hyundai)'
    : brand.slug === 'nissan' ? 'var(--accent-nissan)'
    : brand.slug === 'baw' ? 'var(--accent-ev, #059669)'
    : 'var(--color-text)';

  return `
    <section class="brand-car-section reveal">
      <div class="brand-car-section__header">
        <div>
          <p class="section-eyebrow" style="color:${accent}">${brand.name}</p>
          <h2 class="brand-car-section__title">${brand.name} Vehicles</h2>
          <p class="brand-car-section__desc">${brand.description || ''}</p>
        </div>
        <a href="brand.html?slug=${encodeURIComponent(brand.slug)}" class="link-arrow">All ${brand.name}</a>
      </div>
      <div class="grid-4 brand-car-section__grid">
        ${items.map(renderProductCard).join('')}
      </div>
    </section>
  `;
}

async function loadCarsFlat() {
  const grid = document.getElementById('productsGrid');
  const brandSections = document.getElementById('brandSections');
  const countEl = document.getElementById('resultsCount');
  const brand = document.getElementById('brandFilter').value;
  const fuelType = document.getElementById('fuelFilter')?.value || '';
  const search = document.getElementById('searchInput').value.trim();

  if (brandSections) brandSections.innerHTML = '';
  if (grid) grid.hidden = false;

  grid.innerHTML = '<div class="loading"><div class="spinner"></div>Loading cars…</div>';

  try {
    const params = { page: '1', pageSize: '48' };
    if (brand) params.brand = brand;
    if (fuelType) params.fuelType = fuelType;
    if (search) params.search = search;

    const data = await api.getCars(params);
    countEl.textContent = `${data.total} vehicles found`;

    if (!data.items.length) {
      grid.innerHTML = '<div class="empty-state">No cars match your filters. Try a different brand or search term.</div>';
      return;
    }

    grid.innerHTML = data.items.map(renderProductCard).join('');
    markRevealed(grid);
  } catch (err) {
    grid.innerHTML = `<div class="empty-state alert alert-error">${err.message}</div>`;
    countEl.textContent = '';
  }
}

async function loadCarsByBrand() {
  const grid = document.getElementById('productsGrid');
  const brandSections = document.getElementById('brandSections');
  const countEl = document.getElementById('resultsCount');

  if (grid) {
    grid.hidden = true;
    grid.innerHTML = '';
  }
  if (brandSections) {
    brandSections.innerHTML = '<div class="loading"><div class="spinner"></div>Loading cars by brand…</div>';
  }

  try {
    const brands = await api.getBrands();
    const sections = await Promise.all(
      brands.map(async (brand) => {
        const data = await api.getCars({ brand: brand.slug, pageSize: '8' });
        return { brand, items: data.items };
      })
    );

    const total = sections.reduce((sum, s) => sum + s.items.length, 0);
    countEl.textContent = `${total} vehicles across ${brands.length} brands`;

    if (brandSections) {
      brandSections.innerHTML = sections.map((s) => renderBrandCarSection(s.brand, s.items)).join('');
      markRevealed(brandSections);
      if (typeof refreshScrollReveals === 'function') refreshScrollReveals(brandSections);
    }
  } catch (err) {
    if (brandSections) {
      brandSections.innerHTML = `<div class="empty-state alert alert-error">${err.message}</div>`;
    }
    countEl.textContent = '';
  }
}

async function loadCars() {
  const brand = document.getElementById('brandFilter').value;
  const fuelType = document.getElementById('fuelFilter')?.value || '';
  const search = document.getElementById('searchInput').value.trim();

  if (!brand && !search && !fuelType) {
    await loadCarsByBrand();
    return;
  }
  await loadCarsFlat();
}

document.addEventListener('DOMContentLoaded', () => {
  const brandParam = getQueryParam('brand');
  const fuelParam = getQueryParam('fuelType');
  if (brandParam) document.getElementById('brandFilter').value = brandParam;
  if (fuelParam && document.getElementById('fuelFilter')) {
    document.getElementById('fuelFilter').value = fuelParam;
  }

  document.getElementById('searchBtn').addEventListener('click', loadCars);
  document.getElementById('searchInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') loadCars();
  });
  document.getElementById('brandFilter').addEventListener('change', loadCars);
  document.getElementById('fuelFilter')?.addEventListener('change', loadCars);

  loadCars();
});
