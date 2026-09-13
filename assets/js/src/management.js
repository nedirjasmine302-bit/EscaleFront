import { initReveal } from "../modules/animations.js";
import { API_BASE } from "../modules/config.js";
import { isLoggedIn, isEmployee, isAdmin, clearToken, getToken } from "../modules/auth.js";
import { initCustomSelects, getSelectValue, setSelectValue } from "../modules/custom-select.js";
import { confirmDialog, passwordDialog, initModals } from "../modules/modal.js";
import { isValidEmail, isValidPseudo, isValidPassword } from "../modules/security.js";
import { escapeHtml, imageForDestination, TYPE_LABELS } from "../modules/destination-card.js";
import { showFeedback } from "../modules/feedback.js";
import { showError, hideError } from "../modules/field-error.js";


// Vérifie que les champs du formulaire de création d'employé sont valides
export function isStaffFormValid({ pseudo, email, password }) {
  return isValidPseudo(pseudo) && isValidEmail(email) && isValidPassword(password);
}


// Onglets

// Onglets déjà chargés
const loaded = { requests: false, members: false, staff: false, stats: false };


// Affiche le panneau demandé et charge ses données au premier affichage
function showTab(name) {
  document.querySelectorAll(".admin-tab").forEach((tab) => {
    tab.classList.toggle("is-active", tab.dataset.tab === name);
  });
  document.querySelectorAll(".admin-panel").forEach((panel) => {
    panel.hidden = panel.dataset.panel !== name;
  });

  if (name === "requests" && !loaded.requests) loadRequests();
  if (name === "members" && !loaded.members) loadUsers();
  if (name === "staff" && !loaded.staff) loadUsers();
  if (name === "stats" && !loaded.stats) loadStats();
}


// Mémorise l'onglet choisi et l'oublie au changement de page
function initTabs() {
  document.getElementById("admin-tabs").addEventListener("click", (event) => {
    const tab = event.target.closest(".admin-tab");
    if (tab) {
      showTab(tab.dataset.tab);
      sessionStorage.setItem("activeTab", tab.dataset.tab);
    }
  });

  const savedTab = sessionStorage.getItem("activeTab");
  if (savedTab) {
    const savedBtn = document.querySelector(`.admin-tab[data-tab="${savedTab}"]`);
    if (savedBtn && !savedBtn.hidden) showTab(savedTab);
  }
  document.querySelectorAll("a[href]").forEach((link) => {
    link.addEventListener("click", () => sessionStorage.removeItem("activeTab"));
  });
}


// Accès & session

// Si le jeton est refusé on déconnecte et on renvoie à la connexion
function handleExpiredSession(response) {
  if (response.status === 401) {
    clearToken();
    window.location.href = "/sign-in";
    return true;
  }
  return false;
}


// Affiche un message d'accès réservé à la place de l'espace de gestion.
function renderAccessDenied() {
  const page = document.querySelector(".gestion-page");
  if (!page) return;

  const connected = isLoggedIn();
  const message = connected
    ? "Cet espace est réservé à l'équipe de l'agence."
    : "Cet espace est réservé à l'équipe de l'agence. Connectez-vous pour y accéder.";
  const action = connected
    ? `<a href="/" class="btn btn-primary">Retour à l'accueil</a>`
    : `<a href="/sign-in" class="btn btn-primary">Se connecter</a>`;

  page.innerHTML = `
    <div class="gestion-locked scale-in">
      <i class="bi bi-shield-lock"></i>
      <h2>Accès réservé</h2>
      <p>${message}</p>
      ${action}
    </div>
  `;

  initReveal();
}


// En-têtes & filtres

// En-têtes des requêtes authentifiées
function authHeaders() {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}


// Construit une barre de filtres
function buildFilterChips(bar, labels, allLabel = "Toutes") {
  if (!bar || bar.childElementCount) return;
  const chips = [`<button class="filter-chip is-active" data-filter="all">${allLabel}</button>`];
  Object.entries(labels).forEach(([value, label]) => {
    chips.push(`<button class="filter-chip" data-filter="${value}">${label}</button>`);
  });
  bar.innerHTML = chips.join("");
}


// Met en évidence le filtre sélectionné
function setActiveChip(bar, chip) {
  bar.querySelectorAll(".filter-chip").forEach((el) => el.classList.toggle("is-active", el === chip));
}


// Branche une barre de filtres
function initFilterBar(filtersId, onPick) {
  const bar = document.getElementById(filtersId);
  if (!bar) return;

  bar.addEventListener("click", (event) => {
    const chip = event.target.closest("[data-filter]");
    if (!chip) return;
    setActiveChip(bar, chip);
    onPick(chip.dataset.filter);
  });
}


