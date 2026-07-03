let adminSocket = null;
let activeChatSession = null;
let productFormOptions = null;
let productPage = 1;
let editingProductId = null;
let productGalleryUrls = [];
let adminPermissions = [];
let adminRole = null;
let adminUserId = null;

const PANEL_PERMISSIONS = {
  dashboard: 'analytics.view',
  orders: 'order.manage',
  products: 'product.manage',
  appointments: 'appointment.manage',
  chat: 'chat.respond',
  tickets: 'support.manage',
  customers: 'user.manage',
  team: 'admin.full',
};

function hasPermission(permission) {
  return adminPermissions.includes(permission) || adminPermissions.includes('admin.full');
}

function formatRoleLabel(role) {
  const labels = {
    super_admin: 'Super Admin',
    moderator: 'Moderator',
    staff: 'Staff',
  };
  return labels[role] || role;
}

function adminNotify(message, type = 'error') {
  const el = document.getElementById('adminAlert');
  if (el) showAlert(el, message, type);
  else window.alert(message);
}

const PANEL_TITLES = {
  dashboard: 'Dashboard',
  orders: 'Orders',
  products: 'Products',
  appointments: 'Appointments',
  chat: 'Chat Inbox',
  tickets: 'Support Tickets',
  customers: 'Customers',
  team: 'Team & Moderators',
};

function applyAdminNavPermissions() {
  let firstAllowedPanel = null;

  document.querySelectorAll('.admin-nav a[data-panel]').forEach((link) => {
    const panel = link.dataset.panel;
    const required = PANEL_PERMISSIONS[panel];
    const allowed = !required || hasPermission(required);
    link.hidden = !allowed;
    if (allowed && !firstAllowedPanel) {
      firstAllowedPanel = panel;
    }
  });

  if (firstAllowedPanel) {
    switchPanel(firstAllowedPanel);
  }
}

async function requireAdmin() {
  if (!isLoggedIn()) {
    window.location.href = 'account.html?redirect=admin.html';
    return false;
  }
  try {
    const user = await api.getMe();
    if (!user.role) {
      document.getElementById('adminAlert').innerHTML =
        '<div class="alert alert-error">Admin access required. Please sign in with an admin account.</div>';
      return false;
    }
    adminPermissions = user.permissions || [];
    adminRole = user.role;
    adminUserId = user.id;
    document.getElementById('adminUser').textContent = `${user.fullName} (${formatRoleLabel(user.role)})`;
    applyAdminNavPermissions();
    return true;
  } catch {
    clearAuth();
    window.location.href = 'account.html?redirect=admin.html';
    return false;
  }
}

function switchPanel(name) {
  const required = PANEL_PERMISSIONS[name];
  if (required && !hasPermission(required)) return;

  document.querySelectorAll('.admin-panel').forEach((p) => p.classList.remove('active'));
  document.querySelectorAll('.admin-nav a[data-panel]').forEach((a) => a.classList.remove('active'));
  document.getElementById(`panel-${name}`)?.classList.add('active');
  document.querySelector(`[data-panel="${name}"]`)?.classList.add('active');
  document.getElementById('panelTitle').textContent = PANEL_TITLES[name] || name;

  const loaders = {
    dashboard: loadDashboard,
    orders: loadOrders,
    products: loadProducts,
    appointments: loadAppointments,
    chat: loadChatInbox,
    tickets: loadTickets,
    customers: loadCustomers,
    team: loadTeam,
  };
  loaders[name]?.();
}

async function loadDashboard() {
  const grid = document.getElementById('statGrid');
  try {
    const [stats, analytics] = await Promise.all([
      api.adminGet('/dashboard'),
      api.adminGet('/analytics'),
    ]);

    grid.innerHTML = `
      <div class="stat-card"><div class="label">Orders Today</div><div class="value">${stats.ordersToday}</div></div>
      <div class="stat-card"><div class="label">Total Orders</div><div class="value">${stats.totalOrders}</div></div>
      <div class="stat-card"><div class="label">Revenue Today</div><div class="value">${formatBDT(stats.revenueToday)}</div></div>
      <div class="stat-card"><div class="label">Total Revenue</div><div class="value">${formatBDT(stats.totalRevenue)}</div></div>
      <div class="stat-card"><div class="label">Pending Appointments</div><div class="value">${stats.pendingAppointments}</div></div>
      <div class="stat-card"><div class="label">Active Chats</div><div class="value">${stats.activeChats}</div></div>
      <div class="stat-card"><div class="label">Open Tickets</div><div class="value">${stats.openTickets}</div></div>
      <div class="stat-card"><div class="label">Low Stock</div><div class="value">${stats.lowStockProducts}</div></div>
    `;

    const chart = document.getElementById('revenueChart');
    if (analytics.revenueByDay.length) {
      chart.innerHTML = analytics.revenueByDay.map((d) =>
        `<div style="display:flex;justify-content:space-between;padding:.4rem 0;border-bottom:1px solid var(--border)">
          <span>${d.date}</span><strong>${formatBDT(d.revenue)}</strong>
        </div>`
      ).join('');
    } else {
      chart.textContent = 'No revenue data yet.';
    }
  } catch (err) {
    grid.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  }
}

