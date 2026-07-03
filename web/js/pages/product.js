let currentProduct = null;

function productDescription(product) {
  if (product.type === 'CAR' && product.carModel?.description) {
    return product.carModel.description;
  }
  if (product.type === 'PART' && product.part?.description) {
    return product.part.description;
  }
  return '';
}

function compatibilityHtml(product) {
  if (product.type !== 'PART' || !product.part) return '';
  const brands = product.part.compatibleBrands?.join(', ') || '';
  const models = product.part.compatibleModels?.join(', ') || '';
  const years = product.part.compatibleYearFrom && product.part.compatibleYearTo
    ? `${product.part.compatibleYearFrom}–${product.part.compatibleYearTo}`
    : '';
  return `
    <div class="product-compat">
      <h3>Compatibility</h3>
      <ul>
        ${brands ? `<li><strong>Brands:</strong> ${brands}</li>` : ''}
        ${models ? `<li><strong>Models:</strong> ${models}</li>` : ''}
        ${years ? `<li><strong>Years:</strong> ${years}</li>` : ''}
        ${product.part.partNumber ? `<li><strong>Part No:</strong> ${product.part.partNumber}</li>` : ''}
      </ul>
    </div>
  `;
}

function carSpecsHtml(product) {
  if (product.type !== 'CAR' || !product.carVariant) return '';
  const v = product.carVariant;
  return `
    <div class="product-specs">
      <h3>Specifications</h3>
      <ul>
        <li><strong>Trim:</strong> ${v.trim}</li>
        <li><strong>Engine:</strong> ${v.engine}</li>
        <li><strong>Transmission:</strong> ${v.transmission}</li>
        <li><strong>Fuel:</strong> ${v.fuelType}</li>
        <li><strong>Colour:</strong> ${v.color}</li>
        ${product.carModel?.bodyType ? `<li><strong>Body:</strong> ${product.carModel.bodyType}</li>` : ''}
      </ul>
    </div>
  `;
}

document.addEventListener('DOMContentLoaded', async () => {
  const slug = getQueryParam('slug');
  const container = document.getElementById('productContent');

  if (!slug) {
    container.innerHTML = '<div class="empty-state alert alert-error">Product not found.</div>';
    return;
  }

  try {
    const product = await api.getProduct(slug);
    currentProduct = product;
    document.title = `${product.name} | AutoHub BD`;

    const images = (product.images?.length
      ? product.images
      : [product.thumbnailUrl || `https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=3840&q=90`]
    ).map(resolveImageUrl);
    const brand = product.carModel?.brand?.name || (product.part?.category?.name || 'Parts');
    const desc = productDescription(product);

    container.innerHTML = `
      <div class="product-detail">
        <div class="product-gallery-wrap">
          <div class="product-gallery">
            <img id="mainProductImage" src="${images[0]}" alt="${product.name}" />
          </div>
          ${images.length > 1 ? `
            <div class="product-thumbs">
              ${images.map((url, i) => `
                <button type="button" class="product-thumb ${i === 0 ? 'active' : ''}" data-url="${url}">
                  <img src="${url}" alt="${product.name} view ${i + 1}" loading="lazy" />
                </button>
              `).join('')}
            </div>
          ` : ''}
        </div>
        <div class="product-info">
          <p class="card-brand">${brand} · ${product.type}</p>
          <h1>${product.name}</h1>
          <p class="product-meta">SKU: ${product.sku} · ${product.stock > 0 ? product.stock + ' in stock' : 'Out of stock'}</p>
          <p class="product-price">${formatBDT(product.price)}</p>
          ${desc ? `<div class="product-description"><p>${desc}</p></div>` : ''}
          ${product.carModel?.model3dUrl ? '<p class="alert alert-info">3D model available — interactive viewer coming soon.</p>' : ''}
          <div class="product-actions">
            <input type="number" class="form-input qty-input" id="qtyInput" value="1" min="1" max="${product.stock || 99}" />
            <button class="btn btn-primary" id="addToCartBtn" ${product.stock === 0 ? 'disabled' : ''}>Add to Cart</button>
          </div>
          ${carSpecsHtml(product)}
          ${compatibilityHtml(product)}
        </div>
      </div>
    `;

    container.querySelectorAll('.product-thumb').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.getElementById('mainProductImage').src = btn.dataset.url;
        container.querySelectorAll('.product-thumb').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    document.getElementById('addToCartBtn')?.addEventListener('click', () => {
      const qty = parseInt(document.getElementById('qtyInput').value, 10) || 1;
      addToCart(currentProduct, qty);
      const btn = document.getElementById('addToCartBtn');
      btn.textContent = 'Added ✓';
      setTimeout(() => { btn.textContent = 'Add to Cart'; }, 1500);
    });
  } catch (err) {
    container.innerHTML = `<div class="empty-state alert alert-error">${err.message}</div>`;
  }
});
