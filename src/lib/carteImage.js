// Génère l'image « carte postale » d'un souvenir (format story 1080×1920),
// à télécharger ou à partager sur Instagram.
import { miniature } from './cloudinary'
import { couleurTampon, rotationStable } from './pays'

const L = 1080
const H = 1920
const COULEURS = {
  papier: '#faf6ef', papier2: '#efe6d6', marine: '#002d6a', corail: '#b8432b',
  texte: '#3d3a33', doux: '#6b6457', trait: '#d9cfbd', blanc: '#ffffff',
}
const POLICES = {
  titre: '"Bricolage Grotesque", system-ui, sans-serif',
  texte: '"DM Sans", system-ui, sans-serif',
  main: '"Caveat", cursive',
}

function chargerImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous' // indispensable pour pouvoir exporter le canvas
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Image introuvable'))
    img.src = url
  })
}

async function attendrePolices() {
  if (!document.fonts?.load) return
  await Promise.all([
    document.fonts.load(`800 60px ${POLICES.titre}`),
    document.fonts.load(`500 40px ${POLICES.texte}`),
    document.fonts.load(`700 40px ${POLICES.texte}`),
    document.fonts.load(`700 60px ${POLICES.main}`),
    document.fonts.load(`500 60px ${POLICES.main}`),
  ]).catch(() => {})
}

// Coupe un texte en lignes qui tiennent dans la largeur donnée
function decouper(ctx, texte, largeur, maxLignes) {
  const mots = (texte || '').split(/\s+/).filter(Boolean)
  const lignes = []
  let ligne = ''
  for (const mot of mots) {
    const essai = ligne ? `${ligne} ${mot}` : mot
    if (ctx.measureText(essai).width <= largeur || !ligne) ligne = essai
    else { lignes.push(ligne); ligne = mot }
  }
  if (ligne) lignes.push(ligne)
  if (lignes.length > maxLignes) {
    const garde = lignes.slice(0, maxLignes)
    let derniere = garde[maxLignes - 1]
    while (derniere.length && ctx.measureText(`${derniere}…`).width > largeur) derniere = derniere.slice(0, -1)
    garde[maxLignes - 1] = `${derniere.trimEnd()}…`
    return garde
  }
  return lignes
}

// Dessine l'image en mode « cover » (remplit le cadre en recadrant)
function dessinerCouverture(ctx, img, x, y, l, h) {
  const ratio = Math.max(l / img.width, h / img.height)
  const sl = l / ratio
  const sh = h / ratio
  ctx.drawImage(img, (img.width - sl) / 2, (img.height - sh) / 2, sl, sh, x, y, l, h)
}

function fond(ctx) {
  ctx.fillStyle = COULEURS.papier
  ctx.fillRect(0, 0, L, H)
  // lignes de carnet discrètes
  ctx.strokeStyle = 'rgba(217, 207, 189, 0.45)'
  ctx.lineWidth = 2
  for (let y = 360; y < H - 200; y += 64) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(L, y); ctx.stroke()
  }
}

function entete(ctx, nomCampagne) {
  ctx.textAlign = 'center'
  ctx.fillStyle = COULEURS.corail
  ctx.font = `700 30px ${POLICES.texte}`
  ctx.fillText('CARNET DE VOYAGE', L / 2, 120)
  ctx.fillStyle = COULEURS.marine
  ctx.font = `800 78px ${POLICES.titre}`
  ctx.fillText('FGES Memories', L / 2, 205)
  if (nomCampagne) {
    ctx.fillStyle = COULEURS.doux
    ctx.font = `500 32px ${POLICES.texte}`
    ctx.fillText(`Campagne ${nomCampagne}`, L / 2, 258)
  }
}

function polaroid(ctx, img, titre, angle) {
  const l = 820
  const photo = 740
  const h = photo + 40 + 170
  const x = (L - l) / 2
  const y = 330
  ctx.save()
  ctx.translate(L / 2, y + h / 2)
  ctx.rotate(angle)
  ctx.translate(-L / 2, -(y + h / 2))
  // ombre
  ctx.shadowColor = 'rgba(20, 20, 19, 0.22)'
  ctx.shadowBlur = 40
  ctx.shadowOffsetY = 18
  ctx.fillStyle = COULEURS.blanc
  ctx.fillRect(x, y, l, h)
  ctx.shadowColor = 'transparent'
  // photo
  if (img) dessinerCouverture(ctx, img, x + 40, y + 40, photo, photo)
  else { ctx.fillStyle = COULEURS.papier2; ctx.fillRect(x + 40, y + 40, photo, photo) }
  // légende manuscrite
  ctx.fillStyle = COULEURS.marine
  ctx.textAlign = 'center'
  ctx.font = `700 64px ${POLICES.main}`
  const lignes = decouper(ctx, titre, photo - 40, 2)
  const base = lignes.length === 1 ? y + photo + 140 : y + photo + 112
  lignes.forEach((t, i) => ctx.fillText(t, L / 2, base + i * 60))
  // morceau de scotch
  ctx.fillStyle = 'rgba(232, 199, 122, 0.75)'
  ctx.translate(L / 2, y)
  ctx.rotate(-0.05)
  ctx.fillRect(-110, -26, 220, 56)
  ctx.restore()
  return y + h
}

