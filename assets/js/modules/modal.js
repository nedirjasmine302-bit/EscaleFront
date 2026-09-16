import { isValidPassword } from "./security.js";
import { showFeedback } from "./feedback.js";


// Les fenêtres sont écrites dans le HTML de la page
let confirmModal = null;
let passwordModal = null;


// Déplace les fenêtres dans le body pour qu'elles s'affichent par-dessus tout
export function initModals() {
  confirmModal = document.getElementById("confirm-dialog");
  passwordModal = document.getElementById("password-dialog");
  if (confirmModal) document.body.appendChild(confirmModal);
  if (passwordModal) document.body.appendChild(passwordModal);
}


// Fenêtre de confirmation
export function confirmDialog({
  title = "Confirmer",
  message = "",
  confirmText = "Confirmer",
  cancelText = "Annuler",
  danger = false
} = {}) {
  return new Promise((resolve) => {
    if (!confirmModal) return resolve(false);

    const acceptBtn = confirmModal.querySelector("#confirm-accept");
    const cancelBtn = confirmModal.querySelector("#confirm-cancel");
    const titleEl = confirmModal.querySelector("#confirm-title");
    const messageEl = confirmModal.querySelector("#confirm-message");

    titleEl.textContent = title;
    messageEl.textContent = message;
    cancelBtn.textContent = cancelText;
    acceptBtn.textContent = confirmText;
    acceptBtn.className = "btn " + (danger ? "btn-danger" : "btn-primary");

    confirmModal.style.display = "flex";
    document.body.classList.add("no-scroll");

    function cleanup() {
      confirmModal.style.display = "none";
      document.body.classList.remove("no-scroll");
      acceptBtn.removeEventListener("click", onAccept);
      cancelBtn.removeEventListener("click", onCancel);
      document.removeEventListener("keydown", onEscape);
    }

    function onAccept() {
      cleanup();
      resolve(true);
    }

    function onCancel() {
      cleanup();
      resolve(false);
    }

    function onEscape(event) {
      if (event.key === "Escape") onCancel();
    }

    acceptBtn.addEventListener("click", onAccept);
    cancelBtn.addEventListener("click", onCancel);
    document.addEventListener("keydown", onEscape);
  });
}


// Fenêtre de changement de mot de passe employée
export function passwordDialog({
  title = "Nouveau mot de passe",
  message = "Choisissez un mot de passe sécurisé.",
  email = "",
  onSubmit = null
} = {}) {
  return new Promise((resolve) => {
    if (!passwordModal) return resolve(null);

    const titleEl = passwordModal.querySelector("#password-title");
    const messageEl = passwordModal.querySelector("#password-message");
    const emailInput = passwordModal.querySelector("#dialog-email");
    const pwd = passwordModal.querySelector("#dialog-password");
    const pwd2 = passwordModal.querySelector("#dialog-password2");
    const pwdError = passwordModal.querySelector("#dialog-password-error");
    const pwd2Error = passwordModal.querySelector("#dialog-password2-error");
    const feedback = passwordModal.querySelector("#dialog-feedback");
    const submitBtn = passwordModal.querySelector("#dialog-submit");
    const cancelBtn = passwordModal.querySelector("#dialog-cancel");
    const form = passwordModal.querySelector(".dialog-form");

    titleEl.textContent = title;
    messageEl.textContent = message;
    emailInput.value = email;
    pwd.value = "";
    pwd2.value = "";
    feedback.textContent = "";
    feedback.className = "dialog-feedback";
    pwdError.textContent = ""; pwdError.style.opacity = "0";
    pwd2Error.textContent = ""; pwd2Error.style.opacity = "0";

    const touched = { pwd: false, pwd2: false };
    const showError = (el, msg) => { el.textContent = msg; el.style.opacity = "1"; };
    const hideError = (el) => { el.textContent = ""; el.style.opacity = "0"; };

    function validate() {
      let valid = true;

      if (touched.pwd) {
        if (!isValidPassword(pwd.value)) {
          showError(pwdError, "8 caractères, majuscule, minuscule, chiffre, spécial");
          valid = false;
        } else hideError(pwdError);
      }

      if (touched.pwd2) {
        if (pwd.value !== pwd2.value) {
          showError(pwd2Error, "La confirmation n'est pas identique");
          valid = false;
        } else hideError(pwd2Error);
      }

      const allGood = isValidPassword(pwd.value) && pwd.value === pwd2.value;
      submitBtn.classList.toggle("btn-disabled", !allGood);

      return valid;
    }

    function cleanup() {
      passwordModal.style.display = "none";
      document.body.classList.remove("no-scroll");
      pwd.removeEventListener("input", onPwd);
      pwd2.removeEventListener("input", onPwd2);
      cancelBtn.removeEventListener("click", onCancel);
      form.removeEventListener("submit", onFormSubmit);
      document.removeEventListener("keydown", onEscape);
    }

    function done(value) {
      cleanup();
      resolve(value);
    }

    function onPwd() { touched.pwd = true; validate(); }
    function onPwd2() { touched.pwd2 = true; validate(); }
    function onCancel() { done(null); }
    function onEscape(event) { if (event.key === "Escape") done(null); }

    async function onFormSubmit(event) {
      event.preventDefault();
      touched.pwd = touched.pwd2 = true;
      if (!validate()) return;

      feedback.textContent = "";
      feedback.className = "dialog-feedback";
      submitBtn.classList.add("btn-disabled");

      if (typeof onSubmit === "function") {
        const result = await onSubmit(pwd.value);
        if (result && result.ok) {
          feedback.textContent = result.message || "Mot de passe mis à jour !";
          feedback.classList.add("is-success");
          setTimeout(() => done(pwd.value), 1600);
        } else {
          showFeedback(feedback, (result && result.message) || "Une erreur est survenue.", "is-error", false, "dialog-feedback");
          submitBtn.classList.remove("btn-disabled");
        }
      } else {
        done(pwd.value);
      }
    }

    pwd.addEventListener("input", onPwd);
    pwd2.addEventListener("input", onPwd2);
    cancelBtn.addEventListener("click", onCancel);
    form.addEventListener("submit", onFormSubmit);
    document.addEventListener("keydown", onEscape);

    validate();
    passwordModal.style.display = "flex";
    document.body.classList.add("no-scroll");
    setTimeout(() => pwd.focus(), 60);
  });
}
