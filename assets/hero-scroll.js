/* ==========================================================================
   AGHA PERFUMES — CINEMATIC SCROLLTRIGGER HERO ANIMATION
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // Ensure GSAP and ScrollTrigger are loaded
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
    console.warn('GSAP or ScrollTrigger not loaded. Initializing fallback animations.');
    initializeFallbackHero();
    document.querySelectorAll('.gsap-reveal, .gsap-clip-reveal').forEach((el) => {
      el.style.opacity = '1';
      el.style.clipPath = 'none';
    });
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  // The homepage hero is now the cinematic film in assets/agha-hero.js
  // (sections/agha-hero.liquid). The legacy .hero-wrapper entry animation
  // still runs for inner pages that use it.
  const heroWrapper = document.querySelector('.hero-wrapper');
  if (heroWrapper) {
    const heroTL = gsap.timeline({ defaults: { ease: 'power4.out', duration: 1.4 } });
    heroTL
      .to('.hero-headline span', { opacity: 1, y: 0, stagger: 0.15, delay: 0.2 })
      .to('.hero-editorial-tag', { opacity: 1, y: 0, duration: 0.8 }, '-=1.0')
      .to('.hero-actions-group', { opacity: 1, y: 0, duration: 0.8 }, '-=0.8')
      .to('.hero-footer-bar', { opacity: 1, duration: 0.8 }, '-=0.6');

    gsap.to('.hero-bg-media', {
      scrollTrigger: { trigger: heroWrapper, start: 'top top', end: 'bottom top', scrub: 1 },
      scale: 1.15, y: 80, opacity: 0.25, filter: 'blur(8px)'
    });

    gsap.to('.hero-body', {
      scrollTrigger: { trigger: heroWrapper, start: 'top top', end: '60% top', scrub: 0.8 },
      opacity: 0, y: -50
    });
  }

  // Header background state on scroll
  ScrollTrigger.create({
    start: '100px top',
    onEnter: () => document.querySelector('.header')?.classList.add('scrolled'),
    onLeaveBack: () => document.querySelector('.header')?.classList.remove('scrolled')
  });

  // Reveal animations for all editorial sections.
  // Restrained by design: each block reveals once (no fade-out when scrolling back up,
  // which read as flicker), travels less on small screens, and is skipped entirely
  // for reduced motion. Transforms and opacity only, so nothing shifts layout.
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isSmall = window.matchMedia('(max-width: 767px)').matches;

  const revealElements = document.querySelectorAll('.gsap-reveal');
  const clipReveals = document.querySelectorAll('.gsap-clip-reveal');

  if (reduceMotion) {
    revealElements.forEach((el) => { el.style.opacity = '1'; });
    clipReveals.forEach((el) => { el.style.clipPath = 'none'; });
    return;
  }

  revealElements.forEach((el) => {
    gsap.fromTo(
      el,
      { opacity: 0, y: isSmall ? 24 : 40 },
      {
        opacity: 1,
        y: 0,
        duration: isSmall ? 0.9 : 1.2,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 88%',
          once: true
        }
      }
    );
  });

  // Clip Path Image Reveals
  clipReveals.forEach((el) => {
    gsap.fromTo(
      el,
      { clipPath: 'inset(100% 0 0 0)' },
      {
        clipPath: 'inset(0% 0 0 0)',
        duration: isSmall ? 1.1 : 1.4,
        ease: 'power4.inOut',
        scrollTrigger: {
          trigger: el,
          start: 'top 82%',
          once: true
        }
      }
    );
  });
});

function initializeFallbackHero() {
  const heroLines = document.querySelectorAll('.hero-headline span');
  heroLines.forEach((line, index) => {
    setTimeout(() => {
      line.style.opacity = '1';
      line.style.transform = 'translateY(0)';
      line.style.transition = 'all 1s cubic-bezier(0.16, 1, 0.3, 1)';
    }, index * 200);
  });
}