// Section : Destinations

// Appels API
async function getDestinations() {
  const res = await fetch(`${API_BASE}/api/destinations`);
  if (!res.ok) throw new Error("Erreur lors du chargement des destinations.");
  return res.json();
}


async function getCategories() {
  const res = await fetch(`${API_BASE}/api/categories`);
  if (!res.ok) throw new Error("Erreur lors du chargement des continents.");
  return res.json();
}


async function createDestination(data) {
  return fetch(`${API_BASE}/api/destinations`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(data)
  });
}


async function updateDestination(id, data) {
  return fetch(`${API_BASE}/api/destinations/${id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(data)
  });
}


async function deleteDestination(id) {
  return fetch(`${API_BASE}/api/destinations/${id}`, {
    method: "DELETE",
    headers: authHeaders()
  });
}


let destinations = [];
let destFilter = "all";
let editingId = null;
let selectedImage = null;


// Champs du formulaire destination
const DEST_FIELDS = [
  { id: "name", min: 2, empty: "Le nom est obligatoire", short: "Le nom doit contenir au moins 2 caractères", event: "input" },
  { id: "country", min: 2, empty: "Le pays est obligatoire", short: "Le pays doit contenir au moins 2 caractères", event: "input" },
  { id: "type", min: 1, empty: "Veuillez choisir un type de voyage", short: null, event: "click" },
  { id: "category", min: 1, empty: "Veuillez choisir un continent", short: null, event: "click" },
  { id: "description", min: 30, empty: "La description est obligatoire", short: "La description doit contenir au moins 30 caractères", event: "input" }
];


// Champs déjà touchés
const destTouched = { name: false, country: false, type: false, category: false, description: false, image: false };


// Remplit le menu déroulant des continents depuis l'API
async function loadCategories() {
  const optionsBox = document.querySelector("#category .select-options");

  try {
    const categories = await getCategories();
    categories.forEach((category) => {
      const option = document.createElement("li");
      option.className = "select-option";
      option.dataset.value = category.id;
      option.textContent = category.name;
      optionsBox.appendChild(option);
    });
  } catch (error) {
    console.error(error);
  }
}


// Lit un fichier image et le convertit en base64
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}


// Construit une ligne de la liste des destinations
function renderRow(destination) {
  const typeLabel = TYPE_LABELS[destination.type] || destination.type;
  const continent = destination.category ? destination.category.name : "";
  const image = imageForDestination(destination);

  return `
    <div class="gestion-row">
      <img class="gestion-row-thumb" src="${image}" alt="${escapeHtml(destination.name)}" loading="lazy" onerror="this.remove()">
      <div class="gestion-row-info">
        <span class="gestion-row-name">${escapeHtml(destination.name)}</span>
        <span class="gestion-row-meta">${escapeHtml(destination.country)} · ${escapeHtml(continent)} · ${escapeHtml(typeLabel)}</span>
        <p class="gestion-row-desc">${escapeHtml(destination.description)}</p>
      </div>
      <div class="gestion-row-actions">
        <button class="icon-btn edit" data-id="${destination.id}" title="Modifier">
          <i class="bi bi-pencil"></i>
        </button>
        <button class="icon-btn delete" data-id="${destination.id}" title="Supprimer">
          <i class="bi bi-trash"></i>
        </button>
      </div>
    </div>
  `;
}


// Affiche les destinations correspondant au filtre actif
function renderDestinationList() {
  const list = document.getElementById("gestion-list");
  const state = document.getElementById("list-state");

  const visible = destFilter === "all"
    ? destinations
    : destinations.filter((d) => d.type === destFilter);

  if (visible.length === 0) {
    list.innerHTML = "";
    state.classList.remove("d-none");
    state.textContent = "Aucune destination pour ce filtre.";
    return;
  }

  state.classList.add("d-none");
  list.innerHTML = visible.map(renderRow).join("");
}


// Charge et affiche la liste des destinations
async function loadList() {
  const list = document.getElementById("gestion-list");
  const state = document.getElementById("list-state");

  try {
    destinations = await getDestinations();

    if (destinations.length === 0) {
      state.classList.remove("d-none");
      state.textContent = "Aucune destination pour le moment.";
      list.innerHTML = "";
      return;
    }

    buildFilterChips(document.getElementById("destinations-filters"), TYPE_LABELS);
    renderDestinationList();

  } catch (error) {
    state.classList.remove("d-none");
    state.textContent = "Impossible de charger les destinations.";
    console.error(error);
  }
}


// Valeur d'un champ
function fieldValue(id) {
  const el = document.getElementById(id);
  if (el.classList.contains("select")) return getSelectValue(id).trim();
  return el.value.trim();
}


// Valide le formulaire destination
function validateDestination() {
  let valid = true;

  DEST_FIELDS.forEach((field) => {
    const value = fieldValue(field.id);
    const error = document.getElementById(`${field.id}-error`);
    if (destTouched[field.id]) {
      if (value === "") {
        showError(error, field.empty);
        valid = false;
      } else if (field.short && value.length < field.min) {
        showError(error, field.short);
        valid = false;
      } else hideError(error);
    }
  });

  const imageError = document.getElementById("image-error");
  if (destTouched.image) {
    if (!editingId && selectedImage === null) {
      showError(imageError, "Une image est obligatoire");
      valid = false;
    } else hideError(imageError);
  }

  const value = (id) => fieldValue(id);
  const allGood =
    value("name").length >= 2 &&
    value("country").length >= 2 &&
    value("type") !== "" &&
    value("category") !== "" &&
    value("description").length >= 30 &&
    (editingId !== null || selectedImage !== null);

  document.getElementById("submit-btn").classList.toggle("btn-disabled", !allGood);

  return valid;
}


// Marque tous les champs comme touchés
function touchAllDest() {
  Object.keys(destTouched).forEach((key) => (destTouched[key] = true));
}


// Cache toutes les erreurs de champ du formulaire destination
function clearDestErrors() {
  ["name", "country", "type", "category", "description"].forEach((id) => {
    hideError(document.getElementById(`${id}-error`));
  });
  hideError(document.getElementById("image-error"));
}


// Vide le formulaire et repasse en mode ajout
function resetForm() {
  const form = document.getElementById("destination-form");
  form.reset();
  editingId = null;
  selectedImage = null;

  document.getElementById("form-title").textContent = "Ajouter une destination";
  document.getElementById("submit-btn").textContent = "Ajouter";
  document.getElementById("cancel-btn").hidden = true;

  const feedback = document.getElementById("destination-feedback");
  feedback.textContent = "";
  feedback.className = "form-feedback";

  const hint = document.getElementById("image-hint");
  hint.hidden = true;
  hint.textContent = "";

  document.getElementById("upload-preview").hidden = true;
  document.getElementById("upload-empty").hidden = false;

  setSelectValue("type", "");
  setSelectValue("category", "");

  Object.keys(destTouched).forEach((key) => (destTouched[key] = false));
  clearDestErrors();
  validateDestination();
}


// Passe le formulaire en mode modification et le pré-remplit
function startEdit(id) {
  const destination = destinations.find((d) => d.id === id);
  if (!destination) return;

  editingId = id;
  document.getElementById("name").value = destination.name;
  document.getElementById("country").value = destination.country;
  document.getElementById("description").value = destination.description;

  setSelectValue("type", destination.type);
  setSelectValue("category", destination.category ? destination.category.id : "");

  document.getElementById("form-title").textContent = "Modifier la destination";
  document.getElementById("submit-btn").textContent = "Enregistrer";
  document.getElementById("cancel-btn").hidden = false;

  const feedback = document.getElementById("destination-feedback");
  feedback.textContent = "";
  feedback.className = "form-feedback";

  selectedImage = null;
  const hint = document.getElementById("image-hint");
  hint.hidden = false;
  hint.textContent = destination.image ? "Image actuelle conservée si vous n'en choisissez pas d'autre." : "Aucune image pour le moment.";

  const preview = document.getElementById("upload-preview");
  const empty = document.getElementById("upload-empty");
  if (destination.image) {
    preview.src = destination.image.startsWith("data:") ? destination.image : `${API_BASE}/${destination.image}`;
    preview.hidden = false;
    empty.hidden = true;
  } else {
    preview.hidden = true;
    empty.hidden = false;
  }

  Object.keys(destTouched).forEach((key) => (destTouched[key] = false));
  clearDestErrors();
  validateDestination();
  window.scrollTo({ top: 0, behavior: "smooth" });
}


// Envoie le formulaire de destination
async function submitForm(event) {
  event.preventDefault();

  const feedback = document.getElementById("destination-feedback");
  feedback.textContent = "";
  feedback.className = "form-feedback";

  touchAllDest();
  if (!validateDestination()) return;

  const wasEditing = editingId !== null;
  const submitBtn = document.getElementById("submit-btn");
  submitBtn.classList.add("btn-disabled");

  const data = {
    name: document.getElementById("name").value.trim(),
    country: document.getElementById("country").value.trim(),
    type: getSelectValue("type"),
    description: document.getElementById("description").value.trim(),
    categoryId: getSelectValue("category")
  };

  if (selectedImage) {
    try {
      data.image = await fileToBase64(selectedImage);
    } catch {
      showFeedback(feedback, "Impossible de lire l'image.", "is-error");
      submitBtn.classList.remove("btn-disabled");
      return;
    }
  }

  const response = wasEditing
    ? await updateDestination(editingId, data)
    : await createDestination(data);

  if (handleExpiredSession(response)) return;

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const message = body.errors
      ? Object.values(body.errors).join(" ")
      : (body.message || "Une erreur est survenue.");
    showFeedback(feedback, message, "is-error");
    submitBtn.classList.remove("btn-disabled");
    return;
  }

  resetForm();
  showFeedback(document.getElementById("destination-feedback"), wasEditing ? "Destination modifiée !" : "Destination ajoutée !", "is-success");
  loadList();
}


// Gère les clics
async function onListClick(event) {
  const editBtn = event.target.closest(".edit");
  const deleteBtn = event.target.closest(".delete");

  if (editBtn) {
    startEdit(Number(editBtn.dataset.id));
    return;
  }

  if (deleteBtn) {
    const id = Number(deleteBtn.dataset.id);
    const ok = await confirmDialog({
      title: "Supprimer cette destination",
      message: "Elle sera définitivement retirée du catalogue.",
      confirmText: "Supprimer",
      danger: true
    });
    if (!ok) return;

    const response = await deleteDestination(id);
    if (handleExpiredSession(response)) return;
    if (response.ok) {
      if (editingId === id) resetForm();
      loadList();
    }
  }
}


// Panneau Destinations
function initDestinationPanel() {
  loadCategories().then(() => initCustomSelects());
  loadList();

  document.getElementById("destination-form").addEventListener("submit", submitForm);
  document.getElementById("cancel-btn").addEventListener("click", resetForm);
  document.getElementById("gestion-list").addEventListener("click", onListClick);

  initFilterBar("destinations-filters", (value) => {
    destFilter = value;
    renderDestinationList();
  });

  DEST_FIELDS.forEach((field) => {
    document.getElementById(field.id).addEventListener(field.event, () => {
      destTouched[field.id] = true;
      validateDestination();
    });
  });

  document.getElementById("image").addEventListener("change", (event) => {
    selectedImage = event.target.files[0] || null;
    destTouched.image = true;

    const preview = document.getElementById("upload-preview");
    const empty = document.getElementById("upload-empty");
    const hint = document.getElementById("image-hint");

    if (selectedImage) {
      preview.src = URL.createObjectURL(selectedImage);
      preview.hidden = false;
      empty.hidden = true;
      hint.hidden = false;
      hint.textContent = `Image sélectionnée : ${selectedImage.name}`;
    } else {
      preview.hidden = true;
      empty.hidden = false;
      hint.hidden = true;
      hint.textContent = "";
    }
    validateDestination();
  });

  validateDestination();
}


// Section : Requests

// Appels API
async function getRequests() {
  const res = await fetch(`${API_BASE}/api/requests`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Erreur lors du chargement des demandes.");
  return res.json();
}


async function updateRequestStatus(id, status) {
  return fetch(`${API_BASE}/api/requests/${id}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ status })
  });
}


