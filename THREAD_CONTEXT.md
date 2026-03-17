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


---

### 2026-03-09 — 200148a1

**Ursprung:** Åstorp-2026: Aktuellt-sida & Algoritmförbättringar
**Typ:** Framsteg | Buggfix | Beslut

> Skapade ny webbplatssektion `/aktuellt/` för utökade fågelrekommendationer (Möjliga just nu, I antågande, Rariteter). Fixade JS-bugg där avsaknad av `gridEl` blockerade klickbara kort och modaluppslag genom att refaktorera `arshjul.js`. VEP-kalibrering ledde till algoritmändring: breddad sökruta (summa för rullande 14-dagarsperiod) från deterministiska enskilda dagar, samt skapande av en "Förväntad" (grön) vs "Möjlig" (orange) UX-färgkodning som ersatte emojis.

**Relaterade filer:**
- `layouts/aktuellt/single.html` (ny layout + färgkodning)
- `layouts/_default/arshjul.html` (länkning till "Visa mer")
- `static/js/aktuellt.js` (algoritm med 14-dagars aggregat)
- `static/js/arshjul.js` (refaktorisering av modal och anpassning till sum-baserad logik)

---

### 2026-03-10 — 9b101376

**Ursprung:** Verifiering av vädersidan + axelfix + deploy-incident
**Typ:** Framsteg | Buggfix | Insikt

> Verifierade att alla SMHI-datakällor på `/vader/` returnerar korrekt 2026-data (temperatur param 19/20 från Helsingborg A, nederbörd param 5 från Åstorp, vattenföring station 2372, vind param 3/4). Fixade x-axel-alignment i alla diagram: Custom Canvas (vind, temp) fick `centerX = labelW + d * cellW + (cellW / 2)`, Chart.js (precip, flow, progress) fick `offset: true` vid dagsenhet. **Deploy-incident:** `deploy.sh` kör `git add -A` vilket fångade ofärdig notis (`2026-03-09-varen-andas-in-och-ut.md`, `draft: false`). Hugo byggde in den i `docs/`. Hotfix: satt `draft: true` + manuell borttagning av genererade filer i `docs/`. Lärdom: `deploy.sh` bör köra `hugo --minify --cleanDestinationDir` för att rensa orphan-filer.

**Relaterade filer:**
- `layouts/_default/vader.html` (centerX-fix + Chart.js offset)
- `content/posts/2026-03-09-varen-andas-in-och-ut.md` (satt draft: true)
- `deploy.sh` (identifierat förbättringsbehov: --cleanDestinationDir)

---

### 2026-03-10 — ebee3001

**Ursprung:** Hero widget + 24h-vy + dagsljuswidget för vädersidan
**Typ:** Framsteg | Nytt system

> Tre stora tillägg till `/vader/`: (1) Full-bredd "Just nu"-herowidget med vind-kort (kompass, Beaufort, vindkomponenter) + temperatur-kort (nutemp, dygnets max/min) + dagsljus-sektion (soluppgång/solnedgång, visuell 24h-remsa med borgerlig/nautisk/astronomisk skymning, beräknad med Jean Meeus-algoritm för Åstorp 56.08°N). (2) Ny "24 h"-tidsvy i diagramväljaren som hämtar SMHI `latest-day` timdata och bygger tre Chart.js-diagram (temp linje, vind grupperade staplar, nederbörd staplar). (3) Introtext omplacerad under widgeten. Deployat som commit `e05bacd`.

**Relaterade filer:**
- `layouts/_default/vader.html` (hero HTML + `buildTempNowWidget()` + `buildDaylightWidget()` + `show24hView()` med tre 24h-diagram)
- `assets/css/style.css` (`.vader-now-hero`, `.vader-now-card`, `.vader-daylight`, `.vader-dl-*` dagsljusremsa)

---

### 2026-03-11 — 890efc49

**Ursprung:** Aktuellt i markerna: 2×2-klassificering
**Typ:** Beslut | Framsteg | Buggfix

