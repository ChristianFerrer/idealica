// Idealica — minimal vanilla JS for scroll-spy, cookie banner, sticky CTA
(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const prefersReducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ───────────────────────────────────────────────────────
  // Scroll-spy: highlight nav link for the section in view
  // ───────────────────────────────────────────────────────
  const navLinks = $$('.nav-links a[href^="#"]');
  const sections = navLinks
    .map(a => document.getElementById(a.getAttribute('href').slice(1)))
    .filter(Boolean);

  if (sections.length && 'IntersectionObserver' in window) {
    const byId = new Map(navLinks.map(a => [a.getAttribute('href').slice(1), a]));
    const setActive = id => {
      navLinks.forEach(a => a.removeAttribute('aria-current'));
      const link = byId.get(id);
      if (link) link.setAttribute('aria-current', 'true');
    };
    const obs = new IntersectionObserver(entries => {
      // pick the entry closest to the top of the viewport that is intersecting
      const visible = entries.filter(e => e.isIntersecting);
      if (!visible.length) return;
      visible.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      setActive(visible[0].target.id);
    }, { rootMargin: '-25% 0px -65% 0px', threshold: 0 });
    sections.forEach(s => obs.observe(s));
  }

  // ───────────────────────────────────────────────────────
  // Cookie banner — show unless prior decision in localStorage
  // ───────────────────────────────────────────────────────
  const KEY = 'idealica-consent';
  const banner = $('[data-cookie-banner]');
  const analyticsTag = $('[data-analytics]');

  const removeAnalytics = () => {
    if (analyticsTag && analyticsTag.parentNode) analyticsTag.parentNode.removeChild(analyticsTag);
  };

  if (banner) {
    let consent = null;
    try { consent = localStorage.getItem(KEY); } catch (_) {}
    if (consent === 'rejected') removeAnalytics();
    if (!consent) {
      banner.hidden = false;
      requestAnimationFrame(() => banner.classList.add('open'));
    }
    const close = (decision) => {
      try { localStorage.setItem(KEY, decision); } catch (_) {}
      banner.classList.remove('open');
      setTimeout(() => { banner.hidden = true; }, prefersReducedMotion ? 0 : 250);
      if (decision === 'rejected') removeAnalytics();
    };
    $('[data-cookie-accept]', banner)?.addEventListener('click', () => close('accepted'));
    $('[data-cookie-reject]', banner)?.addEventListener('click', () => close('rejected'));
    $('[data-cookie-more]', banner)?.addEventListener('click', (e) => {
      e.preventDefault();
      alert('Idealica usa Vercel Analytics — analítica de páginas vistas sin cookies de terceros, anónima y agregada. No vendemos datos ni hacemos retargeting. Si rechazas, no se carga.');
    });
  }

  // ───────────────────────────────────────────────────────
  // Sticky mobile CTA — hide when the final CTA section is visible
  // ───────────────────────────────────────────────────────
  const mobileCTA = $('[data-mobile-cta]');
  const finalSection = $('#hablemos');
  if (mobileCTA && finalSection && 'IntersectionObserver' in window) {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => mobileCTA.classList.toggle('hidden', e.isIntersecting));
    }, { threshold: 0.05 });
    obs.observe(finalSection);
  }

  // ───────────────────────────────────────────────────────
  // Close the mobile menu after clicking a nav link
  // ───────────────────────────────────────────────────────
  const disclosure = $('.nav-disclosure');
  if (disclosure) {
    $$('.nav-links a', disclosure).forEach(a => {
      a.addEventListener('click', () => { disclosure.open = false; });
    });
  }

  // ───────────────────────────────────────────────────────
  // Remember language choice when the user clicks the switcher
  // (the head-level redirect script honors this preference)
  // ───────────────────────────────────────────────────────
  $$('.lang-switch').forEach(a => {
    a.addEventListener('click', () => {
      const href = a.getAttribute('href') || '';
      const lang = href === '/en.html' ? 'en' : 'es';
      try { localStorage.setItem('idealica-lang', lang); } catch (_) {}
    });
  });

  // ───────────────────────────────────────────────────────
  // Message form — saves the lead to Supabase so the team can
  // follow up via WhatsApp from the internal CRM (/admin.html).
  // ───────────────────────────────────────────────────────
  const SUPABASE_URL = 'https://tbcfglgabinazoekhcnt.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_yWCslyVmWGbmM8bherr6Vw_gHkJ4ohR';
  const msgForm = $('[data-msg-form]');
  if (msgForm) {
    msgForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const msgEl = $('[name="message"]', msgForm);
      const nameEl = $('[name="name"]', msgForm);
      const phoneEl = $('[name="phone"]', msgForm);
      const msg = (msgEl?.value || '').trim();
      const name = (nameEl?.value || '').trim();
      const phone = (phoneEl?.value || '').trim();
      const phoneOk = phone.replace(/\D/g, '').length >= 7;
      if (!msg || !name || !phoneOk) {
        if (!msg) msgEl?.focus();
        else if (!name) nameEl?.focus();
        else phoneEl?.focus();
        return;
      }
      const submitBtn = msgForm.querySelector('button[type="submit"]');
      const oldHtml = submitBtn ? submitBtn.innerHTML : '';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = document.documentElement.lang === 'en' ? 'Sending...' : 'Enviando...';
      }
      const success = $('.qa-form-success', msgForm);
      try {
        const res = await fetch(SUPABASE_URL + '/rest/v1/leads', {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': 'Bearer ' + SUPABASE_KEY,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({ nombre: name, whatsapp: phone, mensaje: msg })
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        if (success) {
          success.classList.remove('error');
          success.hidden = false;
        }
        msgForm.reset();
      } catch (err) {
        if (success) {
          success.classList.add('error');
          success.innerHTML = document.documentElement.lang === 'en'
            ? 'Something went wrong. Please write to <a href="mailto:hola@idealica.com">hola@idealica.com</a>.'
            : 'Algo falló. Escríbenos a <a href="mailto:hola@idealica.com">hola@idealica.com</a>.';
          success.hidden = false;
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = oldHtml;
        }
      }
    });
  }
})();