async function deleteRequest(id) {
  return fetch(`${API_BASE}/api/requests/${id}`, {
    method: "DELETE",
    headers: authHeaders()
  });
}


const REQUEST_LABELS = {
  interet: "Intérêt",
  "rendez-vous": "Rendez-vous",
  contact: "Renseignement"
};


let requestGroups = [];
let requestFilter = "all";


// Regroupe en un seul ticket les demandes issues d'un même envoi 
function groupRequests(requests) {
  const groups = [];
  const byKey = new Map();

  requests.forEach((request) => {
    const key = `${request.type}|${request.email}|${request.message || ""}|${request.createdAt}`;
    if (byKey.has(key)) {
      byKey.get(key).items.push(request);
    } else {
      const group = { type: request.type, items: [request] };
      byKey.set(key, group);
      groups.push(group);
    }
  });

  return groups;
}


// Construit une carte de demande
function renderRequestCard(group) {
  const first = group.items[0];
  const label = REQUEST_LABELS[first.type] || first.type;
  const traitee = group.items.every((r) => r.status === "traite");
  const ids = group.items.map((r) => r.id).join(",");

  const names = group.items.filter((r) => r.destination).map((r) => escapeHtml(r.destination.name));
  const destination = names.length ? ` · ${names.join(", ")}` : "";

  const phone = first.phone ? `<span><i class="bi bi-telephone"></i> ${escapeHtml(first.phone)}</span>` : "";
  const message = first.message ? `<p class="request-message">${escapeHtml(first.message)}</p>` : "";

  return `
    <article class="request-card card-${first.type} ${traitee ? "is-done" : ""}" data-request="${ids}">
      <div class="request-top">
        <span class="request-type request-type-${first.type}">${label}${destination}</span>
        <span class="request-status ${traitee ? "done" : "new"}">${traitee ? "Traitée" : "Nouvelle"}</span>
      </div>
      <h3 class="request-name">${escapeHtml(first.name)}</h3>
      <div class="request-contact">
        <span><i class="bi bi-envelope"></i> ${escapeHtml(first.email)}</span>
        ${phone}
        <span><i class="bi bi-calendar3"></i> ${escapeHtml(first.createdAt)}</span>
      </div>
      ${message}
      <div class="request-actions">
        <button class="btn btn-sm btn-toggle-status" data-status="${traitee ? "nouveau" : "traite"}">
          <i class="bi bi-check2-circle"></i> ${traitee ? "Marquer nouvelle" : "Marquer traitée"}
        </button>
        <button class="btn btn-sm btn-danger btn-delete-request">
          <i class="bi bi-trash"></i> Supprimer
        </button>
      </div>
    </article>
  `;
}


