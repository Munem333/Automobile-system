document.addEventListener('DOMContentLoaded', async () => {
  const slug = getQueryParam('slug');
  const container = document.getElementById('brandContent');

  if (!slug) {
    container.innerHTML = '<div class="empty-state alert alert-error">No brand selected. <a href="brands.html">Browse brands</a></div>';
    return;
  }

  try {
    const brand = await api.getBrand(slug);
    document.title = `${brand.name} | AutoHub BD`;

    const models = brand.models || [];
    container.innerHTML = `
      <div class="page-header">
        <h1>${brand.name}</h1>
        <p>${brand.description || ''}</p>
      </div>
      <div class="section-header">
        <h2>Model Lineup</h2>
        <a href="cars.html?brand=${encodeURIComponent(slug)}" class="link-arrow">View all ${brand.name} cars →</a>
      </div>
      <div class="grid-3">
        ${models.map((m) => {
          const img = m.heroImageUrl || `https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800&h=600&fit=crop&q=85`;
          return `
          <a href="cars.html?brand=${slug}&search=${encodeURIComponent(m.name)}" class="card">
            <div class="card-image">
              <img src="${img}" alt="${m.name}" loading="lazy" />
            </div>
            <div class="card-body">
              <h3 class="card-title">${m.name}</h3>
              <p class="card-brand">${m.bodyType} · ${m.yearFrom}${m.yearTo ? '–' + m.yearTo : '+'}</p>
              <p class="card-price">From ${formatBDT(Number(m.basePrice))}</p>
            </div>
          </a>`;
        }).join('')}
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="empty-state alert alert-error">${err.message}</div>`;
  }
});
