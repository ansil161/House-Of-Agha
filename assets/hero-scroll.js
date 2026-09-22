/* ==========================================================================
   AGHA PERFUMES — CINEMATIC SCROLLTRIGGER HERO ANIMATION
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // Ensure GSAP and ScrollTrigger are loaded
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
    console.warn('GSAP or ScrollTrigger not loaded. Initializing fallback animations.');
    initializeFallbackHero();
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  const heroWrapper = document.querySelector('.hero-wrapper');
  if (!heroWrapper) return;

  // Initial Hero Entry Animation (Page Load)
  const heroTL = gsap.timeline({ defaults: { ease: 'power4.out', duration: 1.4 } });

  heroTL
    .to('.hero-headline span', {
      opacity: 1,
      y: 0,
      stagger: 0.15,
      delay: 0.2
    })
    .to('.hero-editorial-tag', {
      opacity: 1,
      y: 0,
      duration: 0.8
    }, '-=1.0')
    .to('.hero-actions-group', {
      opacity: 1,
      y: 0,
      duration: 0.8
    }, '-=0.8')
    .to('.hero-footer-bar', {
      opacity: 1,
      duration: 0.8
    }, '-=0.6');

  // Scroll-driven Parallax and Atmospheric Zoom Effect
  gsap.to('.hero-bg-media', {
    scrollTrigger: {
      trigger: heroWrapper,
      start: 'top top',
      end: 'bottom top',
      scrub: 1
    },
    scale: 1.15,
    y: 80,
    opacity: 0.25,
    filter: 'blur(8px)'
  });

  // Fade out hero content on scroll down
  gsap.to('.hero-body', {
    scrollTrigger: {
      trigger: heroWrapper,
      start: 'top top',
      end: '60% top',
      scrub: 0.8
    },
    opacity: 0,
    y: -50
  });

  // Header background state on scroll
  ScrollTrigger.create({
    start: '100px top',
    onEnter: () => document.querySelector('.header')?.classList.add('scrolled'),
    onLeaveBack: () => document.querySelector('.header')?.classList.remove('scrolled')
  });

  // Reveal animations for all editorial sections
  const revealElements = document.querySelectorAll('.gsap-reveal');
  revealElements.forEach((el) => {
    gsap.fromTo(
      el,
      { opacity: 0, y: 40 },
      {
        opacity: 1,
        y: 0,
        duration: 1.2,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 85%',
          toggleActions: 'play none none reverse'
        }
      }
    );
  });

  // Clip Path Image Reveals
  const clipReveals = document.querySelectorAll('.gsap-clip-reveal');
  clipReveals.forEach((el) => {
    gsap.fromTo(
      el,
      { clipPath: 'inset(100% 0 0 0)' },
      {
        clipPath: 'inset(0% 0 0 0)',
        duration: 1.4,
        ease: 'power4.inOut',
        scrollTrigger: {
          trigger: el,
          start: 'top 80%'
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
