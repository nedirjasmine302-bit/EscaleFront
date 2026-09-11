import Route from "./Route.js";
//Définir ici vos routes
export const allRoutes = [
  new Route("/", "Accueil", "/pages/home.html", "/assets/js/src/home.js"),
  new Route("/destinations", "Destinations", "/pages/destinations.html", "/assets/js/src/destinations.js"),
  new Route("/contact", "Contact", "/pages/contact.html", "/assets/js/src/contact.js"),
  new Route("/sign-up", "Inscription", "/pages/sign-up.html", "/assets/js/src/sign-up.js"),
  new Route("/sign-in", "Connexion", "/pages/sign-in.html", "/assets/js/src/sign-in.js"),
  new Route("/favorites", "Mes favoris", "/pages/favorites.html", "/assets/js/src/favorites.js"),
  new Route("/forgot-password", "Mot de passe oublié", "/pages/forgot-password.html", "/assets/js/src/forgot-password.js"),
  new Route("/reset-password", "Réinitialisation", "/pages/reset-password.html", "/assets/js/src/reset-password.js")];
//Le titre s'affiche comme ceci : Route.titre - websitename
export const websiteName = "Escale";
