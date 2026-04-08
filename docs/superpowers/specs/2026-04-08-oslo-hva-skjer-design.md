# Oslo Hva Skjer — Design Spec
**Dato:** 2026-04-08

## Oversikt

En åpen webside for en vennegjeng i Oslo som aggregerer kulturaktiviteter, konserter og restaurantanbefalinger fra ulike kilder og viser dem i en kalender. Inkluderer en "Wheel of Fortune"-funksjon for tilfeldig event-forslag.

## Arkitektur

```
GitHub repo (oslo-hva-skjer)
  ├── /frontend          React + Vite + Tailwind CSS
  ├── /scrapers          Python scraping-scripts (én per kilde)
  ├── /data/events.json  Aggregerte events (oppdatert nattlig via GitHub Actions)
  └── .github/workflows
        ├── scrape.yml   Nattlig scraping → committer events.json
        └── deploy.yml   Bygger og deployer til Azure Static Web Apps
```

**Hosting:** Azure Static Web Apps (gratis tier)  
**CI/CD:** GitHub Actions (gratis)  
**Database:** Ingen — events lagres som `data/events.json` i repoet  
**Kostnad:** kr 0/mnd

## Data-flow

1. GitHub Actions kjører scraping-scripts nattlig (kl. 02:00)
2. Hvert script henter events fra sin kilde og returnerer en liste med events
3. En aggregator-script merger alle lister og skriver til `data/events.json`
4. GitHub Actions committer oppdatert `events.json` til repoet
5. Azure Static Web Apps bygger og deployer ny versjon automatisk
6. React-appen leser `events.json` som en statisk fil

## Event-schema

```json
{
  "id": "string (unik per event)",
  "title": "string",
  "date": "YYYY-MM-DD",
  "time": "HH:MM (valgfri)",
  "category": "konsert | mat | kultur | annet",
  "source": "blaa | rockefeller | meetup | vink",
  "url": "string",
  "description": "string (valgfri)"
}
```

## Scraping-kilder (MVP)

| Script | Kilde | URL | Metode |
|--------|-------|-----|--------|
| `scrape_blaa.py` | Blå Oslo | blaaoslo.no | HTML scraping |
| `scrape_rockefeller.py` | Rockefeller | rockefeller.no | HTML scraping |
| `scrape_meetup.py` | Meetup Oslo | meetup.com/find/no--oslo | API |
| `scrape_vink.py` | Aftenposten Vink | aftenposten.no/vink | HTML scraping |

Nye kilder legges til ved å skrive ett nytt scraping-script — ingen endringer i frontend.

## Frontend-komponenter

### Kalender-view (hovedside)
- Måneds- eller ukevisning
- Events plottet som prikker/markører på datoer
- Klikk på dato åpner event-liste for den dagen

### Event-liste
- Vises ved siden av eller under kalenderen for valgt dato
- Event-kort med: tittel, kategori-badge, kilde-merking, lenke til originalside
- Kategori-filtre: Konsert | Mat/restaurant | Kultur | Annet

### Wheel of Fortune
- Velg dato eller uke
- Trykk "Spin"-knapp → hjul animerer og lander på ett tilfeldig event
- Viser event-kortet for det trukne eventet

## Teknologi-stack

- **Frontend:** React 18 + Vite + Tailwind CSS
- **Scraping:** Python 3 + BeautifulSoup + requests
- **CI/CD:** GitHub Actions
- **Hosting:** Azure Static Web Apps

## Utvidbarhet

- Nye scraping-kilder: legg til nytt Python-script i `/scrapers`, legg til steg i `scrape.yml`
- Nye kategorier: oppdater event-schema og filter-komponent
- Brukerinnlogging og lagring av favoritter kan legges til senere uten å endre grunnarkitekturen
