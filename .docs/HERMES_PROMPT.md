# TrelleMasters 2026 — Komplett implementationsspecifikation

Bygg en komplett webbsida för golftturneringen "TrelleMasters 2026". Sidan ska hostas på GitHub Pages och använda Firebase som backend. All text på sidan ska vara på svenska. Nedan finns allt du behöver — följ specifikationen noggrant.

---

## 1. Projektöversikt

TrelleMasters är en årlig golfturnering som hålls i en trädgård med en golfsimulator. Andra upplagan äger rum **11 juli 2026**. Förra året deltog 7 personer. I år är antalet deltagare flexibelt (poängsystemet skalas med N deltagare).

Sidan ska låta besökare:
- Läsa om tävlingen och schemat
- Anmäla sig via ett formulär (kräver hemlig kod + admin-godkännande)
- Se vilka som är anmälda
- Följa poängställningen live under tävlingsdagen
- Se förra årets resultat

Admin (arrangören Henrik) ska kunna:
- Logga in med email/lösenord
- Godkänna/neka anmälningar
- Hantera deltagare (redigera namn, handicap, ta bort)
- Mata in poäng per tävlingsmoment
- Generera balanserade scramble-lag automatiskt baserat på handicap
- Justera lag manuellt
- Öppna/stänga anmälan, sätta aktivt moment, ändra hemlig kod

---

## 2. Teknikstack

- **Frontend**: Vanilla HTML + CSS + JavaScript. INGEN framework (React, Vue, etc.), INGET build-steg, INGA npm-paket.
- **Backend**: Firebase (Firestore + Authentication), laddas via CDN.
- **Hosting**: GitHub Pages, statiska filer från `main`-branch.
- **Firebase SDK**: Version 10.x via ES-modul CDN:
  ```html
  <script type="module">
    import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
    import { getFirestore, collection, ... } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
    import { getAuth, ... } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
  </script>
  ```

---

## 3. Filstruktur

Skapa exakt denna struktur:

```
TrelleMasters/
  index.html                — Landningssida
  registrera.html            — Anmälningsformulär
  deltagare.html             — Deltagarlista (publik)
  resultattavla.html         — Live-scoreboard
  historik.html              — 2025 års resultat
  admin.html                 — Admin-dashboard
  css/
    style.css                — All styling
  js/
    firebase-config.js       — Firebase-konfiguration
    auth.js                  — Admin login/logout
    registration.js          — Anmälningsformulär → Firestore
    participants.js          — Realtids deltagarlista
    scoreboard.js            — Realtids scoreboard + rankinglogik
    admin-dashboard.js       — Admin-funktionalitet
    scoring.js               — Poängberäkningsmotor
    team-generator.js        — Scramble-laggenererare
  SETUP.md                   — Manuella setup-instruktioner
```

---

## 4. Firebase-konfiguration

### `js/firebase-config.js`

```javascript
// ============================================================
// FIREBASE-KONFIGURATION
// Ersätt värdena nedan med dina egna från Firebase Console.
// Se SETUP.md för instruktioner.
// ============================================================
export const firebaseConfig = {
  apiKey: "DIN-API-KEY-HÄR",
  authDomain: "DITT-PROJEKT.firebaseapp.com",
  projectId: "DITT-PROJEKT",
  storageBucket: "DITT-PROJEKT.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};

// Admin UID — ersätt med ditt UID från Firebase Console > Authentication > Users
export const ADMIN_UID = "DITT-ADMIN-UID-HÄR";
```

### Firestore Security Rules

