const PREFIX = "rateLimit:";

// Enregistre un blocage pendant `seconds` secondes
export function saveRateLimit(key, seconds) {
  const until = Date.now() + seconds * 1000;
  try {
    localStorage.setItem(PREFIX + key, String(until));
  } catch {
    // localStorage indisponible : on ignore
  }
}


// Retourne le nombre de millisecondes restantes avant la fin du blocage
export function getRateLimitRemaining(key) {
  let raw;
  try {
    raw = localStorage.getItem(PREFIX + key);
  } catch {
    return 0;
  }
  if (!raw) return 0;

  const until = parseInt(raw, 10);
  const remaining = until - Date.now();

  if (!Number.isFinite(until) || remaining <= 0) {
    clearRateLimit(key);
    return 0;
  }

  return remaining;
}


// Supprime le blocage
export function clearRateLimit(key) {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    // rien à faire
  }
}


const COUNT_PREFIX = "attempts:";

// Incrémente le compteur de tentatives et renvoie sa nouvelle valeur
export function bumpAttempts(key) {
  let count = 0;
  try {
    count = parseInt(localStorage.getItem(COUNT_PREFIX + key), 10) || 0;
  } catch {
    // localStorage indisponible : on repart de zéro
  }
  count += 1;
  try {
    localStorage.setItem(COUNT_PREFIX + key, String(count));
  } catch {
    // localStorage indisponible : on ignore
  }
  return count;
}


// Remet le compteur de tentatives à zéro
export function resetAttempts(key) {
  try {
    localStorage.removeItem(COUNT_PREFIX + key);
  } catch {
    // rien à faire
  }
}