// Affiche les demandes correspondant au filtre actif
function renderRequests() {
  const list = document.getElementById("requests-list");
  const state = document.getElementById("requests-state");

  if (requestGroups.length === 0) {
    list.innerHTML = "";
    state.classList.remove("d-none");
    state.textContent = "Aucune demande pour le moment.";
    return;
  }

  const visible = requestFilter === "all"
    ? requestGroups
    : requestGroups.filter((g) => g.type === requestFilter);

  if (visible.length === 0) {
    list.innerHTML = "";
    state.classList.remove("d-none");
    state.textContent = "Aucune demande pour ce filtre.";
    return;
  }

  state.classList.add("d-none");
  list.innerHTML = visible.map(renderRequestCard).join("");
}


// Charge et affiche les demandes
async function loadRequests() {
  const state = document.getElementById("requests-state");
  loaded.requests = true;

  try {
    const requests = await getRequests();
    requestGroups = groupRequests(requests);
    buildFilterChips(document.getElementById("requests-filters"), REQUEST_LABELS);
    renderRequests();

  } catch (error) {
    state.classList.remove("d-none");
    state.textContent = "Impossible de charger les demandes.";
    console.error(error);
  }
}


// Gère les clics dans le panneau Demandes
async function onRequestsClick(event) {
  const card = event.target.closest("[data-request]");
  if (!card) return;
  const ids = card.dataset.request.split(",").map(Number);

  const statusBtn = event.target.closest(".btn-toggle-status");
  if (statusBtn) {
    const responses = await Promise.all(ids.map((id) => updateRequestStatus(id, statusBtn.dataset.status)));
    if (responses.some((r) => handleExpiredSession(r))) return;
    if (responses.every((r) => r.ok)) loadRequests();
    return;
  }

  const deleteBtn = event.target.closest(".btn-delete-request");
  if (deleteBtn) {
    const ok = await confirmDialog({
      title: "Supprimer cette demande",
      message: ids.length > 1
        ? "Ce ticket regroupe plusieurs destinations : elles seront toutes supprimées."
        : "Cette demande sera définitivement supprimée.",
      confirmText: "Supprimer",
      danger: true
    });
    if (!ok) return;
    const responses = await Promise.all(ids.map((id) => deleteRequest(id)));
    if (responses.some((r) => handleExpiredSession(r))) return;
    if (responses.every((r) => r.ok)) loadRequests();
  }
}


