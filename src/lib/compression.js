// Réduit les photos dans le navigateur avant l'envoi :
// une photo de téléphone (5 à 12 Mo) passe à ~1 Mo, sans perte visible à l'écran.
// Avantages : envoi rapide même depuis l'étranger, plus de photos bloquées par la limite de taille,
// HEIC (iPhone) converti en JPG quand le navigateur sait le lire, stockage Cloudinary économisé.

const COTE_MAX = 2560 // largeur ou hauteur maximale en pixels
const QUALITE = 0.85
export const TAILLE_MAX_ORIGINALE = 40 * 1024 * 1024 // au-delà, on ne tente même pas (mémoire du téléphone)

function decoderAvecImage(fichier) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(fichier)
    const img = new Image()
    img.onload = () => { URL.revokeObjectURL(url); resolve(img) }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Format non lisible')) }
    img.src = url
  })
}

async function decoder(fichier) {
  if (typeof createImageBitmap === 'function') {
    try {
      // respecte l'orientation enregistrée par le téléphone (photo prise en portrait)
      return await createImageBitmap(fichier, { imageOrientation: 'from-image' })
    } catch {
      // certains navigateurs refusent l'option : on essaie autrement
    }
  }
  return decoderAvecImage(fichier)
}

function nomJpg(nom) {
  return `${(nom || 'photo').replace(/\.[^.]+$/, '')}.jpg`
}

/**
 * Prépare une photo pour l'envoi.
 * Renvoie { fichier, apercuPossible } :
 * - fichier : la version réduite en JPG (ou l'originale si on ne peut/doit pas la réduire)
 * - apercuPossible : false si le navigateur ne sait pas afficher ce format (ex. HEIC sur Chrome)
 */
export async function preparerPhoto(fichier) {
  if (fichier.type === 'image/gif' || fichier.type === 'image/svg+xml') return { fichier, apercuPossible: true }

  let image
  try {
    image = await decoder(fichier)
  } catch {
    // Illisible ici (souvent du HEIC sur Chrome/Windows) : on envoie l'original, Cloudinary le convertira
    return { fichier, apercuPossible: false }
  }

  const largeur = image.width || image.naturalWidth
  const hauteur = image.height || image.naturalHeight
  const echelle = Math.min(1, COTE_MAX / Math.max(largeur, hauteur))
  const estJpg = fichier.type === 'image/jpeg'

  // Petite photo déjà en JPG : rien à faire
  if (echelle === 1 && estJpg && fichier.size < 1.5 * 1024 * 1024) {
    image.close?.()
    return { fichier, apercuPossible: true }
  }

  const canvas = document.createElement('canvas')
  canvas.width = Math.round(largeur * echelle)
  canvas.height = Math.round(hauteur * echelle)
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff' // fond blanc pour les PNG transparents
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
  image.close?.()

  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', QUALITE))
  if (!blob) return { fichier, apercuPossible: true }
  // Si la version « réduite » est plus lourde (rare), on garde l'originale
  if (blob.size >= fichier.size && estJpg) return { fichier, apercuPossible: true }

  return {
    fichier: new File([blob], nomJpg(fichier.name), { type: 'image/jpeg', lastModified: Date.now() }),
    apercuPossible: true,
  }
}

// ---------- Vidéos ----------

export const DUREE_MAX_VIDEO = 60 // secondes

// Durée d'une vidéo en secondes (null si le navigateur ne sait pas la lire, ex. certains formats iPhone)
export function dureeVideo(fichier) {
  return new Promise(resolve => {
    const url = URL.createObjectURL(fichier)
    const video = document.createElement('video')
    video.preload = 'metadata'
    const fin = (valeur) => { URL.revokeObjectURL(url); resolve(valeur) }
    video.onloadedmetadata = () => fin(Number.isFinite(video.duration) ? video.duration : null)
    video.onerror = () => fin(null)
    setTimeout(() => fin(null), 8000)
    video.src = url
  })
}
