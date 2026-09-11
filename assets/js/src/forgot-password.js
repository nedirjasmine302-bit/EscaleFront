import { API_BASE } from "../modules/config.js";
import { initReveal } from "../modules/animations.js";
import { sanitize, isValidEmail, isValidPseudo } from "../modules/security.js";
import { saveRateLimit, getRateLimitRemaining, clearRateLimit, bumpAttempts, resetAttempts } from "../modules/rate-limit.js";
import { showFeedback } from "../modules/feedback.js";
import { createErrorElement, showError, hideError } from "../modules/field-error.js";

const RATE_KEY = "forgot-password";
const RATE_MSG_KEY = "rateLimit:forgot-password:msg";


// Vérifie que les champs du formulaire "mot de passe oublié" sont valides (hors débit)
export function isForgotFormValid({ email, pseudo }) {
  return isValidEmail(email) && isValidPseudo(pseudo);
}


// Appel API : demande un mot de passe temporaire
async function apiForgotPassword(email, pseudo) {
  const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, pseudo })
  });

  const body = await res.json().catch(() => ({}));
  const retryAfter = res.headers.get("Retry-After");

  return { data: body, status: res.status, retryAfter };
}


// Gestion du formulaire de mot de passe oublié
function initForgotPasswordForm() {
  const form = document.getElementById("forgot-form");
  if (!form) return;

  const emailInput = document.getElementById("email");
  const pseudoInput = document.getElementById("pseudo");
  const submitBtn = document.getElementById("forgot-btn");
  const feedback = document.getElementById("auth-feedback");


  const emailError = createErrorElement(emailInput);
  const pseudoError = createErrorElement(pseudoInput);

  const touched = { email: false, pseudo: false };


  function validateForm() {
    const email = sanitize(emailInput.value);
    const pseudo = sanitize(pseudoInput.value);

    let valid = true;

    if (touched.email) {
      if (!isValidEmail(email)) {
        showError(emailError, "Email invalide");
        valid = false;
      } else hideError(emailError);
    }

    if (touched.pseudo) {
      if (!isValidPseudo(pseudo)) {
        showError(pseudoError, "3 à 20 caractères (lettres, chiffres, _ -)");
        valid = false;
      } else hideError(pseudoError);
    }

    if (isForgotFormValid({ email, pseudo }) && getRateLimitRemaining(RATE_KEY) === 0) {
      submitBtn.classList.remove("btn-disabled");
    } else {
      submitBtn.classList.add("btn-disabled");
    }

    return valid;
  }

  // Affiche le message final (centré, même design que les autres pages).
  function showMessage(text, type, persist = false) {
    showFeedback(feedback, text, type === "success" ? "is-success" : "is-error", persist);
  }

  function applyBlock(ms, message) {
    showMessage(message, "error", true);
    submitBtn.classList.add("btn-disabled");
    submitBtn.setAttribute("disabled", "true");

    setTimeout(() => {
      showFeedback(feedback, "");
      clearRateLimit(RATE_KEY);
      localStorage.removeItem(RATE_MSG_KEY);
      submitBtn.removeAttribute("disabled");
      validateForm();
    }, ms);
  }

  function markTouched(field) {
    touched[field] = true;
    validateForm();
  }

  emailInput.addEventListener("input", () => markTouched("email"));
  pseudoInput.addEventListener("input", () => markTouched("pseudo"));

  validateForm();

  const remaining = getRateLimitRemaining(RATE_KEY);
  if (remaining > 0) {
    const savedMsg = localStorage.getItem(RATE_MSG_KEY) || "Trop de tentatives. Réessayez dans quelques instants.";
    applyBlock(remaining, savedMsg);
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (getRateLimitRemaining(RATE_KEY) > 0) return;
    if (!validateForm()) return;

    const email = sanitize(emailInput.value);
    const pseudo = sanitize(pseudoInput.value);

    const { data, status, retryAfter } = await apiForgotPassword(email, pseudo);

    if (status === 429) {
      const waitSeconds = retryAfter ? parseInt(retryAfter) : 60;
      const blockMsg = data.message || "Trop de tentatives. Réessayez dans quelques instants.";
      saveRateLimit(RATE_KEY, waitSeconds);
      localStorage.setItem(RATE_MSG_KEY, blockMsg);
      applyBlock(waitSeconds * 1000, blockMsg);
      return;
    }

    const attempts = bumpAttempts(RATE_KEY);
    const limitReached = attempts >= 5;
    if (limitReached) {
      resetAttempts(RATE_KEY);
      saveRateLimit(RATE_KEY, 60);
      localStorage.setItem(RATE_MSG_KEY, "Trop de tentatives. Réessayez dans quelques instants.");
    }

    if (!data.success) {
      if (limitReached) {
        applyBlock(60 * 1000, "Trop de tentatives. Réessayez dans quelques instants.");
      } else {
        showMessage(data.message || "Aucun compte ne correspond.", "error");
      }
      return;
    }

    resetAttempts(RATE_KEY);
    showMessage(data.message || "Un mot de passe temporaire vous a été envoyé par mail.", "success");
    submitBtn.classList.add("btn-disabled");
    submitBtn.setAttribute("disabled", "true");

    setTimeout(() => {
      window.location.href = "/sign-in";
    }, 2200);
  });
}


// Lance le js de la page Mot de passe oublié quand elle est chargée
function start() {
  initReveal();
  initForgotPasswordForm();
}

if (typeof window !== "undefined") start();
