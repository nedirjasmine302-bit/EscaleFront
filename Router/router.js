import Route from "./Route.js";
import { allRoutes, websiteName } from "./allRoutes.js";

// Création d'une route pour la page 404 (page introuvable)
const route404 = new Route("404", "Page introuvable", "/pages/404.html", "/assets/js/src/404.js");
// Fonction pour récupérer la route correspondant à une URL donnée
const getRouteByUrl = (url) => {
    let currentRoute = null;
  // Parcours de toutes les routes pour trouver la correspondance
  allRoutes.forEach((element) => {
    if (element.url == url) {
      currentRoute = element;
    }
  });
  // Si aucune correspondance n'est trouvée, on retourne la route 404
  if (currentRoute != null) {
    return currentRoute;
  } else {
    return route404;
  }
};


const LoadContentPage = async () => {
  const path = window.location.pathname;
  const actualRoute = getRouteByUrl(path);

  const html = await fetch(actualRoute.pathHtml + "?v=" + Date.now()).then((data) => data.text());
  document.getElementById("main-page").innerHTML = html;

  // On remonte en haut de la nouvelle page
  window.scrollTo(0, 0);

  // On retire l'ancien script de page pour éviter qu'ils s'accumulent
  const oldScript = document.querySelector("script[data-page-script]");
  if (oldScript) oldScript.remove();

  if (actualRoute.pathJS != "") {
    var scriptTag = document.createElement("script");
    scriptTag.type = "module";
    scriptTag.setAttribute("data-page-script", "");
    // L'anti-cache (?v=...) force le module à se ré-exécuter à chaque visite,
    // sinon le JS ne repasse pas lors d'un retour arrière (modules ES exécutés une seule fois).
    scriptTag.src = actualRoute.pathJS + "?v=" + Date.now();
    document.body.appendChild(scriptTag);
  }

  document.title = actualRoute.title + " - " + websiteName;
};


// Navigation SPA : on intercepte les clics sur les liens internes (href commençant par "/")
document.addEventListener("click", (event) => {
  // On laisse le navigateur gérer l'ouverture dans un nouvel onglet (Ctrl / Cmd / Maj + clic)
  if (event.ctrlKey || event.metaKey || event.shiftKey) return;

  const link = event.target.closest("a");
  if (!link) return;

  const href = link.getAttribute("href");
  // Liens externes (http, #, mailto...) : on laisse la navigation normale
  if (!href || !href.startsWith("/")) return;

  event.preventDefault();
  // Mise à jour de l'URL dans l'historique, puis chargement de la nouvelle page
  window.history.pushState({}, "", href);
  LoadContentPage();
});

// Compatibilité : d'anciens liens pouvaient utiliser onclick="route(event)" ; désormais inutile
window.route = () => {};

// Gestion du retour / avancer dans l'historique du navigateur
window.onpopstate = LoadContentPage;

// Chargement du contenu de la page au chargement initial
LoadContentPage();