// Panneau Demandes
function initRequestsPanel() {
  document.getElementById("requests-list").addEventListener("click", onRequestsClick);
  initFilterBar("requests-filters", (value) => {
    requestFilter = value;
    renderRequests();
  });
}


// Section : Membres & Employees

// Appels API
async function getUsers() {
  const res = await fetch(`${API_BASE}/api/users`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Erreur lors du chargement des comptes.");
  return res.json();
}


async function createEmployee(data) {
  return fetch(`${API_BASE}/api/users`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(data)
  });
}


async function updateUserStatus(id, active) {
  return fetch(`${API_BASE}/api/users/${id}/status`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ active })
  });
}


async function resetUserPassword(id, password) {
  return fetch(`${API_BASE}/api/users/${id}/password`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ password })
  });
}


async function deleteUser(id) {
  return fetch(`${API_BASE}/api/users/${id}`, {
    method: "DELETE",
    headers: authHeaders()
  });
}


let allMembers = [];
let allStaff = [];
let memberFilter = "all";
let staffFilter = "all";


const ACCOUNT_STATUS = { active: "Actifs", suspended: "Suspendus" };
const staffTouched = { pseudo: false, email: false, password: false };


// Indique si un compte fait partie de l'équipe
function isStaffUser(user) {
  return user.roles.includes("ROLE_EMPLOYEE") || user.roles.includes("ROLE_ADMIN");
}


