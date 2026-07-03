async function loadParts() {
  const grid = document.getElementById('productsGrid');
  const countEl = document.getElementById('resultsCount');
  const category = document.getElementById('categoryFilter').value;
  const search = document.getElementById('searchInput').value.trim();

  grid.innerHTML = '<div class="loading"><div class="spinner"></div>Loading parts…</div>';

  try {
    const params = { page: '1', pageSize: '60' };
    if (category) params.category = category;
    if (search) params.search = search;

    const data = await api.getParts(params);
    countEl.textContent = `${data.total} parts found`;

    if (!data.items.length) {
      grid.innerHTML = '<div class="empty-state">No parts match your filters. Try a different category or search term.</div>';
      return;
    }

    grid.innerHTML = data.items.map(renderProductCard).join('');
  } catch (err) {
    grid.innerHTML = `<div class="empty-state alert alert-error">${err.message}</div>`;
    countEl.textContent = '';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const urlCategory = getQueryParam('category');
  if (urlCategory) {
    document.getElementById('categoryFilter').value = urlCategory;
  }
  document.getElementById('searchBtn').addEventListener('click', loadParts);
  document.getElementById('searchInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') loadParts();
  });
  document.getElementById('categoryFilter').addEventListener('change', loadParts);
  loadParts();
});
