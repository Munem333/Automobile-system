function renderCart() {
  const container = document.getElementById('cartContent');
  const cart = getCart();

  if (!cart.length) {
    container.innerHTML = `
      <div class="empty-state">
        <p>Your cart is empty.</p>
        <a href="cars.html" class="btn btn-primary" style="margin-top:1rem">Browse Cars</a>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="grid-4" style="grid-template-columns:1fr">
      ${cart.map((item) => `
        <div class="card" style="display:flex;gap:1rem;padding:1rem;align-items:center">
          <img src="${resolveImageUrl(item.thumbnailUrl) || 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=120&h=90&fit=crop&q=85'}" alt="" style="width:100px;height:75px;object-fit:cover;border-radius:8px" />
          <div style="flex:1">
            <h3 class="card-title">${item.name}</h3>
            <p class="card-price">${formatBDT(item.price)} × ${item.quantity}</p>
          </div>
          <div style="display:flex;gap:.5rem;align-items:center">
            <input type="number" class="form-input qty-input" value="${item.quantity}" min="1" data-id="${item.productId}" />
            <button class="btn btn-ghost remove-btn" data-id="${item.productId}">Remove</button>
          </div>
        </div>
      `).join('')}
    </div>
    <div style="margin-top:2rem;padding:1.5rem;background:var(--glass);border:1px solid var(--border);border-radius:var(--radius);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem">
      <div>
        <p style="color:var(--text-muted);font-size:.9rem">Total</p>
        <p style="font-size:1.75rem;font-weight:800;color:var(--primary)">${formatBDT(getCartTotal())}</p>
      </div>
      <button class="btn btn-primary" disabled title="Checkout coming soon">Proceed to Checkout</button>
    </div>
  `;

  container.querySelectorAll('.remove-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      removeFromCart(btn.dataset.id);
      renderCart();
    });
  });

  container.querySelectorAll('.qty-input').forEach((input) => {
    input.addEventListener('change', () => {
      updateQuantity(input.dataset.id, parseInt(input.value, 10));
      renderCart();
    });
  });
}

document.addEventListener('DOMContentLoaded', renderCart);
