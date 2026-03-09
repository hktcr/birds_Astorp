### 2026-03-01 — 7b2ec468

**Ursprung:** Årets första trana, buggfixar Hugo och publicering av blogginlägg
**Typ:** Insikt | Framsteg | Buggfix

> Dokumenterat vårfåglar på bloggen. Felsökt och åtgärdat två buggar i Åstorp-2026: 
> 1) Datumvisningsbugg där Hugo visade "1 jan" på alla inlägg pga felaktig formateringstoken (`jan` istället för `Jan` i Go-templates). 
> 2) MacOS publiceringsbugg, där bilder med decomposed Unicode å,ä,ö i namnen ("Körslättabäckens_våtmarker") misslyckas ladda i GitHub Pages Caddy/CDN. Konvention: enbart ASCII-säkra namn på webb-assets.

**Relaterade filer:**
- `layouts/index.html` (ändrat datumformat)
- `content/posts/2026-03-01-arets-forsta-trana-vid-korslattabacken.md` (rensad metadata, fixad bildinbäddning, lagt in image-frontmatter)
- `static/images/posts/.../korslattabackens_vatmarker.jpg` (omdöpt filnamn)
- `Fåglar/Artportalen/observations-registry-2026.json` (lagt in 5 fler fåglar)

---

### 2026-03-02 — d46b5fe8

**Ursprung:** Termometer-progressbar på artkalendersidan
**Typ:** Framsteg | Buggfix

> Bytte progressbaren på `/artguide/` från tunn 8px-slider till startsidans termometer-stil (20px tjock bar med dynamisk hue-färg, skalmarkeringar 0/50/100/150, kort-container med skugga, slider-puck). Fixade även trasig Go-templatesyntax i `vader.html` (blogPosts-arrayen hade felformaterade `{{ }}`-taggar med mellanslag och saknade punkter) som förhindrade Hugo-bygget. Deployade till astorpsfaglar.se.

**Relaterade filer:**
- `layouts/artguide/single.html` (ny HTML-struktur för progressbaren)
- `assets/css/style.css` (termometer-CSS: 20px bar, gradient, puck)
- `assets/js/artguide.js` (dynamisk hue-färg, "Senast kryssad" med plats)
- `layouts/_default/vader.html` (fix Go-templatesyntax i blogPosts-arrayen)

---

### 2026-03-03 — 9064e410

**Ursprung:** Audit fågelnamn + latinnamn i årshjulet
**Typ:** Buggfix | Insikt | Framsteg

> Full namnaudit mot NL20-officiella-namn-2025.xlsx avslöjade att Entita hade fel latinnamn (`Poecile montanus` istället för `Poecile palustris`) i `checklist-2026.json` och `observations-registry-2026.json`. Rättat. VEP-panel rekommenderade att visa vetenskapligt namn i kursiv på årshjulskort och modaldialoger — implementerat och deployat. Alla 77 observationer och 197 arter validerade mot NL20.

**Relaterade filer:**
- `data/checklist-2026.json` (fixat latin för Entita)
- `Artportalen/observations-registry-2026.json` (fixat latin för Entita)
- `static/js/arshjul.js` (latinnamn på kort + modal)
- `data/species_guide.json` (redan korrekt)

---

### 2026-03-05 — b72b616d

**Ursprung:** Utökad rapportering i krysslista-workflows
**Typ:** Beslut | Framsteg

> Håkan efterfrågade detaljerad ändringsrapport efter `/krysslista`- och `/KrysslistaIn`-körningar. Uppdaterat båda workflows med §20-kompatibelt rapportsteg som inkluderar: nya årskryss med latinska namn, årshjuls-diff per art (snapshot före/efter omkompilering av `species_days_historic.json`), och deploy-bekräftelse.

**Relaterade filer:**
- `.agent/workflows/KrysslistaIn.md` (Steg 5 snapshot + Steg 8 detaljerad rapport)
- `.agent/workflows/krysslista.md` (Steg 4 snapshot + nytt Steg 5 rapport)

---
### 2026-03-07 — b8c0d8d9

**Ursprung:** Åstorp-2026 Krysslista & Naturprosa-kalibrering
**Typ:** Framsteg

> Hanterade krysslista för 2026-03-06 (Åstorp). Uppdaterade checklist-2026.json med Svartmes och Ängspiplärka (totalt 83 arter). Skapade blogginlägget 'Kraftmätning på fältet' med ny mediehantering (uppladdad video+poster). Omskapade /redaktörs-workflowen till att använda diff-block för bättre läsbarhet, och finjusterade Naturprosa-stilregistret för att tillåta mer berättande rytm.

**Relaterade filer:**
- data/checklist-2026.json
- content/posts/2026-03-06-tranor-och-svartmes.md
- .agent/workflows/redaktör.md
- gAIa_OBSIDIAN/gAIa/Skrivarstugan/Sakprosa/Naturprosa_Stilregister.md

---

### 2026-03-07 — b8c0d8d9 (del 2)

**Ursprung:** Åstorp-2026 Krysslista & Naturprosa-kalibrering
**Typ:** Insikt | Framsteg | Buggfix | Röd tråd

> Slutförde resterna av `/fågel`-pipelinen. Sökte upprutade `/observationer` och genererade TSV-exportfil för Artportalen med exakt filtrering (`artportalen: true`). Genomförde en `/astorpsfaglar` hälsokontroll och åtgärdade falskt positiva bash-script (`grep -qL`-bugg på macOS) samt en python-bugg som felaktigt tolkade fotokategorier som arter. Upptäckte att `/krysslista` saknade handover till `/fågel` och lade till en explicit uppmaning i slutet av det flödet (Steg 6) för att bygga en robustare brygga mellan inmatning och registrering.

