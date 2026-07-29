# Kako proizvesti `geo-events.json` iz transkripta

Uputstvo za generisanje punog dataset-a (181 epizoda) koji aplikacija troši. Ugovor je
`geo-events.schema.json` — aplikacija ne prihvata odstupanja.

**Radi u dva koraka.** Jedan prompt nad svim epizodama daje duplirana mesta
(„Skoplje“ / „Skoplju“ / „Skoplja“ kao tri različita mesta) i nekonzistentne `id`-jeve, što
ruši normalizaciju mesta na kojoj celo mapiranje stoji.

```
1) EKSTRAKCIJA  — po epizodi, 181× → 181 fragmenta
2) SPAJANJE     — jednom, nad svim fragmentima → geo-events.json
3) VALIDACIJA   — npm run validate:data public/data/geo-events.json
```

---

## Korak 1 — prompt za ekstrakciju (jedna epizoda po pozivu)

Popuni `{{BROJ}}`, `{{NASLOV}}`, `{{AUDIO_URL}}`, `{{DATUM}}`, `{{TRANSKRIPT}}`.

````
Ti si istoričar-analitičar. Iz transkripta jedne epizode podkasta izvlačiš istorijske
događaje koji se mogu staviti na mapu i vremensku osu.

METAPODACI EPIZODE
id: {{BROJ}}
naslov: {{NASLOV}}
audioUrl: {{AUDIO_URL}}
pubDate: {{DATUM}}

ZADATAK
Vrati JSON (i ništa osim JSON-a) sa dva polja: "places" i "events".

TRI PRAVILA KOJA SU VAŽNIJA OD OSTALIH
1. "timestamp" je najvrednije polje. To je jedina veza između mape i podkasta — bez njega
   korisnik ne može da skoči na taj minut. Popuni ga za SVAKI događaj gde ga je moguće
   odrediti. Ako ga stvarno ne možeš odrediti, radije preskoči događaj nego da pogađaš.
2. "aliases" popuni iscrpno. Svi padežni i pravopisni oblici iz transkripta. Na osnovu njih
   se posle spajaju mesta iz 181 epizode u jedno kanonsko mesto; ako alias izostane,
   „Skoplje“ i „Skoplju“ završe kao dva različita mesta na mapi.
3. "region" drži na MALOM broju vrednosti — idealno do 10 u celoj epizodi, i ponovo
   upotrebi istu vrednost gde god možeš. To su grupe (redovi) na vremenskoj osi; 40
   različitih regiona daje 40 redova i osa postaje nečitljiva.
4. "yearEnd" je OBAVEZAN kad transkript navodi da je događaj trajao duže od godine
   (vladavina, rat, opsada, ustanak u trajanju) — bez obzira na "type". Vremenska osa
   iscrtava periode kao trake; bez yearEnd sve postaje tačka i gubi se razlika između
   jednodnevne bitke i vladavine od 40 godina. Ne veži ovo za tip događaja — jednodnevna
   bitka ostaje tačka i kad je type "uprising" (npr. jednonoćna pobuna), a period ostaje
   period i kad je type "conquest" (osvajanje u više navrata). Kriterijum je isključivo
   ono što transkript kaže o trajanju, ne lista tipova. Ako nema osnove u transkriptu za
   drugu godinu, ostavi yearEnd: null — ne izmišljaj raspon samo da bi zadovoljio ovo pravilo.

PRAVILA ZA "events" — jedan objekat po događaju:
- id: stabilan slug, ASCII kebab-case, oblik "tema-mesto-godina", npr. "dusan-krunisanje-1346".
  Bez dijakritike i bez ćirilice. Mora biti unikatan u okviru epizode.
- title: { "sr": "...", "en": "..." } — kratak naslov, do 60 znakova.
- year: CEO BROJ. Pre nove ere = negativan (431. p.n.e. → -431). Bez „oko“, „cca“ u polju.
- yearEnd: ceo broj ako transkript navodi da je događaj trajao duže od godine; inače null.
  Vidi pravilo 4 iznad — kriterijum je trajanje po transkriptu, ne tip događaja.
- placeId: id mesta iz "places" niza koji vraćaš u istom odgovoru.
- episodeId: "{{BROJ}}" — uvek.
- timestamp: "MM:SS" — trenutak u epizodi gde se o događaju govori. Vidi pravilo 1 iznad:
  obavezno kad god je moguće odrediti.
- type: jedno od: battle, siege, conquest, coronation, treaty, founding, death, birth,
  reign, uprising, reform, other.
- actors: niz ljudi/naroda/država ("Stefan Dušan", "Vizantija"). Do 4.
- region: gruba grupacija za filtriranje ("Srpsko carstvo", "Vizantija", "Zapadna Evropa").
  Vidi pravilo 3 iznad: što manje različitih vrednosti.
