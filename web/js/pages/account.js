function renderLoginForm() {
  return `
    <div class="form-card">
      <h1 style="font-size:1.5rem;margin-bottom:.5rem">Sign In</h1>
      <p style="color:var(--text-muted);margin-bottom:1.5rem;font-size:.9rem">Access your orders, wishlist, and account settings.</p>
      <div id="authAlert"></div>
      <form id="loginForm">
        <div class="form-group">
          <label for="email">Email</label>
          <input type="email" id="email" class="form-input" required placeholder="you@example.com" />
        </div>
        <div class="form-group">
          <label for="password">Password</label>
          <input type="password" id="password" class="form-input" required placeholder="Your password" />
        </div>
        <button type="submit" class="btn btn-primary" style="width:100%">Sign In</button>
      </form>
      <p style="margin-top:1.5rem;text-align:center;font-size:.9rem;color:var(--text-muted)">
        No account? <a href="#" id="showRegister" style="color:var(--primary)">Create one</a>
      </p>
    </div>
  `;
}

function renderRegisterForm() {
  return `
    <div class="form-card">
      <h1 style="font-size:1.5rem;margin-bottom:.5rem">Create Account</h1>
      <p style="color:var(--text-muted);margin-bottom:1.5rem;font-size:.9rem">Join AutoHub BD to track orders and book services.</p>
      <div id="authAlert"></div>
      <form id="registerForm">
        <div class="form-group">
          <label for="fullName">Full Name</label>
          <input type="text" id="fullName" class="form-input" required placeholder="Your full name" />
        </div>
        <div class="form-group">
          <label for="email">Email</label>
          <input type="email" id="email" class="form-input" required placeholder="you@example.com" />
        </div>
        <div class="form-group">
          <label for="phone">Phone (optional)</label>
          <input type="tel" id="phone" class="form-input" placeholder="01712345678" />
        </div>
        <div class="form-group">
          <label for="password">Password</label>
          <input type="password" id="password" class="form-input" required placeholder="Min 8 chars, upper, lower, number" />
        </div>
        <button type="submit" class="btn btn-primary" style="width:100%">Create Account</button>
      </form>
      <p style="margin-top:1.5rem;text-align:center;font-size:.9rem;color:var(--text-muted)">
        Already have an account? <a href="#" id="showLogin" style="color:var(--primary)">Sign in</a>
      </p>
    </div>
  `;
}

function renderProfile(user) {
  return `
    <div class="page-header">
      <h1>Hello, ${user.fullName}</h1>
      <p>${user.email}${user.phone ? ' · ' + user.phone : ''}</p>
    </div>
    ${user.mustChangePassword ? '<div class="alert alert-info">Please change your password — this is required on first login.</div>' : ''}
    <div class="cta-grid" style="max-width:600px">
      <div class="cta-banner">
        <h3>Orders</h3>
        <p>View your order history — coming soon.</p>
      </div>
      <div class="cta-banner">
        <h3>Wishlist</h3>
        <p>Saved vehicles and parts — coming soon.</p>
      </div>
    </div>
    <button class="btn btn-ghost" id="logoutBtn" style="margin-top:2rem">Sign Out</button>
  `;
}

document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('accountContent');
  const redirect = getQueryParam('redirect');

  if (isLoggedIn()) {
    try {
      const user = await api.getMe();
      if (redirect && user.role) {
        window.location.href = redirect;
        return;
      }
      container.innerHTML = renderProfile(user);
      document.getElementById('logoutBtn')?.addEventListener('click', logout);
      if (user.role) {
        container.innerHTML += `<a href="admin.html" class="btn btn-primary" style="margin-top:1rem;display:inline-flex">Open Admin Panel</a>`;
      }
    } catch {
      clearAuth();
      container.innerHTML = renderLoginForm();
      bindLogin();
    }
    return;
  }

  container.innerHTML = renderLoginForm();
  bindLogin();
});

function bindLogin() {
  document.getElementById('showRegister')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('accountContent').innerHTML = renderRegisterForm();
    bindRegister();
  });

  document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const alertEl = document.getElementById('authAlert');
    clearAlert(alertEl);
    try {
      const data = await api.login(
        document.getElementById('email').value.trim(),
        document.getElementById('password').value,
      );
      saveAuth(data);
      location.reload();
    } catch (err) {
      showAlert(alertEl, err.message);
    }
  });
}

function bindRegister() {
  document.getElementById('showLogin')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('accountContent').innerHTML = renderLoginForm();
    bindLogin();
  });

  document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const alertEl = document.getElementById('authAlert');
    clearAlert(alertEl);
    try {
      const data = await api.register({
        fullName: document.getElementById('fullName').value.trim(),
        email: document.getElementById('email').value.trim(),
        phone: document.getElementById('phone').value.trim() || undefined,
        password: document.getElementById('password').value,
      });
      saveAuth(data);
      location.reload();
    } catch (err) {
      showAlert(alertEl, err.message);
    }
  });
}