async function loadOrders() {
  const tbody = document.querySelector('#ordersTable tbody');
  try {
    const orders = await api.adminGet('/orders');
    tbody.innerHTML = orders.map((o) => `
      <tr>
        <td>${o.orderNumber}</td>
        <td>${o.shippingName}<br><small>${o.guestEmail || o.user?.email || ''}</small></td>
        <td>${formatBDT(o.total)}</td>
        <td><span class="status-badge status-${o.status}">${o.status}</span></td>
        <td>${new Date(o.createdAt).toLocaleDateString()}</td>
        <td>
          <select onchange="updateOrderStatus('${o.id}', this.value)" class="filter-select">
            ${['PENDING','CONFIRMED','PROCESSING','SHIPPED','DELIVERED','CANCELLED'].map((s) =>
              `<option value="${s}" ${s === o.status ? 'selected' : ''}>${s}</option>`
            ).join('')}
          </select>
        </td>
      </tr>
    `).join('') || '<tr><td colspan="6">No orders yet.</td></tr>';
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="alert alert-error">${err.message}</td></tr>`;
  }
}

window.updateOrderStatus = async (id, status) => {
  try {
    await api.adminPatch(`/orders/${id}`, { status });
  } catch (err) {
    adminNotify(err.message);
  }
};

function splitCsv(value) {
  return String(value || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function splitLines(value) {
  return String(value || '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}

function resolveImageUrl(url) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
  if (url.startsWith('/')) return `${API_URL}${url}`;
  return url;
}

function setImageUploadStatus(elementId, message, isError = false) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.textContent = message;
  el.className = `image-upload__status${isError ? ' image-upload__status--error' : ''}`;
}

function updateThumbnailPreview(url) {
  const preview = document.getElementById('pfThumbnailPreview');
  const empty = document.getElementById('pfThumbnailEmpty');
  const img = document.getElementById('pfThumbnailImg');
  const input = document.getElementById('pfThumbnail');
  if (!preview || !empty || !img || !input) return;

  const value = String(url || '').trim();
  if (value) {
    img.src = resolveImageUrl(value);
    img.onerror = () => {
      setImageUploadStatus('pfThumbnailStatus', 'This image URL could not be loaded. Check the link or upload a new file.', true);
    };
    preview.hidden = false;
    empty.hidden = true;
    input.value = value;
  } else {
    preview.hidden = true;
    empty.hidden = false;
    img.removeAttribute('src');
    input.value = '';
  }
}

function renderGalleryPreview() {
  const list = document.getElementById('pfGalleryList');
  if (!list) return;

  if (!productGalleryUrls.length) {
    list.innerHTML = '';
    list.hidden = true;
    return;
  }

  list.hidden = false;
  list.innerHTML = productGalleryUrls.map((url, index) => `
    <div class="image-gallery__item">
      <img src="${resolveImageUrl(url)}" alt="Gallery image ${index + 1}" />
      <button type="button" class="image-gallery__remove" data-gallery-index="${index}" aria-label="Remove image">✕</button>
    </div>
  `).join('');

  list.querySelectorAll('[data-gallery-index]').forEach((btn) => {
    btn.addEventListener('click', () => {
      productGalleryUrls.splice(Number(btn.dataset.galleryIndex), 1);
      renderGalleryPreview();
    });
  });
}

function resetProductImages() {
  productGalleryUrls = [];
  const imagesField = document.getElementById('pfImages');
  if (imagesField) imagesField.value = '';
  updateThumbnailPreview('');
  renderGalleryPreview();
  setImageUploadStatus('pfThumbnailStatus', '');
  setImageUploadStatus('pfGalleryStatus', '');
}

function loadProductImagesForEdit(product) {
  const thumbnail = product.thumbnailUrl || '';
  const gallery = (product.images || []).filter((url) => url && url !== thumbnail);
  updateThumbnailPreview(thumbnail);
  productGalleryUrls = [...gallery];
  document.getElementById('pfImages').value = '';
  renderGalleryPreview();
  setImageUploadStatus('pfThumbnailStatus', '');
  setImageUploadStatus('pfGalleryStatus', '');
}

async function handleThumbnailUpload(file) {
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    setImageUploadStatus('pfThumbnailStatus', 'Please choose an image file (JPG, PNG, WebP, or GIF).', true);
    return;
  }
  setImageUploadStatus('pfThumbnailStatus', 'Uploading thumbnail…');
  try {
    const { url } = await api.adminUploadImage(file);
    updateThumbnailPreview(url);
    setImageUploadStatus('pfThumbnailStatus', 'Thumbnail uploaded. You can replace it anytime before saving.');
  } catch (err) {
    setImageUploadStatus('pfThumbnailStatus', err.message, true);
  }
}

async function handleGalleryUpload(fileList) {
  const files = Array.from(fileList || []).filter((file) => file.type.startsWith('image/'));
  if (!files.length) {
    setImageUploadStatus('pfGalleryStatus', 'Please choose one or more image files (JPG, PNG, WebP, or GIF).', true);
    return;
  }

  setImageUploadStatus('pfGalleryStatus', `Uploading ${files.length} image${files.length > 1 ? 's' : ''}…`);
  let uploaded = 0;
  let lastError = '';

  for (const file of files) {
    try {
      const { url } = await api.adminUploadImage(file);
      if (!productGalleryUrls.includes(url)) {
        productGalleryUrls.push(url);
      }
      uploaded += 1;
    } catch (err) {
      lastError = err.message;
    }
  }

  renderGalleryPreview();

  if (uploaded === files.length) {
    setImageUploadStatus('pfGalleryStatus', `${uploaded} image${uploaded > 1 ? 's' : ''} added to gallery.`);
  } else if (uploaded > 0) {
    setImageUploadStatus(
      'pfGalleryStatus',
      `${uploaded} of ${files.length} images uploaded. ${lastError || 'Some files could not be uploaded.'}`,
      true,
    );
  } else {
    setImageUploadStatus('pfGalleryStatus', lastError || 'Could not upload images. Please try again.', true);
  }
}

function initProductImageUploads() {
  const thumbnailFile = document.getElementById('pfThumbnailFile');
  const galleryFiles = document.getElementById('pfGalleryFiles');

  document.getElementById('pfThumbnailUploadBtn')?.addEventListener('click', () => thumbnailFile?.click());
  document.getElementById('pfThumbnailReplaceBtn')?.addEventListener('click', () => thumbnailFile?.click());
  thumbnailFile?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    handleThumbnailUpload(file);
  });

  document.getElementById('pfThumbnailRemove')?.addEventListener('click', () => {
    updateThumbnailPreview('');
    setImageUploadStatus('pfThumbnailStatus', 'Thumbnail removed.');
  });

  document.getElementById('pfThumbnail')?.addEventListener('input', (e) => {
    updateThumbnailPreview(e.target.value.trim());
    if (e.target.value.trim()) {
      setImageUploadStatus('pfThumbnailStatus', '');
    }
  });

  document.getElementById('pfGalleryUploadBtn')?.addEventListener('click', () => galleryFiles?.click());
  galleryFiles?.addEventListener('change', (e) => {
    const files = e.target.files;
    e.target.value = '';
    handleGalleryUpload(files);
  });
}

function openProductModal(title) {
  document.getElementById('productModalTitle').textContent = title;
  document.getElementById('productModal').hidden = false;
  document.getElementById('productFormAlert').innerHTML = '';
}

function closeProductModal() {
  document.getElementById('productModal').hidden = true;
  editingProductId = null;
  document.getElementById('productForm').reset();
  document.getElementById('pfType').disabled = false;
  document.getElementById('pfActive').checked = true;
  resetProductImages();
  toggleProductTypeFields();
}

function toggleProductTypeFields() {
  const type = document.getElementById('pfType').value;
  document.getElementById('pfCarFields').hidden = type !== 'CAR';
  document.getElementById('pfPartFields').hidden = type !== 'PART';
  document.getElementById('pfVariant').required = type === 'CAR';
}

function toggleExistingPartFields() {
  const useExisting = document.getElementById('pfUseExistingPart').checked;
  document.getElementById('pfExistingPartWrap').hidden = !useExisting;
  document.getElementById('pfNewPartWrap').hidden = useExisting;
}

function fillSelect(select, options, placeholder) {
  select.innerHTML = `<option value="">${placeholder}</option>`
    + options.map((o) => `<option value="${o.value}">${o.label}</option>`).join('');
}

function populateBrandSelect() {
  if (!productFormOptions) return;
  fillSelect(
    document.getElementById('pfBrand'),
    productFormOptions.brands.map((b) => ({ value: b.id, label: b.name })),
    'Select brand',
  );
}

function populateModelSelect(brandId) {
  const brand = productFormOptions?.brands.find((b) => b.id === brandId);
  fillSelect(
    document.getElementById('pfModel'),
    (brand?.models || []).map((m) => ({ value: m.id, label: m.name })),
    'Select model',
  );
  fillSelect(document.getElementById('pfVariant'), [], 'Select variant');
}

function populateVariantSelect(modelId) {
  const brandId = document.getElementById('pfBrand').value;
  const brand = productFormOptions?.brands.find((b) => b.id === brandId);
  const model = brand?.models.find((m) => m.id === modelId);
  fillSelect(
    document.getElementById('pfVariant'),
    (model?.variants || []).map((v) => ({
      value: v.id,
      label: `${v.trim} — ${v.color} (${v.sku})`,
    })),
    'Select variant',
  );
}

async function ensureProductFormOptions() {
  if (productFormOptions) return productFormOptions;
  productFormOptions = await api.adminGet('/products/form-options');
  populateBrandSelect();
  fillSelect(
    document.getElementById('pfPartCategory'),
    productFormOptions.partCategories.map((c) => ({ value: c.id, label: c.name })),
    'Select category',
  );
  fillSelect(
    document.getElementById('pfExistingPart'),
    productFormOptions.parts.map((p) => ({
      value: p.id,
      label: `${p.name} (${p.partNumber})`,
    })),
    'Select part',
  );
  return productFormOptions;
}

function readProductFormPayload() {
  const type = document.getElementById('pfType').value;
  const payload = {
    type,
    name: document.getElementById('pfName').value.trim(),
    slug: document.getElementById('pfSlug').value.trim() || undefined,
    sku: document.getElementById('pfSku').value.trim() || undefined,
    price: Number(document.getElementById('pfPrice').value),
    compareAtPrice: document.getElementById('pfComparePrice').value
      ? Number(document.getElementById('pfComparePrice').value)
      : null,
    stock: Number(document.getElementById('pfStock').value),
    thumbnailUrl: document.getElementById('pfThumbnail').value.trim(),
    imageUrls: [...new Set([
      ...productGalleryUrls,
      ...splitLines(document.getElementById('pfImages').value),
    ])],
    isFeatured: document.getElementById('pfFeatured').checked,
    isActive: document.getElementById('pfActive').checked,
  };

  if (type === 'CAR') {
    payload.carVariantId = document.getElementById('pfVariant').value;
    if (!payload.carVariantId && !editingProductId) {
      throw new Error('Please select a car brand, model, and variant.');
    }
  } else {
    const useExisting = document.getElementById('pfUseExistingPart').checked;
    if (!editingProductId && useExisting) {
      payload.partId = document.getElementById('pfExistingPart').value;
      if (!payload.partId) {
        throw new Error('Please select an existing part to link, or uncheck the box to add a new part.');
      }
    } else {
      const categoryId = document.getElementById('pfPartCategory').value;
      const partNumber = document.getElementById('pfPartNumber').value.trim();
      if (!editingProductId) {
        if (!categoryId) throw new Error('Please select a part category.');
        if (!partNumber) throw new Error('Please enter a part number.');
      }
      if (categoryId || partNumber || document.getElementById('pfPartDesc').value.trim()) {
        payload.part = {
          ...(categoryId ? { categoryId } : {}),
          ...(partNumber ? { partNumber } : {}),
          description: document.getElementById('pfPartDesc').value.trim() || undefined,
          compatibleBrands: splitCsv(document.getElementById('pfCompatBrands').value),
          compatibleModels: splitCsv(document.getElementById('pfCompatModels').value),
        };
      }
    }
  }

  return payload;
}

async function openAddProductModal() {
  await ensureProductFormOptions();
  editingProductId = null;
  document.getElementById('productForm').reset();
  document.getElementById('pfType').value = 'CAR';
  document.getElementById('pfActive').checked = true;
  document.getElementById('pfUseExistingPart').checked = false;
  resetProductImages();
  toggleProductTypeFields();
  toggleExistingPartFields();
  populateBrandSelect();
  openProductModal('Add Product');
}

async function openEditProductModal(id) {
  await ensureProductFormOptions();
  const product = await api.adminGet(`/products/${id}`);
  editingProductId = id;
  document.getElementById('pfType').value = product.type;
  document.getElementById('pfType').disabled = true;
  document.getElementById('pfName').value = product.name;
  document.getElementById('pfSku').value = product.sku;
  document.getElementById('pfSlug').value = product.slug;
  document.getElementById('pfPrice').value = product.price;
  document.getElementById('pfComparePrice').value = product.compareAtPrice || '';
  document.getElementById('pfStock').value = product.stock;
  loadProductImagesForEdit(product);
  document.getElementById('pfFeatured').checked = product.isFeatured;
  document.getElementById('pfActive').checked = product.isActive;

  toggleProductTypeFields();

  if (product.type === 'CAR' && product.carModel) {
    const brand = productFormOptions.brands.find((b) =>
      b.models.some((m) => m.id === product.carModel.id));
    if (brand) {
      document.getElementById('pfBrand').value = brand.id;
      populateModelSelect(brand.id);
      document.getElementById('pfModel').value = product.carModel.id;
      populateVariantSelect(product.carModel.id);
      if (product.carVariantId) {
        document.getElementById('pfVariant').value = product.carVariantId;
      }
    }
  }

  if (product.type === 'PART') {
    document.getElementById('pfUseExistingPart').checked = true;
    toggleExistingPartFields();
    if (product.partId) {
      document.getElementById('pfExistingPart').value = product.partId;
    }
    if (product.part) {
      document.getElementById('pfPartCategory').value = product.part.category?.id || '';
      document.getElementById('pfPartNumber').value = product.part.partNumber || '';
      document.getElementById('pfPartDesc').value = product.part.description || '';
      document.getElementById('pfCompatBrands').value = (product.part.compatibleBrands || []).join(', ');
      document.getElementById('pfCompatModels').value = (product.part.compatibleModels || []).join(', ');
    }
  }

  openProductModal('Edit Product');
}

window.editProduct = openEditProductModal;

window.removeProduct = async (id, name) => {
  if (!confirm(`Remove "${name}" from the store?\n\nThe product will be deactivated. If it has no order history, you can permanently delete it from the database later.`)) {
    return;
  }
  try {
    const result = await api.adminDelete(`/products/${id}`);
    adminNotify(result.message || 'Product removed.', 'success');
    loadProducts();
  } catch (err) {
    adminNotify(err.message);
  }
};

async function loadProducts() {
  const tbody = document.querySelector('#productsTable tbody');
  const countEl = document.getElementById('productsCount');
  const pagination = document.getElementById('productsPagination');
  const type = document.getElementById('productTypeFilter')?.value || '';
  const search = document.getElementById('productSearch')?.value.trim() || '';

  const params = new URLSearchParams({ page: String(productPage), pageSize: '20' });
  if (type) params.set('type', type);
  if (search) params.set('search', search);

  try {
    const data = await api.adminGet(`/products?${params}`);
    countEl.textContent = `${data.total} products`;

    tbody.innerHTML = data.items.map((p) => `
      <tr>
        <td><span class="type-badge type-${p.type}">${p.type}</span></td>
        <td>
          <strong>${p.name}</strong>
          ${p.carModel?.brand ? `<br><small>${p.carModel.brand.name}</small>` : ''}
          ${p.part?.category ? `<br><small>${p.part.category.name}</small>` : ''}
        </td>
        <td>${p.sku}</td>
        <td>${formatBDT(p.price)}</td>
        <td>
          <input type="number" value="${p.stock}" min="0" style="width:70px" class="form-input"
            onchange="updateProduct('${p.id}', { stock: Number(this.value) })" />
        </td>
        <td class="${p.isActive ? 'status-active' : 'status-inactive'}">${p.isActive ? 'Active' : 'Inactive'}</td>
        <td>${p.isFeatured ? '⭐' : '—'}</td>
        <td>
          <div class="admin-actions">
            <button class="btn btn-ghost" style="font-size:.75rem" onclick="editProduct('${p.id}')">Edit</button>
            <button class="btn btn-ghost" style="font-size:.75rem" onclick="updateProduct('${p.id}', { isFeatured: ${!p.isFeatured} })">
              ${p.isFeatured ? 'Unfeature' : 'Feature'}
            </button>
            <button class="btn btn-ghost" style="font-size:.75rem" onclick="updateProduct('${p.id}', { isActive: ${!p.isActive} })">
              ${p.isActive ? 'Deactivate' : 'Activate'}
            </button>
            ${hasPermission('admin.full') ? `<button class="btn btn-ghost" style="font-size:.75rem;color:#f87171" data-remove-id="${p.id}" data-remove-name="${p.name.replace(/"/g, '&quot;')}">Remove</button>` : ''}
          </div>
        </td>
      </tr>
    `).join('') || '<tr><td colspan="8">No products found.</td></tr>';

    tbody.querySelectorAll('[data-remove-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        removeProduct(btn.dataset.removeId, btn.dataset.removeName);
      });
    });

    pagination.innerHTML = '';
    if (data.totalPages > 1) {
      if (productPage > 1) {
        pagination.innerHTML += `<button class="btn btn-ghost" type="button" id="productsPrev">Previous</button>`;
      }
      pagination.innerHTML += `<span style="color:var(--text-muted);font-size:.85rem">Page ${data.page} of ${data.totalPages}</span>`;
      if (productPage < data.totalPages) {
        pagination.innerHTML += `<button class="btn btn-ghost" type="button" id="productsNext">Next</button>`;
      }
      document.getElementById('productsPrev')?.addEventListener('click', () => {
        productPage -= 1;
        loadProducts();
      });
      document.getElementById('productsNext')?.addEventListener('click', () => {
        productPage += 1;
        loadProducts();
      });
    }
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8" class="alert alert-error">${err.message}</td></tr>`;
    countEl.textContent = '';
    pagination.innerHTML = '';
  }
}

