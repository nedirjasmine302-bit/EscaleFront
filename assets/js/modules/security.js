// Retire les caractères dangereux
export function sanitize(str) {
  return str.replace(/[<>&"'`]/g, "");
}


// Vérifie qu'un email a une forme valide
export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}


// Pseudo : 3 à 20 caractères
export function isValidPseudo(pseudo) {
  return /^[a-zA-Z0-9_-]{3,20}$/.test(pseudo);
}

// Mot de passe fort
export function isValidPassword(password) {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}


// Numéro de téléphone français
export function isValidPhone(phone) {
  return /^(?:(?:\+|00)33[\s.-]?|0)[1-9](?:[\s.-]?\d{2}){4}$/.test(phone);
}
