# Escale — Front

Site vitrine et espace de gestion de destinations de voyage pour **Escale**.
C'est la partie **front** du projet : une SPA en **JavaScript vanilla** (sans framework), avec un
petit **Router maison**, du **SCSS** compilé en CSS et **Bootstrap** pour la base des composants.
Elle dialogue avec l'API Symfony du repo **EscaleBack**.

## Stack

- **JavaScript vanilla** (ES Modules) — pas de framework
- **Router maison** (`Router/`) qui injecte les pages dans `index.html`
- **SCSS** (architecture 7-1) compilé avec **Dart Sass**
- **Bootstrap 5** + **Bootstrap Icons**
- **Vitest** pour les tests unitaires
- **ESLint** pour le lint
- Déploiement sur **Netlify**

## Prérequis

- **Node.js 24** → [téléchargement officiel](https://nodejs.org/)
  (npm est inclus avec Node, rien à installer en plus).
- Le back **EscaleBack** qui tourne en local sur `http://localhost:8000` (voir son README)

## Installation

```bash
# 1. Installer les dépendances
npm install

# 2. Compiler le SCSS en CSS (génère assets/css/main.css)
npm run build
```

## Lancer le site en local

Le projet est **100 % statique** : il suffit de servir le dossier avec un petit serveur HTTP.

⚠️ **Important : il faut servir sur le port 3000.**
Le back n'autorise le CORS que depuis `http://localhost:3000` (voir `config/packages/nelmio_cors.yaml`
côté back). Sur un autre port, les appels à l'API seront bloqués par le navigateur.

```bash
# Depuis la racine du projet, avec npx (aucune install globale nécessaire)
npx serve -l 3000
```

Puis ouvrir **http://localhost:3000**.

> Astuce : l'extension **Live Server** de VS Code marche aussi, mais pense à la configurer sur le
> port **3000** (par défaut elle démarre sur 5500).

L'API (`EscaleBack`) doit tourner en parallèle sur le port **8000**.

## Connexion au back

L'URL de l'API est gérée automatiquement dans [`assets/js/modules/config.js`](assets/js/modules/config.js) :

- en **local** (`localhost` / `127.0.0.1`) → `http://localhost:8000`
- en **prod** (Netlify) → l'API Railway en ligne

Rien à modifier : le fichier détecte tout seul l'environnement à partir du nom de domaine.

## Scripts npm

| Commande         | Description                                        |
| ---------------- | -------------------------------------------------- |
| `npm run build`  | Compile `scss/main.scss` → `assets/css/main.css`   |
| `npm run lint`   | Lance ESLint sur tout le projet                    |
| `npm test`       | Lance les tests unitaires (Vitest)                 |

## Structure du projet

```
EscaleFront/
├── index.html            # Coquille de la SPA (header, main, footer)
├── Router/               # Router maison (Route, Router, allRoutes)
├── pages/                # Fragments HTML injectés dans le <main>
├── assets/
│   ├── css/              # CSS compilé depuis le SCSS
│   ├── js/
│   │   ├── src/          # 1 fichier JS par page (logique + appels API)
│   │   ├── modules/      # Modules réutilisables (config, auth, feedback, security…)
│   │   ├── test/         # Tests unitaires Vitest
│   │   └── vendor/       # Bootstrap Icons
│   └── images/
├── scss/                 # Sources SCSS (architecture 7-1)
├── netlify.toml          # Config de build + routage SPA sur Netlify
├── serve.json            # Config du serveur local (routage SPA)
└── package.json
```

## Déploiement

Le front est déployé sur **Netlify** (branche `main`).
La config est dans [`netlify.toml`](netlify.toml) :

- **build** : `npm run build` (compile le SCSS)
- **publish** : la racine du projet
- **redirects** : toute URL inconnue renvoie vers `index.html` pour que le Router maison prenne le relais.