window.updateProduct = async (id, data) => {
  try {
    await api.adminPatch(`/products/${id}`, data);
    loadProducts();
  } catch (err) {
    adminNotify(err.message);
  }
};

async function loadAppointments() {
  const tbody = document.querySelector('#appointmentsTable tbody');
  try {
    const appointments = await api.adminAppointments();
    tbody.innerHTML = appointments.map((a) => `
      <tr>
        <td>${a.contactName}<br><small>${a.contactPhone}</small></td>
        <td>${a.carBrand} ${a.carModel}</td>
        <td>${a.serviceType.replace(/_/g, ' ')}</td>
        <td>${new Date(a.preferredDate).toLocaleDateString()} ${a.preferredTime}</td>
        <td>${a.serviceCenter?.name || ''}</td>
        <td><span class="status-badge status-${a.status}">${a.status}</span></td>
        <td>
          <select onchange="updateAppointment('${a.id}', this.value)" class="filter-select">
            ${['PENDING','CONFIRMED','IN_PROGRESS','COMPLETED','CANCELLED'].map((s) =>
              `<option value="${s}" ${s === a.status ? 'selected' : ''}>${s}</option>`
            ).join('')}
          </select>
        </td>
      </tr>
    `).join('') || '<tr><td colspan="7">No appointments.</td></tr>';
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7">${err.message}</td></tr>`;
  }
}

