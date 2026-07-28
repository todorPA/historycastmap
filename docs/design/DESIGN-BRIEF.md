# HistoryCast Map — brief za dizajn

Kratak pregled trenutnog stanja (Faza 1, prototip) kao osnova za mockup-e i vizualni identitet.

---

## 1. Šta je proizvod

Interaktivna **mapa + vremenska osa** istorijskih događaja izvučenih iz podkasta **HistoryCast** (181 epizoda, srpski). Korisnik:

1. gleda događaje kao markere na mapi,
2. klizanjem vremenske ose filtrira period (mapa se ažurira),
3. bira epizodu u sidebar-u → vidi „mapu te priče“,
4. klikne događaj → detalji + **skok na tačan minut u podkastu**.

Dvojezično: **SR (podrazumevano) / EN**. Bez backend-a — statični JSON.

Ključna emocija: *„priča koju slušam ima mesto i vreme“*. Mapa je glavni junak, UI je okvir.

---

## 2. Trenutni layout

```
┌──────────────┬────────────────────────────────────────┐
│ SIDEBAR      │  MAPA (Leaflet, OpenStreetMap)         │
│ 320px        │                                        │
│              │   ● markeri = događaji                 │
│ naslov       │   boja markera = epizoda               │
│ SR|EN        │   ┌──────────────┐  popup detalja      │
│              │   │ LEGENDA      │  (klik na marker)   │
│ EPIZODE      │   └──────────────┘                     │
│ ○ Sve (20)   ├────────────────────────────────────────┤
│ ● Ep 09 (5)  │  VREMENSKA OSA (vis-timeline)          │
│ ● Ep 95 (7)  │  grupe = regioni; trake = periodi      │
│ ● Ep 140 (8) │                                        │
│              │                                        │
│ statistika   │                                        │
│ „Ceo period“ │                                        │
└──────────────┴────────────────────────────────────────┘
```

Na ekranima < 820px sidebar postaje gornji drawer (max 45vh), osa se smanjuje na 170px.

---

## 3. Kako izgleda sada

| Snimak | Šta pokazuje |
|---|---|
| `screenshots/02-vikinzi.png` | **glavni referentni snimak** — epizoda „Vikinzi“, popup otvoren, osa grupisana po regionima, period skraćen na 743–1154 |
| `screenshots/01-dusanova-srbija.png` | uži prozor, epizoda „Dušanova Srbija“ (snimak celog ekrana, sadrži i editor — gledati samo levu polovinu) |

---

## 4. Trenutni (privremeni) vizualni jezik

Sve je „developer default“ — namerno neutralno, čeka dizajn.

| Element | Sada |
|---|---|
| Sidebar / osa | tamno: `#171d24`, panel `#1f2731`, linije `#2a3440` |
| Tekst | `#e8edf2`, muted `#98a4b3` |
| Akcent | `#d9a13b` (zlatna — aktivna epizoda, selekcija) |
| Mapa | svetla, OSM standard |
| Font | sistemski stack (`-apple-system`…) |
| Boje epizoda | Ep 09 `#c0392b`, Ep 95 `#2c3e50`, Ep 140 `#1e8449` |
| Dugme „Slušaj“ | `#1f6feb` |

Princip koji bismo zadržali: **tamni okvir, svetla mapa** (mapa treba da „svetli“).

---

## 5. Šta nam treba od dizajna

Po prioritetu:

1. **Vizualni identitet** — paleta, tipografija, logo/wordmark za „HistoryCast Map“. Ton: istorijski, ali ne kičasto-pergament; čitljivo i moderno.
2. **Sistem markera** — najvažniji element. Treba da nosi 3 informacije istovremeno:
   - **epizodu** (boja),
   - **pouzdanost** (`high` / `medium` / `low` — sada: 60% prozirnost + isprekidan prsten),
   - **selekciju** (sada: beli prsten, veći radijus).
   Opciono: **tip događaja** (bitka, opsada, krunisanje, smrt, ugovor…) — 12 tipova, ima podatak u JSON-u, sada se ne prikazuje. Ikonice?
3. **Popup događaja** — hijerarhija: naslov, godina, mesto, region, učesnici (čipovi), opis, citat iz transkripta, epizoda, CTA „▶ Slušaj od MM:SS“ + audio plejer.
4. **Vremenska osa** — kako stilizovati trake/grupe, i kako jasno pokazati „ovo je opseg koji trenutno vidiš na mapi“.
5. **Sidebar** — lista epizoda (biće ih 181!), pretraga, brojači, SR/EN.
6. **Prazna i granična stanja** — nema događaja u periodu, učitavanje, greška.
7. **Mobilni** — osa + mapa na malom ekranu je otvoreno pitanje.

---

## 6. Ograničenja (važno pri dizajnu)

- **Mapa je Leaflet**, podloga su OSM rasterske pločice (svetle, gusto ispisane). Ne možemo lako menjati izgled same podloge — možemo zameniti provajdera pločica (npr. mirniji, sivi stil), što bi mnogo pomoglo čitljivosti markera.
- **Osa je vis-timeline** — stilizuje se CSS-om, ali struktura (grupe, trake, osa vremena) je data.
- **Faza 2** dodaje istorijske granice sa OpenHistoricalMap-a, vezane za izabranu godinu, plus prekidač „Moderna ↔ Istorijska“ podloga. Dizajn treba da predvidi to dugme i to da podloga može biti vizuelno šuplja/nepotpuna.
- **Faza 3**: pun set podataka (181 epizoda, stotine događaja) → grupisanje markera (clustering) i duga lista epizoda su realnost, ne izuzetak.
- Godine pre nove ere su negativni celi brojevi (`-431` → „431. p.n.e.“) — format se razlikuje po jeziku.
- Sav sadržaj je dvojezičan; srpski naslovi su duži od engleskih (računati na prelom).

---

## 7. Podaci koje imamo po događaju

Korisno za dizajn kartice/popup-a — svaki događaj ima:

`naslov` · `godina` (+ opciono `godina do`) · `mesto` (naziv, koordinate, tip mesta) · `epizoda` · `timestamp (MM:SS)` · `tip` · `učesnici[]` · `region` · `opis` · `citat iz transkripta` · `pouzdanost`

---

## 8. Kontekst

- Sadržaj: podkast HistoryCast (rss.com/rs-historycast)
- Podloga: OpenStreetMap · istorijske granice (Faza 2): OpenHistoricalMap
- Trenutna faza: **prototip sa 3 epizode / 20 događaja** — dovoljno da se vidi mehanika, premalo da se vidi gustina
