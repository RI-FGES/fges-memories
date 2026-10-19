import { createContext, useContext } from 'react'

export const CampagnesContext = createContext(null)

export function useCampagnes() {
  const ctx = useContext(CampagnesContext)
  if (!ctx) throw new Error('useCampagnes doit être utilisé dans <CampagnesProvider>')
  return ctx
}

// Firestore Timestamp | Date | string | null -> Date | null
export function versDate(v) {
  if (!v) return null
  if (typeof v.toDate === 'function') return v.toDate()
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d
}

// Toutes les dates du concours sont à l'heure de Paris,
// même pour un étudiant qui consulte le site depuis Sydney ou Montréal.
export const FUSEAU = 'Europe/Paris'

export function formatDate(v) {
  const d = versDate(v)
  return d ? d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: FUSEAU }) : '—'
}

// Date de clôture : « 12 janvier 2027 à 23h59 (heure de Paris) »
export function formatFin(v) {
  const d = versDate(v)
  if (!d) return '—'
  const heure = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: FUSEAU }).replace(':', 'h')
  return `${formatDate(d)} à ${heure} (heure de Paris)`
}

// Heure locale de l'étudiant pour une date donnée, si elle diffère de Paris
export function heureLocale(v) {
  const d = versDate(v)
  if (!d) return ''
  const local = Intl.DateTimeFormat().resolvedOptions().timeZone
  const options = { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }
  const ici = d.toLocaleString('fr-FR', options)
  const paris = d.toLocaleString('fr-FR', { ...options, timeZone: FUSEAU })
  if (!local || local === FUSEAU || ici === paris) return ''
  return `soit le ${ici.replace(':', 'h')} chez toi`
}

// Date -> "2026-10-01" pour un <input type="date"> (jour à Paris)
export function versInputDate(v) {
  const d = versDate(v)
  if (!d) return ''
  return d.toLocaleDateString('en-CA', { timeZone: FUSEAU }) // format AAAA-MM-JJ
}

// Construit une date « heure de Paris », quel que soit le fuseau de l'ordinateur utilisé
function dateParis(a, m, j, h, min, s) {
  const essai = Date.UTC(a, m - 1, j, h, min, s)
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: FUSEAU, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date(essai))
  const v = Object.fromEntries(parts.map(p => [p.type, Number(p.value)]))
  const vuAParis = Date.UTC(v.year, v.month - 1, v.day, v.hour, v.minute, v.second)
  return new Date(essai - (vuAParis - essai))
}

// "2026-10-01" -> Date (début ou fin de journée, heure de Paris)
export function depuisInputDate(str, finDeJournee = false) {
  if (!str) return null
  const [a, m, j] = str.split('-').map(Number)
  return finDeJournee ? dateParis(a, m, j, 23, 59, 59) : dateParis(a, m, j, 0, 0, 0)
}

function entre(now, debut, fin) {
  const d = versDate(debut)
  const f = versDate(fin)
  if (!d || !f) return false
  return now >= d && now <= f
}

export function phaseCampagne(c, now = new Date()) {
  if (!c) return { depotsOuverts: false, votesOuverts: false, resultatsPublies: false, avantDepots: false, depotsTermines: false }
  const debutDepots = versDate(c.debutDepots)
  const finDepots = versDate(c.finDepots)
  return {
    depotsOuverts: entre(now, c.debutDepots, c.finDepots),
    votesOuverts: entre(now, c.debutVotes, c.finVotes),
    resultatsPublies: !!c.resultatsPublies,
    avantDepots: !!debutDepots && now < debutDepots,
    depotsTermines: !!finDepots && now > finDepots,
  }
}

// La campagne "en cours" : celle marquée active, sinon la plus récente
export function choisirCampagneActive(campagnes) {
  return campagnes.find(c => c.active) || campagnes[0] || null
}

export function trierCampagnes(liste) {
  return [...liste].sort((a, b) => (versDate(b.debutDepots)?.getTime() || 0) - (versDate(a.debutDepots)?.getTime() || 0))
}
