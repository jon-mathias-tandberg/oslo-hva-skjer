# Oslo Hva Skjer?

En aggregator for aktiviteter, konserter, kultur og restauranter i Oslo — bygget for en vennegjeng som vil holde oversikt over hva som skjer uten å måtte sjekke ti forskjellige nettsider.

🔗 **[oslo-hva-skjer.web.app](https://oslo-hva-skjer.web.app)**

---

## Funksjoner

- **Kalender** — se hva som skjer hvilken dag i Oslo
- **Kategorifilter** — konsert, mat, kultur, humor, annet
- **Wheel of Fortune** — kan ikke bestemme deg? Spin og la skjebnen velge
- **Logg inn med Google** — lagre favoritter synkronisert på tvers av enheter
- **Grupper** — opprett en gruppe med vennegjengen, legg til events i en felles plan, stem (+1) på forslag, inviter via lenke
- **Automatisk oppdatering** — nattlig scraping henter nye events fra alle kilder

## Kilder

| Kilde | Kategori |
|-------|----------|
| Blå Oslo | Konsert |
| Rockefeller / John Dee / Sentrum Scene | Konsert |
| Latter | Humor |
| Meetup Oslo | Kultur |
| Oslo Operaen | Kultur |
| Oslo Nye Teater | Kultur |
| Det Norske Teatret | Kultur |
| Aftenposten Vink | Mat |
| Nieu Scene | Humor |

## Teknologi

- **Frontend:** React 18 + Vite + Tailwind CSS
- **Auth + database:** Firebase (Authentication + Firestore)
- **Hosting:** Firebase Hosting
- **Scraping:** Python 3 + BeautifulSoup + requests
- **CI/CD:** GitHub Actions — nattlig scraping + automatisk deploy ved push

## Kjøre lokalt

```bash
git clone https://github.com/jon-mathias-tandberg/oslo-hva-skjer.git
cd oslo-hva-skjer/frontend
npm install
```

Opprett `frontend/.env.local` med Firebase-config:
```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

```bash
npm run dev
```

## Legge til ny kilde

1. Skriv et nytt scraper-script i `scrapers/` — se `scrape_blaa.py` som mal
2. Legg til scriptet i `SCRAPERS`-listen i `scrapers/aggregate.py`
3. Push — neste nattlige kjøring plukker opp den nye kilden automatisk

## Arkitektur

```
GitHub repo
├── /frontend          React-app (Vite + Tailwind)
├── /scrapers          Python-scripts, én per kilde
├── /data/events.json  Aggregerte events (oppdatert nattlig)
└── .github/workflows
      ├── scrape.yml   Nattlig scraping → commit events.json
      └── deploy.yml   Deploy til Firebase Hosting ved push til main

Firebase
├── Hosting            Serverer React-appen
├── Authentication     Google OAuth
└── Firestore          Brukerens favoritter og grupper
```

## Laget av

Jon Mathias Tandberg — for vennegjengen i Oslo.
