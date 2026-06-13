# TrelleMasters 2026 ⛳

> Trelleborgs mest prestigefyllda trädgårdsturnering

En webbapp för att hantera en golfturnering i trädgårdsmiljö — anmälan, live-resultattavla, lagdragning och adminpanel med realtidsuppdateringar via Firebase.

**Live:** [considhenrik.github.io/TrelleMasters](https://considhenrik.github.io/TrelleMasters/)

---

## Funktioner

- Anmälan med namn och handicap
- Live-resultattavla (realtid via Firestore)
- 8 tävlingsmoment med automatisk poängberäkning
- Lagdragning via serpentin-draft baserat på handicap
- Adminpanel för hantering av event, deltagare och resultat
- Handicap-justerad poängsättning
- Historikvy för tidigare turneringar

## Tech stack

| Lager       | Teknologi                          |
|-------------|------------------------------------|
| Frontend    | Vanilla JS (ES-moduler), plain CSS |
| Databas     | Firebase Firestore                 |
| Auth        | Firebase Authentication            |
| Hosting     | GitHub Pages                       |
| CI/CD       | GitHub Actions                     |
| Tester      | Vitest                             |
| Linter      | ESLint                             |

## Kom igång

Inget byggsteg krävs. Öppna valfri HTML-fil i webbläsaren eller servera katalogen med en lokal server:

```bash
# VS Code Live Server, eller:
npx serve .
```

### Kör tester

```bash
npm install
npm test
```

### Kör linter

```bash
npm run lint
```

## Firebase-setup

Appen använder ett befintligt Firebase-projekt. Om du vill sätta upp en egen instans:

1. Skapa ett Firebase-projekt på [console.firebase.google.com](https://console.firebase.google.com)
2. Aktivera Firestore och Email/Password-autentisering
3. Uppdatera `js/firebase-config.js` med dina projektuppgifter
4. Sätt `ADMIN_UID` till din admin-användares UID
5. Publicera Firestore-säkerhetsreglerna från `firebase/firestore.rules`

## Projektstruktur

```
├── js/
│   ├── firebase-config.js   # Firebase-initiering och admin-UID
│   ├── scoring.js           # Poängberäkning (tournament points, scramble)
│   ├── team-generator.js    # Lagdragning via serpentin-draft
│   ├── admin-dashboard.js   # Adminpanel
│   ├── auth.js              # Inloggning
│   ├── registration.js      # Anmälningsformulär
│   ├── participants.js      # Deltagarlista
│   └── scoreboard.js        # Resultattavla
├── css/style.css            # Stilar
├── tests/                   # Unit-tester (Vitest)
│   ├── scoring.test.js
│   └── team-generator.test.js
├── firebase/
│   └── firestore.rules      # Firestore-säkerhetsregler
├── index.html               # Startsida (schema, tävlingsmoment)
├── registrera.html          # Anmälningssida
├── deltagare.html           # Deltagarlista
├── resultattavla.html       # Live-resultattavla
├── historik.html            # Historik
└── admin.html               # Adminpanel
```

## CI/CD

GitHub Actions kör automatiskt vid varje push och pull request:

| Steg              | Körs vid           | Avbryter vid fel |
|-------------------|--------------------|------------------|
| ESLint            | Push + PR          | Ja               |
| Vitest (tester)   | Push + PR          | Ja               |
| Deploy → Pages    | Push till `main`   | —                |

Inga GitHub Secrets behövs — GitHub Pages använder den inbyggda `GITHUB_TOKEN`.

## Poängsystem

Varje moment ger 1 till N poäng (N = antal deltagare). Vinnaren i ett moment får N poäng, siste plats får 1. Deltar man inte får man automatiskt 1 poäng. Flest totalpoäng i slutet av dagen vinner TrelleMasters 2026!