// Libellé de rôle lisible
function roleLabel(user) {
  if (user.roles.includes("ROLE_ADMIN")) return "Administrateur";
  if (user.roles.includes("ROLE_EMPLOYEE")) return "Employé";
  return "Membre";
}


// Bouton suspendre / réactiver
function suspendButton(user) {
  return user.active
    ? `<button class="btn btn-sm btn-suspend" data-id="${user.id}" data-active="false" title="Suspendre le compte">
        <i class="bi bi-pause-circle"></i> Suspendre
      </button>`
    : `<button class="btn btn-sm btn-reactivate" data-id="${user.id}" data-active="true" title="Réactiver le compte">
        <i class="bi bi-play-circle"></i> Réactiver
      </button>`;
}


// Marqueur de compte suspendu dans les infos
function suspendedTag(user) {
  return user.active ? "" : ` <span class="role-chip role-suspended">Suspendu</span>`;
}


// Construit une ligne du tableau des membres
function renderMemberRow(user) {
  return `
    <div class="admin-row ${user.active ? "" : "is-suspended"}">
      <div class="admin-row-info">
        <span class="admin-row-name">${escapeHtml(user.pseudo)}${suspendedTag(user)}</span>
        <span class="admin-row-meta">${escapeHtml(user.email)} · inscrit le ${escapeHtml(user.createdAt)}</span>
      </div>
      <div class="admin-row-actions">
        ${suspendButton(user)}
        <button class="icon-btn delete btn-delete-user" data-id="${user.id}" title="Supprimer">
          <i class="bi bi-trash"></i>
        </button>
      </div>
    </div>
  `;
}


// Construit une ligne du tableau des employés
function renderStaffRow(user) {
  return `
    <div class="admin-row ${user.active ? "" : "is-suspended"}">
      <div class="admin-row-info">
        <span class="admin-row-name">${escapeHtml(user.pseudo)} <span class="role-chip role-staff">${roleLabel(user)}</span>${suspendedTag(user)}</span>
        <span class="admin-row-meta">${escapeHtml(user.email)} · inscrit le ${escapeHtml(user.createdAt)}</span>
      </div>
      <div class="admin-row-actions">
        ${suspendButton(user)}
        <button class="btn btn-sm btn-reset-password" data-id="${user.id}" data-email="${escapeHtml(user.email)}" title="Réinitialiser le mot de passe">
          <i class="bi bi-key"></i> Mot de passe
        </button>
        <button class="icon-btn delete btn-delete-user" data-id="${user.id}" title="Supprimer">
          <i class="bi bi-trash"></i>
        </button>
      </div>
    </div>
  `;
}


// Filtre une liste de comptes selon le statut actif / suspendu
function filterByStatus(users, filter) {
  if (filter === "active") return users.filter((u) => u.active);
  if (filter === "suspended") return users.filter((u) => !u.active);
  return users;
}


// Affiche les membres correspondant au filtre actif
function renderMembers() {
  const list = document.getElementById("members-list");
  const state = document.getElementById("members-state");

  if (allMembers.length === 0) {
    list.innerHTML = "";
    state.classList.remove("d-none");
    state.textContent = "Aucun membre inscrit.";
    return;
  }

  const visible = filterByStatus(allMembers, memberFilter);
  if (visible.length === 0) {
    list.innerHTML = "";
    state.classList.remove("d-none");
    state.textContent = "Aucun membre pour ce filtre.";
    return;
  }

  state.classList.add("d-none");
  list.innerHTML = visible.map(renderMemberRow).join("");
}


// Affiche les employés correspondant au filtre actif
function renderStaff() {
  const list = document.getElementById("staff-list");
  const state = document.getElementById("staff-state");
  if (!list) return;

  if (allStaff.length === 0) {
    list.innerHTML = "";
    state.classList.remove("d-none");
    state.textContent = "Aucun employé.";
    return;
  }

  const visible = filterByStatus(allStaff, staffFilter);
  if (visible.length === 0) {
    list.innerHTML = "";
    state.classList.remove("d-none");
    state.textContent = "Aucun employé pour ce filtre.";
    return;
  }

  state.classList.add("d-none");
  list.innerHTML = visible.map(renderStaffRow).join("");
}


