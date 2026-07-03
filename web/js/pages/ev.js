async function loadEvPage() {
  const carsGrid = document.getElementById('evCarsGrid');
  const partsGrid = document.getElementById('evPartsGrid');
  const carsCount = document.getElementById('evCarsCount');

  try {
    const [carsData, partsData] = await Promise.all([
      api.getCars({ fuelType: 'ELECTRIC', pageSize: '48' }),
      api.getParts({ category: 'ev', pageSize: '48' }),
    ]);

    if (carsCount) {
      carsCount.textContent = `${carsData.total} electric vehicle${carsData.total === 1 ? '' : 's'} available`;
    }

    if (carsGrid) {
      if (!carsData.items.length) {
        carsGrid.innerHTML = '<div class="empty-state">No electric vehicles listed yet. Check back soon or contact us for BAW EV availability.</div>';
      } else {
        carsGrid.innerHTML = carsData.items.map(renderProductCard).join('');
        markRevealed(carsGrid);
      }
    }

    if (partsGrid) {
      if (!partsData.items.length) {
        partsGrid.innerHTML = '<div class="empty-state">EV parts coming soon.</div>';
      } else {
        partsGrid.innerHTML = partsData.items.map(renderProductCard).join('');
        markRevealed(partsGrid);
      }
    }

    if (typeof refreshScrollReveals === 'function') refreshScrollReveals();
  } catch (err) {
    const msg = err.message || 'Could not load EV catalog. Make sure the API is running.';
    if (carsGrid) carsGrid.innerHTML = `<div class="empty-state alert alert-error">${msg}</div>`;
    if (partsGrid) partsGrid.innerHTML = '';
    if (carsCount) carsCount.textContent = '';
  }
}

document.addEventListener('DOMContentLoaded', loadEvPage);
