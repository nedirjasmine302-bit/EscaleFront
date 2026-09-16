import { API_BASE } from "./config.js";


// Libellés lisibles des types de destination
export const TYPE_LABELS = {
  plage: "Plage",
  ville: "Ville",
  montagne: "Montagne",
  nature: "Nature"
};


// Échappe le texte pour éviter l'injection de code HTML
export function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value ?? "";
  return div.innerHTML;
}


// Image de la destination
export function imageForDestination(destination) {
  if (destination.image) {
    return destination.image.startsWith("data:") ? destination.image : `${API_BASE}/${destination.image}`;
  }
  const file = destination.name.replace(/ /g, "-");
  return "/assets/images/" + encodeURIComponent(file) + ".webp";
}


// Construit le HTML d'une carte destination.
export function renderCard(destination, { selectHtml = "", heartHtml = "" } = {}) {
  const typeLabel = TYPE_LABELS[destination.type] || destination.type;
  const continent = destination.category ? destination.category.name : "";
  const image = imageForDestination(destination);

  return `
    <article class="destination-card fade-up">
      <div class="destination-media media-${destination.type}">
        <img src="${image}" alt="${escapeHtml(destination.name)}" loading="lazy" onerror="this.remove()">
        <span class="tag tag-${destination.type}">${typeLabel}</span>
        ${selectHtml}
        ${heartHtml}
      </div>
      <div class="destination-body">
        <h3 class="destination-name">${escapeHtml(destination.name)}</h3>
        <p class="destination-country">
          <i class="bi bi-geo-alt-fill"></i>${escapeHtml(destination.country)} · ${escapeHtml(continent)}
        </p>
        <p class="destination-text">${escapeHtml(destination.description)}</p>
        <button class="btn btn-interest" data-interest="${destination.id}">
          Je suis intéressé(e)
        </button>
      </div>
    </article>
  `;
}
