import { initReveal } from "../modules/animations.js";
import { API_BASE } from "../modules/config.js";
import { isLoggedIn, isEmployee } from "../modules/auth.js";
import { sanitize, isValidEmail, isValidPseudo, isValidPassword } from "../modules/security.js";
import { saveRateLimit, getRateLimitRemaining, clearRateLimit, bumpAttempts, resetAttempts } from "../modules/rate-limit.js";
import { showFeedback } from "../modules/feedback.js";
import { createErrorElement, showError, hideError } from "../modules/field-error.js";


const RATE_KEY = "signup";


// Vérifie que les champs du formulaire d'inscription sont valides
export function isSignUpFormValid({ email, pseudo, password, password2 }) {
  return (
    isValidEmail(email) &&
    isValidPseudo(pseudo) &&
    isValidPassword(password) &&
    password === password2
  );
}


// Appel API : inscription
async function signUp(payload) {
  return fetch(`${API_BASE}/api/sign-up`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}


// Appel API : vérifie qu'un email n'est pas déjà utilisé
async function checkEmailUnique(email) {
  try {
    const res = await fetch(`${API_BASE}/api/check-email?email=` + encodeURIComponent(email));
    if (!res.ok) return true;
    const data = await res.json();
    return data.unique !== false;
  } catch (error) {
    console.error("Erreur API check-email:", error);
    return true;
  }
}


// Appel API : vérifie qu'un pseudo n'est pas déjà utilisé
async function checkPseudoUnique(pseudo) {
  try {
    const res = await fetch(`${API_BASE}/api/check-pseudo?pseudo=` + encodeURIComponent(pseudo));
    if (!res.ok) return true;
    const data = await res.json();
    return data.unique !== false;
  } catch (error) {
    console.error("Erreur API check-pseudo:", error);
    return true;
  }
}


// Gestion du formulaire d'inscription
function initSignUpForm() {
  const form = document.getElementById("signup-form");
  if (!form) return;

  const emailInput = document.getElementById("email");
  const pseudoInput = document.getElementById("pseudo");
  const passwordInput = document.getElementById("password");
  const password2Input = document.getElementById("password2");
  const submitBtn = document.getElementById("signup-btn");
  const feedback = document.getElementById("auth-feedback");


  const emailError = createErrorElement(emailInput);
  const pseudoError = createErrorElement(pseudoInput);
  const passwordError = createErrorElement(passwordInput);
  const password2Error = createErrorElement(password2Input);

  const touched = { email: false, pseudo: false, password: false, password2: false };


  async function validateForm() {
    const email = sanitize(emailInput.value);
    const pseudo = sanitize(pseudoInput.value);
    const password = sanitize(passwordInput.value);
    const password2 = sanitize(password2Input.value);

    let valid = true;

    if (touched.email) {
      if (!isValidEmail(email)) {
        showError(emailError, "Email invalide");
        valid = false;
      } else if (!(await checkEmailUnique(email))) {
        showError(emailError, "Cet email est déjà utilisé");
        valid = false;
      } else {
        hideError(emailError);
      }
    }

    if (touched.pseudo) {
      if (!isValidPseudo(pseudo)) {
        showError(pseudoError, "3 à 20 caractères (lettres, chiffres, _ -)");
        valid = false;
      } else if (!(await checkPseudoUnique(pseudo))) {
        showError(pseudoError, "Ce pseudo est déjà utilisé");
        valid = false;
      } else {
        hideError(pseudoError);
      }
    }

    if (touched.password) {
      if (!isValidPassword(password)) {
        showError(passwordError, "8 caractères, majuscule, minuscule, chiffre, spécial");
        valid = false;
      } else {
        hideError(passwordError);
      }
    }

    if (touched.password2) {
      if (password !== password2) {
        showError(password2Error, "La confirmation n'est pas identique");
        valid = false;
      } else {
        hideError(password2Error);
      }
    }

    const allGood =
      isSignUpFormValid({ email, pseudo, password, password2 }) &&
      getRateLimitRemaining(RATE_KEY) === 0;

    submitBtn.classList.toggle("btn-disabled", !allGood);

    return valid;
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
  passwordInput.addEventListener("input", () => markTouched("password"));
  password2Input.addEventListener("input", () => markTouched("password2"));

  validateForm();

  const remaining = getRateLimitRemaining(RATE_KEY);
  if (remaining > 0) {
    applyBlock(remaining, "Trop de tentatives. Réessayez dans quelques instants.");
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (getRateLimitRemaining(RATE_KEY) > 0) return;
    if (!(await validateForm())) return;

    const payload = {
      email: sanitize(emailInput.value),
      pseudo: sanitize(pseudoInput.value),
      password: sanitize(passwordInput.value),
      password2: sanitize(password2Input.value)
    };

    const res = await signUp(payload);
    const data = await res.json().catch(() => ({}));

    if (res.status === 429) {
      const retryAfter = res.headers.get("Retry-After");
      const waitSeconds = retryAfter ? parseInt(retryAfter) : 60;

      saveRateLimit(RATE_KEY, waitSeconds);
      applyBlock(waitSeconds * 1000, data.message || "Trop de tentatives. Réessayez dans quelques instants.");
      return;
    }

    const attempts = bumpAttempts(RATE_KEY);
    const limitReached = attempts >= 5;
    if (limitReached) {
      resetAttempts(RATE_KEY);
      saveRateLimit(RATE_KEY, 60);
    }

    if (!data.success) {
      if (limitReached) {
        applyBlock(60 * 1000, "Trop de tentatives. Réessayez dans quelques instants.");
      } else {
        showMessage(data.message || "Une erreur est survenue.", "error");
      }
      return;
    }

    showMessage(data.message, "success");
    submitBtn.classList.add("btn-disabled");
    submitBtn.setAttribute("disabled", "true");

    setTimeout(() => {
      window.location.href = "/sign-in";
    }, 2000);
  });
}


// Lance le js de la page Inscription quand elle est chargée
function start() {
  initReveal();

  if (isLoggedIn()) {
    window.location.href = isEmployee() ? "/management" : "/destinations";
    return;
  }

  initSignUpForm();
}

if (typeof window !== "undefined") start();
