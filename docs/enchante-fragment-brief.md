# Enchanté brief — producing an episode fragment

What Enchanté delivers for each episode: **one JSON file per episode**, dropped into
`fragments/`. Nothing else. The merge script turns the whole folder into
`public/data/geo-events.json`, and the app reads only that.

An episode that has no fragment does not exist in the app — even though it is in the RSS
feed. The feed supplies title, publication date and audio URL; the fragment supplies the
events. Both halves are needed.

## 1. File name

The file name **is** the episode id, and it must match what the merge script derives from
the feed title:

| Feed title | File |
|---|---|
| `145 - Ustanak u Srbiji 1941.` | `fragments/145.json` |
| `75. - Stefan Prvovenčani` | `fragments/75.json` |
| `115 = Vuk Karadžić \| HistoryCast nedeljom` | `fragments/115.json` |
| `Novogodišnja epizoda` | `fragments/novogodisnja-epizoda.json` |
| `HistoryCast četvrtkom - Žiča` | `fragments/historycast-cetvrtkom-zica.json` |

The rule the script applies: if the title **starts** with digits, the episode number is
those digits (a trailing `.` and any separator — `-`, `=`, `–`, space — are ignored).
Otherwise the id is the slug of the *entire* title: lowercase, diacritics stripped
(`ž`→`z`, `ć`→`c`), **`đ`→`dj`**, every run of non-alphanumerics collapsed to a single `-`, no
leading or trailing `-`.

`đ` is spelled out because it is the one exception in the Serbian alphabet. `č ć š ž` are a
base letter plus a *combining* diacritic, so stripping the combining marks handles them.
`đ` (U+0111) is a letter with a **stroke** — one indivisible codepoint with no mark to strip —
so it needs an explicit replacement. `Karađorđe` → `karadjordje`, not `kara-or-e`. If you are
ever unsure of a slug, print it rather than guess:

```sh
node -e 'const s=process.argv[1].toLowerCase().replace(/đ/g,"dj").normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");console.log(s)' "Karađorđe posle Karađorđa"
```

Getting this wrong does **not** fail validation. The episode merges with the title
`Epizoda <id>`, no `pubDate`, and an empty `audioUrl` — which silently breaks "Play at
MM:SS" for every event in it. Check the generated `episodes` entry after merging.

Note the feed reuses numbers 5 and 6 across the main show and the side series. If a fragment
is ever produced for one of those, use the slug form for the side-series one so the two
cannot collide.

## 2. Fragment shape

```json
{
  "places": [ /* every place referenced by this episode's events */ ],
  "events":  [ /* the events */ ]
}
```

A typical episode yields **4–6 events**. Current totals: 178 fragments, 741 events,
283 places, covering 180 of 181 transcripts. Use `fragments/144.json` as the reference example.

### Place

```json
{
  "id": "ohrid",
  "name": { "sr": "Ohrid", "en": "Ohrid" },
  "aliases": ["Ohridu", "Ohrida", "Okridu", "Okrid", "Okredu", "okritska"],
  "lat": 41.1231,
  "lng": 20.8016,
  "kind": "city"
}
```

- `id` — kebab-case ASCII, named after **the place**, never after the episode topic.
  `beograd`, not `beograd-vuk`.
- `name.sr` and `name.en` are both required.
- `kind` — one of `city`, `region`, `country`, `battle-site`, `landmark`, `water`,
  `person-seat`, `unknown`.

**Aliases carry the most weight.** They are the only mechanism that merges the same place
across episodes — there is deliberately no merging by coordinate proximity, because Lexington
and Concord are 10 km apart and would falsely collapse. So list every form that appears in
the transcript: Serbian case endings (`Ohridu`, `Ohrida`), adjectives (`okritska`), and
transcription errors from the speech-to-text (`Okredu`, `Okrid`). Under-aliasing produces two
markers for one city; the validator catches only the subset that share exact coordinates.

### Event

```json
{
  "id": "vuk-brankovic-rodjenje-ohrid-1345",
  "title": { "sr": "Rođenje Vuka Brankovića u Ohridu", "en": "Birth of Vuk Branković in Ohrid" },
  "year": 1345,
  "yearEnd": null,
  "placeId": "ohrid",
  "episodeId": "144",
  "timestamp": "21:53",
  "type": "birth",
  "actors": ["Vuk Branković"],
  "region": "Balkan",
  "description": {
    "sr": "Pretpostavlja se da je Vuk Branković rođen u Ohridu oko 1345. godine.",
    "en": "Vuk Branković is presumed to have been born in Ohrid around 1345."
  },
  "quote": "rekli smo, predpostavlja se rođenje u Okredu, oko 1345. godine.",
  "confidence": "medium"
}
```

| Field | Rule |
|---|---|
| `id` | Stable globally-unique slug. Pattern that works: `<subject>-<what>-<place>-<year>`. |
| `year` | **Integer.** BC is negative: 431 BC → `-431`. Never a string, never a range. |
| `yearEnd` | Integer or `null`. Use it for spans; must be ≥ `year`. A `reign` almost always needs one. |
| `placeId` | Must exist in this fragment's `places`. |
| `episodeId` | The episode id — same string as the file name. |
| `timestamp` | `MM:SS` or `MMM:SS` (`21:53`, `104:07`). Where in the audio the claim is made. |
| `type` | `battle`, `siege`, `conquest`, `coronation`, `treaty`, `founding`, `death`, `birth`, `reign`, `uprising`, `reform`, `other`. |
| `region` | **Closed set — see below.** |
| `description` | `sr` required, `en` strongly preferred. One or two sentences. |
| `quote` | The verbatim transcript sentence the event came from. This is the provenance trail; keep the speech-to-text wording, errors included. |
| `confidence` | `high`, `medium`, `low`. `low` = the year or the place is uncertain. Prefer honest `low` over a confident guess. |

## 3. The region list is closed

```
Balkan | Vizantija i Egejski svet | Osmansko carstvo | Srednja Evropa |
Zapadna Evropa | Istočna Evropa | Severna Evropa i Atlantik | Bliski istok |
Afrika | Azija | Severna Amerika | Južna Amerika
```

Twelve values, no others, exact spelling. Regions are the timeline's group rows, so their
count is a hard UI constraint rather than a matter of taste. Left to per-episode judgement
the list grows by roughly one value every two episodes, which extrapolates to 60+ unreadable
rows across the full archive. Pick the nearest value; never invent one.

## 4. Merge and verify

```sh
npm run episodes          # refresh episodes.json from the RSS feed (only if titles changed)
HISTORYCAST_EPISODES_JSON=episodes.json node scripts/merge-fragments.mjs
node scripts/validate-data.mjs public/data/geo-events.json --strict
```

`--strict` turns two warnings into errors: an off-list `region`, and one place split across
several ids. Both must be clean before committing.

After merging, confirm the new episode carries a real title and a non-empty `audioUrl` — that
is the check the validator cannot do for you.
