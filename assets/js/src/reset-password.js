import { initReveal } from "../modules/animations.js";
import { API_BASE } from "../modules/config.js";
import { sanitize, isValidEmail, isValidPassword } from "../modules/security.js";
import { saveRateLimit, getRateLimitRemaining, clearRateLimit, bumpAttempts, resetAttempts } from "../modules/rate-limit.js";
import { showFeedback } from "../modules/feedback.js";
import { createErrorElement, showError, hideError } from "../modules/field-error.js";


const RATE_KEY = "reset-password";
const RATE_MSG_KEY = "rateLimit:reset-password:msg";


// Vérifie que les champs du formulaire de réinitialisation sont valides
export function isResetFormValid({ email, temp, password, password2 }) {
  return (
    isValidEmail(email) &&
    temp.length > 0 &&
    isValidPassword(password) &&
    password === password2
  );
}


// Appel API : réinitialisation avec le mot de passe temporaire
async function resetPassword(email, temporaryPassword, newPassword) {
  const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, temporaryPassword, newPassword })
  });
  const body = await res.json().catch(() => ({}));
  return { data: body, status: res.status, retryAfter: res.headers.get("Retry-After") };
}


// Gestion du formulaire de réinitialisation
function initResetForm() {
  const form = document.getElementById("reset-form");
  if (!form) return;

  const emailInput = document.getElementById("email");
  const tempInput = document.getElementById("temp-password");
  const passwordInput = document.getElementById("password");
  const password2Input = document.getElementById("password2");
  const submitBtn = document.getElementById("reset-btn");
  const feedback = document.getElementById("auth-feedback");


  const emailError = createErrorElement(emailInput);
  const tempError = createErrorElement(tempInput);
  const passwordError = createErrorElement(passwordInput);
  const password2Error = createErrorElement(password2Input);

  const touched = { email: false, temp: false, password: false, password2: false };


  function validateForm() {
    const email = sanitize(emailInput.value);
    const temp = sanitize(tempInput.value);
    const password = sanitize(passwordInput.value);
    const password2 = sanitize(password2Input.value);

    if (touched.email) {
      isValidEmail(email) ? hideError(emailError) : showError(emailError, "Email invalide");
    }
    if (touched.temp) {
      temp.length > 0 ? hideError(tempError) : showError(tempError, "Entrez votre mot de passe temporaire");
    }
    if (touched.password) {
      isValidPassword(password)
        ? hideError(passwordError)
        : showError(passwordError, "8 caractères, majuscule, minuscule, chiffre, spécial");
    }
    if (touched.password2) {
      password === password2 ? hideError(password2Error) : showError(password2Error, "La confirmation n'est pas identique");
    }

    const ok =
      isResetFormValid({ email, temp, password, password2 }) &&
      getRateLimitRemaining(RATE_KEY) === 0;

    submitBtn.classList.toggle("btn-disabled", !ok);
    return ok;
  }


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
  tempInput.addEventListener("input", () => markTouched("temp"));
  passwordInput.addEventListener("input", () => markTouched("password"));
  password2Input.addEventListener("input", () => markTouched("password2"));

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
    const temp = sanitize(tempInput.value);
    const password = sanitize(passwordInput.value);

    const { data, status, retryAfter } = await resetPassword(email, temp, password);

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
        showMessage(data.message || "Une erreur est survenue.", "error");
      }
      return;
    }

    resetAttempts(RATE_KEY);
    const successMsg = "Mot de passe modifié avec succès !";
    showMessage(successMsg, "success");
    submitBtn.classList.add("btn-disabled");
    submitBtn.setAttribute("disabled", "true");
    setTimeout(() => {
      window.location.href = "/sign-in";
    }, 2000);
  });
}


// Lance le js de la page Réinitialisation quand elle est chargée
function start() {
  initReveal();
  initResetForm();
}

if (typeof window !== "undefined") start();
