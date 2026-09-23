/* ==========================================================================
   HOUSE OF AGHA · CUSTOMER ACCOUNTS (templates/customers/*)
   Progressive enhancement only. Every form still posts to Shopify and works
   without this file; it adds the password toggle, a pending state on submit,
   a quick empty-field check, the recover panel switch, the address confirm step
   and Shopify's country/province lists.
   ========================================================================== */
(() => {
  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Show / hide password
  document.querySelectorAll('[data-hoa-reveal-password]').forEach((btn) => {
    const input = document.getElementById(btn.getAttribute('aria-controls'));
    if (!input) return;
    btn.hidden = false;
    btn.addEventListener('click', () => {
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.setAttribute('aria-pressed', String(show));
      const end = input.value.length;
      input.focus({ preventScroll: true });
      try { input.setSelectionRange(end, end); } catch (e) { /* not supported on this type */ }
    });
  });

  // Field state helpers
  const fieldOf = (input) => input.closest('.hoa-field');
  const setInvalid = (input, message) => {
    const field = fieldOf(input);
    if (!field) return;
    field.classList.add('is-invalid');
    input.setAttribute('aria-invalid', 'true');
    let msg = field.querySelector('[data-hoa-client-msg]');
    if (!msg) {
      msg = document.createElement('p');
      msg.className = 'hoa-field__msg hoa-field__msg--error';
      msg.id = input.id + '-client-msg';
      msg.setAttribute('data-hoa-client-msg', '');
      field.appendChild(msg);
      input.setAttribute('aria-describedby', [input.getAttribute('aria-describedby'), msg.id].filter(Boolean).join(' '));
    }
    msg.textContent = message;
  };
  const clearInvalid = (input) => {
    const field = fieldOf(input);
    if (!field) return;
    const msg = field.querySelector('[data-hoa-client-msg]');
    if (msg) msg.remove();
    if (!field.querySelector('.hoa-field__msg--error')) {
      field.classList.remove('is-invalid');
      input.removeAttribute('aria-invalid');
    }
  };

  // Submit: quick check for empty required fields, then a pending state while Shopify responds
  document.querySelectorAll('.hoa-form').forEach((form) => {
    form.querySelectorAll('.hoa-field__input').forEach((input) => {
      input.addEventListener('input', () => clearInvalid(input));
    });
    form.addEventListener('submit', (e) => {
      if (e.submitter && e.submitter.hasAttribute('formnovalidate')) return;
      let first = null;
      form.querySelectorAll('.hoa-field__input[required]').forEach((input) => {
        const value = input.value.trim();
        let message = '';
        if (!value) message = 'Please fill in this field.';
        else if (input.type === 'email' && !EMAIL.test(value)) message = 'Please enter a valid email address.';
        if (message) {
          setInvalid(input, message);
          if (!first) first = input;
        }
      });
      if (first) {
        e.preventDefault();
        first.focus();
        return;
      }
      const btn = form.querySelector('[data-hoa-submit]');
      if (!btn) return;
      const label = btn.querySelector('[data-label]');
      if (label && btn.dataset.loadingLabel) {
        btn.dataset.idleLabel = label.textContent;
        label.textContent = btn.dataset.loadingLabel + '…';
      }
      btn.classList.add('is-loading');
      btn.setAttribute('aria-busy', 'true');
      // Disable on the next tick so the button's own name/value still posts
      setTimeout(() => { btn.disabled = true; }, 0);
    });
  });

  // Back/forward cache: never come back to a stuck "Signing in…" button
  window.addEventListener('pageshow', (e) => {
    if (!e.persisted) return;
    document.querySelectorAll('[data-hoa-submit].is-loading').forEach((btn) => {
      const label = btn.querySelector('[data-label]');
      if (label && btn.dataset.idleLabel) label.textContent = btn.dataset.idleLabel;
      btn.classList.remove('is-loading');
      btn.removeAttribute('aria-busy');
      btn.disabled = false;
    });
  });

  // Move focus to a Shopify error / success message so screen readers announce it
  const message = document.querySelector('[data-hoa-focus]');
  if (message) {
    const details = message.closest('details');
    if (details) details.open = true;
    message.focus({ preventScroll: true });
  } else {
    // Otherwise, show the first error-carrying <details> (address forms)
    const errDetails = document.querySelector('details .hoa-form-msg--error');
    if (errDetails) errDetails.closest('details').open = true;
  }

  // Sign in <-> forgot password (CSS :target does the switch; this keeps focus sensible)
  const recover = document.getElementById('recover');
  if (recover) {
    const focusIn = (panel) => {
      const input = panel && panel.querySelector('.hoa-field__input');
      if (input) input.focus({ preventScroll: true });
    };
    document.querySelectorAll('[data-hoa-to-login]').forEach((a) => {
      a.addEventListener('click', () => {
        recover.classList.remove('is-active');
        setTimeout(() => focusIn(document.getElementById('login')), 0);
      });
    });
    document.querySelectorAll('a[href="#recover"]').forEach((a) => {
      a.addEventListener('click', () => setTimeout(() => focusIn(recover), 0));
    });
  }

  // Address panels: Cancel closes the surrounding <details>
  document.querySelectorAll('[data-hoa-close-details]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const details = btn.closest('details');
      if (!details) return;
      details.open = false;
      const summary = details.querySelector('summary');
      if (summary) summary.focus();
    });
  });

  // Remove address: first click arms, second click posts (no browser dialog)
  document.querySelectorAll('[data-hoa-remove]').forEach((form) => {
    const btn = form.querySelector('button');
    if (!btn) return;
    const idle = btn.textContent;
    let timer;
    form.addEventListener('submit', (e) => {
      if (btn.classList.contains('is-confirming')) return;
      e.preventDefault();
      btn.classList.add('is-confirming');
      btn.textContent = btn.dataset.confirmLabel || 'Confirm';
      clearTimeout(timer);
      timer = setTimeout(() => {
        btn.classList.remove('is-confirming');
        btn.textContent = idle;
      }, 4000);
    });
  });

  // Country / province lists (Shopify's shopify_common.js, loaded by the addresses section)
  const countries = document.querySelectorAll('[data-hoa-country]');
  if (countries.length && window.Shopify && typeof window.Shopify.CountryProvinceSelector === 'function') {
    countries.forEach((select) => {
      const key = select.dataset.hoaCountry;
      new window.Shopify.CountryProvinceSelector('AddressCountry' + key, 'AddressProvince' + key, {
        hideElement: 'AddressProvinceContainer' + key
      });
    });
  }
})();