Generera dessa i en fil `firebase/firestore.rules` och inkludera instruktioner i SETUP.md att klistra in dem i Firebase Console:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Alla kan läsa allt (publik scoreboard, deltagarlista)
    match /{document=**} {
      allow read: if true;
    }

    // Alla kan skapa en anmälan (men inte ändra/ta bort)
    match /participants/{pid} {
      allow create: if true;
    }

    // Bara inloggad admin kan skriva
    match /participants/{pid} {
      allow update, delete: if request.auth != null;
    }
    match /scores/{sid} {
      allow write: if request.auth != null;
    }
    match /events/{eid} {
      allow write: if request.auth != null;
    }
    match /teams/{tid} {
      allow write: if request.auth != null;
    }
    match /settings/{sid} {
      allow write: if request.auth != null;
    }
  }
}
```

### Firestore-datamodell

**Collection: `settings`** (ett enda dokument med id `tournament`)
```json
{
  "year": 2026,
  "date": "2026-07-11",
  "dropinTime": "11:00",
  "startTime": "13:00",
  "registrationOpen": true,
  "currentEvent": null,
  "secretCode": "trelle2026"
}
```

**Collection: `participants`**
```json
{
  "name": "André",
  "handicap": 30,
  "status": "pending",
  "registeredAt": "2026-06-15T10:30:00Z",
  "email": "andre@example.com",
  "phone": "070-1234567"
}
```
`status` kan vara `"pending"`, `"approved"`, eller `"rejected"`.

**Collection: `events`** (8 dokument, en per moment, skapas av admin vid setup)
```json
{
  "id": "putt",
  "name": "Putt-tävling",
  "description": "5 puttar var, bästa 3 räknas. Poäng: 1, 2, 3, 4 eller 10 per putt.",
  "order": 1,
  "status": "upcoming",
  "type": "individual",
  "scoreDirection": "higher_is_better",
  "handicapRule": "Fler försök med högt hcp, bästa 3 räknas"
}
```
`status`: `"upcoming"`, `"active"`, `"completed"`. `scoreDirection`: `"higher_is_better"` eller `"lower_is_better"`. `type`: `"individual"`, `"team"`, `"audience_vote"`.

Samtliga 8 event-dokument:

| id | name | order | type | scoreDirection | handicapRule |
|----|------|-------|------|----------------|--------------|
| putt | Putt-tävling | 1 | individual | higher_is_better | Fler försök med högt hcp, bästa 3 räknas |
| chip_spel | Chipping-spel | 2 | individual | higher_is_better | Fler omgångar med högt hcp, bäst omgång räknas |
| chip_hink | Chip i hink | 3 | individual | higher_is_better | Fler försök med högt hcp |
| cttp_56 | Closest to the pin 56m | 4 | individual | lower_is_better | Fler omgångar med högt hcp, bäst omgång räknas |
| cttp_124 | Closest to the pin 124m | 5 | individual | lower_is_better | Fler omgångar med högt hcp, bäst omgång räknas |
| drive | Longest drive | 6 | individual | higher_is_better | Fler omgångar med högt hcp, längst räknas |
| scramble | Scramble | 7 | team | higher_is_better | — |
| roliga_skott | Roligaste skott | 8 | audience_vote | higher_is_better | — |

**Collection: `scores`**
```json
{
  "eventId": "putt",
  "participantId": "abc123",
  "rawScore": 14,
  "rank": 3,
  "tournamentPoints": 5,
  "enteredAt": "2026-07-11T14:30:00Z"
}
```

**Collection: `teams`**
```json
{
  "name": "Lag 1",
  "memberIds": ["abc123", "def456"],
  "averageHandicap": 35.1,
  "scrambleResult": null,
  "scrambleRank": null,
  "scramblePoints": null
}
```

### Initiering av Firestore-data

Admin-dashboarden ska ha en "Initiera tävling"-knapp (under Inställningar) som skapar:
- `settings/tournament`-dokumentet med standardvärden
- Alla 8 `events`-dokument enligt tabellen ovan

Knappen ska bara fungera om dokumenten inte redan finns (skydda mot dubbletter).

---

## 5. Sidspecifikationer

### 5.1 Gemensam navigation

Alla sidor ska ha en gemensam header/nav med logotyp och länkar:
- TrelleMasters 2026 (logotyp/titel → index.html)
- Tävlingen (index.html)
- Anmälan (registrera.html)
- Deltagare (deltagare.html)
- Resultattavla (resultattavla.html)
- Historik (historik.html)
- Admin (admin.html) — visas alltid men admin-funktioner kräver login

Navigationen ska vara responsiv: hamburgermeny på mobil.

### 5.2 index.html — Landningssida

**Hero-sektion:**
- Stor rubrik: "TrelleMasters 2026"
- Underrubrik/tagline: "Trelleborgs mest prestigefyllda trädgårdsturnering"
- Datum: "11 juli 2026"
- Enkel golf-ikon (SVG-flagga eller boll)
- CTA-knapp: "Anmäl dig!" → registrera.html

**Schema:**
- Drop-in från kl. 11:00 — värma upp, hänga, kalibrera
- Tävlingarna börjar kl. 13:00
- "Är alla här innan 13 så startar vi när vi känner för det :)"

**Tävlingsmoment:**
Lista alla 8 moment med kort beskrivning och handicap-justering:

1. **Putt-tävling** — 5 puttar var, bästa 3 räknas. Poäng per putt: 1, 2, 3, 4 eller 10. Flest poäng vinner.
   _Hcp-justering: Fler försök med högt hcp, bästa 3 räknas_
2. **Chipping-spel** — 6 chip var, alla räknas. Poäng i spelet, flest vinner.
   _Hcp-justering: Fler omgångar med högt hcp, bäst omgång räknas_
3. **Chip i hink** — 5 chip var. Varje boll i hinken = 1 poäng. Flest vinner.
   _Hcp-justering: Fler försök med högt hcp_
4. **Closest to the pin 56m** — 3 försök var. Närmast vinner.
   _Hcp-justering: Fler omgångar med högt hcp, bäst omgång räknas_
5. **Closest to the pin 124m** — 3 försök var. Närmast vinner.
   _Hcp-justering: Fler omgångar med högt hcp, bäst omgång räknas_
6. **Longest drive** — 4 försök var. Längst vinner.
   _Hcp-justering: Fler omgångar med högt hcp, längst räknas_
7. **Scramble** — Dagens stora moment! Lag tävlar mot varandra. Bäst lag vinner mest poäng.
8. **Roligaste skott** — Under Scramble röstar övriga deltagare fram roliga skott. Varje roligt skott ger 1 poäng, ingen gräns. Kan vara en slice som träffar ett träd och åker tillbaka på banan — helt up till de andra spelarna. Låt det balla ur!

**Poängsystem:**
- Varje moment ger 1 till N poäng (N = antal deltagare)
- Bäst i momentet får N poäng, sämst får 1
- Deltar man inte i ett moment får man automatiskt 1 poäng (och folk får peka och skratta)
- Flest totalpoäng i slutet av dagen vinner TrelleMasters 2026!

**Packlista ("Kom ihåg att ta med"):**
- Klubbor
- Kläder lämpliga för utomhus hela dagen (vädret kan skifta)
- Dricka (vatten finns i kranen, Henrik delar gärna ut gin, övrigt tar man med själv)
- Mat till grillen
- Snacks (gärna för mycket — vi kör kopiöst överdådigt snacksbord)
- Gott humör!

**Avslutning:**
"När tävlingarna är över är det fri lek — spela mer golf, häng i soffan med golf på TV:n, eller prata golf... eller annat om man absolut måste."

### 5.3 registrera.html — Anmälningsformulär

**Om registrering är öppen** (`settings.registrationOpen === true`):

Formulär med fälten:
- **Namn** (text, obligatoriskt)
- **Handicap** (nummer med en decimal, obligatoriskt)
- **Email** (email, valfritt)
- **Telefon** (text, valfritt)
- **Hemlig kod** (text, obligatoriskt) — label: "Hemlig kod (fråga Henrik om du inte fått den)"

Vid submit:
1. Läs `settings/tournament.secretCode` från Firestore
2. Jämför formulärets kod med `secretCode` (case-insensitive)
3. Om koden stämmer: skapa dokument i `participants`-collection med `status: "pending"` och `registeredAt: serverTimestamp()`
4. Visa bekräftelse: "Tack för din anmälan! Den väntar nu på godkännande av arrangören."
5. Om koden inte stämmer: visa felmeddelande "Fel hemlig kod. Fråga Henrik!"

**Om registrering är stängd** (`settings.registrationOpen === false`):
Visa meddelande: "Anmälan är stängd. Kontakta Henrik om du vill vara med."

Validering:
- Namn: minst 2 tecken
- Handicap: 0–54 (decimalt)
- Email: giltig email-format (om ifylld)
- Hemlig kod: obligatorisk

### 5.4 deltagare.html — Deltagarlista

Realtidslista som uppdateras via Firestore `onSnapshot`.

- Visa bara deltagare med `status === "approved"`
- Rubrik: "Anmälda deltagare"
- Räknare: "X deltagare anmälda"
- Tabell/lista med: Namn, Handicap
- Henrik S ska ha en badge/ikon: "Regerande mästare 🏆" (trofé-ikon)
- Sortera alfabetiskt efter namn

### 5.5 resultattavla.html — Live-scoreboard

**Huvudfunktionen på hela sidan.** Ska fungera smidigt på mobil med realtidsuppdateringar.

Realtids-leaderboard via Firestore `onSnapshot` på `scores`-collection.

**Layout:**
- Rubrik: "Resultattavla"
- Indikator: "Uppdateras i realtid" (liten pulsande punkt)
- Om `settings.currentEvent` är satt: visa "Pågående moment: [moment-namn]" markerat

**Tabell:**
| # | Namn | Putt | Chip | Hink | 56m | 124m | Drive | Scramble | Rolig | Totalt |
|---|------|------|------|------|-----|------|-------|----------|-------|--------|
| 1 | Henrik S | 7 | 5 | ... | ... | ... | ... | ... | ... | 42 |
| 2 | ... | ... | ... | ... | ... | ... | ... | ... | ... | ... |

- Sorterat efter totalpoäng (fallande), sedan namn (alfabetiskt vid lika)
- Ledaren (plats 1) ska ha visuell markering (guldrad eller krona-ikon)
- Celler utan poäng visas som "–"
- Kolumnen för aktivt moment ska markeras visuellt (t.ex. ljus bakgrund)

**Mobilanpassning:**
- Tabellen ska vara horisontellt scrollbar i en container
- Namn-kolumnen ska vara "sticky" (syns alltid)
- Eller: visa som kort-layout på smala skärmar (varje deltagare = ett kort med alla poäng)

**Poängberäkning:**
Se sektion 6 (Scoring Engine) för exakt algoritm.

### 5.6 historik.html — 2025 års resultat

Statisk sida med hårdkodad data (ingen Firestore-anslutning).

- Rubrik: "TrelleMasters 2025"
- Underrubrik: "Vinnare: Henrik S — 44 poäng"
- Samma tabellformat som resultattavla

Hårdkodad data:

```javascript
const results2025 = [
  { rank: 1, name: "Henrik S", hcp: 27.7, scores: { putt: 5, chip_spel: 7, chip_hink: 7, cttp_56: 7, cttp_124: 6, drive: 5, scramble: 7, roliga_skott: 0 }, total: 44 },
  { rank: 2, name: "Pelle", hcp: 24.2, scores: { putt: 7, chip_spel: 3, chip_hink: 7, cttp_56: 6, cttp_124: 3, drive: 4, scramble: 5, roliga_skott: 0 }, total: 35 },
  { rank: 3, name: "Nils", hcp: 46, scores: { putt: 3, chip_spel: 6, chip_hink: 5, cttp_56: 2, cttp_124: 4, drive: 7, scramble: 5, roliga_skott: 0 }, total: 32 },
  { rank: 4, name: "André", hcp: 30, scores: { putt: 4, chip_spel: 4, chip_hink: 3, cttp_56: 5, cttp_124: 7, drive: 3, scramble: 3, roliga_skott: 0 }, total: 29 },
  { rank: 4, name: "Johan", hcp: 40.8, scores: { putt: 1, chip_spel: 5, chip_hink: 5, cttp_56: 3, cttp_124: 2, drive: 6, scramble: 7, roliga_skott: 0 }, total: 29 },
  { rank: 6, name: "Rickard", hcp: 32.9, scores: { putt: 6, chip_spel: 2, chip_hink: 3, cttp_56: 4, cttp_124: 5, drive: 2, scramble: 3, roliga_skott: 0 }, total: 25 },
  { rank: 7, name: "Henrik L", hcp: 48, scores: { putt: 2, chip_spel: 2, chip_hink: 3, cttp_56: 1, cttp_124: 1, drive: 1, scramble: 1, roliga_skott: 0 }, total: 11 }
];
```

### 5.7 admin.html — Admin-dashboard

Bakom Firebase Auth login. Visa login-formulär om ej inloggad, dashboard om inloggad.

**Login:**
- Email + lösenord
- "Logga in"-knapp
- Felmeddelande vid fel credentials
- "Logga ut"-knapp (synlig när inloggad)

**Dashboard (efter login) — flikar/sektioner:**

#### Flik: Anmälningar
- Lista alla `participants` med `status === "pending"`
- Per anmälan: Namn, Handicap, Email, Telefon, Datum
- Knappar: "Godkänn" (→ status: "approved") och "Neka" (→ status: "rejected")
- Visa antal väntande: "X anmälningar att hantera"

#### Flik: Deltagare
- Lista alla `participants` med `status === "approved"`
- Redigera: klicka på en deltagare → redigera namn och handicap inline eller i modal
- Ta bort: "Ta bort"-knapp med bekräftelse
- "Lägg till deltagare manuellt"-knapp (formulär för namn + hcp, skapar direkt med status "approved")

#### Flik: Resultat
- Dropdown/tabs: välj tävlingsmoment
- Per moment: lista alla godkända deltagare med ett input-fält för raw score
- "Deltar ej"-checkbox per deltagare (ger automatiskt 1 turnéringspoäng)
- "Beräkna och spara poäng"-knapp: kör scoring-algoritmen (se sektion 6), sparar rank och tournamentPoints till Firestore
- Visa beräknade tournament points bredvid varje deltagare efter beräkning
- Markera momentet som "completed" (`events/{id}.status = "completed"`)

**Speciellt för Scramble (moment 7):**
- Visa laguppställning (från `teams`-collection)
- Input-fält för varje lags resultat
- "Beräkna och spara"-knapp: rankar lagen, ger poäng per lagmedlem

**Speciellt för Roligaste skott (moment 8):**
- Lista deltagare med en räknare (+/- knappar) för antal roliga skott
- Varje klick på + sparar direkt till Firestore

#### Flik: Lag (Scramble)
- Dropdown: "Antal lag" (2, 3, 4, 5)
- "Generera lag"-knapp → kör algoritm (se sektion 7)
- Visa genererade lag med spelare + genomsnittligt handicap per lag
- Drag-and-drop ELLER knappar för att flytta spelare mellan lag manuellt
- "Spara lag"-knapp → sparar till Firestore `teams`-collection (rensa gamla först)

#### Flik: Inställningar
- Toggle: "Anmälan öppen" (boolean → `settings/tournament.registrationOpen`)
- Dropdown: "Aktivt moment" (lista alla events + "Inget") → `settings/tournament.currentEvent`
- Textfält: "Hemlig anmälningskod" → `settings/tournament.secretCode`
- "Initiera tävling"-knapp: skapar `settings`-dokument och alla 8 `events`-dokument (med guard mot dubbletter)
- "Spara inställningar"-knapp

---

## 6. Poängberäkningsmotor (`js/scoring.js`)

### Algoritm för individuella moment (1-6)

```
function calculateTournamentPoints(participants, eventId, scoreDirection):
    N = antal deltagare med status "approved"

    // Hämta raw scores, markera "deltar ej"
    entries = []
    for each participant:
        if participant har "deltar ej" markerat:
            entries.push({ participantId, rawScore: null, didNotParticipate: true })
        else:
            entries.push({ participantId, rawScore, didNotParticipate: false })

    // Separera deltagande och ej deltagande
    competing = entries.filter(e => !e.didNotParticipate)
    notCompeting = entries.filter(e => e.didNotParticipate)

    // Sortera deltagande efter rawScore
    if scoreDirection === "higher_is_better":
        competing.sort(rawScore DESC)  // högst först
    else:
        competing.sort(rawScore ASC)   // lägst först

    // Tilldela rank med delad placering
    rank = 1
    for i = 0 to competing.length - 1:
        if i > 0 AND competing[i].rawScore === competing[i-1].rawScore:
            competing[i].rank = competing[i-1].rank  // samma rank som föregående
        else:
            competing[i].rank = i + 1

    // Konvertera rank → turnéringspoäng
    // Poäng = N - rank + 1 (rank 1 → N poäng, rank 2 → N-1 poäng, etc.)
    // Vid delad placering: alla med samma rank får samma poäng (den högre)
    for each entry in competing:
        entry.tournamentPoints = N - entry.rank + 1

    // Ej deltagande får 1 poäng
    for each entry in notCompeting:
        entry.rank = null
        entry.tournamentPoints = 1

    return all entries
