import { initReveal } from "../modules/animations.js";
import { API_BASE } from "../modules/config.js";
import { isLoggedIn, getToken } from "../modules/auth.js";
import { openInterestModal, initInterestModal } from "../modules/interest.js";
import { renderCard } from "../modules/destination-card.js";
import { initFilters, renderFilteredList } from "../modules/filters.js";
import { initSelection, selectButton, toggleSelection, clearSelection, removeFromSelection } from "../modules/selection.js";


// Retire une destination de la liste des favoris
export function removeFavoriteById(favorites, id) {
  return favorites.filter((d) => d.id !== id);
}


// En-têtes des requêtes authentifiées
function authHeaders() {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}


// Appel API : récupère les favoris du membre connecté
async function getFavorites() {
  const res = await fetch(`${API_BASE}/api/favorites`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Erreur lors du chargement des favoris.");
  return res.json();
}


// Appel API : retire une destination des favoris
async function removeFavorite(id) {
  return fetch(`${API_BASE}/api/favorites/${id}`, {
    method: "DELETE",
    headers: authHeaders()
  });
}


// Favoris chargés
let favorites = [];


// Le cœur est toujours plein et sert à retirer le favori
function favoriteButton(destination) {
  return `
    <button class="fav-btn is-active" data-fav="${destination.id}"
            aria-label="Retirer des favoris" title="Retirer des favoris">
      <i class="bi bi-heart-fill"></i>
    </button>
  `;
}


// Une carte favori
function renderFavoriteCard(destination) {
  return renderCard(destination, {
    selectHtml: selectButton(destination.id),
    heartHtml: favoriteButton(destination)
  });
}


// Affiche un état vide quand aucun favori
function renderEmpty(state) {
  const list = document.getElementById("favorites-list");
  if (list) list.innerHTML = "";
  const filters = document.getElementById("destination-filters");
  if (filters) filters.innerHTML = "";
  clearSelection();
  state.classList.remove("d-none");
  state.innerHTML = `Vous n'avez pas encore de favori. <a href="/destinations">Parcourir les destinations</a>`;
}


// Gère les clics
async function onListClick(event) {
  const selectBtn = event.target.closest("[data-select]");
  if (selectBtn) {
    toggleSelection(Number(selectBtn.dataset.select), selectBtn);
    return;
  }

  const favBtn = event.target.closest("[data-fav]");
  if (favBtn) {
    const id = Number(favBtn.dataset.fav);
    const response = await removeFavorite(id);
    if (!response.ok) return;

    favorites = removeFavoriteById(favorites, id);
    removeFromSelection(id);

    if (favorites.length === 0) {
      renderEmpty(document.getElementById("list-state"));
    } else {
      renderFilteredList();
    }
    return;
  }

  const interestBtn = event.target.closest("[data-interest]");
  if (interestBtn) {
    const destination = favorites.find((d) => d.id === Number(interestBtn.dataset.interest));
    if (destination) openInterestModal(destination);
  }
}


// Charge et affiche les favoris du membre
async function loadFavorites() {
  const list = document.getElementById("favorites-list");
  const state = document.getElementById("list-state");
  if (!list) return;

  try {
    favorites = await getFavorites();

    if (favorites.length === 0) {
      renderEmpty(state);
      return;
    }

    initFilters({
      filtersId: "destination-filters",
      listId: "favorites-list",
      stateId: "list-state",
      emptyText: "Aucun favori pour ce filtre.",
      getItems: () => favorites,
      renderItem: renderFavoriteCard
    });
    renderFilteredList();

    list.addEventListener("click", onListClick);
    initSelection(() => favorites);

  } catch (error) {
    state.textContent = "Impossible de charger vos favoris.";
    console.error(error);
  }
}


// Lance le js de la page Favoris quand elle est chargée
function start() {
  initReveal();

  if (!isLoggedIn()) {
    window.location.href = "/sign-in";
    return;
  }

  initInterestModal();
  loadFavorites();
}

if (typeof window !== "undefined") start();
