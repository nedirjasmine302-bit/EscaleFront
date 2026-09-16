import { initReveal } from "../modules/animations.js";
import { API_BASE } from "../modules/config.js";
import { getUser, isLoggedIn, getToken } from "../modules/auth.js";
import { initCustomSelects, getSelectValue } from "../modules/custom-select.js";
import { sanitize, isValidEmail, isValidPhone } from "../modules/security.js";
import { saveRateLimit, getRateLimitRemaining, clearRateLimit } from "../modules/rate-limit.js";
import { showFeedback } from "../modules/feedback.js";
import { createErrorElement, showError, hideError } from "../modules/field-error.js";

const RATE_KEY = "contact";


// Vérifie que les champs du formulaire de contact sont valides
export function isContactFormValid({ type, name, email, phone, message }) {
  return (
    type !== "" &&
    name.length >= 2 &&
    isValidEmail(email) &&
    (phone.length === 0 || isValidPhone(phone)) &&
    message.length >= 30
  );
}


// Appels API
async function apiSendRequest(payload) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers["Authorization"] = "Bearer " + token;

  return fetch(`${API_BASE}/api/requests`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload)
  });
}


// Nombre de demandes déjà envoyées
function getRequestCount() {
  try {
    return parseInt(localStorage.getItem("requestCount:contact"), 10) || 0;
  } catch {
    return 0;
  }
}

// Enregistre le nombre de demandes envoyées
function setRequestCount(n) {
  try {
    localStorage.setItem("requestCount:contact", String(n));
  } catch {
    // localStorage indisponible : on ignore
  }
}


// Gère l'envoi du formulaire de contact
function initContactForm() {
  const form = document.getElementById("contact-form");
  if (!form) return;

  const typeInput = document.getElementById("type");
  const nameInput = document.getElementById("name");
  const emailInput = document.getElementById("email");
  const phoneInput = document.getElementById("phone");
  const messageInput = document.getElementById("message");
  const feedback = document.getElementById("contact-feedback");
  const submitBtn = document.getElementById("contact-submit");


  const typeError = document.createElement("p");
  typeError.classList.add("field-error");
  typeInput.closest(".field").appendChild(typeError);

  const nameError = createErrorElement(nameInput);
  const emailError = createErrorElement(emailInput);
  const phoneError = createErrorElement(phoneInput);
  const messageError = createErrorElement(messageInput);

  const touched = { type: false, name: false, email: false, phone: false, message: false };

  const connected = isLoggedIn();
  if (connected) {
    const user = getUser();
    nameInput.value = user.pseudo || "";
    emailInput.value = user.email || "";
    nameInput.readOnly = true;
    emailInput.readOnly = true;
    nameInput.classList.add("is-locked");
    emailInput.classList.add("is-locked");
  }


  function validateForm() {
    const type = getSelectValue("type");
    const name = sanitize(nameInput.value);
    const email = sanitize(emailInput.value);
    const phone = sanitize(phoneInput.value);
    const message = sanitize(messageInput.value);

    let valid = true;

    if (touched.type) {
      if (type === "") {
        showError(typeError, "Veuillez choisir votre demande");
        valid = false;
      } else hideError(typeError);
    }

    if (touched.name) {
      if (name.length < 2) {
        showError(nameError, "Veuillez indiquer votre nom (2 caractères minimum)");
        valid = false;
      } else hideError(nameError);
    }

    if (touched.email) {
      if (!isValidEmail(email)) {
        showError(emailError, "Email invalide");
        valid = false;
      } else hideError(emailError);
    }

    if (touched.phone) {
      if (phone.length > 0 && !isValidPhone(phone)) {
        showError(phoneError, "Numéro de téléphone invalide (ex. 06 12 34 56 78)");
        valid = false;
      } else hideError(phoneError);
    }

    if (touched.message) {
      if (message.length < 30) {
        showError(messageError, "Votre message doit contenir au moins 30 caractères");
        valid = false;
      } else hideError(messageError);
    }

    const allGood =
      isContactFormValid({ type, name, email, phone, message }) &&
      getRateLimitRemaining(RATE_KEY) === 0;

    submitBtn.classList.toggle("btn-disabled", !allGood);

    return valid;
  }

  function touchAll() {
    touched.type = touched.name = touched.email = touched.phone = touched.message = true;
  }

  function applyBlock(ms, message) {
    feedback.textContent = message;
    feedback.className = "form-feedback is-error";
    submitBtn.classList.add("btn-disabled");
    submitBtn.setAttribute("disabled", "true");

    setTimeout(() => {
      feedback.textContent = "";
      feedback.className = "form-feedback";
      clearRateLimit(RATE_KEY);
      submitBtn.removeAttribute("disabled");
      validateForm();
    }, ms);
  }

  typeInput.addEventListener("click", () => { touched.type = true; validateForm(); });
  nameInput.addEventListener("input", () => { touched.name = true; validateForm(); });
  emailInput.addEventListener("input", () => { touched.email = true; validateForm(); });
  phoneInput.addEventListener("input", () => { touched.phone = true; validateForm(); });
  messageInput.addEventListener("input", () => { touched.message = true; validateForm(); });

  validateForm();

  const remaining = getRateLimitRemaining(RATE_KEY);
  if (remaining > 0) {
    applyBlock(remaining, "Trop de demandes. Réessayez dans quelques instants.");
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    feedback.textContent = "";
    feedback.className = "form-feedback";

    if (getRateLimitRemaining(RATE_KEY) > 0) return;

    touchAll();
    if (!validateForm()) return;

    const payload = {
      type: getSelectValue("type"),
      name: sanitize(nameInput.value),
      email: sanitize(emailInput.value),
      phone: sanitize(phoneInput.value),
      message: sanitize(messageInput.value)
    };

    submitBtn.classList.add("btn-disabled");
    const response = await apiSendRequest(payload);

    if (response.status === 429) {
      const retryAfter = response.headers.get("Retry-After");
      const waitSeconds = retryAfter ? parseInt(retryAfter) : 60;
      saveRateLimit(RATE_KEY, waitSeconds);
      applyBlock(waitSeconds * 1000, "Trop de demandes. Réessayez dans quelques instants.");
      return;
    }

    if (response.ok) {
      feedback.textContent = "Merci ! Votre demande a bien été envoyée, nous vous recontactons rapidement.";
      feedback.classList.add("is-success");
      submitBtn.classList.add("btn-disabled");

      const count = getRequestCount() + 1;
      if (count >= 5) {
        setRequestCount(0);
        saveRateLimit(RATE_KEY, 60);
      } else {
        setRequestCount(count);
      }

      setTimeout(() => window.location.reload(), 2200);
    } else {
      submitBtn.classList.remove("btn-disabled");
      showFeedback(feedback, "Une erreur est survenue. Réessayez plus tard.", "is-error");
    }
  });
}


// Lance le js de la page Contact quand elle est chargée
function start() {
  initReveal();
  initCustomSelects();
  initContactForm();
}

if (typeof window !== "undefined") start();
