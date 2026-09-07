document.addEventListener('DOMContentLoaded', () => {
    // Initialize Lucide icons
    if (window.lucide) window.lucide.createIcons();

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
                if (window.lucide) window.lucide.createIcons();
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
        if (new URL(link.href).pathname === window.location.pathname) {
            link.classList.add('nav-link-active');
            link.setAttribute('aria-current', 'page');
        }
    });

});
