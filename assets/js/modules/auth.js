const TOKEN_KEY = "escale_token";
const ROLES_KEY = "escale_roles";
const USER_KEY = "escale_user";


// Récupère le jeton stocké
export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}


// Enregistre le jeton, les rôles et les infos du membre après une connexion réussie
export function setAuth(token, roles, user) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(ROLES_KEY, JSON.stringify(roles || []));
    localStorage.setItem(USER_KEY, JSON.stringify(user || {}));
  } catch {
    // localStorage indisponible : on ignore
  }
}


// Retourne les infos du membre connecté
export function getUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY)) || {};
  } catch {
    return {};
  }
}


// Supprime le jeton, les rôles et les infos du membre
export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ROLES_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {
    // rien à faire
  }
}


// Indique si un utilisateur est connecté
export function isLoggedIn() {
  return !!getToken();
}


// Retourne les rôles mémorisés
export function getRoles() {
  try {
    return JSON.parse(localStorage.getItem(ROLES_KEY)) || [];
  } catch {
    return [];
  }
}


// Indique si l'utilisateur connecté est administrateur
export function isAdmin() {
  return getRoles().includes("ROLE_ADMIN");
}


// Indique si l'utilisateur connecté fait partie de l'équipe
export function isEmployee() {
  const roles = getRoles();
  return roles.includes("ROLE_EMPLOYEE") || roles.includes("ROLE_ADMIN");
}