**Relaterade filer:**
- `Artportalen/observations-registry-2026.json` (registrerade 31 nya obs, markerade 29 som skip)
- `.agent/workflows/astorpsfaglar.md` (rättat bash+python)
- `.agent/workflows/krysslista.md` (nytt Steg 6 handover)
- `data/species_portraits.json` (lagt till 4 saknade porträtt)

---

### 2026-03-07 — f3ab4ea4

**Ursprung:** VEP Årshjul som standardvy + felsökning
**Typ:** Beslut | Framsteg | Buggfix

> VEP-panel (utvidgad med 3 extra experter + 3 virtuella användare) delibererade om Artkalender vs Årshjul. Konsensusbeslut: Årshjulet blir standardvy, Artkalendern omvandlas till infällbar "Månadsguide". Fixat tre buggar: (1) Go-template-syntax i vader.html blockerade Hugo-bygget. (2) Trasig sed-injektion i arshjul.js (Promise.then-parameterlistan) kraschade hela scriptet. (3) CDN-cache serverade gammal trasig JS — löst med `?v={{ now.Unix }}` cache-busting.

**Relaterade filer:**
- `hugo.toml` (menynavnet "Årshjul")
- `layouts/artguide/single.html` (layout-omstrukturering + knapp)
- `static/js/artguide.js` (rensat helårsöversikt)
- `static/js/arshjul.js` (fixat Promise-chain)
- `layouts/_default/vader.html` (fixat Go-template-syntax)
- `CHANGELOG_ARSHJUL.md` (rollback-dokumentation)

---

### 2026-03-08 — f3ab4ea4 (del 2)

**Ursprung:** /lärdomar (kedjat från /avstämning)
**Typ:** Beslut | Insikt

> Kedjad `/lärdomar`-körning identifierade 4/6 friktionspoäng (F1 backtracking, F2 misslyckade kommandon, F4 upprepning, F6 överraskande komplexitet). Implementerade 🟢-ändringar direkt: (1) Deploy-steg D3 i `/Åstorp-2026` omstrukturerat till pre-flight build-check (Hugo MÅSTE lyckas innan commit). (2) Nytt steg D4 med separerade commit/push. (3) Cache-busting TIP-ruta. (4) sed-varning CAUTION-ruta. Två 🟡-förslag kvarstår: cache-busting som _CONVENTIONS.md-paragraf och flytt av arshjul.js till assets/.

**Relaterade filer:**
- `.agent/workflows/Åstorp-2026.md` (D3/D4 omstrukturering + TIP/CAUTION)

---

### 2026-03-08 — 167540b4

**Ursprung:** Pipeline-audit: Årshjul + Kalendervy inkrementell synk
**Typ:** Beslut | Framsteg | Insikt

> Full audit av datapipelinen identifierade att årshjul och kalendervy inte uppdaterades synkront vid ny observation. Tre luckor åtgärdade: (1) Nytt steg A3c i `/Åstorp-2026` kör `generate_radial_data.py` efter checklist-synk, med snapshot-diffing. (2) `arshjul.js` visar nu checklist-arter som saknas i species-guide med kategori `"new"`. (3) Metadata (`_meta`) i `species_days_historic.json` spårar alla AP-exporter + System C-filer för framtida dedup. `sync-data.sh` kör radialdata-regenerering automatiskt före Hugo-build. Dupliceringsskydd baseras på set-semantik (art + dag + år).

**Relaterade filer:**
- `.agent/workflows/Åstorp-2026.md` (A3c, V3, V4, uppdaterad snabbreferens)
- `sync-data.sh` (radialdata-regenerering före build)
- `static/js/arshjul.js` (new-species overlay, _meta-filtrering, checkedMap-fix)
- `scripts/generate_radial_data.py` (_meta-metadata)
- `scripts/preprocess_species_guide.py` (artportalen_export_file)

---

### 2026-03-08 — 9196924b

**Ursprung:** Fågelpipeline: 22 arter → registret + årshjul + deploy
**Typ:** Framsteg

> Fältlista med 22 arter (Mosshult, Salshult mosse, Högalidstoppen, Kvidinge) processad genom hela /fågel-pipelinen. Alla arter redan kryssade (inga nya årskryss). System C-fil sparad, 22 obs tillagda i registret (obs-2026-687→708), årshjulsdata uppdaterad med 22 nya dagspunkter på 03-08 (varav 16 arter aldrig noterats på just 8 mars innan). Deploy `ad46c8c`. Hälsokontroll 7/7 grön.

**Relaterade filer:**
- `Fåglar/Exkursioner/2026-03-08_astorp.json` (System C)
- `Fåglar/Artportalen/observations-registry-2026.json` (+22 obs)
- `static/data/species_days_historic.json` (+22 dagspunkter)

---

### 2026-03-09 — 2834ec88

**Ursprung:** Diagram i notiser (astorpsfaglar.se)
**Typ:** Beslut | Framsteg | Nytt system

> VEP-panel designade och implementerade ett system för statiska diagram i blogginlägg. Designbeslut: statisk PNG (inte live Chart.js), Lora italic bildtext i vetenskaplig stil, inline-only (befintlig lightbox räcker). Tre deliverables: (1) `.notis-chart` CSS-block med Lora italic figcaption. (2) `scripts/generate_notis_chart.py` — hämtar SMHI-data (temp/precip/wind/flow) och genererar stilade PNG. (3) Ny sektion "Diagram i notiser" i `CONTRIBUTING.md`. Alla diagramtyper testade mot live SMHI. `matplotlib` installerat som nytt beroende.

**Relaterade filer:**
- `assets/css/style.css` (ny `.notis-chart`-sektion)
- `scripts/generate_notis_chart.py` (ny fil)
- `CONTRIBUTING.md` (ny sektion)

---