```

**Exempel med 7 deltagare, högt-är-bäst:**
```
Raw scores: A=14, B=12, C=14, D=8, E=10, F=6, G=0(ej deltagande)
Sorterat: A=14, C=14, B=12, E=10, D=8, F=6
Rank:     A=1,  C=1,  B=3,  E=4,  D=5,  F=6
Points:   A=7,  C=7,  B=5,  E=4,  D=3,  F=2,  G=1
```

### Scramble-poäng (moment 7)

```
function calculateScramblePoints(teams, N):
    // N = antal godkända deltagare totalt
    // Sortera lag efter resultat (lägre = bättre i golf)
    teams.sort(scrambleResult ASC)

    numTeams = teams.length
    for i = 0 to numTeams - 1:
        if numTeams === 2:
            pointsPerTeam = [N, Math.round(N * 0.4)]
        else if numTeams === 3:
            pointsPerTeam = [N, Math.round(N * 0.7), Math.round(N * 0.4)]
        else if numTeams === 4:
            pointsPerTeam = [N, Math.round(N * 0.75), Math.round(N * 0.5), Math.round(N * 0.25)]
        else:
            // Fördela linjärt: bästa = N, sämsta = Math.max(1, round(N/numTeams))
            step = (N - 1) / (numTeams - 1)
            pointsPerTeam = [round(N - i * step) for i in 0..numTeams-1]

        teams[i].scramblePoints = pointsPerTeam[i]

    // Tilldela poäng till alla lagmedlemmar
    for each team:
        for each memberId in team.memberIds:
            save score for memberId with tournamentPoints = team.scramblePoints
