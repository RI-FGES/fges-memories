# FGES Memories · le carnet de voyage

Plateforme où les étudiants FGES partis en échange partagent une photo ou une vidéo de leur séjour, likent les souvenirs des autres et votent pour élire les lauréats de chaque semestre : les 5 photos et les 5 vidéos les plus votées, à égalité (pas de classement, même cadeau pour tous).

**Stack :** React + Vite · Firebase (Authentification + Firestore) · Cloudinary (fichiers) · d3-geo + world-atlas (carte du monde)

---

## 1. Installation locale

```bash
npm install
cp .env.example .env     # puis remplir les valeurs
npm run dev
```

Les valeurs Firebase à mettre dans `.env` sont celles qui se trouvaient dans l’ancien `src/firebase.js` (Console Firebase › Paramètres du projet › Vos applications).

---

## 2. À faire une seule fois dans les consoles

### Cloudinary (urgent)
1. **Régénérer la clé secrète API** (Settings › API Keys). L’ancienne était écrite dans `Admin.jsx`, donc visible par n’importe qui : il faut la considérer comme compromise.
2. Dans Settings › Upload › preset `ml_default` (non signé) : imposer le dossier `fges-memories`, limiter les formats (jpg, png, heic, webp, mp4, mov) et la taille maximale (100 Mo).

### Firebase Authentication
1. Authentication › Sign-in method › **Adresse e-mail/Mot de passe** › activer **Lien envoyé par e-mail (connexion sans mot de passe)**.
2. Authentication › Paramètres › **Domaines autorisés** : ajouter le domaine du site en production (localhost est déjà autorisé).
3. Facultatif : Authentication › Modèles › personnaliser l’email envoyé (nom de l’expéditeur « FGES Memories »). Vérifier qu’il n’arrive pas dans les spams de la messagerie universitaire.

### Firestore
1. **Adapter les domaines email** de l’université dans `firestore.rules` (fonction `emailUniversitaire`) et dans `.env` (`VITE_DOMAINES_AUTORISES`).
2. Déployer les règles : copier-coller `firestore.rules` dans Firestore › Règles, ou `firebase deploy --only firestore:rules`.
3. **Créer le premier compte RI** : Firestore › Démarrer une collection `admins` › ID du document = ton email **en minuscules** (champs : aucun ou n’importe lequel). Les suivants s’ajoutent ensuite depuis l’Espace RI › Équipe RI.
4. Supprimer l’ancienne collection **`parametres`** (elle contenait les mots de passe en clair ; elle n’est plus utilisée).

### Cloud Function (recommandée)
Elle supprime le fichier Cloudinary quand un souvenir est refusé ou supprimé, sans exposer la clé secrète. Nécessite le forfait Firebase **Blaze** (paiement à l’usage, gratuit à ce volume).

```bash
cd functions && npm install && cd ..
firebase functions:secrets:set CLOUDINARY_API_SECRET   # la NOUVELLE clé secrète
firebase deploy --only functions                        # demandera CLOUDINARY_API_KEY
```

Sans cette fonction, tout marche quand même : seuls les fichiers refusés restent stockés dans Cloudinary.

---

## 3. Utilisation par le service RI

1. Se connecter avec son email (lien magique) → onglet **Espace RI**.
2. **Campagnes & lauréats** › Nouvelle campagne : nom (ex. « S1 2026-27 »), dates de dépôt, dates de vote (facultatives, modifiables à tout moment), nombre de photos/vidéos déposables et nombre de votes par étudiant, cadeau des lauréats (affiché sur « Comment ça marche »).
3. **Modération** : accepter ou refuser les dépôts. Les médias de l’ancienne version (sans campagne) peuvent y être rattachés à une campagne.
4. Après les votes : **Désigner les lauréats** (aperçu privé avec le nombre de votes) › **Publier les lauréats**. Les 5 photos et 5 vidéos les plus votées sont retenues automatiquement ; si plusieurs souvenirs sont à égalité pour la 5e place, l’aperçu le signale (départage par défaut : likes, puis dépôt le plus ancien). Sur le site, les lauréats apparaissent sans votes ni ordre, avec une révélation animée. Les votes pour son propre souvenir ne comptent pas.
5. **Contenus publiés** : export CSV, téléchargement des fichiers, suppression.

---

## 4. Mise en ligne

```bash
npm run build     # génère le dossier dist/
```

`dist/` est un site statique. L’hébergement doit renvoyer toutes les URL vers `index.html` (application à page unique), par exemple avec Firebase Hosting (`"rewrites": [{ "source": "**", "destination": "/index.html" }]`), Netlify ou Vercel. Penser à ajouter le domaine final dans les domaines autorisés de Firebase Authentication.

---

## 5. Organisation du code

```
src/
  index.css            variables (couleurs, polices, arrondis) : tout le thème se règle ici
  travelbook.css       styles du carnet de voyage (classes tb-…)
  firebase.js          connexion Firebase (valeurs dans .env)
  auth/                connexion par lien magique + rôle RI
  lib/                 campagnes, likes & votes, désignation des lauréats, Cloudinary, liste des pays (+ coordonnées)
  components/          Polaroid, Tampon, CartePostale, CarteEmbarquement, CarteMonde, Confettis, Nav…
  pages/               Connexion, Accueil, Galerie, Deposer, Top5 (lauréats), CommentCaMarche, MonCarnet, Admin
  pages/admin/         Modération, Contenus, Campagnes, Équipe
firestore.rules        règles de sécurité
functions/             suppression automatique des fichiers Cloudinary
```

### Données Firestore

| Collection | Contenu | Qui écrit |
|---|---|---|
| `campagnes` | nom, dates dépôts/votes, `maxPhotos`, `maxVideos`, `nbVotesPhoto`, `nbVotesVideo`, `prix`, `active`, `resultats` (lauréats), `resultatsPublies` | RI |
| `medias` | un souvenir : auteur, filière, pays, ville, université, légende, caption, fichier, `statut`, `campagneId`, `slot` — identifiant `{campagneId}_{uid}_{photo\|video}_{n}` | étudiant (création), RI (validation) |
| `likes` | un like = un document `{mediaId}_{uid}` | étudiant |
| `bulletins` | les votes d’un étudiant pour une campagne `{campagneId}_{uid}` (privé) | étudiant, pendant la période de vote |
| `admins` | un document par email de l’équipe RI | RI |

Les règles Firestore garantissent côté serveur : dépôts uniquement pendant la période de dépôt et dans la limite fixée par étudiant, votes uniquement pendant la période de vote et dans la limite fixée, un seul like par personne et par souvenir, bulletins de vote privés, accès réservé aux emails universitaires vérifiés.
