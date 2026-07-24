# gen_infos_seller

Script Python qui génère un fichier JSON de statistiques de ventes par produit à partir d'un export CSV Dolistore.

## Prérequis

Installer la dépendance Python :

```bash
pip install -r requirements.txt
```

## Utilisation

### 1. Placer le fichier CSV

Copier le fichier d'export CSV Dolistore dans le **même répertoire** que le script :

```
tools/gen_infos_seller/
├── gen_infos_seller.py
├── requirements.txt
└── _service_page_ajax.csv   ← fichier à placer ici
```

Le fichier doit s'appeler exactement `_service_page_ajax.csv` (séparateur `;`).

### 2. Lancer le script

```bash
python gen_infos_seller.py
```

Le script génère un fichier `stat_products.json` dans le même répertoire.

## Fichier généré : `stat_products.json`

Structure produite :

```json
{
  "SELLER": {
    "produits": [
      { "id": 1954, "nb_sell_level": "+500", "order_module": 0 },
      { "id": 2035, "nb_sell_level": "+250", "order_module": 0 },
      ...
    ]
  }
}
```

Les niveaux de ventes (`nb_sell_level`) sont calculés ainsi :

| Nombre de ventes | Niveau affiché |
|-----------------|----------------|
| ≥ 500           | `"+500"`       |
| ≥ 250           | `"+250"`       |
| ≥ 100           | `"+100"`       |
| ≥ 50            | `"+50"`        |
| ≥ 10            | `"+10"`        |
| < 10            | `0`            |

Les lignes avec un montant négatif (avoirs) sont exclues du calcul.

## Après la génération

Le fichier `stat_products.json` est une base à compléter manuellement avant de l'intégrer dans `datas/SELLERS/`.

### 1. Renommer le fichier

Renommer `stat_products.json` en `<Prénom NOM>.json` (ex. `Charlene BENKE.json`).

### 2. Remplacer la clé `SELLER`

Remplacer la clé `"SELLER"` par le nom du vendeur (ex. `"Charlene BENKE"`).

### 3. Ajouter les informations du vendeur

Compléter l'objet avec les champs suivants :

```json
{
  "Charlene BENKE": {
    "url_site": "https://www.example.com",
    "socname": "Nom de la société",
    "url_logo": "https://example.com/logo.png",
    "preferred_partner": 0,       # 1 si preferred partner, 0 sinon
    "github_contributor_level": 0,  # nombre de contribution dans le core de dolibarr les 12 derniers mois 
    "presentation_text": "Texte de présentation du vendeur",
    "produits": [ ... ]
  }
}
```

le nombre de contributions se trouve ici : https://github.com/Dolibarr/dolibarr/graphs/contributors?from=19%2F07%2F2025

### 4. Ajouter le positionnement des produits (`order_module`)

Pour chaque produit dans le tableau `"produits"`, renseigner le champ `order_module` afin de définir l'ordre d'affichage dans la boutique (entier, `0` = non défini) :

```json
{ "id": 1954, "nb_sell_level": "+500", "order_module": 1 }
```

### 5. soumettre le fichier via une Pull Request

Une fois le fichier prêt dans `datas/SELLERS/`, soumettre une PR sur le dépôt GitHub 
