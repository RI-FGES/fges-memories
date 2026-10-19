import { versDate } from '../../lib/campagnes'

function nomFichier(m) {
  const ext = (m.fichier_url || '').split('?')[0].match(/\.([a-z0-9]+)$/i)?.[1] || (m.type === 'Vidéo' ? 'mp4' : 'jpg')
  const base = `${m.prenom_nom || 'etudiant'}_${m.titre || 'souvenir'}`
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '')
  return `${base}.${ext}`
}

export async function telecharger(m) {
  const res = await fetch(m.fichier_url)
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nomFichier(m)
  a.click()
  URL.revokeObjectURL(url)
}

export async function toutTelecharger(liste) {
  for (const m of liste) {
    await telecharger(m)
    await new Promise(r => setTimeout(r, 500))
  }
}

const cellule = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`

export function exporterCSV(medias, likes, votes, nomCampagne) {
  const lignes = [
    ['Prénom et nom', 'Email', 'Filière', 'Durée', 'Pays', 'Ville', 'Université', 'Type', 'Légende', 'Caption', 'Statut', 'Likes', 'Votes', 'Date de dépôt'],
    ...medias.map(m => [
      m.prenom_nom, m.email, m.filiere, m.duree, m.pays, m.ville, m.universite, m.type, m.titre, m.caption,
      m.statut === 'accepte' ? 'Accepté' : m.statut === 'refuse' ? `Refusé (${m.motif_refus || ''})` : 'En attente',
      likes[m.id] || 0,
      votes[m.id] || 0,
      versDate(m.created_at)?.toLocaleDateString('fr-FR') || '',
    ]),
  ]
  telechargerCSV(lignes, `fges-memories-${(nomCampagne || 'export').replace(/\s+/g, '-')}.csv`)
}

// Télécharge un tableau (liste de lignes) en CSV lisible par Excel
export function telechargerCSV(lignes, nom) {
  const csv = lignes.map(l => l.map(cellule).join(';')).join('\n')
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nom
  a.click()
  URL.revokeObjectURL(url)
}
