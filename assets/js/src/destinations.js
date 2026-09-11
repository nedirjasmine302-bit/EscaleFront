import { API_BASE } from "../modules/config.js";
import { isLoggedIn, getToken } from "../modules/auth.js";
import { openInterestModal, initInterestModal } from "../modules/interest.js";
import { renderCard } from "../modules/destination-card.js";
import { initFilters, renderFilteredList } from "../modules/filters.js";
import { initSelection, selectButton, toggleSelection } from "../modules/selection.js";


// En-têtes des requêtes authentifiées
function authHeaders() {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}


// Appel API : récupère toutes les destinations
async function getDestinations() {
  const res = await fetch(`${API_BASE}/api/destinations`);
  if (!res.ok) throw new Error("Erreur lors du chargement des destinations.");
  return res.json();
}


// Appel API : récupère les favoris du membre connecté
async function getFavorites() {
  const res = await fetch(`${API_BASE}/api/favorites`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Erreur lors du chargement des favoris.");
  return res.json();
}


// Appel API : ajoute une destination aux favoris
async function addFavorite(id) {
  return fetch(`${API_BASE}/api/favorites/${id}`, {
    method: "POST",
    headers: authHeaders()
  });
}


// Appel API : retire une destination des favoris
async function removeFavorite(id) {
  return fetch(`${API_BASE}/api/favorites/${id}`, {
    method: "DELETE",
    headers: authHeaders()
  });
}


let destinations = [];
let favoriteIds = new Set();
const canFavorite = isLoggedIn();


// Bouton favori affiché uniquement pour un membre connecté
function favoriteButton(destination) {
  if (!canFavorite) return "";
  const active = favoriteIds.has(destination.id);
  return `
    <button class="fav-btn ${active ? "is-active" : ""}" data-fav="${destination.id}"
            aria-label="Ajouter aux favoris" title="Favoris">
      <i class="bi bi-heart${active ? "-fill" : ""}"></i>
    </button>
  `;
}


// Une carte destination
function renderDestinationCard(destination) {
  return renderCard(destination, {
    selectHtml: selectButton(destination.id),
    heartHtml: favoriteButton(destination)
  });
}


// Bascule un favori et met à jour le cœur
async function toggleFavorite(id, button) {
  const active = favoriteIds.has(id);
  const response = active ? await removeFavorite(id) : await addFavorite(id);
  if (!response.ok) return;

  if (active) {
    favoriteIds.delete(id);
    button.classList.remove("is-active");
    button.innerHTML = `<i class="bi bi-heart"></i>`;
  } else {
    favoriteIds.add(id);
    button.classList.add("is-active");
    button.innerHTML = `<i class="bi bi-heart-fill"></i>`;
  }
}


// Gère les clics sur les cartes
function onListClick(event) {
  const selectBtn = event.target.closest("[data-select]");
  if (selectBtn) {
    toggleSelection(Number(selectBtn.dataset.select), selectBtn);
    return;
  }

  const favBtn = event.target.closest("[data-fav]");
  if (favBtn) {
    toggleFavorite(Number(favBtn.dataset.fav), favBtn);
    return;
  }

  const interestBtn = event.target.closest("[data-interest]");
  if (interestBtn) {
    const destination = destinations.find((d) => d.id === Number(interestBtn.dataset.interest));
    if (destination) openInterestModal(destination);
  }
}


// Récupère les destinations depuis l'API et les affiche
async function loadDestinations() {
  const list = document.getElementById("destination-list");
  const state = document.getElementById("list-state");
  if (!list) return;

  try {
    if (canFavorite) {
      try {
        const favorites = await getFavorites();
        favoriteIds = new Set(favorites.map((d) => d.id));
      } catch {
        favoriteIds = new Set();
      }
    }

    destinations = await getDestinations();

    if (destinations.length === 0) {
      state.textContent = "Aucune destination pour le moment.";
      return;
    }

    initFilters({
      filtersId: "destination-filters",
      listId: "destination-list",
      stateId: "list-state",
      emptyText: "Aucune destination pour ce filtre.",
      getItems: () => destinations,
      renderItem: renderDestinationCard
    });
    renderFilteredList();

    list.addEventListener("click", onListClick);
    initSelection(() => destinations);

  } catch (error) {
    state.textContent = "Impossible de charger les destinations.";
    console.error(error);
  }
}


// Lance le js de la page Destinations quand elle est chargée
function start() {
  initInterestModal();
  loadDestinations();
}

if (typeof window !== "undefined") start();
