import type { EpisodeOverrides } from '../lib/episodeModel';

/**
 * Hand-checked corrections to the episode model (HANDOFF §1), where the rules in
 * lib/episodeModel.ts get an episode wrong: its period, its kind, the place its marker stands at,
 * a precise date label, and an English title (the dataset carries Serbian titles only).
 *
 * Source: the Claude Design prototype (docs/design/revamp/prototype.html, `window.HC_DATA`),
 * where these were baked into the episode data. Recovered on 2026-10-06 by comparing every
 * prototype episode with what deriveEpisodes produces, and keeping only real differences:
 *
 * - a place counts as changed only when its *name* differs — the prototype used slightly
 *   different coordinates for the same places, which is not a correction;
 * - a kind is written only when it is not what §1's rule gives for that period anyway;
 * - places the data does not have cannot be pointed at, so these keep their derived place:
 *     118: place "Više lokacija" is not a place in the data
 *     121: place "Pacifik" is not a place in the data
 *
 * Everything works without this file (§1). Keyed by episode id; checked by
 * episodeOverrides.test.ts against the dataset.
 */
export const EPISODE_OVERRIDES: EpisodeOverrides = {
  // Dušanova Srbija: Uspon carstva
  '09': { from: 1331, to: 1355, title: { en: 'Dušan\'s Serbia: Rise of an Empire' } },
  // Napoleon, I deo: za početnike
  '14': { placeId: 'kairo' },
  // Pokret nesvrstanih
  '20': { placeId: 'beograd' },
  // Cezar Drugi deo: Trijumf i kraj
  '40': { from: -509, to: -44 },
  // Dušanov zakonik
  '68': { from: 1349, to: 1349, title: { en: 'Dušan\'s Code' } },
  // Kosovska bitka, HistoryCast specijal
  '95': { from: 1389, to: 1389, placeId: 'kosovo-polje', dateLabel: { sr: '28. jun 1389.', en: '28 June 1389' }, title: { en: 'The Battle of Kosovo (HistoryCast special)' } },
  // Mao Cedung
  '112': { placeId: 'peking', title: { en: 'Mao Zedong' } },
  // Leonardo da Vinči
  '114': { placeId: 'firenca', title: { en: 'Leonardo da Vinci' } },
  // Vuk Karadžić
  '115': { placeId: 'trsic', title: { en: 'Vuk Karadžić | HistoryCast on Sunday' } },
  // Šarl De Gol
  '116': { title: { en: 'Charles de Gaulle' } },
  // Miroslavljevo jevandjelje
  '117': { from: 1180, to: 1998, placeId: 'sveta-gora', title: { en: 'The Miroslav Gospel' } },
  // Najveće istorijske laži
  '118': { title: { en: 'History\'s Greatest Lies' } },
  // Kublaj-kan i mongolsko carstvo
  '119': { title: { en: 'Kublai Khan and the Mongol Empire' } },
  // Kralj Petar II
  '120': { title: { en: 'King Peter II' } },
  // Rat na Pacifiku, Drugi svetski rat
  '121': { title: { en: 'The Pacific War, World War II' } },
  // Vizantijske carice
  '122': { title: { en: 'Byzantine Empresses' } },
  // Demon bojnog polja, Voja Tankosić
  '123': { title: { en: 'Demon of the Battlefield: Voja Tankosić' } },
  // Krimski rat
  '124': { title: { en: 'The Crimean War' } },
  // Salvador Dali
  '125': { placeId: 'figueres', title: { en: 'Salvador Dalí' } },
  // Ataturk, od bolesnika sa Bosfora do moderne Turske
  '126': { placeId: 'ankara', title: { en: 'Atatürk: From the Sick Man of the Bosphorus to Modern Turkey' } },
  // Engleska Republika, Oliver Kromvel
  '127': { title: { en: 'The English Republic: Oliver Cromwell' } },
  // Mikelanđelo
  '128': { title: { en: 'Michelangelo' } },
  // Irski rat za nezavisnost
  '129': { from: 1916, to: 1923, title: { en: 'The Irish War of Independence' } },
  // Korejski rat
  '130': { from: 1950, to: 1953, placeId: 'seul', title: { en: 'The Korean War' } },
  // Pseudoarheologija
  '131': { kind: 'long', title: { en: 'Pseudoarchaeology' } },
  // MOSAD
  '132': { title: { en: 'Mossad' } },
  // Nuklearna katastrofa u Černobilju
  '133': { from: 1986, to: 1986, dateLabel: { sr: '26. april 1986.', en: '26 April 1986' }, title: { en: 'The Chernobyl Nuclear Disaster' } },
  // Pad Berlina, drugi svetski rat
  '134': { kind: 'range', title: { en: 'The Fall of Berlin, World War II' } },
  // Mihajlo Pupin
  '135': { from: 1854, to: 1935 },
  // Otkriće Troje
  '136': { from: 1870, to: 1873, placeId: 'hisarlik-troja', title: { en: 'The Discovery of Troy' } },
  // Raspućin
  '137': { placeId: 'petrograd', title: { en: 'Rasputin' } },
  // Pokrštavanje Slovena
  '138': { title: { en: 'The Christianization of the Slavs' } },
  // Hemingvej
  '139': { title: { en: 'Hemingway' } },
  // Vikinzi
  '140': { placeId: 'lindisfarne', title: { en: 'The Vikings' } },
  // Duško Popov, kodno ime "Tricikl"
  '141': { from: 1940, to: 1946, placeId: 'london', title: { en: 'Duško Popov, codename "Tricycle"' } },
  // Američki rat za nezavisnost
  '142': { title: { en: 'The American War of Independence' } },
  // Bizmark
  '143': { title: { en: 'Bismarck' } },
  // Istoričari odgovaraju na vaša pitanja
  'istoricari-odgovaraju-na-vasa-pitanja': { placeId: 'rim' },
  // Partenon
  'partenon-historycast-nedeljom': { from: -446, to: 1860 },
};
