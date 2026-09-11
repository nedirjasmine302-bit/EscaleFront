// Crée un petit message d'erreur juste sous un champ
export function createErrorElement(input) {
  const error = document.createElement("p");
  error.classList.add("field-error");
  input.insertAdjacentElement("afterend", error);
  return error;
}


// Affiche une erreur sous un champ
export function showError(errorEl, msg) {
  errorEl.textContent = msg;
  errorEl.style.opacity = "1";
}


// Cache l'erreur d'un champ
export function hideError(errorEl) {
  errorEl.textContent = "";
  errorEl.style.opacity = "0";
}
