import { initReveal } from "./animations.js";
import { TYPE_LABELS } from "./destination-card.js";



let config = null;
let activeFilter = "all";


// Filtre une liste de destinations par type
export function filterByType(items, type) {
  return type === "all" ? items : items.filter((d) => d.type === type);
}


// Affiche les cartes correspondant au filtre actif
export function renderFilteredList() {
  if (!config) return;

  const list = document.getElementById(config.listId);
  const state = document.getElementById(config.stateId);
  if (!list) return;

  const items = config.getItems();
  const visible = filterByType(items, activeFilter);

  if (visible.length === 0) {
    list.innerHTML = "";
    state.textContent = config.emptyText;
    state.classList.remove("d-none");
    return;
  }

  state.classList.add("d-none");
  list.innerHTML = visible.map(config.renderItem).join("");
  initReveal();
}


// Construit la barre de filtres
export function initFilters(options) {
  config = options;
  activeFilter = "all";

  const bar = document.getElementById(config.filtersId);
  if (!bar) return;

  const chips = [`<button class="filter-chip is-active" data-filter="all">Toutes</button>`];
  for (const [value, label] of Object.entries(TYPE_LABELS)) {
    chips.push(`<button class="filter-chip" data-filter="${value}">${label}</button>`);
  }
  bar.innerHTML = chips.join("");

  bar.addEventListener("click", (event) => {
    const chip = event.target.closest("[data-filter]");
    if (!chip) return;

    activeFilter = chip.dataset.filter;
    bar.querySelectorAll(".filter-chip").forEach((el) => {
      el.classList.toggle("is-active", el === chip);
    });
    renderFilteredList();
  });
}
