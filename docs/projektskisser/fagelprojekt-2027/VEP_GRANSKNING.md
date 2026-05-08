---
## VEP-Deliberation: SlideForge-design för Fågelprojekt 2027

**Datum:** 2026-05-06
**Panel:** Ad-hoc Presentationsekologi-panel
**Nivå:** 🟡 Standard Deliberation
**Rundor:** 1

### Narrativ sammanfattning
När Håkan bad om en snygg presentation för att spåna kring fågelprojekt, och samtidigt aktiverade `/VEP`, sammankallades en ad-hoc panel. Fokus låg på att utvärdera hur vi bäst använder Component Forge v3.0 för ornitologiska fältprojekt, samt att identifiera vilka SlideCraft-templates vi *saknar* för framtida fältpresentationer.

### Paneldeltagare
- **[VEP-01] Vera Visuell (Visuell designer):** Estetik och form-över-funktion.
- **[VEP-02] Dr. Fenix Fenologica (Science Communicator):** Naturskrivande, fenologi och biologisk rytm.
- **[VEP-03] Fabian Flöde (Interaktionsdesigner):** Mikrointeraktioner, feedback och presentationsteknisk dynamik.

---

### Ståndpunkter & Korspollinering

**[VEP-04] Vera Visuell:** "Vi har redan en stark uppsättning. Genom att använda `hero-image` för varje projekts startbild skapar vi omedelbar immersion. Och `dark_topo_astorp`-kartan jag såg till att vi genererade ger en otroligt snygg 'Command Center'-känsla i bakgrunden för kartnålarna."

**[VEP-05] Dr. Fenix Fenologica:** "Visst, det är snyggt. Men vi måste tänka på *vad* vi presenterar. Naturens tid är inte linjär, den är cyklisk. Vår `timeline-vertical` är bra för historik (som råkprojektet), men fåglar följer årshjulet. Vi saknar ett bra sätt att illustrera fenologi över året. Dessutom måste arterna få stå i centrum."

**[VEP-06] Fabian Flöde:** "Jag gillar att vi använder `box-reveal` (Den industriella ön) för att bygga upp spänningen kring en plats. Det bryter monologen, precis som vi fastställde i Skrivarstugan. Men jag håller med Fenix – när vi diskuterar artinventeringar känns de nuvarande sifferfokuserade slidesen (som `number-wall`) lite för... corporate. Vi behöver interaktioner som andas *fältarbete*."

---

### Friktioner och divergens

| Fråga | Position A (Vera/Fabian) | Position B (Fenix) | Status |
|-------|-----------|-----------|--------|
| **Datavisualisering** | Corporate-grafer (`line-chart`) fungerar bra för att visa minskning av rapphöns. | Grafer är för kalla. Vi behöver visa habitatets krympande yta rumsligt. | ÖPPEN |
| **Tidsrepresentation** | Tidslinjer (`timeline-vertical`) driver narrativet framåt. | Naturen kräver cyklisk representation (Årshjul/Growth Rings). | LÖST (Förslag på ny komponent) |

---

### Konsensus: Förslag på NYA SlideCraft-templates

Panelen är enig om att vi nått långt med v3.0, men för att GAIA ska bli den optimala plattformen för ornitologi föreslås följande nya SlideForge-komponenter för framtida sprintar:

1. **`season-wheel` (Fenologihjulet)**
   - *Varför:* För att illustrera när arter spelar, flyttar eller ska inventeras.
   - *Design:* Ett animerat årshjul (cirkulär tidslinje) där månader lyser upp i takt med att presentationen avancerar.

2. **`habitat-polygon` (Habitat-krymparen)**
   - *Varför:* För att visa varför t.ex. rapphönan minskar.
   - *Design:* En interaktiv karta/yta där användaren klickar för att "intensifiera jordbruket", varvid gröna kantzoner visuellt försvinner och populationstalet (i realtid) sjunker. En kognitiv smäll.

3. **`species-card` (Art-monografin)**
   - *Varför:* Ett mer biologiskt alternativ till "Quote" eller "Stat".
   - *Design:* Halva skärmen högupplöst artbild. Andra halvan en ren, datarik "ID-bricka" med utbredningskarta, status, hotkategori och en interaktiv ljudknapp för att spela upp lätet.

### Dirigentens (gAIas) beslut för dagens presentation
För den presentation som precis byggts (`fagelprojekt-2027`) har vi maximerat de *befintliga* templatesen. Vi använder `map-pins` för Rönneå, `box-reveal` för Nyvångshögen, och `process-chain` för att illustrera ett kombinerat årsprogram. Detta ger en mycket snygg, interaktiv och professionell grund för dina egna brainstormingsessioner.

---