- description: { "sr": "...", "en": "..." } — 1–3 rečenice, na osnovu transkripta.
- quote: doslovna rečenica iz transkripta iz koje je događaj izveden. Ne parafraziraj.
- confidence: "high" | "medium" | "low".
    high   = godina i mesto su izričito rečeni u transkriptu
    medium = jedno od njih je izvedeno iz konteksta
    low    = godina ili mesto su nesigurni, ili transkript deluje iskvareno
             (Whisper ume da izgubi cifru: „138. godine“ za 1389)

PRAVILA ZA "places" — samo mesta koja koristiš u ovoj epizodi:
- id: ASCII kebab-case, bez dijakritike i ćirilice: "skoplje", "kosovo-polje", "reka-marica".
- name: { "sr": "Skoplje", "en": "Skopje" } — oba jezika obavezno.
- aliases: SVI padežni i pravopisni oblici koje si video u transkriptu
  ("Skoplju", "Skoplja"). Vidi pravilo 2 iznad — od ovoga zavisi spajanje mesta.
- lat, lng: decimalni stepeni, 4 decimale. Realne koordinate. Ako ne znaš tačno mesto
  bitke, upotrebi najbliže poznato naselje i stavi confidence "low" na događaj.
- kind: city | region | country | battle-site | landmark | water | person-seat | unknown
  ("person-seat" = prestonica vladara, kad je događaj vezan za osobu a ne za tačno mesto)

ŠTA NE RADITI
- Ne izmišljaj događaje, godine, koordinate ni citate. Ako godina nije poznata, preskoči događaj.
- Ne izvlači opšte digresije bez mesta i vremena („tada je feudalizam bio u usponu“).
- Ne prevodi imena mesta na engleski ako postoji ustaljeni engleski egzonim — koristi njega
  ("Carigrad" → "Constantinople").
- Ne dodaj polja koja nisu navedena.
- Bez markdown ograda, bez komentara, samo JSON.

TRANSKRIPT
{{TRANSKRIPT}}
````

Izlaz sačuvaj kao `fragments/{{BROJ}}.json`.

---

## Korak 2 — spajanje

Cilj: jedan `geo-events.json` u kome je svako mesto **jedno** mesto.

Preporuka: spajanje radi **skriptom, ne modelom** — deterministično je i proverljivo.
Pravilo spajanja: dva mesta su ista ako im se poklapa `id`, ili ako se `name.sr`/`alias`
jednog nalazi u `aliases` drugog. Spajanje po geografskoj blizini se NE koristi — dva
razdvojena mesta mogu biti bliža od 15 km (npr. Lexington i Concord, 10.3 km; Kosovo polje
i Priština, 12.4 km) i lažno bi se spojila, a greška se ne vidi u validatoru, samo kao
pogrešan marker na mapi. Pri spajanju uzmi prvi `id` kao kanonski, uniraj `aliases`, i
prepiši `placeId` u svim događajima.

Ako spajanje ipak radiš modelom, daj mu samo `places` nizove (ne događaje) i traži mapu
`stari_id → kanonski_id`, pa zamenu odradi skriptom.

Rezultat sklopi u:

```json
{
  "meta": {
    "source": "HistoryCast podcast (rss.com/rs-historycast)",
    "generated": "<ISO datum>",
    "count": <broj događaja>,
    "schemaVersion": "1.0"
  },
  "places": [ ... ],
  "episodes": [ ... ],
  "events": [ ... ]
}
```

`episodes[].color` dodeli sam (hex), aplikacija ga koristi za boju markera.

---

## Korak 3 — validacija (obavezno pre commit-a)

```bash
node scripts/validate-data.mjs public/data/geo-events.json
```

Hvata upravo ono što LLM najčešće pogreši: `placeId` koji ne postoji, `timestamp` koji nije
MM:SS, `yearEnd` pre `year`, duple `id`-jeve, koordinate van opsega, nepoznat `type`,
nedostajuću `confidence`. Prolaz je uslov — CI ga pušta pre svakog deploy-a.

Kad fajl prođe, uključi ga kao podrazumevani dataset: `DEFAULT_DATASET = 'full'` u
`src/lib/data.ts`. Do tada mu možeš pristupiti preko `?data=full`.

---

## Praktične napomene

- **Radi u serijama i validiraj rano.** Pusti 5 epizoda, spoji, validiraj, pogledaj na mapi
  preko `?data=full`. Greška u promptu na 5 epizoda je jeftina; na 181 nije.
- **`timestamp` je najvrednije polje** i najlakše se izgubi — to je jedina veza između mape
  i podkasta. Ako model počne da ga preskače, traži ga eksplicitno u svakom događaju.
- **Očekuj greške u godinama.** Whisper ume da izgubi cifru; zato postoji `confidence: low`,
  koji aplikacija prikazuje prigušeno i sa isprekidanim prstenom.
- **`region` drži na malom broju vrednosti.** To su grupe na vremenskoj osi — 40 različitih
  regiona daje 40 redova i osa postaje nečitljiva.
- **ASCII `id`-jevi.** U postojećem sample-u je `saurско-polje` (ćirilično „ск“) — radi, ali
  je zamka. Zato prompt to izričito traži.
