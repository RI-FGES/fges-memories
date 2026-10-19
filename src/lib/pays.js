// Liste des pays proposés dans le formulaire de dépôt.
// Pour chaque pays : [nom, latitude, longitude] (position de l'épingle sur la carte du monde).
// Le continent sert à la couleur des tampons. Ajoute un pays ici si besoin.

export const CONTINENTS = {
  europe: { label: 'Europe', couleur: '#002d6a' },
  ameriques: { label: 'Amériques', couleur: '#1f6f8b' },
  asie: { label: 'Asie', couleur: '#b8432b' },
  oceanie: { label: 'Océanie', couleur: '#2f7d4f' },
  afrique: { label: 'Afrique & Moyen-Orient', couleur: '#8a5300' },
}

const PAR_CONTINENT = {
  europe: [
    ['Allemagne', 51, 10], ['Autriche', 47.5, 14.5], ['Belgique', 50.6, 4.6], ['Bulgarie', 42.7, 25.3],
    ['Chypre', 35, 33], ['Croatie', 45.2, 15.5], ['Danemark', 56, 10], ['Espagne', 40.3, -3.7],
    ['Estonie', 58.7, 25.5], ['Finlande', 62, 26], ['Grèce', 39.5, 22], ['Hongrie', 47.2, 19.4],
    ['Irlande', 53.3, -8], ['Islande', 64.9, -18.6], ['Italie', 42.8, 12.5], ['Lettonie', 56.9, 24.6],
    ['Lituanie', 55.3, 23.9], ['Luxembourg', 49.8, 6.1], ['Malte', 35.9, 14.4], ['Norvège', 61, 9],
    ['Pays-Bas', 52.2, 5.3], ['Pologne', 52, 19.4], ['Portugal', 39.6, -8], ['République tchèque', 49.8, 15.5],
    ['Roumanie', 45.9, 25], ['Royaume-Uni', 53, -1.5], ['Serbie', 44, 20.9], ['Slovaquie', 48.7, 19.7],
    ['Slovénie', 46.1, 14.8], ['Suède', 62, 15], ['Suisse', 46.8, 8.2], ['Turquie', 39, 35], ['Ukraine', 49, 31],
  ],
  ameriques: [
    ['Argentine', -34, -64], ['Bolivie', -16.3, -63.6], ['Brésil', -10, -52], ['Canada', 50, -95],
    ['Chili', -33, -71], ['Colombie', 4.6, -74], ['Costa Rica', 9.9, -84], ['Cuba', 21.5, -79],
    ['Équateur', -1.5, -78.5], ['États-Unis', 39, -98], ['Guatemala', 15.5, -90.3], ['Mexique', 23.6, -102.5],
    ['Panama', 8.5, -80], ['Paraguay', -23.4, -58.4], ['Pérou', -9.2, -75], ['République dominicaine', 18.7, -70.2],
    ['Uruguay', -32.8, -56],
  ],
  asie: [
    ['Cambodge', 12.6, 105], ['Chine', 35, 104], ['Corée du Sud', 36.5, 127.9], ['Hong Kong', 22.3, 114.2],
    ['Inde', 22, 79], ['Indonésie', -2.5, 118], ['Japon', 36.2, 138.3], ['Kazakhstan', 48, 67],
    ['Malaisie', 3.1, 101.7], ['Mongolie', 46.9, 103.8], ['Népal', 28.4, 84.1], ['Ouzbékistan', 41.4, 64.6],
    ['Philippines', 12.9, 121.8], ['Singapour', 1.35, 103.8], ['Sri Lanka', 7.9, 80.8], ['Taïwan', 23.7, 121],
    ['Thaïlande', 15.9, 101], ['Vietnam', 16, 106],
  ],
  oceanie: [['Australie', -25.3, 133.8], ['Fidji', -17.7, 178], ['Nouvelle-Zélande', -41, 174]],
  afrique: [
    ['Afrique du Sud', -30.6, 22.9], ['Arabie saoudite', 23.9, 45], ['Bénin', 9.3, 2.3], ['Burkina Faso', 12.2, -1.6],
    ['Cameroun', 7.4, 12.4], ['Côte d’Ivoire', 7.5, -5.5], ['Égypte', 26.8, 30.8], ['Émirats arabes unis', 23.4, 53.8],
    ['Ghana', 7.9, -1], ['Israël', 31, 34.9], ['Jordanie', 30.6, 36.2], ['Kenya', 0, 37.9], ['Liban', 33.9, 35.9],
    ['Madagascar', -18.8, 46.9], ['Maroc', 31.8, -7.1], ['Maurice', -20.3, 57.6], ['Nigeria', 9.1, 8.7],
    ['Qatar', 25.4, 51.2], ['Rwanda', -1.9, 29.9], ['Sénégal', 14.5, -14.5], ['Tanzanie', -6.4, 34.9],
    ['Togo', 8.6, 0.8], ['Tunisie', 34, 9.5],
  ],
}

export const PAYS = Object.entries(PAR_CONTINENT)
  .flatMap(([continent, liste]) => liste.map(([nom, lat, lon]) => ({ nom, continent, lat, lon })))
  .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))

const INDEX = Object.fromEntries(PAYS.map(p => [p.nom, p]))

export function infosPays(pays) {
  return INDEX[pays] || null
}

export function continentDe(pays) {
  return INDEX[pays]?.continent || 'europe'
}

export function couleurTampon(pays) {
  return CONTINENTS[continentDe(pays)].couleur
}

export const FILIERES = [
  'L3 SDN', 'L3 SV Biotech', 'L3 SV Ingénieur', 'L3 SV EO', 'M1 DM in B',
  'L2 Eco Finance + Classe Sup', 'L2 Gestion + Classe Sup', 'L3 Eco Finance',
  'L3 IEG', 'L3 IEB', 'L3 Gestion', 'L2 CFA', 'L3 CFA', 'Prépa 3 Eco Finance',
  'Prépa 3 Gestion', 'M1 ME', 'M1 FRD', 'M1 IM', 'M2 IM', 'M1 MRC', 'M2 MRC',
]

export const DUREES = [
  { valeur: 'S1', label: 'Semestre 1' },
  { valeur: 'S2', label: 'Semestre 2' },
  { valeur: 'Année', label: 'Année complète' },
]

// Rotation "aléatoire" mais stable pour un même identifiant (le polaroïd garde son angle)
export function rotationStable(id, amplitude = 2) {
  let h = 0
  for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) | 0
  const t = ((Math.abs(h) % 1000) / 1000) * 2 - 1 // entre -1 et 1
  return Math.round(t * amplitude * 10) / 10
}
