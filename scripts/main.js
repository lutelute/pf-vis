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


// 演習の達成状況をlocalStorageから読み、学習パスの演習リンク行に表示する
document.addEventListener('DOMContentLoaded', () => {
    try {
        const store = JSON.parse(localStorage.getItem('pfvis-exercises') || '{}');
        const done = Object.values(store).filter(v => v && v.ok).length;
        if (done > 0) {
            const links = document.querySelectorAll('a[href="exercises.html"]');
            links.forEach(a => {
                const badge = document.createElement('span');
                badge.textContent = ` (自動判定 ${done}問 達成済み)`;
                badge.style.color = '#10b981';
                badge.style.fontSize = '0.85em';
                a.after(badge);
            });
        }
    } catch (e) { /* localStorage不可の環境では表示しない */ }
});
