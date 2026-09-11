// Affiche un message de retour qui disparaît tout seul après quelques secondes.
export function showFeedback(el, text, type, persist = false, baseClass = "form-feedback") {
  if (!el) return;

  clearTimeout(el._feedbackTimer);
  el.textContent = text;
  el.className = type ? baseClass + " " + type : baseClass;

  if (text && !persist) {
    el._feedbackTimer = setTimeout(() => {
      el.textContent = "";
      el.className = baseClass;
    }, 4500);
  }
}
