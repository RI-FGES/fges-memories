// Cloud Function : supprime le fichier Cloudinary quand un souvenir est supprimé dans Firestore.
// La clé secrète Cloudinary reste côté serveur (elle n'est plus jamais envoyée au navigateur).
//
// Mise en place (une seule fois) :
//   firebase functions:secrets:set CLOUDINARY_API_SECRET
//   firebase deploy --only functions
// (nécessite le forfait Firebase "Blaze", facturé à l'usage mais gratuit à ce volume)

import { onDocumentDeleted } from 'firebase-functions/v2/firestore'
import { defineSecret, defineString } from 'firebase-functions/params'
import { logger } from 'firebase-functions'
import { v2 as cloudinary } from 'cloudinary'

const CLOUD_NAME = defineString('CLOUDINARY_CLOUD_NAME', { default: 'dorl1r9wq' })
const API_KEY = defineString('CLOUDINARY_API_KEY')
const API_SECRET = defineSecret('CLOUDINARY_API_SECRET')

export const supprimerFichierCloudinary = onDocumentDeleted(
  { document: 'medias/{mediaId}', region: 'europe-west1', secrets: [API_SECRET] },
  async (event) => {
    const media = event.data?.data()
    if (!media?.cloudinary_public_id) return

    cloudinary.config({
      cloud_name: CLOUD_NAME.value(),
      api_key: API_KEY.value(),
      api_secret: API_SECRET.value(),
    })

    // Les anciens dépôts n'ont pas "resource_type" : on devine d'après le type
    const resourceType = media.resource_type || (media.type === 'Vidéo' ? 'video' : 'image')
    try {
      const res = await cloudinary.uploader.destroy(media.cloudinary_public_id, { resource_type: resourceType })
      logger.info('Fichier Cloudinary supprimé', { publicId: media.cloudinary_public_id, resultat: res.result })
    } catch (e) {
      logger.error('Suppression Cloudinary impossible', { publicId: media.cloudinary_public_id, erreur: e.message })
    }
  },
)
