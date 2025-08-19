# Charger les bibliothèques nécessaires
library(readr)      # Pour read_csv2() et write_csv2()
library(dplyr)      # Pour la manipulation des données
library(lubridate)  # Pour le traitement des dates

# Définir les colonnes cibles requises par le site Svelte
colonnes_cibles <- c("date_de_tirage", 
                     "combinaison_gagnante_en_ordre_croissant",
                     "rapport_du_rang1", "rapport_du_rang2", "rapport_du_rang3",
                     "rapport_du_rang4", "rapport_du_rang5", "rapport_du_rang6",
                     "rapport_du_rang7", "rapport_du_rang8", "rapport_du_rang9")

# Définir une fonction pour traiter chaque fichier CSV
traiter_fichier <- function(fichier) {
  chemin_fichier <- file.path(repertoire_donnees, fichier)
  cat("📁 Traitement de:", chemin_fichier, "\n")
  
  tryCatch({
    # Lire le fichier CSV (point-virgule comme délimiteur)
    df <- read_csv2(chemin_fichier, col_types = cols(.default = "c"), 
                    skip_empty_rows = TRUE, 
                    locale = locale(encoding = "UTF-8"))
    
    cat("   Lignes lues:", nrow(df), "\n")
    
    # Supprimer les espaces des noms de colonnes
    colnames(df) <- trimws(colnames(df))
    
    # Supprimer les colonnes vides (causées par les point-virgules de fin)
    colonnes_vides <- which(colnames(df) == "" | is.na(colnames(df)))
    if (length(colonnes_vides) > 0) {
      df <- df[, -colonnes_vides, drop = FALSE]
      cat("   Supprimé", length(colonnes_vides), "colonnes vides\n")
    }
    
    # Vérifier les colonnes importantes
    colonnes_presentes <- intersect(colonnes_cibles, colnames(df))
    if (length(colonnes_presentes) == 0) {
      warning("⚠️  Aucune colonne cible trouvée dans ", fichier)
    }
    
    # Ajouter les colonnes cibles manquantes avec des valeurs NA
    colonnes_manquantes <- setdiff(colonnes_cibles, colnames(df))
    if (length(colonnes_manquantes) > 0) {
      for (col in colonnes_manquantes) {
        df[[col]] <- NA
      }
      cat("   Ajouté", length(colonnes_manquantes), "colonnes manquantes\n")
    }
    
    # Garder seulement les colonnes cibles
    df <- df[, colonnes_cibles, drop = FALSE]
    
    # Supprimer les lignes complètement vides
    df <- df %>% filter(!if_all(everything(), ~ is.na(.) | . == ""))
    
    cat("   Lignes finales:", nrow(df), "\n")
    return(df)
    
  }, error = function(e) {
    cat("❌ Erreur avec", chemin_fichier, ":", e$message, "\n")
    return(NULL)
  })
}

# Définir le répertoire des données
repertoire_donnees <- "static/data"

# Lister les fichiers CSV existants dans static/data
fichiers_existants <- list.files(repertoire_donnees, pattern = "\\.csv$", full.names = FALSE)
cat("📂 Fichiers CSV dans", repertoire_donnees, ":", paste(fichiers_existants, collapse = ", "), "\n")

# Chercher aussi les nouveaux fichiers CSV à la racine (dézippés)
nouveaux_fichiers <- list.files(".", pattern = "\\.csv$", full.names = FALSE)
nouveaux_fichiers <- nouveaux_fichiers[nouveaux_fichiers != "loto_combined.csv"] # Exclure notre fichier de sortie

if (length(nouveaux_fichiers) > 0) {
  cat("📥 Nouveaux fichiers trouvés à la racine:", paste(nouveaux_fichiers, collapse = ", "), "\n")
  # Copier vers static/data pour traitement
  for (fichier in nouveaux_fichiers) {
    chemin_src  <- fichier
    chemin_dest <- file.path(repertoire_donnees, fichier)
    dir.create(repertoire_donnees, recursive = TRUE, showWarnings = FALSE)
    ok <- file.copy(chemin_src, chemin_dest, overwrite = TRUE)
    cat("   Copie forcée", fichier, "→", chemin_dest, if (ok) " [OK]\n" else " [ECHEC]\n")
  }
}

# Tous les fichiers disponibles pour traitement
tous_fichiers <- unique(c(fichiers_existants, nouveaux_fichiers))
cat("📋 Total des fichiers disponibles:", paste(tous_fichiers, collapse = ", "), "\n")

# Exclure les anciens fichiers sans numero_chance + le fichier de sortie précédent
fichiers_exclus <- c("loto.csv", "nouveau_loto.csv", "loto_combined.csv")
fichiers <- tous_fichiers[!tous_fichiers %in% fichiers_exclus]

if (length(fichiers_exclus[fichiers_exclus %in% tous_fichiers]) > 0) {
  cat("🚫 Fichiers exclus:", paste(fichiers_exclus[fichiers_exclus %in% tous_fichiers], collapse = ", "), "\n")
}

if (length(fichiers) == 0) {
  stop("❌ Aucun fichier CSV valide trouvé !")
}

cat("✅ Fichiers à traiter:", paste(fichiers, collapse = ", "), "\n\n")

# Traiter chaque fichier et les combiner en un seul dataframe
liste_df <- lapply(fichiers, traiter_fichier)

# Filtrer les résultats NULL (fichiers en erreur)
liste_df <- liste_df[!sapply(liste_df, is.null)]

if (length(liste_df) == 0) {
  stop("❌ Aucun fichier n'a pu être traité avec succès !")
}

# Combiner tous les dataframes
df_combine <- bind_rows(liste_df)
cat("\n📊 Total des lignes avant nettoyage:", nrow(df_combine), "\n")

# Supprimer les lignes entièrement NA et les doublons
df_combine <- df_combine %>% 
  filter(!if_all(all_of(colonnes_cibles), ~ is.na(.) | . == "")) %>%
  distinct()

cat("📊 Lignes après déduplication:", nrow(df_combine), "\n")

# Convertir et formater les dates
df_combine <- df_combine %>%
  mutate(date_analysee = case_when(
    grepl("/", date_de_tirage) ~ as.Date(date_de_tirage, format = "%d/%m/%Y"),
    grepl("^[0-9]{8}$", date_de_tirage) ~ as.Date(date_de_tirage, format = "%Y%m%d"),
    TRUE ~ NA_Date_
  )) %>%
  filter(!is.na(date_analysee)) %>%  # Supprimer les dates non valides
  arrange(desc(date_analysee)) %>%
  mutate(date_de_tirage = format(date_analysee, "%d/%m/%Y")) %>%
  select(-date_analysee)

# Supprimer les dates dupliquées (garder la plus récente)
df_combine <- df_combine %>% distinct(date_de_tirage, .keep_all = TRUE)

cat("📊 Lignes finales:", nrow(df_combine), "\n")

# Vérifier qu'on a des données
if (nrow(df_combine) == 0) {
  stop("❌ Aucune donnée valide après traitement !")
}

# Écrire le fichier final
write_csv2(df_combine, "loto_combined.csv")
cat("✅ Données sauvées dans loto_combined.csv\n")