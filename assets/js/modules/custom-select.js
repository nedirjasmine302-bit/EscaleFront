// Lit la valeur d'un select personnalisé
export function getSelectValue(id) {
  return document.querySelector("#" + id + " .select-label")?.dataset.value || "";
}


// Écrit une valeur dans un select personnalisé
export function setSelectValue(id, value) {
  const select = document.getElementById(id);
  if (!select) return;

  const label = select.querySelector(".select-label");
  const option = select.querySelector(`.select-option[data-value="${value ?? ""}"]`);
  if (!label || !option) return;

  label.textContent = option.textContent;
  label.dataset.value = option.dataset.value;
  label.classList.toggle("is-placeholder", option.dataset.value === "");

  select.querySelectorAll(".select-option").forEach((el) => el.classList.remove("is-selected"));
  option.classList.add("is-selected");
}


// Ferme tous les menus ouverts
function closeAll() {
  document.querySelectorAll(".select.open").forEach((el) => el.classList.remove("open"));
}


// Prépare un select personnalisé
function initSelect(select) {
  if (select.dataset.enhanced === "true") return;
  select.dataset.enhanced = "true";

  const trigger = select.querySelector(".select-trigger");
  const label = select.querySelector(".select-label");
  if (!trigger || !label) return;

  const start = select.querySelector(".select-option.is-selected") || select.querySelector(".select-option");
  if (start) {
    label.textContent = start.textContent;
    label.dataset.value = start.dataset.value;
    label.classList.toggle("is-placeholder", start.dataset.value === "");
  }

  trigger.addEventListener("click", (event) => {
    event.stopPropagation();
    const isOpen = select.classList.contains("open");
    closeAll();
    if (!isOpen) select.classList.add("open");
  });

  select.querySelectorAll(".select-option").forEach((option) => {
    option.addEventListener("click", () => {
      label.textContent = option.textContent;
      label.dataset.value = option.dataset.value;
      label.classList.toggle("is-placeholder", option.dataset.value === "");

      select.querySelectorAll(".select-option").forEach((el) => el.classList.remove("is-selected"));
      option.classList.add("is-selected");
      select.classList.remove("open");
    });
  });
}


// Prépare tous les selects personnalisés présents dans un conteneur
export function initCustomSelects(root = document) {
  root.querySelectorAll(".select").forEach(initSelect);
}


// Clic en dehors donc on referme les menus
if (typeof document !== "undefined") {
  document.addEventListener("click", closeAll);
}
