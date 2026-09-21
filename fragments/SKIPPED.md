# Preskočene epizode

Evidencija epizoda koje nisu dale fragment (ili su duplikat postojećeg). Razlog je
namerno konkretan i razlikuje dve vrste slučajeva:

- **pokvaren transkript** — tehnički problem (loš audio, Whisper greška, prazan/repetitivan
  transkript). Rešivo ponovnom transkripcijom; treba ponovo pokušati ekstrakciju ako se
  transkript popravi.
- **nema datiranih događaja** — sadržaj epizode je legitimno bez kombinacije datum + mesto +
  citat (npr. Q&A format, opšta diskusija). Neće se promeniti ni sa boljim transkriptom;
  konačan ishod.
- **duplikat** — isti transkript/epizoda već obrađena pod drugim rednim brojem fajla.

| epizoda | naslov | razlog |
|---|---|---|
| 68 | Dušanov zakonik | duplikat — već obrađena u prvoj seriji (fragment `68.json` postoji), fajl se ponovo javio pod drugim rednim brojem transkripta |
| (specijal, bez broja) | Istoričari odgovaraju na vaša pitanja | nema datiranih događaja — Q&A format, sve pominjane teme su apstraktne diskusije o ideologiji/historiografiji bez kombinacije datum + mesto + citat |
| 49 | Stefan Uroš I | pokvaren transkript — cela epizoda transkribovana kao repetitivno ponavljanje fraze "Uruša prvom" na svakih ~30 sekundi; nema upotrebljivog govornog sadržaja |

## Delimično oštećeni transkripti (fragment ipak napravljen)

Nisu preskočene, ali vredi zapisati radi buduće ponovne transkripcije — prvi deo je
neupotrebljiv, ostatak je iskorišćen normalno.

| epizoda | naslov | razlog |
|---|---|---|
| 47 | Japan: Doba šoguna | prvih ~15 minuta transkribovano kao repetitivno "Hvala vam." (verovatno tišina/muzika na početku epizode pogrešno transkribovana); od minuta ~15 nadalje transkript je normalan i korišćen je za ekstrakciju |

