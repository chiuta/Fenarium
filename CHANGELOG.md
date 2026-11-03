# Jurnal de modificări — FENARIUM

Format: SemVer MAJOR.MINOR.PATCH. Date: AAAA-LL-ZZ. (Versiunile 8 și 9, fără număr de patch, sunt echivalentele 8.0.0 și 9.0.0.)

## 9.1.0 — 2026-11-03

Aducere la nivelul celorlalte aplicații „fără frontiere”:

- Nou (kit FFF 1.2.0: `core, store, dialog, label, bundle, qr, p2p, sync, history, bridge`): dialogul «Transparență» (clic pe versiune: rețea, stocare, permisiuni, SHA-256), copie de siguranță `.fff.json` (și criptată), sincronizare între dispozitive și istoric local; CSP strict (`connect-src 'none'`, scripturi doar cu hash); instalabilă (manifest + service worker, offline).
- Nou: pașaport de învățare comun (`passport/fff`): «Notează în pașaport», repetiție eșalonată, certificat tipăribil; local, fără server.
- Schimbat: cele 10 apeluri native `alert()`/`confirm()` (ștergerea jurnalului, planul A/B nou, golirea laboratorului, resetarea progresului cursului, restaurarea unei copii, importul jurnalului, avertizarea pentru sesiunile cu lumină) folosesc dialogurile accesibile ale kitului (Escape = anulare, focus pe «Anulează»; ștergerile sunt marcate ca periculoase). Avertizarea pentru lumină și celelalte confirmări sunt acum asincrone.
- **Chei de stocare: `fenarium_*` → `fenarium.*`, fără pierdere de date.** La prima pornire, o migrare idempotentă COPIAZĂ `fenarium_lang`, `fenarium_theme`, `fenarium_jurnal_v1`, `fenarium_set_v1`, `fenarium_day_v1`, `fenarium_prog_v1`, `fenarium_lab_v1` în `fenarium.lang`, `fenarium.theme`, `fenarium.jurnal.v1`, `fenarium.set.v1`, `fenarium.day.v1`, `fenarium.prog.v1`, `fenarium.lab.v1`. Cheile vechi NU se șterg; o cheie nouă deja existentă nu se suprascrie; fiecare copie e verificată prin citire înapoi; după o rulare fără erori se scrie markerul `fenarium.migrated` și nu se mai face nimic. Jurnalul din «Fosfena» (`fosfena_jurnal_v1`) rămâne citit ca înainte, dacă jurnalul nou lipsește. «Șterge datele» din «Transparență» șterge atât cheile noi, cât și pe cele vechi (sunt indexate de kit), deci nimic nu «reînvie» după ștergere. Copiile de siguranță proprii (`fenarium-backup.json`) nu depind de numele cheilor și se importă ca înainte.
- Accesibilitate: bara de sus e reper de navigare; tabelele late din laborator stau în containere derulabile focalizabile și etichetate; axe-core: 0 violări în 8 scenarii (luminos/întunecat, 360/1366 px, pagină și dialog) și pe 9 taburi.
- Reparat: scripturile cu dicționarele de limbă erau după `</body></html>`; acum sunt în interiorul `<body>`.
- Teste noi: `tests/fenarium.test.mjs` (pornire fără erori/rețea/CSP, migrarea cu date vechi — inclusiv conflict, date corupte, stocare blocată, ștergere prin kit —, toate dialogurile, copie de siguranță, axe, paritate pe 8 limbi și fără depășiri la 360 px, import ostil).

## 9 — 2026-11-03

Interfață adaptabilă (desktop, tabletă, telefon), meniu orizontal care se rupe pe rânduri.