```

### Roligaste skott (moment 8)

Varje deltagares rawScore är antalet roliga skott de gjort. Konvertera till turnéringspoäng med samma rankingalgoritm som individuella moment (higher_is_better). Deltagare med 0 roliga skott räknas som deltagande (inte "deltar ej").

### Totalpoäng

Totalpoäng = summan av turnéringspoäng över alla 8 moment. Scoreboarden visar totalt och per moment.

---

## 7. Scramble-laggenererare (`js/team-generator.js`)

### Algoritm: Serpentin-fördelning

Syftet är att skapa lag med så jämnt genomsnittligt handicap som möjligt.

```
function generateTeams(participants, numTeams):
    // Sortera deltagare efter handicap (lägst först)
    sorted = participants.sort(handicap ASC)

    // Skapa tomma lag
    teams = Array(numTeams).fill([])

    // Serpentin-fördelning
    // Omgång 1: deltagare 0→Lag0, 1→Lag1, 2→Lag2
    // Omgång 2: deltagare 3→Lag2, 4→Lag1, 5→Lag0  (omvänd ordning)
    // Omgång 3: deltagare 6→Lag0, 7→Lag1, 8→Lag2
    // osv.
    direction = "forward"  // alternerar
    teamIndex = 0

    for each participant in sorted:
        teams[teamIndex].push(participant)

        if direction === "forward":
            if teamIndex === numTeams - 1:
                direction = "backward"
            else:
                teamIndex++
        else:
            if teamIndex === 0:
                direction = "forward"
            else:
                teamIndex--

    // Beräkna snitt-handicap per lag
    for each team:
        team.averageHandicap = average(team.members.map(m => m.handicap))

    return teams