window.updateAppointment = async (id, status) => {
  try {
    await api.adminAppointmentUpdate(id, status);
  } catch (err) {
    adminNotify(err.message);
  }
};

function connectAdminSocket() {
  if (adminSocket) return;
  adminSocket = io(API_URL, { auth: { token: localStorage.getItem('accessToken') } });
  adminSocket.on('chat:message', (msg) => {
    if (msg.sessionId === activeChatSession) appendAdminMessage(msg);
  });
  adminSocket.on('chat:new-message', () => loadChatInbox());
}

function appendAdminMessage(msg) {
  const el = document.getElementById('adminChatMessages');
  const isAgent = msg.senderType === 'AGENT';
  const div = document.createElement('div');
  div.className = `chat-msg ${isAgent ? 'chat-msg-user' : 'chat-msg-agent'}`;
  div.innerHTML = `<span class="chat-msg-name">${escapeHtml(msg.senderName)}</span><p>${escapeHtml(msg.content)}</p>`;
  el.appendChild(div);
  el.scrollTop = el.scrollHeight;
}

async function loadChatInbox() {
  connectAdminSocket();
  const list = document.getElementById('chatSessionList');
  try {
    const sessions = await api.adminChatSessions();
    list.innerHTML = sessions.map((s) => `
      <div class="chat-session-item ${s.id === activeChatSession ? 'active' : ''}" data-id="${s.id}" data-name="${s.guestName || 'Guest'}">
        <strong>${s.guestName || 'Guest'}</strong>
        <p style="font-size:.75rem;color:var(--text-muted);margin-top:.25rem">${s.lastMessage?.content?.slice(0, 50) || 'No messages'}…</p>
      </div>
    `).join('') || '<p style="padding:1rem;color:var(--text-muted)">No active chats.</p>';

    list.querySelectorAll('.chat-session-item').forEach((item) => {
      item.addEventListener('click', () => openChatSession(item.dataset.id, item.dataset.name));
    });
  } catch (err) {
    list.innerHTML = `<p class="alert alert-error">${err.message}</p>`;
  }
}

