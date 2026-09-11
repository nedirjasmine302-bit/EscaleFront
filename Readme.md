# Escale — Application dynamique (front)

Front de l'application **Escale** réalisé pour le **Dossier Professionnel DWWM**.
Concept : une **vitrine publique** (catalogue de destinations) et un **back-office
sécurisé** réservé à l'administrateur (connexion par jeton **JWT**).

Il illustre l'**Activité-type 1 (front-end dynamique)** : afficher les données
d'une API et gérer un formulaire (ajout / modification / suppression) protégé par
authentification.

Ce front consomme l'**API Symfony** du dossier `EscaleBack`.

## Stack

- HTML5
- SCSS (compilé avec Dart Sass) + Bootstrap 5
- JavaScript (modules ES) + Router maison (SPA)
- `fetch` pour dialoguer avec l'API REST
- Bootstrap Icons + ESLint

## Pages

- **Accueil** (`/`) : page de présentation (hero, étapes, types de voyage, appel à l'action).
- **Destinations** (`/destinations`) : liste des destinations chargée dynamiquement depuis l'API (accès public).
- **Inscription** (`/sign-up`) : création de compte (email, pseudo, mot de passe) avec validation en direct.
- **Connexion** (`/sign-in`) : connexion d'un membre (email + mot de passe, récupère un jeton JWT).
- **Gestion** (`/management`) : back-office CRUD (ajout / modification / suppression). **Réservé aux membres connectés** : sans jeton, la page affiche « Accès réservé ».

Les lectures (GET) sont publiques ; les écritures (POST/PUT/DELETE) exigent le jeton,
envoyé dans l'en-tête `Authorization: Bearer …`.

## Sécurité

- **Mot de passe fort** exigé : 8 caractères minimum, dont une majuscule, une minuscule, un chiffre et un caractère spécial (vérifié côté front **et** côté API).
- **Rate limiting** anti brute-force sur la connexion et l'inscription (5 tentatives/minute par IP, réponse `429`).
- **Jeton JWT** stateless ; déconnexion automatique si le jeton est expiré/invalide (`401`).

## Compte de démonstration

- **Email** : `admin@escale.fr`
- **Mot de passe** : `escale2026`

(ou créez votre propre compte via la page **Inscription**)

## Configuration de l'API

L'adresse de l'API se règle dans `assets/js/modules/config.js`
(`http://localhost:8000` en local).

## Installation

```bash
npm install
```

## Compiler le SCSS

```bash
npm run build
```

## Lancer en local

```bash
npx serve -l 3000
```

L'API (`EscaleBack`) doit tourner en parallèle sur le port 8000.

## Vérifier le code

```bash
npm run lint
```
