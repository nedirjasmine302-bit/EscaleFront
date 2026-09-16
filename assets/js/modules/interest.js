import { API_BASE } from "./config.js";
import { getUser, isLoggedIn, getToken } from "./auth.js";
import { sanitize, isValidEmail, isValidPhone } from "./security.js";
import { showFeedback } from "./feedback.js";
import { showError, hideError } from "./field-error.js";


// En-têtes des requêtes d'écriture
function authHeaders() {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}


// Appel API : envoie une demande à l'agence
async function sendRequest(payload) {
  return fetch(`${API_BASE}/api/requests`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload)
  });
}


let interestModal = null;

// Déplace la fenêtre dans le body pour qu'elle s'affiche par-dessus tout
export function initInterestModal() {
  interestModal = document.getElementById("interest-modal");
  if (interestModal) document.body.appendChild(interestModal);
}


// Ouvre la fenêtre « Je suis intéressé(e) » pour une ou plusieurs destinations
export function openInterestModal(input, options = {}) {

  if (!interestModal) return;

  const list = Array.isArray(input) ? input : [input];
  if (list.length === 0) return;
  const multiple = list.length > 1;


  const nameInput = interestModal.querySelector("#interest-name");
  const emailInput = interestModal.querySelector("#interest-email");
  const phoneInput = interestModal.querySelector("#interest-phone");
  const messageInput = interestModal.querySelector("#interest-message");
  const feedback = interestModal.querySelector("#interest-feedback");
  const submitBtn = interestModal.querySelector("#interest-submit");
  const form = interestModal.querySelector(".dialog-form");
  const closeBtn = interestModal.querySelector(".dialog-close");

  const nameError = interestModal.querySelector("#interest-name-error");
  const emailError = interestModal.querySelector("#interest-email-error");
  const phoneError = interestModal.querySelector("#interest-phone-error");
  const messageError = interestModal.querySelector("#interest-message-error");


  const touched = { name: false, email: false, phone: false, message: false };


  function validateForm() {
    const name = sanitize(nameInput.value);
    const email = sanitize(emailInput.value);
    const phone = sanitize(phoneInput.value);
    const message = sanitize(messageInput.value);

    let valid = true;

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
      name.length >= 2 &&
      isValidEmail(email) &&
      (phone.length === 0 || isValidPhone(phone)) &&
      message.length >= 30;

    submitBtn.classList.toggle("btn-disabled", !allGood);

    return valid;
  }

  function closeModal() {
    interestModal.style.display = "none";
    document.body.classList.remove("no-scroll");

    nameInput.removeEventListener("input", onName);
    emailInput.removeEventListener("input", onEmail);
    phoneInput.removeEventListener("input", onPhone);
    messageInput.removeEventListener("input", onMessage);
    form.removeEventListener("submit", onSubmit);
    closeBtn.removeEventListener("click", closeModal);
    document.removeEventListener("keydown", onEscape);
  }

  function onName() { touched.name = true; validateForm(); }
  function onEmail() { touched.email = true; validateForm(); }
  function onPhone() { touched.phone = true; validateForm(); }
  function onMessage() { touched.message = true; validateForm(); }
  function onEscape(event) { if (event.key === "Escape") closeModal(); }

  async function onSubmit(event) {
    event.preventDefault();
    feedback.textContent = "";
    feedback.className = "dialog-feedback";

    touched.name = touched.email = touched.phone = touched.message = true;
    if (!validateForm()) return;

    const name = sanitize(nameInput.value);
    const email = sanitize(emailInput.value);
    const phone = sanitize(phoneInput.value);
    const message = sanitize(messageInput.value);

    submitBtn.classList.add("btn-disabled");

    const envois = list.map((destination) =>
      sendRequest({ type: "interet", destinationId: destination.id, name, email, phone, message })
    );
    const resultats = await Promise.all(envois);

    if (resultats.every((r) => r.ok)) {
      feedback.textContent = multiple
        ? `Demande envoyée pour ${list.length} destinations ! Nous vous recontactons très vite.`
        : "Demande envoyée ! Nous vous recontactons très vite.";
      feedback.classList.add("is-success");
      if (typeof options.onSuccess === "function") options.onSuccess();
      setTimeout(closeModal, 2000);
    } else {
      submitBtn.classList.remove("btn-disabled");
      showFeedback(feedback, "Une erreur est survenue. Réessayez plus tard.", "is-error", false, "dialog-feedback");
    }
  }

  interestModal.querySelector("#interest-title").textContent = multiple ? `Votre sélection (${list.length})` : list[0].name;

  const destinations = interestModal.querySelector("#interest-destinations");
  if (multiple) {
    destinations.textContent = list.map((d) => d.name).join(" · ");
    destinations.hidden = false;
  } else {
    destinations.textContent = "";
    destinations.hidden = true;
  }

  const connected = isLoggedIn();
  interestModal.querySelector("#interest-intro").textContent = connected
    ? "Vos coordonnées sont déjà renseignées. Ajoutez un message si vous le souhaitez, puis envoyez."
    : "Laissez-nous vos coordonnées, un conseiller vous recontacte pour organiser votre voyage.";

  phoneInput.value = "";
  messageInput.value = "";
  feedback.textContent = "";
  feedback.className = "dialog-feedback";
  [nameError, emailError, phoneError, messageError].forEach((el) => { el.textContent = ""; el.style.opacity = "0"; });

  if (connected) {
    const user = getUser();
    nameInput.value = user.pseudo || "";
    emailInput.value = user.email || "";
    nameInput.readOnly = true;
    emailInput.readOnly = true;
    nameInput.classList.add("is-locked");
    emailInput.classList.add("is-locked");
  } else {
    nameInput.value = "";
    emailInput.value = "";
    nameInput.readOnly = false;
    emailInput.readOnly = false;
    nameInput.classList.remove("is-locked");
    emailInput.classList.remove("is-locked");
  }

  nameInput.addEventListener("input", onName);
  emailInput.addEventListener("input", onEmail);
  phoneInput.addEventListener("input", onPhone);
  messageInput.addEventListener("input", onMessage);
  form.addEventListener("submit", onSubmit);
  closeBtn.addEventListener("click", closeModal);
  document.addEventListener("keydown", onEscape);


  validateForm();
  document.body.classList.add("no-scroll");
  interestModal.style.display = "flex";
}