async function openChatSession(id, name) {
  activeChatSession = id;
  document.getElementById('chatSessionTitle').textContent = name;
  document.getElementById('closeChatBtn').style.display = 'inline-flex';
  document.getElementById('adminChatInput').style.display = 'flex';
  document.getElementById('adminChatMessages').innerHTML = '';

  adminSocket?.emit('chat:join', id);

  const messages = await api.getChatMessages(id);
  messages.forEach(appendAdminMessage);

  document.querySelectorAll('.chat-session-item').forEach((el) => {
    el.classList.toggle('active', el.dataset.id === id);
  });
}

async function loadTickets() {
  const tbody = document.querySelector('#ticketsTable tbody');
  try {
    const tickets = await api.adminTickets();
    tbody.innerHTML = tickets.map((t) => `
      <tr>
        <td>${t.subject}</td>
        <td>${t.name}<br><small>${t.email}</small></td>
        <td>${t.priority}</td>
        <td><span class="status-badge status-${t.status}">${t.status}</span></td>
        <td>${new Date(t.createdAt).toLocaleDateString()}</td>
        <td>
          <select onchange="updateTicket('${t.id}', this.value)" class="filter-select">
            ${['OPEN','IN_PROGRESS','RESOLVED','CLOSED'].map((s) =>
              `<option value="${s}" ${s === t.status ? 'selected' : ''}>${s}</option>`
            ).join('')}
          </select>
        </td>
      </tr>
    `).join('') || '<tr><td colspan="6">No tickets.</td></tr>';
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6">${err.message}</td></tr>`;
  }
}

