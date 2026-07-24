import pandas as pd
import json

import pathlib
import os

myFolderpath = pathlib.Path(__file__).parent.resolve()
os.chdir(myFolderpath)

FICHIER_CSV = '_service_page_ajax.csv'

def generer_stat_produits(fichier_csv):
    """
    Lit le fichier CSV des ventes et génère un fichier JSON
    contenant le nombre de ventes par produit.

    Structure JSON générée :
    {
      "SELLER": {
        "produits": [
          { "id": <Product id>, "nb_sell_level": <nb ventes> },
          ...
        ]
      }
    }
    """
    try:
        df = pd.read_csv(fichier_csv, sep=';')
        print(f"Fichier chargé : {len(df)} lignes")
    except FileNotFoundError:
        print(f"Erreur : fichier '{fichier_csv}' introuvable")
        return
    except Exception as e:
        print(f"Erreur lors du chargement : {e}")
        return

    col_id = 'Product id'
    if col_id not in df.columns:
        print(f"Erreur : colonne '{col_id}' absente. Colonnes disponibles : {list(df.columns)}")
        return

    # Suppression des lignes avec un montant négatif (avoirs)
    col_montant = 'Amount earned (HT)'
    if col_montant in df.columns:
        df[col_montant] = (
            df[col_montant]
            .astype(str)
            .str.replace(',', '.', regex=False)
            .str.replace(' ', '', regex=False)
        )
        df[col_montant] = pd.to_numeric(df[col_montant], errors='coerce')
        df = df[df[col_montant] > 0]

    # Comptage du nombre de ventes par produit
    stats = (
        df.groupby(col_id)
        .size()
        .reset_index(name='nb_sell_level')
        .sort_values('nb_sell_level', ascending=False)
    )

    def get_sell_level(nb):
        if nb >= 500:
            return "+500"
        elif nb >= 250:
            return "+250"
        elif nb >= 100:
            return "+100"
        elif nb >= 50:
            return "+50"
        elif nb >= 10:
            return "+10"
        else:
            return 0

    produits = [
        {"id": int(row[col_id]), "nb_sell_level": get_sell_level(int(row['nb_sell_level'])), "order_module": 0}
        for _, row in stats.iterrows()
    ]

    result = {
        "SELLER": {
            "produits": produits
        }
    }

    fichier_json = 'stat_products.json'
    with open(fichier_json, 'w', encoding='utf-8') as f:
        json.dump(result, f, indent=2, ensure_ascii=False)

    print(f"Fichier JSON généré : {fichier_json} ({len(produits)} produits)")


if __name__ == '__main__':
    generer_stat_produits(FICHIER_CSV)
