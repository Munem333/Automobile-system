document.addEventListener('DOMContentLoaded', async () => {
  const user = typeof getUser === 'function' ? getUser() : null;
  if (user) {
    document.getElementById('ticketName').value = user.fullName || '';
    document.getElementById('ticketEmail').value = user.email || '';
    if (user.phone) document.getElementById('ticketPhone').value = user.phone;
  }

  // Load FAQ
  try {
    const categories = await api.getFaq();
    const faqList = document.getElementById('faqList');
    faqList.innerHTML = categories.map((cat) => `
      <div style="margin-bottom:2rem">
        <h3 style="margin-bottom:1rem;color:var(--primary)">${cat.name}</h3>
        ${cat.items.map((item) => `
          <details class="card" style="margin-bottom:.75rem;padding:1rem">
            <summary style="cursor:pointer;font-weight:600">${item.question}</summary>
            <p style="margin-top:.75rem;color:var(--text-muted);font-size:.9rem">${item.answer}</p>
          </details>
        `).join('')}
      </div>
    `).join('');
  } catch {
    document.getElementById('faqList').innerHTML = '<p class="text-muted">FAQ unavailable.</p>';
  }

  // Support ticket
  document.getElementById('supportTicketForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const alertEl = document.getElementById('ticketAlert');
    clearAlert(alertEl);
    try {
      const result = await api.createTicket({
        name: document.getElementById('ticketName').value.trim(),
        email: document.getElementById('ticketEmail').value.trim(),
        phone: document.getElementById('ticketPhone').value.trim() || undefined,
        subject: document.getElementById('ticketSubject').value.trim(),
        message: document.getElementById('ticketMessage').value.trim(),
      });
      showAlert(alertEl, result.message, 'success');
      e.target.reset();
    } catch (err) {
      showAlert(alertEl, err.message);
    }
  });

  // Order track
  document.getElementById('trackForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const alertEl = document.getElementById('trackAlert');
    const resultEl = document.getElementById('trackResult');
    clearAlert(alertEl);
    resultEl.innerHTML = '';
    try {
      const order = await api.orderLookup(
        document.getElementById('orderNumber').value.trim(),
        document.getElementById('contact').value.trim(),
      );
      resultEl.innerHTML = `
        <div class="alert alert-success">
          <strong>Order ${order.orderNumber}</strong><br />
          Status: ${order.status}<br />
          Total: ${formatBDT(order.total)}<br />
          Placed: ${new Date(order.createdAt).toLocaleDateString()}
        </div>
      `;
    } catch (err) {
      showAlert(alertEl, err.message);
    }
  });
});
