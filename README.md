# 🎯 Simulation Loto (SvelteKit)

[![Deploy](https://github.com/oliviercaron/loto_simulation/actions/workflows/deploy.yml/badge.svg)](https://github.com/oliviercaron/loto_simulation/actions/workflows/deploy.yml)  
**Démo en ligne :** https://oliviercaron.github.io/loto_simulation/

<p align="center">
  <img src="static/demo/simulation_loto.gif" alt="Simulation Loto" width="50%">
</p>

Une petite appli SvelteKit pour simuler vos gains au Loto 🇫🇷 : choisissez 5 numéros + 1 numéro Chance, et voyez ce que ça aurait donné sur tous les tirages depuis 2017. C’est rapide (calculs optimisés), simple, et 100 % côté client.

---

## ✨ Fonctionnalités

- Sélection de **5 numéros** et du **numéro Chance**
- Bouton **“Numéros aléatoires”** et **“Jouer jusqu’à gagner”**
- Calcul sur **tous les tirages** (depuis 2017-03-06)
- **Tri** par *Date* ou *Gain* (asc/desc)
- Statistiques : **dépensé**, **gagné**, **résultat net**
- Chargement local d’un CSV (`static/data/loto_combined.csv`) — rien n’est envoyé côté serveur

> ⚠️ **Disclaimer** : Projet de simulation à but informatif. Non affilié à la FDJ. Aucune garantie. Jouez avec modération.

---

## 🧠 Comment ça marche

- Les données sont lues depuis `static/data/loto_combined.csv` (séparateur `;`) via **d3-dsv**.
- Les comparaisons sont accélérées avec des **bitmasks 32 bits** → calculs très rapides.
- Prix d’un ticket utilisé dans la simulation : **2,20 €** (modifiable dans le code).

---

## 🚀 Lancer en local

### Prérequis
- Node.js **20** recommandé

### Installation & dev
    npm ci
    npm run dev

### Build statique + preview
    npm run build
    npm run preview

L’appli est pré-rendue (**prerender**) et utilisable en hébergement statique (GitHub Pages).

---

## 🌐 Déploiement (GitHub Pages)

- Adapter : **@sveltejs/adapter-static** avec fallback `404.html`
- Base path configuré pour ce repo : **`/loto_simulation`**
- Workflow : `.github/workflows/deploy.yml` publie sur GitHub Pages à chaque push sur `main`

URL de prod : **https://oliviercaron.github.io/loto_simulation/**

---

## 📂 Arborescence utile

    static/
      ├─ data/
      │   └─ loto_combined.csv
      └─ demo/
          └─ simulation_loto.gif   ← le GIF du README
    src/
      └─ routes/
          ├─ +layout.ts            (prerender = true)
          └─ +page.svelte          (logique UI + calcul)

---

## 🛠️ Stack

- **SvelteKit** + **Vite**
- **Tailwind CSS**
- **d3-dsv** (parsing CSV)
- **@number-flow/svelte** (joli compteur animé)
- GitHub Actions + Pages

---

## 🤝 Contribuer

Issues et PRs bienvenues ! Si vous avez des idées d’améliorations (UI, perf, nouvelles stats), n’hésitez pas.

---

## 📜 Licence

MIT — fais-en bon usage ✌️
