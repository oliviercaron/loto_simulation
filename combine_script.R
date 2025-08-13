# Load required libraries
library(readr)      # For read_csv2() and write_csv2()
library(dplyr)      # For data manipulation
library(lubridate)  # For date parsing

# Read the reference file to obtain the target column names and formatting
ref_file <- "loto_201911.csv"
ref <- read_csv2(ref_file, col_types = cols(.default = "c"))
# Define the target columns required by your Svelte site
target_cols <- c("date_de_tirage", 
                 "combinaison_gagnante_en_ordre_croissant",
                 "rapport_du_rang1", "rapport_du_rang2", "rapport_du_rang3",
                 "rapport_du_rang4", "rapport_du_rang5", "rapport_du_rang6",
                 "rapport_du_rang7", "rapport_du_rang8", "rapport_du_rang9")

# Define a function to process and adapt each CSV file
process_file <- function(file) {
  # Read the CSV file (semicolon as delimiter)
  df <- read_csv2(file, col_types = cols(.default = "c"))
  
  # Remove any extra whitespace from column names
  colnames(df) <- trimws(colnames(df))
  
  # ---- File-specific adjustments ----
  if (file == "loto.csv") {
    # In loto.csv, rename "numero_joker" to "numero_chance" if it exists
    if ("numero_joker" %in% colnames(df)) {
      colnames(df)[colnames(df) == "numero_joker"] <- "numero_chance"
    }
    # Remove extra columns not needed in the final output
    extra_cols <- c("1er_ou_2eme_tirage", "boule_6", "boule_complementaire")
    df <- df[, !(colnames(df) %in% extra_cols), drop = FALSE]
  }
  # ------------------------------------
  
  # Add any missing target columns with NA values
  missing_cols <- setdiff(target_cols, colnames(df))
  if (length(missing_cols) > 0) {
    for (col in missing_cols) {
      df[[col]] <- NA
    }
  }
  
  # Keep only the target columns
  df <- df[, target_cols, drop = FALSE]
  
  return(df)
}

# List all CSV files in the working directory
files <- list.files(pattern = "\\.csv$")

# Process each file and combine them into one dataframe
df_list <- lapply(files, process_file)
combined_df <- bind_rows(df_list)

# Remove rows that are entirely NA in the target columns,
# and remove duplicate rows (only one row per unique draw)
combined_df <- combined_df %>% 
  filter(!if_all(all_of(target_cols), ~ is.na(.) | . == "")) %>%
  distinct()

# Convert the "date_de_tirage" column to a Date object.
# This handles both "dd/mm/yyyy" and "YYYYMMDD" formats.
# Then, reformat it as "dd/mm/yyyy" to match the reference.
combined_df <- combined_df %>%
  mutate(date_parsed = if_else(grepl("/", date_de_tirage),
                               as.Date(date_de_tirage, format = "%d/%m/%Y"),
                               as.Date(date_de_tirage, format = "%Y%m%d"))) %>%
  arrange(desc(date_parsed)) %>%
  mutate(date_de_tirage = if_else(!is.na(date_parsed),
                                  format(date_parsed, "%d/%m/%Y"),
                                  date_de_tirage)) %>%
  select(-date_parsed)

combined_df <- combined_df %>% distinct(date_de_tirage, .keep_all = TRUE)

# Write the final combined dataframe to a CSV file using semicolon as delimiter
write_csv2(combined_df, "loto_combined.csv")