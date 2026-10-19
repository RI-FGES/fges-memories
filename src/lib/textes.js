import { createContext, useContext } from 'react'
import { doc } from 'firebase/firestore'
import { db } from '../firebase'

// Textes modifiables depuis l'Espace RI (rubrique « Textes du site »).
// Les valeurs ci-dessous sont les textes d'origine : elles s'affichent tant que le service RI
// ne les a pas modifiés, et reviennent si un champ est vidé.
// Mise en forme possible dans les textes : **gras**, retour à la ligne, et des variables entre
// accolades comme {debut}, remplacées automatiquement par les réglages de la campagne.

export const TEXTES_DEFAUT = {
  // ---------- Accueil ----------
  accueil_surtitre: 'Service des Relations Internationales · FGES',
  accueil_titre: 'Le carnet de voyage des étudiants FGES',
  accueil_intro: 'Tu es parti·e en échange ? Colle ton plus beau souvenir dans le carnet, like ceux des autres et vote pour élire les lauréats du semestre.',
  accueil_sans_campagne: 'Aucune campagne n’est ouverte pour le moment. Reviens bientôt !',

  // ---------- Comment ça marche ----------
  ccm_titre: 'Comment ça marche ?',
  ccm_intro: 'Chaque semestre, le carnet s’ouvre pour une nouvelle campagne (en ce moment : {campagne}). Voici l’itinéraire, en quatre escales.',
  escale1_titre: 'Dépose ton souvenir',
  escale1_texte: 'Du **{debut}** au **{fin}**, colle dans le carnet jusqu’à **{photos}** et **{videos}** (60 secondes maximum) de ton échange.',
  escale1_sans_dates: 'Les dates de la prochaine campagne seront bientôt annoncées.',
  escale1_complement: 'Ajoute une légende et, si tu veux, quelques mots pour raconter ton souvenir. Le service RI le valide avant qu’il apparaisse dans la galerie.',
  escale2_titre: 'Like tes coups de cœur',
  escale2_texte: 'Parcours la galerie et like autant de souvenirs que tu veux (un like par souvenir). Les likes ne désignent pas les lauréats : ils servent seulement à départager une égalité de votes.',
  escale3_titre: 'Vote pour tes préférés',
  escale3_texte: '{periode}, tu disposes de **{votes_photo} photo** et de **{votes_video} vidéo**. Tu ne peux pas voter pour ton propre souvenir, et tu peux changer d’avis tant que les votes sont ouverts.',
  escale4_titre: 'Les lauréats',
  escale4_texte: 'Les **5 photos** et les **5 vidéos** qui reçoivent le plus de votes sont élues. Pas de classement entre elles : tous les lauréats sont à égalité.',

  // ---------- Charte (page Comment ça marche et formulaire de dépôt) ----------
  charte_titre: 'La charte de bonne conduite',
  charte_intro: 'Les souvenirs représentent l’image de la FGES et de l’Université Catholique de Lille. Sera refusé tout contenu montrant :',
  charte_points: [
    'nudité ou tenue indécente ;',
    'consommation d’alcool, de cigarettes ou de substances ;',
    'propos ou gestes offensants, discriminatoires ou irrespectueux ;',
    'tout contenu contraire aux valeurs de l’établissement.',
  ],
  charte_personnes: '**Les personnes sur ta photo :** si on reconnaît d’autres personnes sur ton souvenir, demande-leur leur accord avant de le déposer.',
  charte_musique: '**La musique :** évite les chansons connues dans tes vidéos. Si ta vidéo est lauréate, la FGES ne pourra pas la repartager sur ses réseaux à cause des droits d’auteur. Préfère le son d’ambiance, ta voix ou une musique libre de droits.',

  // ---------- Questions fréquentes ----------
  faq: [
    {
      q: 'Qui peut participer ?',
      r: 'Les étudiants de la FGES partis en échange. La plateforme leur est réservée : seuls les étudiants inscrits par le service des Relations Internationales peuvent se connecter, déposer, liker et voter. Si tu es parti·e en échange et que tu n’arrives pas à te connecter, écris au service RI.',
    },
    {
      q: 'Pourquoi mon souvenir n’apparaît pas encore dans la galerie ?',
      r: 'Chaque dépôt est vérifié par le service des Relations Internationales avant publication. Tu peux suivre son statut dans « Mon carnet ».',
    },
    {
      q: 'Je me suis trompé·e dans mon dépôt, je fais comment ?',
      r: 'Tant qu’il n’est pas validé, tu peux corriger sa légende depuis « Mon carnet », ou le retirer et en déposer un nouveau. Une fois publié, écris au service RI.',
    },
    {
      q: 'Je suis à l’autre bout du monde : à quelle heure ferment les dépôts et les votes ?',
      r: 'Toutes les dates sont à l’heure de Paris : tout ferme à 23h59, heure française. Selon ton pays, ça peut tomber le matin du lendemain ou dans l’après-midi. Le compte à rebours de la page d’accueil, lui, est toujours juste, où que tu sois.',
    },
    {
      q: 'Est-ce que je peux changer mon vote ?',
      r: 'Oui, tant que la période de vote est ouverte : retire ton vote sur un souvenir, puis donne-le à un autre.',
    },
    {
      q: 'Qui voit mes photos et vidéos ?',
      r: 'Seuls les étudiants inscrits sur la plateforme et le service RI. Les souvenirs des lauréats pourront aussi être utilisés par la FGES pour sa communication, comme indiqué au moment du dépôt.',
    },
  ],

  // ---------- Formulaire de dépôt ----------
  depot_case_charte: 'J’ai lu la charte et je certifie que mon média la respecte.',
  depot_case_tiers: 'Les personnes reconnaissables sur mon média sont d’accord pour qu’il soit publié sur FGES Memories et, s’il est lauréat, utilisé par la FGES.',
  depot_case_consentement: 'J’accepte que la FGES conserve ce média. S’il fait partie des lauréats, j’autorise la FGES à l’utiliser pour sa communication (réseaux sociaux, site web, promotion de la mobilité internationale).',

  // ---------- Accès refusé ----------
  contact_ri: '',
  acces_refuse_texte: 'FGES Memories est réservé aux étudiants de la FGES partis en échange. L’adresse **{email}** n’est pas sur la liste des voyageurs.',
  acces_refuse_contact: 'Tu es parti·e en échange ? Écris au service des Relations Internationales{contact} pour être ajouté·e.',
}