// Charge les comptes et remplit les panneaux Membres et Employés
async function loadUsers() {
  loaded.members = true;
  loaded.staff = true;

  try {
    const users = await getUsers();
    allMembers = users.filter((u) => !isStaffUser(u));
    allStaff = users.filter((u) => u.roles.includes("ROLE_EMPLOYEE") && !u.roles.includes("ROLE_ADMIN"));

    buildFilterChips(document.getElementById("members-filters"), ACCOUNT_STATUS, "Tous");
    buildFilterChips(document.getElementById("staff-filters"), ACCOUNT_STATUS, "Tous");
    renderMembers();
    renderStaff();

  } catch (error) {
    const membersState = document.getElementById("members-state");
    membersState.classList.remove("d-none");
    membersState.textContent = "Impossible de charger les comptes.";
    console.error(error);
  }
}


// Gère les clics dans les panneaux Membres / Employés
async function onUsersClick(event) {
  const statusBtn = event.target.closest(".btn-suspend, .btn-reactivate");
  if (statusBtn) {
    const active = statusBtn.dataset.active === "true";
    const ok = await confirmDialog({
      title: active ? "Réactiver le compte" : "Suspendre le compte",
      message: active
        ? "Ce compte pourra de nouveau se connecter."
        : "Ce compte ne pourra plus se connecter tant qu'il est suspendu.",
      confirmText: active ? "Réactiver" : "Suspendre",
      danger: !active
    });
    if (!ok) return;

    const response = await updateUserStatus(Number(statusBtn.dataset.id), active);
    if (handleExpiredSession(response)) return;
    if (response.ok) loadUsers();
    return;
  }

  const pwdBtn = event.target.closest(".btn-reset-password");
  if (pwdBtn) {
    const id = Number(pwdBtn.dataset.id);
    await passwordDialog({
      title: "Réinitialiser le mot de passe",
      message: "Définissez un nouveau mot de passe pour cet employé.",
      email: pwdBtn.dataset.email || "",
      onSubmit: async (newPassword) => {
        const response = await resetUserPassword(id, newPassword);
        if (response.status === 401) {
          handleExpiredSession(response);
          return { ok: false, message: "Session expirée." };
        }
        const body = await response.json().catch(() => ({}));
        return {
          ok: response.ok,
          message: response.ok ? "Mot de passe mis à jour !" : (body.message || "Impossible de modifier le mot de passe.")
        };
      }
    });
    return;
  }

  const deleteBtn = event.target.closest(".btn-delete-user");
  if (deleteBtn) {
    const ok = await confirmDialog({
      title: "Supprimer ce compte",
      message: "Cette action est définitive.",
      confirmText: "Supprimer",
      danger: true
    });
    if (!ok) return;

    const response = await deleteUser(Number(deleteBtn.dataset.id));
    if (handleExpiredSession(response)) return;
    if (response.ok) {
      loadUsers();
    } else {
      const body = await response.json().catch(() => ({}));
      await confirmDialog({ title: "Suppression impossible", message: body.message || "Action refusée.", confirmText: "OK", cancelText: "Fermer" });
    }
  }
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


// Valide le formulaire employé
async function validateStaff() {
  const pseudo = document.getElementById("staff-pseudo").value.trim();
  const email = document.getElementById("staff-email").value.trim();
  const password = document.getElementById("staff-password").value;

  let valid = true;

  if (staffTouched.pseudo) {
    if (!isValidPseudo(pseudo)) {
      showError(document.getElementById("staff-pseudo-error"), "3 à 20 caractères (lettres, chiffres, _ -)");
      valid = false;
    } else if (!(await checkPseudoUnique(pseudo))) {
      showError(document.getElementById("staff-pseudo-error"), "Ce pseudo est déjà utilisé");
      valid = false;
    } else hideError(document.getElementById("staff-pseudo-error"));
  }

  if (staffTouched.email) {
    if (!isValidEmail(email)) {
      showError(document.getElementById("staff-email-error"), "Email invalide");
      valid = false;
    } else if (!(await checkEmailUnique(email))) {
      showError(document.getElementById("staff-email-error"), "Cet email est déjà utilisé");
      valid = false;
    } else hideError(document.getElementById("staff-email-error"));
  }

  if (staffTouched.password) {
    if (!isValidPassword(password)) {
      showError(document.getElementById("staff-password-error"), "8 caractères, majuscule, minuscule, chiffre, spécial");
      valid = false;
    } else hideError(document.getElementById("staff-password-error"));
  }

  const allGood = isStaffFormValid({ pseudo, email, password });
  document.getElementById("staff-submit").classList.toggle("btn-disabled", !allGood);

  return valid;
}


// Gère la création d'un employé
async function submitStaffForm(event) {
  event.preventDefault();

  const feedback = document.getElementById("staff-feedback");
  feedback.textContent = "";
  feedback.className = "form-feedback";

  staffTouched.pseudo = staffTouched.email = staffTouched.password = true;
  if (!(await validateStaff())) return;

  const data = {
    pseudo: document.getElementById("staff-pseudo").value.trim(),
    email: document.getElementById("staff-email").value.trim(),
    password: document.getElementById("staff-password").value
  };

  const submitBtn = document.getElementById("staff-submit");
  submitBtn.classList.add("btn-disabled");

  const response = await createEmployee(data);
  if (handleExpiredSession(response)) return;

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    showFeedback(feedback, body.message || "Une erreur est survenue.", "is-error");
    submitBtn.classList.remove("btn-disabled");
    return;
  }

  event.target.reset();
  staffTouched.pseudo = staffTouched.email = staffTouched.password = false;
  ["staff-pseudo-error", "staff-email-error", "staff-password-error"].forEach((id) => hideError(document.getElementById(id)));
  validateStaff();
  loaded.staff = false;
  loaded.members = false;
  loadUsers();

  showFeedback(feedback, "Employé créé !", "is-success");
}


