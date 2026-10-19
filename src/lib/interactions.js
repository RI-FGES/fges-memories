import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  collection, query, where, getDocs, doc, getDoc, setDoc, writeBatch, increment, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase'

export const cleType = (type) => (type === 'Vidéo' ? 'video' : 'photo')

export function limiteVotes(campagne, type) {
  const n = cleType(type) === 'video' ? campagne?.nbVotesVideo : campagne?.nbVotesPhoto
  return Number.isInteger(n) && n > 0 ? n : 1
}

// ---------- Médias publiés d'une campagne, gardés en mémoire quelques minutes ----------
// Passer de l'accueil à la galerie, ouvrir un souvenir puis revenir… ne relit pas toute la base à chaque fois :
// le site reste rapide et on reste largement dans le quota gratuit de Firebase.

const DUREE_CACHE = 5 * 60 * 1000 // 5 minutes
const cache = new Map() // campagneId -> { quand, promesse, liste }

function lireMedias(campagneId) {
  const entree = cache.get(campagneId)
  if (entree && Date.now() - entree.quand < DUREE_CACHE) return entree.promesse.then(() => entree.liste)
  const nouvelle = { quand: Date.now(), liste: [] }
  nouvelle.promesse = getDocs(query(collection(db, 'medias'),
    where('campagneId', '==', campagneId), where('statut', '==', 'accepte')))
    .then(snap => {
      const liste = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      liste.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
      nouvelle.liste = liste
    })
    .catch(e => { cache.delete(campagneId); throw e })
  cache.set(campagneId, nouvelle)
  return nouvelle.promesse.then(() => nouvelle.liste)
}

// Répercute un like dans la copie en mémoire (pour le retrouver en revenant sur la galerie)
function majCompteurCache(campagneId, mediaId, delta) {
  const entree = cache.get(campagneId)
  if (!entree) return
  entree.liste = entree.liste.map(m => (m.id === mediaId ? { ...m, nbLikes: Math.max(0, (m.nbLikes || 0) + delta) } : m))
}

// Médias acceptés d'une campagne
export function useMediasCampagne(campagneId) {
  const [etat, setEtat] = useState({ campagneId: null, medias: [] })

  useEffect(() => {
    if (!campagneId) return
    let annule = false
    lireMedias(campagneId)
      .then(liste => { if (!annule) setEtat({ campagneId, medias: liste }) })
      .catch(e => {
        console.error('Chargement des médias impossible', e)
        if (!annule) setEtat({ campagneId, medias: [] })
      })
    return () => { annule = true }
  }, [campagneId])

  const pret = etat.campagneId === campagneId
  return { medias: pret ? etat.medias : [], chargement: campagneId ? !pret : false }
}

// ---------- Likes et bulletin de vote de l'étudiant connecté ----------
// Le nombre de likes est stocké directement sur chaque souvenir (champ nbLikes) :
// la galerie ne lit plus tous les likes de la campagne, seulement ceux de l'étudiant.