window.updateTicket = async (id, status) => {
  try {
    await api.adminTicketUpdate(id, { status });
  } catch (err) {
    adminNotify(err.message);
  }
};

async function loadCustomers() {
  const tbody = document.querySelector('#customersTable tbody');
  const search = document.getElementById('customerSearch')?.value.trim() || '';
  const params = search ? `?search=${encodeURIComponent(search)}` : '';

  try {
    const customers = await api.adminGet(`/customers${params}`);
    tbody.innerHTML = customers.map((c) => `
      <tr>
        <td>${escapeHtml(c.fullName)}</td>
        <td>${escapeHtml(c.email)}</td>
        <td>${escapeHtml(c.phone || '—')}</td>
        <td>${c._count.orders}</td>
        <td class="${c.isActive ? 'status-active' : 'status-inactive'}">${c.isActive ? 'Active' : 'Inactive'}</td>
        <td>${new Date(c.createdAt).toLocaleDateString()}</td>
        <td>
          <button class="btn btn-ghost btn-sm" type="button"
            onclick="toggleCustomerStatus('${c.id}', ${!c.isActive}, '${c.fullName.replace(/'/g, "\\'")}')">
            ${c.isActive ? 'Deactivate' : 'Activate'}
          </button>
        </td>
      </tr>
    `).join('') || '<tr><td colspan="7">No customers found.</td></tr>';
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" class="alert alert-error">${escapeHtml(err.message)}</td></tr>`;
  }
}

