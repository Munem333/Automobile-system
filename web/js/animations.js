(function initAnimations() {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReduced) {
    document.documentElement.classList.add('reduced-motion');
  }

  function bindReveal(el) {
    if (el.dataset.revealBound) return;
    el.dataset.revealBound = '1';

    if (prefersReduced) {
      el.classList.add('revealed');
      return;
    }

    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
      const stagger = el.dataset.stagger;
      const children = stagger ? el.querySelectorAll(stagger) : null;

      if (children && children.length) {
        gsap.set(children, { opacity: 0, y: 24 });
        ScrollTrigger.create({
          trigger: el,
          start: 'top 80%',
          once: true,
          onEnter: () => {
            gsap.to(children, {
              opacity: 1,
              y: 0,
              duration: 0.7,
              ease: 'power2.out',
              stagger: 0.09,
            });
          },
        });
      } else {
        gsap.set(el, { opacity: 0, y: 24 });
        ScrollTrigger.create({
          trigger: el,
          start: 'top 80%',
          once: true,
          onEnter: () => {
            gsap.to(el, { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out' });
          },
        });
      }
      return;
    }

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('revealed');
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.2 }
      );
      observer.observe(el);
      return;
    }

    el.classList.add('revealed');
  }

  function refreshScrollReveals(root = document) {
    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
      gsap.registerPlugin(ScrollTrigger);
    }

    root.querySelectorAll('.reveal').forEach(bindReveal);

    if (typeof ScrollTrigger !== 'undefined') {
      ScrollTrigger.refresh();
    }
  }

  window.refreshScrollReveals = refreshScrollReveals;

  document.addEventListener('DOMContentLoaded', () => {
    refreshScrollReveals();
  });
})();
