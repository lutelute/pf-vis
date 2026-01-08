/**
 * Power Flow Visualization - Main JavaScript
 * Handles card animation effects using Intersection Observer
 */

document.addEventListener('DOMContentLoaded', () => {
    initCardAnimations();
});

/**
 * Initialize scroll-based card animations
 */
function initCardAnimations() {
    const cards = document.querySelectorAll('.card[data-animate]');

    if (!cards.length) return;

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        },
        { threshold: 0.1 }
    );

    cards.forEach((card) => observer.observe(card));
}
