import { initReveal } from "../modules/animations.js";
import { API_BASE } from "../modules/config.js";
import { setAuth, isLoggedIn, isEmployee } from "../modules/auth.js";
import { sanitize, isValidEmail } from "../modules/security.js";
import { saveRateLimit, getRateLimitRemaining, clearRateLimit, bumpAttempts, resetAttempts } from "../modules/rate-limit.js";
import { showFeedback } from "../modules/feedback.js";
import { createErrorElement, showError, hideError } from "../modules/field-error.js";


const RATE_KEY = "signin";
const RATE_MSG_KEY = "rateLimit:signin:msg";


// Vérifie que les champs du formulaire de connexion sont valides
export function isSignInFormValid({ email, password }) {
  return isValidEmail(email) && password.length > 0;
}


// Appel API : connexion
async function signIn(email, password) {
  try {
    const res = await fetch(`${API_BASE}/api/auth/sign-in`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const body = await res.json();
    return { data: body.data, status: res.status, retryAfter: res.headers.get("Retry-After") };
  } catch (error) {
    console.error("Erreur API sign-in:", error);
    return { data: { success: false, message: "Erreur serveur." }, status: 500 };
  }
}


// Gestion du formulaire de connexion
function initLoginForm() {
  const form = document.getElementById("login-form");
  if (!form) return;

  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const submitBtn = document.getElementById("login-btn");
  const feedback = document.getElementById("auth-feedback");


  const emailError = createErrorElement(emailInput);
  const passwordError = createErrorElement(passwordInput);

  const touched = { email: false, password: false };


  function validateForm() {
    const email = sanitize(emailInput.value);
    const password = sanitize(passwordInput.value);

    let valid = true;

    if (touched.email) {
      if (!isValidEmail(email)) {
        showError(emailError, "Email invalide");
        valid = false;
      } else {
        hideError(emailError);
      }
    }

    if (touched.password) {
      if (password.length < 1) {
        showError(passwordError, "Veuillez entrer votre mot de passe");
        valid = false;
      } else {
        hideError(passwordError);
      }
    }

    if (isSignInFormValid({ email, password }) && getRateLimitRemaining(RATE_KEY) === 0) {
      submitBtn.classList.remove("btn-disabled");
    } else {
      submitBtn.classList.add("btn-disabled");
    }

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
  passwordInput.addEventListener("input", () => markTouched("password"));

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
    const password = sanitize(passwordInput.value);

    const { data, status, retryAfter } = await signIn(email, password);

    if (status === 429) {
      const waitSeconds = retryAfter ? parseInt(retryAfter) : 60;
      const blockMsg = data.message || "Trop de tentatives. Réessayez dans quelques instants.";

      saveRateLimit(RATE_KEY, waitSeconds);
      localStorage.setItem(RATE_MSG_KEY, blockMsg);
      applyBlock(waitSeconds * 1000, blockMsg);
      return;
    }

    if (!data.success) {
      showMessage(data.message || "Identifiants incorrects.", "error");
      if (bumpAttempts(RATE_KEY) >= 5) {
        resetAttempts(RATE_KEY);
        saveRateLimit(RATE_KEY, 60);
        localStorage.setItem(RATE_MSG_KEY, "Trop de tentatives. Réessayez dans quelques instants.");
        applyBlock(60 * 1000, "Trop de tentatives. Réessayez dans quelques instants.");
      }
      return;
    }

    resetAttempts(RATE_KEY);

    if (data.mustReset) {
      const resetMsg = data.message || "Vous devez changer votre mot de passe.";
      showMessage(resetMsg, "success");
      submitBtn.classList.add("btn-disabled");
      try {
        sessionStorage.setItem("escale_reset_email", data.email || email);
      } catch {
        // sessionStorage indisponible : la page reset demandera l'email
      }
      setTimeout(() => {
        window.location.href = "/reset-password";
      }, 2000);
      return;
    }

    setAuth(data.token, data.user && data.user.roles, data.user);
    showMessage("Connexion réussie !", "success");
    submitBtn.classList.add("btn-disabled");

    const destination = isEmployee() ? "/management" : "/destinations";
    setTimeout(() => {
      window.location.href = destination;
    }, 1200);
  });
}


// Lance le js de la page Connexion quand elle est chargée
function start() {
  initReveal();

  if (isLoggedIn()) {
    window.location.href = isEmployee() ? "/management" : "/destinations";
    return;
  }

  initLoginForm();
}

if (typeof window !== "undefined") start();
