document.addEventListener('DOMContentLoaded', () => {
    const menuToggle = document.querySelector('.mobile-menu-toggle');
    const mainNav = document.querySelector('.main-nav');

    if (menuToggle && mainNav) {
        menuToggle.addEventListener('click', () => {
            const isExpanded = menuToggle.getAttribute('aria-expanded') === 'true';

            // Toggle menu visibility
            mainNav.classList.toggle('open');

            // Update aria attribute
            menuToggle.setAttribute('aria-expanded', !isExpanded);
        });
    }
});