> Omklassificering av arter på `/aktuellt/`-sidan. Tidigare använde koden en enda variabel (`sumNow`) för att bestämma om en art var "Förväntad" eller "Möjlig", vilket blandade ihop artens årsförväntan med tidssignalen. Nu separeras de två dimensionerna: artens `category` (abundant/regular/uncommon från species-guide) och `sumNow` (obs-dagar i ±7-dagarsfönstret). Ny `getClassification()`-funktion returnerar etiketter: Förväntad, Tidig ankomst, Aktuell, Kan dyka upp, Möjlig. Fixade JS-bugg: `catOrder[abundant]=0` var falsy, vilket förstörde sorteringen. Lagt till färglegend och ny förklaringstext. Deployat som commit `1c1d7ce`.

**Relaterade filer:**
- `static/js/aktuellt.js` (ny `getClassification()`, fixad sortering, uppdaterad rendering)
- `layouts/aktuellt/single.html` (rubrik "Aktuella arter", förklaringstext, färglegend)

---

### 2026-03-13 — 4d8f1358

**Ursprung:** Tips & aktuellt: ny rekommendationsvy med stabil kategoriseringsalgoritm
**Typ:** Framsteg | Beslut | Buggfix

> Helt ombyggd rekommendationsvy: dropdown i sökfältet ersatt med dedikerad "Tips & aktuellt"-panel med fem kategorier (Aktuella arter, I antågande, Lämnar snart, Finns i området, Rariteter) och inline-årshjul. Två VEP-deliberationer genomförda: (1) ny kategori "Finns i området" för helårsarter med tillfällig obsdipp, (2) algoritmstabilisering med tre fixes: sumNow/sumSoon räknar dagar istf count, symmetrisk lämnar-logik för sommargäster aug-okt, och kombinerad djupvintertröskel (≥4 dagar ELLER ≥2 med ≥10% av total). Djupvintertröskeln skiljer stannare (Vit stork 39d, Kungsfågel 13d) från flyttfåglar (Gransångare 0d, Brun kärrhök 0d) korrekt.

**Relaterade filer:**
- `static/js/arshjul.js` (`renderTipsPanel()` med fem kategorier, isResident, isSummerGuest)
- `layouts/artguide/single.html` (Tips-panel HTML med fem sektioner, trevägs-toggle)

---

### 2026-03-13 — 4d8f1358 (del 2)

**Ursprung:** Modalfix, toggle kryssade, algoritmbugg varfågel
**Typ:** Buggfix | Framsteg | Beslut

> Tre förbättringar: (1) Modal-overlay-bugg: `<dialog id="arshjul-modal">` låg inuti `#panel-arshjul` som döljs vid panelväxling. Fix: flytt i HTML + JS-baserad fallback (`modal.closest('#panel-arshjul')` → `appendChild`) som skyddar mot CDN-cache. (2) Ny toggle "Visa även redan kryssade" i Tips-panelen: alla arter kategoriseras nu oavsett kryss-status, filtrering sker vid rendering. Badge visar antal dolda. Kryssade kort renderas med ✓-prefix, grönt namn och sänkt opacitet. (3) Varfågel-bugg: vintergäster (>75% vinterdagar) hamnade felaktigt i "Finns i området" via fallback `isResident`-check. Fix: `!isWinterGuest && !isSummerGuest` tillagt i fallback-villkoret.

**Relaterade filer:**
- `static/js/arshjul.js` (modal-flytt, renderTipsPanel() refaktorerad, isWinterGuest-fix)
- `layouts/artguide/single.html` (modal-position, introtext, checkbox-toggle)

---

### 2026-03-15 — ccf0ec1b

**Ursprung:** Varfågelobservation + årshjulsdata-fix
**Typ:** Framsteg | Buggfix

