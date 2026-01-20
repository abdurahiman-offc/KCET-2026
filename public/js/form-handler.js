document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('formModal');
    const form = document.getElementById('admissionForm');
    const msg = document.getElementById('formMessage');

    // --- 1. SESSION STORAGE CHECK ---
    if (localStorage.getItem('kcet_form_submitted') === 'true') {
        // Already submitted
    }

    // --- 2. PHONE VALIDATION ---
    const phoneInput = document.getElementById('phone');
    phoneInput?.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/[^0-9]/g, '');
    });

    // --- 3. SUBMISSION HANDLER ---
    form?.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('name').value.trim();
        const phone = document.getElementById('phone').value.trim();

        if (!name || !phone) {
            showMessage('Please fill in all fields.', 'red');
            return;
        }

        if (!/^[0-9]{10}$/.test(phone)) {
            showMessage('Please enter a valid 10-digit phone number.', 'red');
            return;
        }

        showMessage('Submitting...', 'blue');

        // --- 4. INTERNAL API SUBMISSION ---
        fetch('/api/submit', {
            method: 'POST',
            body: JSON.stringify({ name: name, phone: phone }),
            headers: {
                "Content-Type": "application/json", // Changed to application/json
            },
        })
            .then(response => response.json())
            .then(data => {
                if (data.result === 'success') {
                    showMessage('Message sent successfully!', 'green');
                    localStorage.setItem('kcet_form_submitted', 'true');

                    setTimeout(() => {
                        modal.classList.add('hidden');
                        modal.classList.remove('flex');
                        if (window.pendingUrl) {
                            window.location.href = window.pendingUrl;
                        }
                    }, 1500);
                } else {
                    console.error('Submission Error:', data);
                    showMessage('Error submitting form. Please try again.', 'red');
                }
            })
            .catch(error => {
                console.error('Fetch Error:', error);
                showMessage('Network error. Please try again.', 'red');
            });
    });

    function showMessage(text, color) {
        if (msg) {
            msg.textContent = text;
            msg.className = `text-center mt-2 text-sm font-semibold text-${color}-600`;
        }
    }
});
