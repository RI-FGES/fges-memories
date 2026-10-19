// « Nouveautés » du carnet : souvenirs publiés ou refusés depuis la dernière visite de « Mon carnet ».
// Le site n'envoie pas d'e-mails : c'est la pastille du menu qui prévient l'étudiant.
import { versDate } from './campagnes'

const cle = (uid) => `fges-memories-carnet-vu-${uid}`

export function lireDerniereVisite(uid) {
  try {
    return Number(localStorage.getItem(cle(uid))) || 0
  } catch {
    return 0
  }
}

export function marquerCarnetVu(uid) {
  try {
    localStorage.setItem(cle(uid), String(Date.now()))
  } catch {
    // navigation privée : tant pis, la pastille réapparaîtra
  }
}

// Date à laquelle le service RI a pris sa décision sur ce souvenir
function dateDecision(m) {
  if (m.statut === 'accepte') return versDate(m.valide_le)
  if (m.statut === 'refuse') return versDate(m.refuse_le)
  return null
}

export function estNouveau(m, derniereVisite) {
  const d = dateDecision(m)
  return !!d && d.getTime() > derniereVisite
}
