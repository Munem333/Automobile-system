document.addEventListener('DOMContentLoaded', async () => {
  const centerSelect = document.getElementById('serviceCenter');
  const dateInput = document.getElementById('preferredDate');
  const timeSelect = document.getElementById('preferredTime');
  const user = typeof getUser === 'function' ? getUser() : null;

  if (user) {
    document.getElementById('contactName').value = user.fullName || '';
    if (user.phone) document.getElementById('contactPhone').value = user.phone;
    if (user.email) document.getElementById('contactEmail').value = user.email;
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  dateInput.min = tomorrow.toISOString().slice(0, 10);

  try {
    const centers = await api.getServiceCenters();
    centers.forEach((c) => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = `${c.name} — ${c.city}`;
      centerSelect.appendChild(opt);
    });
  } catch (err) {
    showAlert(document.getElementById('bookAlert'), err.message);
  }

  async function loadSlots() {
    const centerId = centerSelect.value;
    const date = dateInput.value;
    timeSelect.innerHTML = '<option value="">Loading…</option>';
    timeSelect.disabled = true;

    if (!centerId || !date) {
      timeSelect.innerHTML = '<option value="">Pick date first…</option>';
      return;
    }

    try {
      const slots = await api.getAppointmentSlots(centerId, date);
      timeSelect.innerHTML = '<option value="">Select time…</option>';
      slots.filter((s) => s.available).forEach((s) => {
        const opt = document.createElement('option');
        opt.value = s.time;
        opt.textContent = s.time;
        timeSelect.appendChild(opt);
      });
      if (!slots.some((s) => s.available)) {
        timeSelect.innerHTML = '<option value="">No slots available</option>';
      } else {
        timeSelect.disabled = false;
      }
    } catch (err) {
      timeSelect.innerHTML = '<option value="">Error loading slots</option>';
    }
  }

  centerSelect.addEventListener('change', loadSlots);
  dateInput.addEventListener('change', loadSlots);

  document.getElementById('bookForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const alertEl = document.getElementById('bookAlert');
    clearAlert(alertEl);

    try {
      const result = await api.bookAppointment({
        serviceCenterId: centerSelect.value,
        serviceType: document.getElementById('serviceType').value,
        carBrand: document.getElementById('carBrand').value.trim(),
        carModel: document.getElementById('carModel').value.trim(),
        carYear: document.getElementById('carYear').value ? Number(document.getElementById('carYear').value) : undefined,
        issueDescription: document.getElementById('issueDescription').value.trim() || undefined,
        preferredDate: dateInput.value,
        preferredTime: timeSelect.value,
        contactName: document.getElementById('contactName').value.trim(),
        contactPhone: document.getElementById('contactPhone').value.trim(),
        contactEmail: document.getElementById('contactEmail').value.trim() || undefined,
      });
      showAlert(alertEl, result.message || 'Appointment booked successfully!', 'success');
      e.target.reset();
      timeSelect.disabled = true;
      timeSelect.innerHTML = '<option value="">Pick date first…</option>';
    } catch (err) {
      showAlert(alertEl, err.message);
    }
  });
});
