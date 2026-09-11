import { openInterestModal } from "./interest.js";



const selectedIds = new Set();
let limitTimeout = null;
let getItems = () => [];


// Case de sélection
export function selectButton(id) {
  const active = selectedIds.has(id);
  return `
    <button class="select-btn ${active ? "is-active" : ""}" data-select="${id}"
            aria-label="Ajouter à ma demande" title="Ajouter à ma demande">
      <i class="bi bi-${active ? "check-square-fill" : "square"}"></i>
    </button>
  `;
}


// Coche / décoche une destination et met à jour la case + la barre d'action
export function toggleSelection(id, button) {
  const active = selectedIds.has(id);

  if (!active && selectedIds.size >= 3) {
    flashSelectionLimit();
    return;
  }

  if (active) {
    selectedIds.delete(id);
    button.classList.remove("is-active");
    button.innerHTML = `<i class="bi bi-square"></i>`;
  } else {
    selectedIds.add(id);
    button.classList.add("is-active");
    button.innerHTML = `<i class="bi bi-check-square-fill"></i>`;
  }
  updateSelectionBar();
}


// Retire une destination de la sélection
export function removeFromSelection(id) {
  selectedIds.delete(id);
  updateSelectionBar();
}


// Vide la sélection et remet les cases à zéro
export function clearSelection() {
  selectedIds.clear();
  document.querySelectorAll(".select-btn.is-active").forEach((btn) => {
    btn.classList.remove("is-active");
    btn.innerHTML = `<i class="bi bi-square"></i>`;
  });
  updateSelectionBar();
}


// Message temporaire quand on dépasse le maximum de destinations
function flashSelectionLimit() {
  const bar = document.getElementById("selection-bar");
  const count = document.getElementById("selection-count");
  if (!bar || !count) return;

  bar.hidden = false;
  count.textContent = "Maximum 3 destinations";
  count.classList.add("is-limit");
  clearTimeout(limitTimeout);
  limitTimeout = setTimeout(() => {
    count.classList.remove("is-limit");
    updateSelectionBar();
  }, 1600);
}


// Affiche la barre d'action et met à jour le compteur selon la sélection
export function updateSelectionBar() {
  const bar = document.getElementById("selection-bar");
  const count = document.getElementById("selection-count");
  if (!bar) return;

  const n = selectedIds.size;
  bar.hidden = n === 0;
  if (count) count.textContent = `${n} destination${n > 1 ? "s" : ""} sélectionnée${n > 1 ? "s" : ""}`;
}


// Ouvre la demande groupée pour toutes les destinations cochées
function openGroupedRequest() {
  const selection = getItems().filter((d) => selectedIds.has(d.id));
  if (selection.length === 0) return;
  openInterestModal(selection, { onSuccess: clearSelection });
}


// Branche la barre d'action
export function initSelection(itemsGetter) {
  getItems = itemsGetter;

  const groupBtn = document.getElementById("send-selection");
  if (groupBtn) groupBtn.addEventListener("click", openGroupedRequest);
  const clearBtn = document.getElementById("clear-selection");
  if (clearBtn) clearBtn.addEventListener("click", clearSelection);

  updateSelectionBar();
}