function tampon(ctx, pays, cx, cy, angle) {
  if (!pays) return
  const couleur = couleurTampon(pays)
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(angle)
  ctx.fillStyle = 'rgba(250, 246, 239, 0.88)' // fond papier pour rester lisible sur la photo
  ctx.beginPath(); ctx.arc(0, 0, 122, 0, Math.PI * 2); ctx.fill()
  ctx.globalAlpha = 0.92
  ctx.strokeStyle = couleur
  ctx.lineWidth = 7
  ctx.beginPath(); ctx.arc(0, 0, 118, 0, Math.PI * 2); ctx.stroke()
  ctx.lineWidth = 3
  ctx.beginPath(); ctx.arc(0, 0, 100, 0, Math.PI * 2); ctx.stroke()
  ctx.fillStyle = couleur
  ctx.textAlign = 'center'
  ctx.font = `700 18px ${POLICES.texte}`
  ctx.fillText('FGES · ÉCHANGE', 0, -50)
  let taille = 44
  ctx.font = `800 ${taille}px ${POLICES.titre}`
  while (ctx.measureText(pays.toUpperCase()).width > 180 && taille > 22) {
    taille -= 2
    ctx.font = `800 ${taille}px ${POLICES.titre}`
  }
  ctx.fillText(pays.toUpperCase(), 0, taille / 3)
  ctx.font = `700 22px ${POLICES.texte}`
  ctx.fillText('★ ★ ★', 0, 62)
  ctx.restore()
}

function message(ctx, media, yDepart) {
  const marge = 120
  const largeur = L - marge * 2
  let y = yDepart + 90
  ctx.textAlign = 'left'
  if (media.caption) {
    ctx.fillStyle = COULEURS.texte
    ctx.font = `500 50px ${POLICES.main}`
    decouper(ctx, media.caption, largeur, 3).forEach(t => { ctx.fillText(t, marge, y); y += 58 })
    y += 14
  }
  const prenom = (media.prenom_nom || '').split(' ')[0]
  ctx.fillStyle = COULEURS.corail
  ctx.font = `700 54px ${POLICES.main}`
  ctx.fillText(`— ${prenom}${media.filiere ? `, ${media.filiere}` : ''}`, marge, y)
  y += 64
  const ville = media.ville || (media.universite || '').split(' - ')[0]
  ctx.fillStyle = COULEURS.doux
  ctx.font = `500 32px ${POLICES.texte}`
  decouper(ctx, [media.universite, [ville, media.pays].filter(Boolean).join(', ')].filter(Boolean).join(' · '), largeur, 2)
    .forEach(t => { ctx.fillText(t, marge, y); y += 42 })
}

function piedDePage(ctx) {
  ctx.fillStyle = COULEURS.marine
  ctx.fillRect(0, H - 150, L, 150)
  ctx.textAlign = 'center'
  ctx.fillStyle = COULEURS.blanc
  ctx.font = `700 34px ${POLICES.texte}`
  ctx.fillText('FGES · Relations Internationales', L / 2, H - 82)
  ctx.font = `500 26px ${POLICES.texte}`
  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)'
  ctx.fillText('Université Catholique de Lille', L / 2, H - 42)
}

// Construit l'image et renvoie un Blob PNG
export async function genererCartePostale(media, nomCampagne) {
  await attendrePolices()
  let img = null
  try {
    img = await chargerImage(miniature(media.fichier_url, 1200))
  } catch (e) {
    console.warn('Photo non chargée pour la carte postale', e)
  }
  const canvas = document.createElement('canvas')
  canvas.width = L
  canvas.height = H
  const ctx = canvas.getContext('2d')
  const angle = (rotationStable(media.id, 2) * Math.PI) / 180
  fond(ctx)
  entete(ctx, nomCampagne)
  const bas = polaroid(ctx, img, media.titre || '', angle)
  tampon(ctx, media.pays, L - 175, 375, 0.2) // coin haut droit de la photo
  message(ctx, media, bas)
  piedDePage(ctx)
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Export impossible'))), 'image/png')
    } catch (e) {
      reject(e) // canvas « contaminé » si l'image n'autorise pas le CORS
    }
  })
}

function nomFichier(media) {
  const base = (media.titre || 'souvenir')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return `carte-postale-${base || 'souvenir'}.png`
}

// Télécharge la carte (ou ouvre le menu de partage du téléphone, pratique pour les stories)
export async function telechargerCartePostale(media, nomCampagne) {
  const blob = await genererCartePostale(media, nomCampagne)
  const fichier = new File([blob], nomFichier(media), { type: 'image/png' })
  const mobile = window.matchMedia?.('(pointer: coarse)').matches
  if (mobile && navigator.canShare?.({ files: [fichier] })) {
    try {
      await navigator.share({ files: [fichier], title: 'Ma carte postale FGES Memories' })
      return
    } catch (e) {
      if (e?.name === 'AbortError') return
    }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fichier.name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}
