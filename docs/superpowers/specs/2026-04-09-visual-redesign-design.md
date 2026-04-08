# Oslo Hva Skjer — Visual Redesign Spec
**Dato:** 2026-04-09

## Oversikt

Redesign av frontend fra flat hvit Tailwind-standard til en klassisk avis/magasin-stil. Inspirasjonen er norske aviser og Aftenposten Vink — rent hvit bakgrunn, Georgia-serif for titler, tydelig typografisk hierarki og fargekodede kategori-labels i uppercase.

## Valgt stil: Klassisk avis (hvit/sort)

Godkjent av bruker etter visuell sammenligning av 4 alternativer (mørk/vibrant, Oslo blå, klassisk avis, neon).

## Farger og typografi

```
Bakgrunn:        #fafaf8  (off-white papir-tone)
Primær tekst:    #1a1a1a  (nesten svart)
Sekundær tekst:  #6b7280  (grå for metadata)
Skillelinjer:    #e5e7eb  (lys grå)
Valgt dato:      #1a1a1a bakgrunn, hvit tekst

Serif font (titler/event-navn):  Georgia, serif
Sans font (labels/metadata/nav): system-ui, sans-serif

Kategori-aksenter (uppercase label-farge):
  konsert:  #dc2626  (rød)
  mat:      #d97706  (amber)
  kultur:   #2563eb  (blå)
  humor:    #7c3aed  (lilla)
  annet:    #6b7280  (grå)
```

## Header

- Logo "Oslo Hva Skjer?" i Georgia serif, 20px bold
- Tykk sort strek under header (border-bottom: 3px solid #1a1a1a)
- Innlogget bruker: navn + profilbilde høyre side
- Ikke innlogget: "Logg inn"-knapp i sort med hvit tekst

## Navigasjon

- Understreket tab-stil i uppercase sans-serif (letter-spacing: 3px)
- Aktiv tab: sort understrek (border-bottom: 2px solid #1a1a1a)
- Inaktive tabs: grå tekst

## Kalender

- Månedsnavn i uppercase sans-serif med letter-spacing
- Dager i sans-serif
- Valgt dag: sort sirkel med hvit tekst
- Dager med events: liten rød prikk under datoen (#dc2626)
- Dager fra forrige/neste måned: lys grå tekst
- Ingen border/shadow på kalenderen — bare tynn skillelinje mot event-listen

## Event-liste

### Kategori-label (over tittelen)
```
KONSERT · ROCKEFELLER
```
- Uppercase, 8-9px, bold, letter-spacing: 2px
- Kategori-farge (se farger over)
- Format: `KATEGORI · KILDE`

### Event-tittel
- Georgia serif, 14-16px, bold, sort tekst

### Metadata
- Tid og dato: sans-serif, 11px, grå (#6b7280)

### Event-kort
- Ingen bakgrunnsfarge / ingen shadow
- Tynn skillelinje mellom events (border-bottom: 1px solid #f3f4f6)
- Padding: 12px 0
- Stjerne-ikon for favoritt (høyre side, kun innlogget)
- "＋"-knapp for gruppeplan (høyre side, kun i gruppe)

## Kategorifiltre

- Pill-knapper med outline-stil (border: 1px solid)
- Aktiv: sort bakgrunn, hvit tekst, sort border
- Inaktiv: hvit bakgrunn, grå tekst, grå border
- Uppercase tekst, letter-spacing

## Layout

- Maks bredde: 1024px, sentrert
- Grid: kalender (1fr) + event-liste (1.5fr) side ved side på desktop
- Skillelinje mellom kalender og event-liste (border-right: 1px solid #e5e7eb)
- Ingen avrundede hjørner på hovedelementer (unntatt knapper/pills)
- Ingen box-shadow

## Wheel of Fortune

- Hvit bakgrunn, sort ramme på hjulet
- Spin-knapp: sort bakgrunn, hvit tekst
- Resultat-kort: hvit bakgrunn med sort border (1px), serif tittel

## Endringer fra nåværende design

- Fjern `bg-gray-50` bakgrunn → `#fafaf8`
- Fjern alle `rounded-lg shadow-sm` → flat stil
- Bytt `font-semibold text-gray-900` → Georgia serif bold
- Bytt blå primærfarge (#2563EB) til sort (#1a1a1a) for navigasjon/valgt tilstand
- Kategori-labels: fra pill-badges med bakgrunnsfarge til uppercase tekst med kategori-farge
- Header: fra enkel flex-header til tykkere avislinje

## Komponenter som endres

- `App.jsx` — bakgrunnsfarge og max-width
- `Header.jsx` — serif logo, tykkere border, sort innloggingsknapp
- `Calendar.jsx` — fjern rounded/shadow, sort valgt-dag, rød prikk
- `EventCard.jsx` — nytt layout med label over tittel, fjern badge-stil
- `EventList.jsx` — tykkere datooverskrift i serif
- `CategoryFilter.jsx` — outline pill-stil, sort aktiv
- `WheelOfFortune.jsx` — sort/hvit stil
- `index.css` — legg til Georgia font-stack
