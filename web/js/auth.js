function saveAuth(data) {
  localStorage.setItem('accessToken', data.accessToken);
  localStorage.setItem('refreshToken', data.refreshToken);
  localStorage.setItem('user', JSON.stringify(data.user));
}

function clearAuth() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
}

function getUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    return null;
  }
}

function isLoggedIn() {
  return !!localStorage.getItem('accessToken');
}

function logout() {
  clearAuth();
  window.location.href = 'index.html';
}

document.addEventListener('DOMContentLoaded', () => {
  const user = getUser();
  const accountLink = document.getElementById('accountLink');
  if (accountLink && user) {
    accountLink.title = user.fullName;
  }
});