// Organisation de la rubrique « Textes du site » dans l'Espace RI
export const GROUPES_TEXTES = [
  {
    id: 'accueil', titre: 'Accueil', lien: '/',
    champs: [
      { cle: 'accueil_surtitre', label: 'Petit titre au-dessus', type: 'ligne' },
      { cle: 'accueil_titre', label: 'Titre principal', type: 'ligne' },
      { cle: 'accueil_intro', label: 'Texte d’introduction' },
      { cle: 'accueil_sans_campagne', label: 'Message quand aucune campagne n’est ouverte' },
    ],
  },
  {
    id: 'ccm', titre: 'Comment ça marche', lien: '/comment-ca-marche',
    champs: [
      { cle: 'ccm_titre', label: 'Titre de la page', type: 'ligne' },
      { cle: 'ccm_intro', label: 'Introduction', variables: { campagne: 'nom de la campagne en cours' } },
      { cle: 'escale1_titre', label: 'Escale 1 : titre', type: 'ligne' },
      { cle: 'escale1_texte', label: 'Escale 1 : dates et nombre de dépôts', variables: { debut: 'ouverture des dépôts', fin: 'clôture des dépôts (avec l’heure)', photos: 'ex. « 1 photo »', videos: 'ex. « 1 vidéo »' } },
      { cle: 'escale1_sans_dates', label: 'Escale 1 : quand aucune campagne n’est prévue' },
      { cle: 'escale1_complement', label: 'Escale 1 : texte complémentaire' },
      { cle: 'escale2_titre', label: 'Escale 2 : titre', type: 'ligne' },
      { cle: 'escale2_texte', label: 'Escale 2 : texte' },
      { cle: 'escale3_titre', label: 'Escale 3 : titre', type: 'ligne' },
      { cle: 'escale3_texte', label: 'Escale 3 : texte', variables: { periode: '« Du … au … » ou « Pendant la période de vote (dates bientôt annoncées) »', votes_photo: 'ex. « 1 vote »', votes_video: 'ex. « 2 votes »' } },
      { cle: 'escale4_titre', label: 'Escale 4 : titre', type: 'ligne' },
      { cle: 'escale4_texte', label: 'Escale 4 : texte' },
    ],
  },
  {
    id: 'charte', titre: 'Charte de bonne conduite', lien: '/comment-ca-marche',
    aide: 'La charte s’affiche sur la page « Comment ça marche » et dans le formulaire de dépôt.',
    champs: [
      { cle: 'charte_titre', label: 'Titre', type: 'ligne' },
      { cle: 'charte_intro', label: 'Phrase d’introduction' },
      { cle: 'charte_points', label: 'Contenus refusés', type: 'liste' },
      { cle: 'charte_personnes', label: 'Conseil : personnes visibles sur la photo' },
      { cle: 'charte_musique', label: 'Conseil : musique dans les vidéos' },
    ],
  },
  {
    id: 'faq', titre: 'Questions fréquentes', lien: '/comment-ca-marche',
    champs: [{ cle: 'faq', label: 'Questions et réponses', type: 'faq' }],
  },
  {
    id: 'depot', titre: 'Formulaire de dépôt', lien: '/deposer',
    aide: 'Les trois cases que l’étudiant doit cocher avant d’envoyer son souvenir. Le lien « En savoir plus sur tes données » est ajouté automatiquement à la dernière.',
    champs: [
      { cle: 'depot_case_charte', label: 'Case 1 : charte' },
      { cle: 'depot_case_tiers', label: 'Case 2 : accord des personnes visibles' },
      { cle: 'depot_case_consentement', label: 'Case 3 : conservation et utilisation par la FGES' },
    ],
  },
  {
    id: 'acces', titre: 'Accès refusé', lien: null,
    aide: 'Message affiché à une personne qui se connecte avec une adresse absente de la liste des étudiants autorisés.',
    champs: [
      { cle: 'contact_ri', label: 'Adresse email de contact du service RI', type: 'ligne' },
      { cle: 'acces_refuse_texte', label: 'Message', variables: { email: 'adresse de la personne' } },
      { cle: 'acces_refuse_contact', label: 'Invitation à contacter le service RI', variables: { contact: 'l’adresse de contact entre parenthèses (rien si elle est vide)' } },
    ],
  },
]

// Textes modifiés par le service RI : document unique contenus/textes (lisible par tous)
export const refTextes = () => doc(db, 'contenus', 'textes')

export const TextesContext = createContext({ textes: TEXTES_DEFAUT, modifies: {}, recharger: () => {} })

// Valeur affichée : le texte modifié par le service RI, ou le texte d'origine s'il est vide
export function valeurTexte(modifies, cle) {
  const v = modifies?.[cle]
  const vide = v === undefined || v === null
    || (typeof v === 'string' && !v.trim())
    || (Array.isArray(v) && v.length === 0)
  return vide ? TEXTES_DEFAUT[cle] : v
}

export function useTextes() {
  return useContext(TextesContext)
}
