import { collection, query, where, getDocs, writeBatch, doc, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'

export const NB_LAUREATS = 5

// Likes et bulletins de vote bruts d'une campagne (lecture réservée au service RI pour les bulletins)
export async function chargerInteractions(campagneId) {
  const [snapLikes, snapBulletins] = await Promise.all([
    getDocs(query(collection(db, 'likes'), where('campagneId', '==', campagneId))),
    getDocs(query(collection(db, 'bulletins'), where('campagneId', '==', campagneId))),
  ])
  const likes = {}
  snapLikes.docs.forEach(d => {
    const { mediaId } = d.data()
    likes[mediaId] = (likes[mediaId] || 0) + 1
  })
  return { campagneId, likes, nbLikes: snapLikes.size, bulletins: snapBulletins.docs.map(d => d.data()) }
}

// Même chose, en direct : rappelle `surChange` à chaque nouveau like ou vote. Renvoie la fonction d'arrêt.
export function ecouterInteractions(campagneId, surChange, surErreur) {
  let likesDocs = null
  let bulletinsDocs = null
  const publier = () => {
    if (!likesDocs || !bulletinsDocs) return // on attend les deux premières réponses
    const likes = {}
    likesDocs.forEach(d => {
      const { mediaId } = d.data()
      likes[mediaId] = (likes[mediaId] || 0) + 1
    })
    surChange({ campagneId, likes, nbLikes: likesDocs.length, bulletins: bulletinsDocs.map(d => d.data()) })
  }
  const stopLikes = onSnapshot(query(collection(db, 'likes'), where('campagneId', '==', campagneId)),
    snap => { likesDocs = snap.docs; publier() }, surErreur)
  const stopBulletins = onSnapshot(query(collection(db, 'bulletins'), where('campagneId', '==', campagneId)),
    snap => { bulletinsDocs = snap.docs; publier() }, surErreur)
  return () => { stopLikes(); stopBulletins() }
}

// Remet d'aplomb le compteur de likes affiché sur chaque souvenir (champ nbLikes)
// à partir des likes réellement enregistrés. Lancé automatiquement à l'ouverture de l'Espace RI.
export async function synchroniserCompteurs(publies, likes) {
  const aCorriger = publies.filter(m => (m.nbLikes || 0) !== (likes[m.id] || 0))
  for (let i = 0; i < aCorriger.length; i += 400) {
    const batch = writeBatch(db)
    aCorriger.slice(i, i + 400).forEach(m => batch.update(doc(db, 'medias', m.id), { nbLikes: likes[m.id] || 0 }))
    await batch.commit()
  }
  return aCorriger.length
}

/**
 * Compte les votes valides par souvenir :
 * - seulement pour un souvenir publié, de la bonne catégorie
 * - un vote pour son propre souvenir est ignoré
 * - un même souvenir ne compte qu'une fois par bulletin
 */
export function compterVotes(bulletins, mediasParId) {
  const votes = {}
  let nbVotants = 0
  bulletins.forEach(b => {
    let aVote = false
    ;[['photo', 'Photo'], ['video', 'Vidéo']].forEach(([cle, type]) => {
      new Set(b[cle] || []).forEach(id => {
        const m = mediasParId[id]
        if (!m || m.type !== type || m.statut !== 'accepte' || m.uid === b.uid) return
        votes[id] = (votes[id] || 0) + 1
        aVote = true
      })
    })
    if (aVote) nbVotants += 1
  })
  return { votes, nbVotants }
}

// Classement interne (jamais publié tel quel) : votes, puis likes, puis dépôt le plus ancien
export function classerParVotes(medias, votes, likes) {
  return [...medias].sort((a, b) =>
    ((votes[b.id] || 0) - (votes[a.id] || 0)) ||
    ((likes[b.id] || 0) - (likes[a.id] || 0)) ||
    (a.created_at || '').localeCompare(b.created_at || ''))
}

/**
 * Les 5 lauréats d'une catégorie (à égalité, pas de classement entre eux).
 * Signale les souvenirs à égalité de votes avec le dernier retenu mais laissés de côté.
 */
export function designerLaureats(mediasDuType, votes, likes) {
  const avecVotes = classerParVotes(mediasDuType.filter(m => (votes[m.id] || 0) > 0), votes, likes)
  const retenus = avecVotes.slice(0, NB_LAUREATS)
  const dernier = retenus[NB_LAUREATS - 1]
  const exAequoExclus = dernier
    ? avecVotes.slice(NB_LAUREATS).filter(m => votes[m.id] === votes[dernier.id])
    : []
  return { retenus, exAequoExclus }
}

// Version publiée d'un lauréat : pas de votes, uniquement les infos d'affichage
export function versPublication(m) {
  return {
    mediaId: m.id,
    titre: m.titre || '',
    caption: m.caption || '',
    prenom_nom: m.prenom_nom || '',
    filiere: m.filiere || '',
    duree: m.duree || '',
    pays: m.pays || '',
    ville: m.ville || '',
    universite: m.universite || '',
    type: m.type,
    fichier_url: m.fichier_url,
    created_at: m.created_at || '',
  }
}
