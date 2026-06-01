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
})();
