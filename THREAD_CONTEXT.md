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