// Panneau Membres & Employés
function initUsersPanel() {
  document.getElementById("members-list").addEventListener("click", onUsersClick);

  initFilterBar("members-filters", (value) => {
    memberFilter = value;
    renderMembers();
  });
  initFilterBar("staff-filters", (value) => {
    staffFilter = value;
    renderStaff();
  });

  const staffList = document.getElementById("staff-list");
  if (staffList) staffList.addEventListener("click", onUsersClick);

  const staffForm = document.getElementById("staff-form");
  if (staffForm) {
    staffForm.addEventListener("submit", submitStaffForm);
    ["staff-pseudo", "staff-email", "staff-password"].forEach((id) => {
      document.getElementById(id).addEventListener("input", () => {
        staffTouched[id.replace("staff-", "")] = true;
        validateStaff();
      });
    });
    validateStaff();
  }
}


// Section : Statistiques

// Appel API : classement des destinations les plus consultée
async function getStats() {
  const res = await fetch(`${API_BASE}/api/stats/popular`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Erreur lors du chargement des statistiques.");
  return res.json();
}


// Construit une ligne du classement
function renderStatRow(stat, rank, maxCount) {
  const width = maxCount > 0 ? Math.round((stat.count / maxCount) * 100) : 0;
  const rankClass = rank <= 3 && stat.count > 0 ? `rank-${rank}` : "rank-n";

  return `
    <div class="stat-row">
      <span class="stat-rank ${rankClass}">${rank}</span>
      <div class="stat-info">
        <span class="stat-name">${escapeHtml(stat.name)}</span>
        <span class="stat-country">${escapeHtml(stat.country)}</span>
        <div class="stat-bar"><span style="width: ${width}%"></span></div>
      </div>
      <span class="stat-views"><strong>${stat.count}</strong> demande${stat.count > 1 ? "s" : ""}</span>
    </div>
  `;
}


// Affiche le classement
function renderStats(stats) {
  const list = document.getElementById("stats-list");
  const state = document.getElementById("stats-state");

  if (stats.length === 0) {
    list.innerHTML = "";
    state.classList.remove("d-none");
    state.textContent = "Aucune destination pour le moment.";
    return;
  }

  const maxCount = stats[0].count;
  state.classList.add("d-none");
  list.innerHTML = stats.map((stat, index) => renderStatRow(stat, index + 1, maxCount)).join("");
}


// Charge et affiche le classement des destinations
async function loadStats() {
  const state = document.getElementById("stats-state");
  loaded.stats = true;

  try {
    const stats = await getStats();
    renderStats(stats);

  } catch (error) {
    state.classList.remove("d-none");
    state.textContent = "Impossible de charger les statistiques.";
    console.error(error);
  }
}


// Panneau Statistiques
function initStatsPanel() {
  const refresh = document.getElementById("stats-refresh");
  if (refresh) {
    refresh.addEventListener("click", () => {
      loaded.stats = false;
      loadStats();
    });
  }
}


// Lance le js de la page Gestion quand elle est chargée
function start() {
  initReveal();

  if (!isEmployee()) {
    renderAccessDenied();
    return;
  }

  initModals();

  if (isAdmin()) {
    document.querySelectorAll(".admin-only").forEach((el) => (el.hidden = false));
  }

  initTabs();
  initDestinationPanel();
  initRequestsPanel();
  initUsersPanel();
  initStatsPanel();
}


if (typeof window !== "undefined") start();
