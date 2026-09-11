import { initReveal } from "../modules/animations.js";


// La flèche du hero fait défiler vers la section suivante
function initHeroScroll() {
  const scrollBtn = document.getElementById("hero-scroll");
  const nextSection = document.querySelector(".home-steps");
  if (!scrollBtn || !nextSection) return;

  scrollBtn.addEventListener("click", () => {
    nextSection.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}


// Lance le js de la page Accueil quand elle est chargée
function start() {
  initReveal();
  initHeroScroll();
}

if (typeof window !== "undefined") start();