```

**Exempel med 7 spelare och 3 lag:**
```
Sorterat: Pelle(24.2), Henrik S(27.7), André(30), Rickard(32.9), Johan(40.8), Nils(46), Henrik L(48)
Omgång 1 (→): Lag1=Pelle, Lag2=Henrik S, Lag3=André
Omgång 2 (←): Lag3=Rickard, Lag2=Johan, Lag1=Nils
Omgång 3 (→): Lag1=Henrik L
Resultat:
  Lag 1: Pelle(24.2), Nils(46), Henrik L(48) → snitt 39.4
  Lag 2: Henrik S(27.7), Johan(40.8) → snitt 34.25
  Lag 3: André(30), Rickard(32.9) → snitt 31.45
```

### Admin-gränssnitt för lag

Visa genererade lag i kolumner/kort. Varje lag visar:
- Lagnamn (redigerbart, default "Lag 1", "Lag 2", ...)
- Lista med spelarnamn + handicap
- Genomsnittligt handicap (beräknas automatiskt)

Admin kan flytta spelare mellan lag:
- Klicka på spelare → välj nytt lag (dropdown eller knappar)
- Genomsnitt uppdateras direkt
- "Spara lag"-knappen sparar slutgiltiga lag till Firestore

---

## 8. Design och styling (`css/style.css`)

### Färgpalett
```css
:root {
  --color-primary: #2d5a27;       /* Golfgrönt */
  --color-primary-dark: #1e3d1a;  /* Mörkare grönt */
  --color-primary-light: #4a8a42; /* Ljusare grönt */
  --color-accent: #d4a843;        /* Guld */
  --color-accent-light: #f0d68a;  /* Ljust guld */
  --color-bg: #f5f0e8;            /* Creme bakgrund */
  --color-bg-white: #ffffff;      /* Vit bakgrund (kort) */
  --color-text: #2c2c2c;          /* Mörk text */
  --color-text-light: #666666;    /* Ljus text */
  --color-error: #c0392b;         /* Röd (fel) */
  --color-success: #27ae60;       /* Grön (lyckad) */
  --color-pending: #f39c12;       /* Orange (väntande) */
}
```

### Typografi
```css
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  /* Systemfonter - snabbt, inget att ladda */
}
```

### Responsive breakpoints
- Mobil: < 768px (standard)
- Desktop: >= 768px
- Bred: >= 1024px

### Designriktlinjer
- **Ton**: Lekfull men snygg. Det är en trädgårdsturnering, inte PGA Tour.
- **Kort/cards**: Använd kort med lätt skugga för att gruppera innehåll
- **Knappar**: Rundade hörn, gröna som primärfärg, guld för accentknappar
- **Tabeller**: Zebra-striping (varannan rad), sticky header
- **Ikoner**: Enkel SVG-flagga (⛳) i headern. Trofé (🏆) för vinnare/mästare. Inga externa ikonbibliotek — använd emoji eller enkel inline SVG.
- **Animationer**: Subtil fade-in för realtidsuppdateringar. Pulsande punkt för "live"-indikator.
- **Admin**: Kan vara mer utilitaristisk — fokus på funktionalitet, inte skönhet

---

## 9. SETUP.md — Manuella instruktioner

Generera en `SETUP.md`-fil i roten av projektet med dessa instruktioner (på svenska):

```markdown
# TrelleMasters 2026 — Setup-guide

