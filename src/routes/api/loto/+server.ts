// src/routes/api/loto/+server.ts
import { json } from '@sveltejs/kit';
import fs from 'fs';
import { dsvFormat } from 'd3-dsv';

export async function GET() {
  // Lire le fichier CSV sur le serveur (dans le répertoire statique ou ailleurs)
  const csvFilePath = 'static/data/loto_201911.csv'; // Chemin vers le fichier CSV
  const csvText = fs.readFileSync(csvFilePath, 'utf-8');

  // Utiliser d3-dsv pour parser le fichier CSV
  const semicolonParser = dsvFormat(';');
  const parsedData = semicolonParser.parse(csvText);

  // Traiter les données CSV pour les formater en JSON
  const lotoData = parsedData.map((draw) => {
    const [combinaison, chance] = draw.combinaison_gagnante_en_ordre_croissant.split('+');
    const drawNumbers = combinaison.split('-').map(Number);

    return {
      date: draw.date_de_tirage,
      draw: drawNumbers,
      chance: +chance,
      gains: {
        rang1: parseFloat((draw.rapport_du_rang1 || '0').replace(',', '.')) || 0,
        rang2: parseFloat((draw.rapport_du_rang2 || '0').replace(',', '.')) || 0,
        rang3: parseFloat((draw.rapport_du_rang3 || '0').replace(',', '.')) || 0,
        rang4: parseFloat((draw.rapport_du_rang4 || '0').replace(',', '.')) || 0,
        rang5: parseFloat((draw.rapport_du_rang5 || '0').replace(',', '.')) || 0,
        rang6: parseFloat((draw.rapport_du_rang6 || '0').replace(',', '.')) || 0,
        rang7: parseFloat((draw.rapport_du_rang7 || '0').replace(',', '.')) || 0,
        rang8: parseFloat((draw.rapport_du_rang8 || '0').replace(',', '.')) || 0,
        rang9: parseFloat((draw.rapport_du_rang9 || '0').replace(',', '.')) || 0,
      },
    };
  });

  // Retourner les données au client
  return json(lotoData);
}
