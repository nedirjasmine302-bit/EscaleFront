// Décide si un élément observé doit apparaître
export function shouldReveal(entry) {
  return entry.isIntersecting;
}

// Animation d'apparition des éléments de la page au scroll
export function initReveal() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (shouldReveal(entry)) entry.target.classList.add("show");
    });
  });

  const elements = document.querySelectorAll(".fade-up, .scale-in, .blur-in");
  elements.forEach(el => observer.observe(el));
}
