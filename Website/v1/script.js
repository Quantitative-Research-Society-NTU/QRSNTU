import { animate, inView } from "https://esm.run/framer-motion";

document.addEventListener('DOMContentLoaded', () => {
    // Initialize Lucide icons
    lucide.createIcons();

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Mobile menu functionality
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');
    const header = document.getElementById('header');

    if (mobileMenuButton && mobileMenu) {
        mobileMenuButton.addEventListener('click', () => {
            const isOpen = !mobileMenu.classList.contains('hidden');
            mobileMenu.classList.toggle('hidden');
            mobileMenuButton.setAttribute('aria-expanded', String(!isOpen));

            const icon = mobileMenuButton.querySelector('[data-lucide]');
            if (icon) {
                icon.setAttribute('data-lucide', isOpen ? 'menu' : 'x');
                lucide.createIcons();
            }
        });
    }

    // Header scroll effect
    if (header) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 100) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
        });
    }

    // Smooth scrolling for in-page anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                e.preventDefault();
                const headerHeight = header ? header.offsetHeight : 0;
                const targetPosition = target.offsetTop - headerHeight - 20;

                window.scrollTo({
                    top: targetPosition,
                    behavior: reduceMotion ? 'auto' : 'smooth'
                });

                if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
                    mobileMenu.classList.add('hidden');
                    mobileMenuButton?.setAttribute('aria-expanded', 'false');
                }
            }
        });
    });

    // Highlight the current page in the nav (works at any page depth, since
    // link.href/location.href are both browser-resolved absolute URLs).
    document.querySelectorAll('.nav-link, .nav-cta').forEach(link => {
        if (link.href === window.location.href) {
            link.classList.add('nav-link-active');
            link.setAttribute('aria-current', 'page');
        }
    });

    const animatedElements = document.querySelectorAll('.project-card, .quick-link-card');

    if (reduceMotion) {
        // Skip entrance/scroll/hover animations entirely; show final state.
        animatedElements.forEach(el => {
            el.style.opacity = '1';
            el.style.transform = 'none';
        });
    } else {
        // Animated elements on scroll
        animatedElements.forEach((el, index) => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(30px)';

            inView(el, () => {
                animate(
                    el,
                    { opacity: 1, y: 0 },
                    { duration: 0.6, delay: (index % 4) * 0.1, ease: "easeOut" }
                );
            }, { once: true, margin: "-80px 0px" });
        });

        // Hero section parallax effect (subtle)
        const heroSection = document.querySelector('.hero-section');
        if (heroSection) {
            window.addEventListener('scroll', () => {
                const scrolled = window.pageYOffset;
                const parallax = scrolled * 0.3;
                heroSection.style.transform = `translateY(${parallax}px)`;
            });
        }

        // Card hover effects
        animatedElements.forEach(card => {
            card.addEventListener('mouseenter', () => {
                animate(card, { scale: 1.02, y: -4 }, { duration: 0.3, ease: "easeOut" });
            });
            card.addEventListener('mouseleave', () => {
                animate(card, { scale: 1, y: 0 }, { duration: 0.3, ease: "easeOut" });
            });
        });

        // Intersection Observer for section title/subtitle animations
        const sectionObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');

                    const title = entry.target.querySelector('.section-title');
                    if (title) {
                        animate(title, { opacity: [0, 1], y: [20, 0] }, { duration: 0.8, ease: "easeOut" });
                    }

                    const subtitle = entry.target.querySelector('.section-subtitle');
                    if (subtitle) {
                        animate(subtitle, { opacity: [0, 1], y: [20, 0] }, { duration: 0.8, delay: 0.2, ease: "easeOut" });
                    }
                }
            });
        }, { threshold: 0.1, rootMargin: '-50px 0px' });

        document.querySelectorAll('section').forEach(section => sectionObserver.observe(section));

        // Button hover effects
        document.querySelectorAll('.btn').forEach(button => {
            button.addEventListener('mouseenter', () => {
                animate(button, { scale: 1.05 }, { duration: 0.2, ease: "easeOut" });
            });
            button.addEventListener('mouseleave', () => {
                animate(button, { scale: 1 }, { duration: 0.2, ease: "easeOut" });
            });
        });

        // Hero content entrance animation
        window.addEventListener('load', () => {
            document.body.classList.add('loaded');
            const heroContent = document.querySelector('.hero-content');
            if (heroContent) {
                animate(heroContent, { opacity: [0, 1], y: [30, 0] }, { duration: 1, ease: "easeOut" });
            }
        });
    }
});
