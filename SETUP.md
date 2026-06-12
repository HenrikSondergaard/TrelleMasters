# TrelleMasters 2026 — Setup-guide

## Steg 1: Skapa Firebase-projekt

1. Gå till [Firebase Console](https://console.firebase.google.com/)
2. Klicka "Add project" / "Lägg till projekt"
3. Ge projektet ett namn (t.ex. "trellemasters-2026")
4. Du behöver inte aktivera Google Analytics — hoppa över det
5. Klicka "Create project"

## Steg 2: Aktivera Authentication

1. I Firebase Console, gå till **Build → Authentication**
2. Klicka **Get started**
3. Under **Sign-in method**, klicka på **Email/Password**
4. Aktivera **Email/Password** (INTE "Email link")
5. Klicka **Save**
6. Gå till fliken **Users**
7. Klicka **Add user**
8. Ange din email och ett lösenord — detta blir din admin-inloggning
9. Kopiera det **User UID** som visas — du behöver det snart

## Steg 3: Aktivera Firestore

1. I Firebase Console, gå till **Build → Firestore Database**
2. Klicka **Create database**
3. Välj **Start in test mode** (vi ändrar reglerna sen)
4. Välj en location nära dig (t.ex. `europe-west1`)
5. Klicka **Enable**

## Steg 4: Sätt Security Rules

1. I Firestore, gå till fliken **Rules**
2. Ersätt allt med innehållet från `firebase/firestore.rules` i detta projekt
3. Klicka **Publish**

## Steg 5: Hämta Firebase-config

1. I Firebase Console, klicka på kugghjulet ⚙️ → **Project settings**
2. Scrolla ned till **Your apps**
3. Klicka på `</>` (Web) ikonen för att lägga till en webbapp
4. Ge den ett smeknamn (t.ex. "TrelleMasters Web")
5. Du behöver INTE aktivera Firebase Hosting
6. Kopiera hela `firebaseConfig`-objektet

## Steg 6: Konfigurera projektet

1. Öppna `js/firebase-config.js`
2. Ersätt placeholder-värdena med din Firebase-config
3. Ersätt `ADMIN_UID` med ditt User UID från steg 2

Exempel:
```javascript
export const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "trellemasters-2026.firebaseapp.com",
  projectId: "trellemasters-2026",
  storageBucket: "trellemasters-2026.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
};

export const ADMIN_UID = "abc123def456";
```

## Steg 7: Aktivera GitHub Pages

1. Pusha alla filer till ditt GitHub-repo
2. Gå till repots **Settings → Pages**
3. Under **Source**, välj **Deploy from a branch**
4. Välj branch `main` och mapp `/ (root)`
5. Klicka **Save**
6. Vänta 1–2 minuter — sidan finns på `https://DITT-ANVÄNDARNAMN.github.io/TrelleMasters/`

## Steg 8: Initiera tävlingen

1. Gå till din sida → **Admin**
2. Logga in med din email och lösenord
3. Gå till fliken **Inställningar**
4. Klicka **Initiera tävling** — detta skapar alla tävlingsmoment i databasen
5. Ställ in hemlig kod för anmälan
6. Öppna anmälan när du är redo

---

## Felsökning

### "Kunde inte ladda" / blank sida
- Kontrollera att Firebase-config i `js/firebase-config.js` är korrekt
- Öppna browserns devtools (F12) → Console för felmeddelanden
- Verifiera att Firestore är aktiverat i Firebase Console

### Anmälan fungerar inte
- Kontrollera att `settings/tournament`-dokumentet finns i Firestore
- Verifiera att `registrationOpen` är `true`
- Kontrollera att den hemliga koden stämmer

### Admin-login fungerar inte
- Verifiera att Email/Password är aktiverat i Firebase Authentication
- Kontrollera att du har skapat en användare i Firebase Console
