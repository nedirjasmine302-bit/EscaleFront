import { isLoggedIn, isEmployee, clearToken } from "../modules/auth.js";


// Animation du burger
// Le click
function initBurger() {
  const burger = document.querySelector(".burger");
  if (!burger) return;

  burger.addEventListener("click", () => {
    toggleMenu();
  });
}

// Ferme le menu hamburger
function closeMenu() {
  const menu = document.querySelector(".menu");
  const navbar = document.querySelector(".navbar");
  if (!menu || !menu.classList.contains("show")) return;

  menu.classList.remove("show");
  menu.classList.add("closing");

  setTimeout(() => {
    menu.classList.remove("closing");
    navbar.classList.remove("menu-open");
  }, 1000);
}

// Ouvrir/Fermer
function toggleMenu() {
  const menu = document.querySelector(".menu");
  const navbar = document.querySelector(".navbar");

  if (menu.classList.contains("show")) {
    closeMenu();
  } else {
    menu.classList.add("show");
    navbar.classList.add("menu-open");
  }
}


// Ajoute au menu les entrées liées à la connexion
function renderAuthNav() {
  const menu = document.getElementById("menu");
  if (!menu) return;

  if (isLoggedIn()) {
    const contact = document.getElementById("nav-contact");

    const favorites = document.createElement("li");
    favorites.innerHTML = `<a href="/favorites">Favoris</a>`;
    menu.insertBefore(favorites, contact);

    if (isEmployee()) {
      const gestion = document.createElement("li");
      gestion.innerHTML = `<a href="/management">Gestion</a>`;
      menu.insertBefore(gestion, contact);
    }

    const logout = document.createElement("li");
    logout.innerHTML = `<a href="#" class="logout">Déconnexion</a>`;
    logout.querySelector(".logout").addEventListener("click", (event) => {
      event.preventDefault();
      clearToken();
      window.location.href = "/";
    });
    menu.appendChild(logout);

  } else {
    const inscription = document.createElement("li");
    inscription.innerHTML = `<a href="/sign-up">Inscription</a>`;
    menu.appendChild(inscription);

    const connexion = document.createElement("li");
    connexion.innerHTML = `<a href="/sign-in">Connexion</a>`;
    menu.appendChild(connexion);
  }
}


// Cliquer sur un lien du menu le referme automatiquement
function initMenuAutoClose() {
  const menu = document.getElementById("menu");
  if (!menu) return;

  menu.addEventListener("click", (event) => {
    if (event.target.closest("a")) closeMenu();
  });
}


// Lance le js du Header quand elle est chargée
function start() {
  initBurger();
  renderAuthNav();
  initMenuAutoClose();
}

if (typeof window !== "undefined") start();
