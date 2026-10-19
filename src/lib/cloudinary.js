const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

export const TAILLE_MAX = {
  Photo: 10 * 1024 * 1024,   // 10 Mo
  Vidéo: 100 * 1024 * 1024,  // 100 Mo
}

export function typeDepuisFichier(fichier) {
  if (!fichier) return null
  if (fichier.type.startsWith('video/')) return 'Vidéo'
  if (fichier.type.startsWith('image/')) return 'Photo'
  // Certains navigateurs ne reconnaissent pas les formats iPhone : on regarde l'extension
  const ext = (fichier.name || '').split('.').pop().toLowerCase()
  if (['heic', 'heif'].includes(ext)) return 'Photo'
  if (['mov', 'mp4', 'm4v', 'hevc'].includes(ext)) return 'Vidéo'
  return null
}

// Upload non signé. "auto" = Cloudinary détecte seul image ou vidéo
// (l'ancienne version envoyait tout sur /image/upload, ce qui refusait les vidéos).
export function uploaderFichier(fichier, onProgression) {
  return new Promise((resolve, reject) => {
    const formData = new FormData()
    formData.append('file', fichier)
    formData.append('upload_preset', UPLOAD_PRESET)
    formData.append('folder', 'fges-memories')

    const xhr = new XMLHttpRequest()
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgression) onProgression(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText)
        if (xhr.status >= 200 && xhr.status < 300 && data.secure_url) {
          resolve({ url: data.secure_url, publicId: data.public_id, resourceType: data.resource_type })
        } else {
          reject(new Error(data?.error?.message || "L'envoi du fichier a échoué."))
        }
      } catch {
        reject(new Error("Réponse inattendue du serveur d'images."))
      }
    }
    xhr.onerror = () => reject(new Error('Connexion perdue pendant l’envoi. Réessaie avec une meilleure connexion.'))
    xhr.send(formData)
  })
}

function insererTransformation(url, transformation) {
  return url.replace('/upload/', `/upload/${transformation}/`)
}

// Version allégée pour la galerie (au lieu du fichier original de plusieurs Mo)
export function miniature(url, largeur = 600) {
  if (!url || !url.includes('res.cloudinary.com')) return url
  if (url.includes('/video/upload/')) {
    // Image de couverture tirée de la 1re seconde de la vidéo
    return insererTransformation(url, `so_1,f_jpg,q_auto,w_${largeur},c_limit`).replace(/\.[a-z0-9]+$/i, '.jpg')
  }
  return insererTransformation(url, `f_auto,q_auto,w_${largeur},c_limit`)
}

export function videoOptimisee(url) {
  if (!url || !url.includes('/video/upload/')) return url
  return insererTransformation(url, 'q_auto')
}