> Registrerade varfågel (1 ex) vid Kommungränsen, SV Mosshult (ny lokal, `new_pending`) i obs-registret (obs-2026-741). Arten redan kryssad sedan 2026-03-01 — inget årskryss. Upptäckte att årshjulsdata (`species_days_historic.json`) inte uppdaterades vid enskild observation via `/observationer`-workflowen. Manuellt lagt till `"03-15": 1` för Varfågel + synkat `static/data/` → `docs/data/`. Identifierat gap: `/observationer` saknar steg för årshjulsuppdatering vid enstaka obs utan System C-fil.

**Relaterade filer:**
- `Fåglar/Artportalen/observations-registry-2026.json` (+1 obs)
- `Fåglar/Artportalen/artportalen-sites.json` (+1 ny lokal)
- `gAIa_OBSIDIAN/gAIa/03 🪵 Growth Rings/Fenologi/03-15.md` (fenologipost)
- `static/data/species_days_historic.json` (+1 obsdag varfågel)

---

### 2026-03-16 — ccf0ec1b (del 2)

**Ursprung:** /lärdomar + skottårsbuggfix
**Typ:** Beslut | Buggfix

> Kedjad `/lärdomar` identifierade F3+F5 friktioner: `/observationer` saknade steg för årshjulsuppdatering vid enstaka obs. Implementerade nytt steg 3b i `observationer.md` (inline årshjulspatch vid Åstorp-obs) + NOTE i `Åstorp-2026.md` A3c. Separat bugg upptäckt: `arshjul.js` hade hårdkodad `isLeapYear = true` / `totalDays = 366`, vilket gav 1 dags förskjutning i alla datumpositioner fr.o.m. mars i icke-skottår. Fixat till dynamisk beräkning. Deployat som `05bc4fe6`.

**Relaterade filer:**
- `.agent/workflows/observationer.md` (nytt steg 3b)
- `.agent/workflows/Åstorp-2026.md` (NOTE i A3c)
- `static/js/arshjul.js` (dynamisk skottårsberäkning)

---

### 2026-03-16 — 7b6e4513

**Ursprung:** Fenologisk temperaturremsa v2 — VEP-designad ekologisk klassificering
**Typ:** Beslut | Framsteg | Buggfix | Nytt system

> Ersatte ΔT-dygnssvängningsremsan i `/vader/` med en fenologisk temperaturremsa som klassificerar varje dygn efter ekologisk karaktär. Itererat genom extended VEP-deliberation (6-expertpanel) till slutgiltig v2 med 8 kategorier: isdag (max ≤ 0°), tropisk natt, varmfrost (diagonal split), sommardag, frostdygn, insektströskeln (≥ 10°), bio. nollpunkt (5-10°), dvala (0-5°). Tre buggar fixade: (1) frost-prioritetbugg (insektströskeln trumfade nattfrost felaktigt), (2) JS `-0.0`-bugg (`-0 < 0` → false, fixat med `<= 0`), (3) varmfrost-anomali (sommardag + frost) saknade visuell distinktion. VEP-designbeslut: rent temperaturstyrd modell utan datumgränser — biologisk tolkning i säsongskontext delegeras till text (notiser/blogginlägg).

**Relaterade filer:**
- `layouts/_default/vader.html` (phenologyColor v2, drawSplitCell, legend)
- `VADER_DIAGRAM.md` (uppdaterad dokumentation)

---

### 2026-03-17 — 52cf6798

**Ursprung:** Fågelobservationer & Avstämning
**Typ:** Insikt | Röd tråd

> Upptäckte under morgonbriefingen att "Varfågel"-observationerna från 1 mars (Madkärr, Tomarp) och 15 mars (Kommungränsen, SV Mosshult) skiljer sig åt med hela 9.0 km avstånd. Detta betyder att det rör sig om två separata övervintrande/rastande individer i kommunen, inte samma individ som antogs i fenologireflektionen.

**Relaterade filer:**
- `Fåglar/Artportalen/observations-registry-2026.json` (avståndsanalys)

---
