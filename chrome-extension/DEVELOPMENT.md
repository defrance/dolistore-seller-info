# Guide de développement & test

## Tester l'extension dans Chrome (ou Edge)

### 1. Ouvrir la page des extensions

- Dans Chrome : ouvre un onglet et va sur `chrome://extensions`
- Dans Edge : `edge://extensions`

### 2. Activer le mode développeur

En haut à droite de la page, active le bouton **"Mode développeur"** (Developer mode).

### 3. Charger l'extension non empaquetée

Clique sur **"Charger l'extension non empaquetée"** (Load unpacked), puis sélectionne le **dossier racine** du projet :

```
dolistore-info/
```

L'extension apparaît alors dans la liste avec son nom `Dolistore Seller Info`.

### 4. Tester sur Dolistore

Va sur [https://www.dolistore.com](https://www.dolistore.com), navigue vers la page d'un module et **Alt+Clic** sur le nom du vendeur pour ouvrir sa fiche.

> Sur Mac : **⌥ Option + Clic**

---

## Fichier de données local (phase de test)

Pendant les tests, les données vendeurs sont chargées depuis le fichier local :

```
dolistore_author.json
```

Dans `seller/seller.js`, la constante `DATA_URL` contrôle la source :

```js
// Mode test (fichier local)
const DATA_URL = chrome.runtime.getURL('dolistore_author.json');

// Mode production (URL externe) — décommenter quand disponible
// const DATA_URL = 'https://www.patas-monkey.com/dolistore/sellers.json';
```

> **Important :** lors du passage en production, vide le cache de l'extension via la console de l'extension :
> ```js
> chrome.storage.local.clear()
> ```

---

## Recharger l'extension après une modification

Après chaque modification de fichier, retourne sur `chrome://extensions` et clique sur l'icône **↺ (Recharger)** à côté de l'extension.

> Les modifications du `content_script` nécessitent également de **rafraîchir l'onglet Dolistore** ouvert.

---

## Structure du projet

```
dolistore-info/
├── manifest.json          # Configuration de l'extension
├── background.js          # Service worker (ouvre la page vendeur)
├── content.js             # Injecté sur dolistore.com (détecte Alt+Clic)
├── dolistore_author.json  # Données vendeurs (test local)
├── popup/
│   └── popup.html         # Popup de l'icône extension
└── seller/
    ├── seller.html        # Page de fiche vendeur
    └── seller.js          # Chargement et affichage des données vendeur
```

---

## Mettre en ligne le fichier de données

### 1. Générer le fichier JSON

Lance le script Python qui scrape Dolistore et produit `dolistore_author.json`.

### 2. Uploader le fichier sur le serveur

Déposer le fichier à l'adresse suivante (via FTP, SSH ou interface d'admin) :

```
https://www.patas-monkey.com/docs/dolistore_author.json
```

### 3. Vérifier que le fichier est accessible

Ouvre directement l'URL dans un navigateur et vérifie que le JSON s'affiche correctement :

```
https://www.patas-monkey.com/docs/dolistore_author.json
```

### 4. Vider le cache de l'extension

Le cache est valide 24h et versionné (`DSI_VERSION`). Pour forcer le rechargement immédiat après un upload :

- Ouvre `chrome://extensions`
- Clique sur **"Page d'arrière-plan"** (service worker) de l'extension
- Dans la console, exécute :

```js
chrome.storage.local.clear()
```

- Recharge ensuite l'extension (bouton **↺**)

### 5. Incrémenter la version en cas de changement de structure

Si des champs sont ajoutés ou modifiés dans le JSON, incrémenter `DSI_VERSION` dans `background.js` pour invalider automatiquement le cache chez tous les utilisateurs :

```js
// background.js
const BG_VERSION = 3; // incrémenter à chaque changement de structure JSON
```

---

## Packager l'extension Chrome

### Option A — ZIP pour le Chrome Web Store

C'est la méthode recommandée pour publier ou distribuer l'extension.

1. S'assurer que `manifest.json` est à jour (version, permissions, etc.)
2. **Supprimer** les fichiers inutiles du dossier (`dolistore_author.json` si les données viennent de l'URL externe, fichiers `.DS_Store`, etc.)
3. Créer le ZIP depuis le terminal en se plaçant **dans** le dossier du projet :

```bash
cd "chemin/vers/dolistore-info"
zip -r ../dolistore-info.zip . --exclude "*.DS_Store" --exclude ".git/*"
```

4. Le fichier `dolistore-info.zip` est créé un niveau au-dessus du projet.

### Option B — Empaqueter depuis Chrome (fichier .crx)

Pour un partage direct sans passer par le Chrome Web Store :

1. Ouvre `chrome://extensions`
2. Active le **Mode développeur**
3. Clique sur **"Empaqueter l'extension"** (Pack extension)
4. Dans **"Répertoire racine"**, sélectionne le dossier `dolistore-info/`
5. Laisse **"Fichier de clé privée"** vide pour la première fois (Chrome en génère une)
6. Clique sur **"Empaqueter l'extension"** → Chrome crée `.crx` et `.pem` dans le dossier parent

> ⚠️ Conserve précieusement le fichier `.pem` : il est nécessaire pour signer les mises à jour futures avec la même identité.

### Publier sur le Chrome Web Store

1. Aller sur [https://chrome.google.com/webstore/devconsole](https://chrome.google.com/webstore/devconsole)
2. Créer ou sélectionner un élément
3. Uploader le fichier `.zip`
4. Remplir la fiche (description, captures d'écran)
5. Soumettre pour révision