window.toggleCustomerStatus = async (id, isActive, name) => {
  const action = isActive ? 'activate' : 'deactivate';
  if (!confirm(`${isActive ? 'Activate' : 'Deactivate'} customer "${name}"?`)) return;
  try {
    const result = await api.adminPatch(`/customers/${id}`, { isActive });
    adminNotify(result.message || `Customer ${action}d.`, 'success');
    loadCustomers();
  } catch (err) {
    adminNotify(err.message);
  }
};

function openTeamModal() {
  document.getElementById('teamModal').hidden = false;
  document.getElementById('teamFormAlert').innerHTML = '';
}

function closeTeamModal() {
  document.getElementById('teamModal').hidden = true;
  document.getElementById('teamForm').reset();
  document.getElementById('tfRole').value = 'moderator';
}

async function loadTeam() {
  const tbody = document.querySelector('#teamTable tbody');
  try {
    const members = await api.adminGet('/team');
    tbody.innerHTML = members.map((m) => {
      const isSuperAdmin = m.role === 'super_admin';
      const isSelf = m.userId === adminUserId;
      return `
        <tr>
          <td><strong>${escapeHtml(m.fullName)}</strong>${m.mustChangePassword ? '<br><small>Must change password</small>' : ''}</td>
          <td>${escapeHtml(m.email)}</td>
          <td><span class="type-badge type-${m.role === 'moderator' ? 'PART' : 'CAR'}">${formatRoleLabel(m.role)}</span></td>
          <td class="${m.isActive ? 'status-active' : 'status-inactive'}">${m.isActive ? 'Active' : 'Inactive'}</td>
          <td>${m.lastLoginAt ? new Date(m.lastLoginAt).toLocaleString() : 'Never'}</td>
          <td>
            ${isSuperAdmin ? '<span style="color:var(--text-muted);font-size:.8rem">Protected</span>' : `
              <div class="admin-actions">
                <select class="filter-select" style="font-size:.75rem" onchange="updateTeamRole('${m.id}', this.value, '${m.fullName.replace(/'/g, "\\'")}')">
                  <option value="moderator" ${m.role === 'moderator' ? 'selected' : ''}>Moderator</option>
                  <option value="staff" ${m.role === 'staff' ? 'selected' : ''}>Staff</option>
                </select>
                <button class="btn btn-ghost btn-sm" type="button"
                  onclick="toggleTeamStatus('${m.id}', ${!m.isActive}, '${m.fullName.replace(/'/g, "\\'")}')"
                  ${isSelf ? 'disabled title="You cannot deactivate your own account"' : ''}>
                  ${m.isActive ? 'Deactivate' : 'Activate'}
                </button>
                <button class="btn btn-ghost btn-sm" style="color:#f87171" type="button"
                  onclick="removeTeamMember('${m.id}', '${m.fullName.replace(/'/g, "\\'")}')"
                  ${isSelf ? 'disabled title="You cannot remove your own access"' : ''}>Remove</button>
              </div>
            `}
          </td>
        </tr>
      `;
    }).join('') || '<tr><td colspan="6">No team members yet.</td></tr>';
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="alert alert-error">${escapeHtml(err.message)}</td></tr>`;
  }
}

window.updateTeamRole = async (id, role, name) => {
  try {
    await api.adminPatch(`/team/${id}`, { role });
    adminNotify(`${name} is now a ${formatRoleLabel(role)}.`, 'success');
    loadTeam();
  } catch (err) {
    adminNotify(err.message);
    loadTeam();
  }
};

window.toggleTeamStatus = async (id, isActive, name) => {
  const action = isActive ? 'activate' : 'deactivate';
  if (!confirm(`${isActive ? 'Activate' : 'Deactivate'} "${name}"?`)) return;
  try {
    await api.adminPatch(`/team/${id}`, { isActive });
    adminNotify(`Team member ${action}d.`, 'success');
    loadTeam();
  } catch (err) {
    adminNotify(err.message);
  }
};

window.removeTeamMember = async (id, name) => {
  if (!confirm(`Remove admin access for "${name}"?\n\nThey will no longer be able to sign in to the admin panel.`)) return;
  try {
    const result = await api.adminDelete(`/team/${id}`);
    adminNotify(result.message || 'Admin access removed.', 'success');
    loadTeam();
  } catch (err) {
    adminNotify(err.message);
  }
};

document.addEventListener('DOMContentLoaded', async () => {
  const ok = await requireAdmin();
  if (!ok) return;

  document.querySelectorAll('.admin-nav a[data-panel]').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      switchPanel(a.dataset.panel);
    });
  });

  document.getElementById('adminLogout').addEventListener('click', logout);

  document.getElementById('addProductBtn')?.addEventListener('click', openAddProductModal);
  document.getElementById('addTeamMemberBtn')?.addEventListener('click', openTeamModal);
  document.getElementById('customerSearchBtn')?.addEventListener('click', loadCustomers);
  document.getElementById('customerSearch')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') loadCustomers();
  });
  document.querySelectorAll('[data-close-team-modal]').forEach((el) => {
    el.addEventListener('click', closeTeamModal);
  });
  document.getElementById('teamForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const alertEl = document.getElementById('teamFormAlert');
    const submitBtn = document.getElementById('teamFormSubmit');
    alertEl.innerHTML = '';
    submitBtn.disabled = true;
    try {
      const payload = {
        fullName: document.getElementById('tfName').value.trim(),
        email: document.getElementById('tfEmail').value.trim(),
        phone: document.getElementById('tfPhone').value.trim() || undefined,
        role: document.getElementById('tfRole').value,
      };
      const password = document.getElementById('tfPassword').value;
      if (password) payload.password = password;

      const result = await api.adminPost('/team', payload);
      closeTeamModal();
      loadTeam();

      let message = result.message || 'Team member created.';
      if (result.temporaryPassword) {
        message += ` Temporary password: ${result.temporaryPassword} (share securely — must change on first login).`;
      }
      adminNotify(message, 'success');
    } catch (err) {
      alertEl.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
    } finally {
      submitBtn.disabled = false;
    }
  });
  document.getElementById('productSearchBtn')?.addEventListener('click', () => {
    productPage = 1;
    loadProducts();
  });
  document.getElementById('productTypeFilter')?.addEventListener('change', () => {
    productPage = 1;
    loadProducts();
  });
  document.getElementById('productSearch')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      productPage = 1;
      loadProducts();
    }
  });
  document.getElementById('pfType')?.addEventListener('change', () => {
    document.getElementById('pfType').disabled = false;
    toggleProductTypeFields();
  });
  document.getElementById('pfUseExistingPart')?.addEventListener('change', toggleExistingPartFields);
  document.getElementById('pfBrand')?.addEventListener('change', (e) => populateModelSelect(e.target.value));
  document.getElementById('pfModel')?.addEventListener('change', (e) => populateVariantSelect(e.target.value));
  document.querySelectorAll('[data-close-modal]').forEach((el) => {
    el.addEventListener('click', closeProductModal);
  });
  initProductImageUploads();
  document.getElementById('productForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const alertEl = document.getElementById('productFormAlert');
    const submitBtn = document.getElementById('productFormSubmit');
    alertEl.innerHTML = '';
    submitBtn.disabled = true;
    try {
      const payload = readProductFormPayload();
      if (editingProductId) {
        await api.adminPatch(`/products/${editingProductId}`, payload);
      } else {
        await api.adminPost('/products', payload);
      }
      closeProductModal();
      loadProducts();
    } catch (err) {
      alertEl.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
    } finally {
      submitBtn.disabled = false;
    }
  });

  document.getElementById('adminChatSend')?.addEventListener('click', () => {
    const input = document.getElementById('adminChatText');
    const content = input.value.trim();
    if (!content || !activeChatSession || !adminSocket) return;
    adminSocket.emit('chat:message', { sessionId: activeChatSession, content });
    input.value = '';
  });

  document.getElementById('closeChatBtn')?.addEventListener('click', async () => {
    if (!activeChatSession) return;
    await api.adminChatClose(activeChatSession);
    activeChatSession = null;
    loadChatInbox();
    document.getElementById('adminChatMessages').innerHTML = '';
    document.getElementById('adminChatInput').style.display = 'none';
    document.getElementById('closeChatBtn').style.display = 'none';
    document.getElementById('chatSessionTitle').textContent = 'Select a conversation';
  });
});
