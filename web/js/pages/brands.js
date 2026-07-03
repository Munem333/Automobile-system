document.addEventListener('DOMContentLoaded', async () => {
  const grid = document.getElementById('brandsGrid');
  try {
    const brands = await api.getBrands();
    grid.innerHTML = brands.map(renderBrandCard).join('');
  } catch (err) {
    grid.innerHTML = `<div class="empty-state alert alert-error">${err.message}</div>`;
  }
});