// idsValides : identifiants des souvenirs encore publiés (null tant qu'ils chargent).
// Un vote pour un souvenir supprimé ou dépublié ne compte plus et libère sa place.
export function useInteractions(campagne, uid, idsValides = null) {
  const campagneId = campagne?.id
  const [mesLikesEtat, setMesLikes] = useState({ campagneId: null, ids: new Set() })
  const [bulletinEtat, setBulletin] = useState({ campagneId: null, photo: [], video: [] })
  // Likes donnés/retirés pendant la visite (le souvenir affiché ne bouge pas tant qu'on ne recharge pas)
  const [ajustements, setAjustements] = useState({ campagneId: null, map: {} })

  useEffect(() => {
    if (!campagneId || !uid) return
    let annule = false
    async function charger() {
      try {
        const [snapLikes, snapBulletin] = await Promise.all([
          getDocs(query(collection(db, 'likes'), where('campagneId', '==', campagneId), where('uid', '==', uid))),
          getDoc(doc(db, 'bulletins', `${campagneId}_${uid}`)),
        ])
        if (annule) return
        setMesLikes({ campagneId, ids: new Set(snapLikes.docs.map(d => d.data().mediaId)) })
        const b = snapBulletin.exists() ? snapBulletin.data() : {}
        setBulletin({ campagneId, photo: b.photo || [], video: b.video || [] })
        setAjustements({ campagneId, map: {} })
      } catch (e) {
        console.error('Chargement des likes / votes impossible', e)
      }
    }
    charger()
    return () => { annule = true }
  }, [campagneId, uid])

  const mesLikes = useMemo(
    () => (mesLikesEtat.campagneId === campagneId ? mesLikesEtat.ids : new Set()),
    [mesLikesEtat, campagneId],
  )
  const bulletin = useMemo(() => {
    if (bulletinEtat.campagneId !== campagneId) return { photo: [], video: [] }
    const garder = (ids) => (idsValides ? ids.filter(id => idsValides.has(id)) : ids)
    return { photo: garder(bulletinEtat.photo), video: garder(bulletinEtat.video) }
  }, [bulletinEtat, campagneId, idsValides])
  const ajust = useMemo(
    () => (ajustements.campagneId === campagneId ? ajustements.map : {}),
    [ajustements, campagneId],
  )

  const nbLikes = useCallback(
    (media) => Math.max(0, (media.nbLikes || 0) + (ajust[media.id] || 0)),
    [ajust],
  )

  const basculerLike = useCallback(async (media) => {
    const dejaLike = mesLikes.has(media.id)
    const delta = dejaLike ? -1 : 1
    // Mise à jour immédiate de l'affichage, annulée en cas d'erreur
    const appliquer = (ajout, d) => {
      setMesLikes(prev => {
        const ids = new Set(prev.campagneId === campagneId ? prev.ids : [])
        if (ajout) ids.add(media.id); else ids.delete(media.id)
        return { campagneId, ids }
      })
      setAjustements(prev => {
        const map = { ...(prev.campagneId === campagneId ? prev.map : {}) }
        map[media.id] = (map[media.id] || 0) + d
        return { campagneId, map }
      })
    }
    appliquer(!dejaLike, delta)
    try {
      // Le like et le compteur du souvenir sont enregistrés ensemble (tout ou rien)
      const batch = writeBatch(db)
      const refLike = doc(db, 'likes', `${media.id}_${uid}`)
      if (dejaLike) batch.delete(refLike)
      else batch.set(refLike, { uid, mediaId: media.id, campagneId, created_at: serverTimestamp() })
      batch.update(doc(db, 'medias', media.id), { nbLikes: increment(delta) })
      await batch.commit()
      majCompteurCache(campagneId, media.id, delta)
    } catch (e) {
      appliquer(dejaLike, -delta)
      throw e
    }
  }, [mesLikes, uid, campagneId])

  const basculerVote = useCallback(async (media) => {
    const cle = cleType(media.type)
    if (media.uid === uid) throw new Error('Tu ne peux pas voter pour ton propre souvenir.')
    const actuel = bulletin[cle]
    let nouveau
    if (actuel.includes(media.id)) {
      nouveau = actuel.filter(id => id !== media.id)
    } else {
      const limite = limiteVotes(campagne, media.type)
      if (actuel.length >= limite) {
        throw new Error(limite === 1
          ? `Tu as déjà voté pour une ${cle === 'video' ? 'vidéo' : 'photo'}. Retire ton vote pour le donner à un autre souvenir.`
          : `Tu as utilisé tes ${limite} votes ${cle === 'video' ? 'vidéo' : 'photo'}. Retires-en un pour voter ici.`)
      }
      nouveau = [...actuel, media.id]
    }
    const precedent = bulletin
    const suivant = { ...bulletin, [cle]: nouveau }
    setBulletin({ campagneId, ...suivant })
    try {
      await setDoc(doc(db, 'bulletins', `${campagneId}_${uid}`), {
        uid, campagneId, photo: suivant.photo, video: suivant.video, updated_at: serverTimestamp(),
      })
    } catch (e) {
      setBulletin({ campagneId, ...precedent })
      throw e
    }
  }, [bulletin, campagne, campagneId, uid])

  return { nbLikes, mesLikes, bulletin, basculerLike, basculerVote }
}