## Steg 1: Skapa Firebase-projekt

1. Gå till [Firebase Console](https://console.firebase.google.com/)
2. Klicka "Add project" / "Lägg till projekt"
3. Ge projektet ett namn (t.ex. "trellemasters-2026")
4. Du behöver inte aktivera Google Analytics — hoppa över det
5. Klicka "Create project"

## Steg 2: Aktivera Authentication

1. I Firebase Console, gå till "Build" > "Authentication"
2. Klicka "Get started"
3. Under "Sign-in method", klicka på "Email/Password"
4. Aktivera "Email/Password" (INTE "Email link")
5. Klicka "Save"
6. Gå till fliken "Users"
7. Klicka "Add user"
8. Ange din email och ett lösenord — detta blir din admin-inloggning
9. Kopiera det "User UID" som visas — du behöver det snart

## Steg 3: Aktivera Firestore

1. I Firebase Console, gå till "Build" > "Firestore Database"
2. Klicka "Create database"
3. Välj "Start in test mode" (vi ändrar reglerna sen)
4. Välj en location nära dig (t.ex. "europe-west1")
5. Klicka "Enable"

## Steg 4: Sätt Security Rules

1. I Firestore, gå till fliken "Rules"
2. Ersätt allt med innehållet från `firebase/firestore.rules` i detta projekt
3. Klicka "Publish"

## Steg 5: Hämta Firebase-config

1. I Firebase Console, klicka på kugghjulet > "Project settings"
2. Scrolla ned till "Your apps"
3. Klicka på "</>" (Web) ikonen för att lägga till en webbapp
4. Ge den ett smeknamn (t.ex. "TrelleMasters Web")
5. Du behöver INTE aktivera Firebase Hosting
6. Kopiera hela `firebaseConfig`-objektet

## Steg 6: Konfigurera projektet

1. Öppna `js/firebase-config.js`
2. Ersätt placeholder-värdena med din Firebase-config
3. Ersätt `ADMIN_UID` med ditt User UID från steg 2

## Steg 7: Aktivera GitHub Pages

1. Pusha alla filer till ditt GitHub-repo
2. Gå till repots Settings > Pages
3. Under "Source", välj "Deploy from a branch"
4. Välj branch "main" och mapp "/ (root)"
5. Klicka "Save"
6. Vänta 1-2 minuter — sidan finns på https://DITT-ANVÄNDARNAMN.github.io/TrelleMasters/

## Steg 8: Initiera tävlingen

1. Gå till din sida > Admin
2. Logga in med din email och lösenord
3. Gå till Inställningar
4. Klicka "Initiera tävling" — detta skapar alla tävlingsmoment i databasen
5. Ställ in hemlig kod för anmälan
6. Öppna anmälan när du är redo
```

---

## 10. Implementationsordning

Bygg filerna i denna ordning (beroenden markerade):

1. `css/style.css` — grundläggande styling, CSS-variabler, responsiv layout, navigation
2. `js/firebase-config.js` — placeholder-config
3. `index.html` — landningssida (ren HTML+CSS, ingen JS-logik)
4. `historik.html` + `js/history.js` — statisk data, inget Firebase-beroende, bra test
5. `js/auth.js` — Firebase Auth: login, logout, auth state listener
6. `admin.html` + `js/admin-dashboard.js` — admin-dashboard med alla flikar (beror på auth.js)
7. `js/scoring.js` — poängberäkningsmotor (ren logik, testbar)
8. `js/team-generator.js` — laggenererare (ren logik, testbar)
9. `registrera.html` + `js/registration.js` — anmälningsformulär (beror på firebase-config)
10. `deltagare.html` + `js/participants.js` — realtids deltagarlista
11. `resultattavla.html` + `js/scoreboard.js` — live scoreboard (beror på scoring.js)
12. `firebase/firestore.rules` — security rules
13. `SETUP.md` — manuella instruktioner

---

## 11. Viktiga regler

- **INGEN npm, INGEN bundler, INGET build-steg.** Allt ska fungera som rena HTML/CSS/JS-filer serverade av vilken statisk server som helst.
- **All text på svenska.** Variabelnamn och kod på engelska, men allt användaren ser ska vara på svenska.
- **Mobile-first.** Testa att allt fungerar bra på en smal skärm (375px).
- **Inga hårdkodade antal deltagare.** Poängsystemet ska skala dynamiskt med antalet godkända deltagare.
- **Firebase-config är publik by design.** Firestore Security Rules skyddar datan, inte API-nyckeln.
- **Defensiv programmering i admin.** Bekräftelse-dialoger vid destruktiva handlingar (ta bort deltagare, neka anmälan, rensa lag).
- **Graceful fallback.** Om Firebase är nere eller config saknas, visa ett tydligt felmeddelande istället för blank sida.
