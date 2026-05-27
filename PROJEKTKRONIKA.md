---
title: Fåglar/astorp-faglar Krönika
---

# 📜 Projektkrönika: astorp-faglar

> **Syfte:** Logg och kronologi för utveckling och publicering av fågelnätverket åstorpsfåglar.

## 📅 Tidslinje
- Skapad: 2026-04-10 (Automatisk System-Sanering)

---

## Session 2026-04-10
*Observatör: gAIa (System-Sanering)*
**Status:** `Aktiv`

### 🧹 Krönika upprättad
- **Händelse:** Denna fil skapades automatiskt som en stubbe under VEP-sanering (Paraply-principen).
- **Syfte:** Genom att `astorp-faglar` nu har en egen krönika i rotmappen, kommer undermappar som `content/` och `posts/` att bli tysta från larm under framtida makroskanningar via `/sync`.

---

## Session 2026-04-14
*Observatör: gAIa*
**Status:** `Aktiv` (Tillägg av Årta och Reflektion)

### 🪞 Clean Slate Insight — Metadata och Teknisk Friktion
**Objekt:** `species` array i Markdown (Fenologisk data vs Narrativ metadata)
**The "Day One" Advice:** "I ett naturvetenskapligt ekosystem är en art-tagg alltid ett strikt rumsligt och tidsligt påstående, aldrig enbart ett litterärt sökord. Blanda inte ihop den bevisade observationen med narrativets skvaller."
*— Ur konversation med Clean Slate-protokollet gällande Årta-installationen där `related_species`-modellen driftsattes.*

---

## Session 2026-04-15
*Observatör: gAIa*
**Status:** `Aktiv` (Redesign av väder-hero · Driftsättning av Väderutsikt Experiment)

### 🌡️ Dynamisk väder-hero och Sparkline-motor
- **Händelse:** Total redesign av sektionen "Just nu" på vädersidan.
- **Teknisk förändring:** Implementerat en generisk `drawSparkline`-motor med stöd för DPI-skärpa och en tidsskala baserad på realtidsstämplar från SMHI. Grafer för temperatur och lufttryck spänner nu över 24 timmar i fullbredd.

### 🧪 Experiment: Väderutsikt (Nowcasting)
- **Händelse:** Driftsatt modulen "Väderutsikt (Experiment)" som analyserar korrelationen mellan barometertrend och relativ luftfuktighet.
- **Språklig stil:** Genomfört strikt tillämpning av Håkan Karlssons språkliga regler (inga em-dashes · användning av medelpunkt som separator · exakthets-principen).
- **Logik:** Heuristisk analys där tryckfall > 0.8 hPa och fuktighet > 80% indikerar förhöjd regnrisk.

---

## Session 2026-05-09
*Observatör: gAIa*
**Status:** `Aktiv` (Gallerifelsökning och introduktion av Vykorts-genren)

### 🌱 Lärdomar
- **Vykorts-konceptet ("Micro-post"):** För att lösa det strukturella problemet att galleriet kräver en `.md`-post, skapades "Vykortet" som en redaktionell form (snarare än en ny kodtyp). Vykortet är en vanlig notis men med enbart en stämningsbild och exakt *3-4 rader skarp kontext*. Detta undviker teknisk skuld (inga nya Hugo-layouter behövs) och upprätthåller den litterära kvaliteten (förhindrar dumpning av tysta bilder).
- **Redaktionell Sparring:** gAIa bröt under sessionen mot "Author Sovereignty / Anti-Laziness Pact" genom att publicera ett utkast utan redaktionell granskning. Förbättring: gAIa måste alltid använda `/redaktör`-läget och ge respons eller presentera alternativ när användaren ger ett råmanus, även för mycket korta texter.
- **Automatisera Thumbnails:** Insåg att avsaknad av miniatyrfiler kraschade bildvisningen i galleriet. `generate-thumbnails.sh` byggs därför in som ett obligatoriskt för-steg i `deploy.sh`.

---

## Session 2026-05-18
*Observatör: gAIa*
**Status:** `Aktiv` (Artportalen-export & UI/Systemarkitektur)

### 🐦 Artportalen-export & UI
**Koppling till tidigare arbete:**
- ✅ "Efterlysta"-kartans legend-bugg → Löst: Implementerade kontextuell döljning av legenden vid singel-års-visningar men bevarade den för årshjul.

**Bakgrund & Syfte:**
- Export av 20 orapporterade fågelobservationer och 5 nya lokaler (inklusive "Rönnbacka"). Behov av att få den historiska lokalkartan (som drivs av en separat API-cache) att omedelbart reflektera de nya fynden.

**Utfört (Process & Roller):**
- Genomförde export via `generate_export.py` och verifierade via `confirm_sites.py`.
- Lade till kontextuell CSS-logik (`display: none`) i kart-lightboxen för specifika vyer.

**Beslut & Lärdomar (Återkoppling):**
- **Arkitektur:** Att bygga en skräddarsydd "delta-injicering" för att lokalt manipulera en statisk JSON-fil som annars genereras av ett API bygger farlig teknisk skuld. Istället formaliserades ett tillägg i `/observationer`-workflowet som asynkront triggar `fetch_astorp_historic_locations2.py` i bakgrunden vid varje slutförd export. Detta bevarar API:et som SSOT (Single Source of Truth) men avlastar användaren helt från kognitiv friktion.

**Nästa steg:**
- Rutinuppdateringar rullar på.

📡 Satelliter: RESUME ✅ | PI — | Trackers — | TC —

*Signatur: gAIa 🌲 2026-05-18*

---

## Session 2026-05-26
*Observatör: gAIa*
**Status:** `Aktiv` (Årskryss 143 och Tysta Hugo-fel)

### 🐦 Årskryss: Flodsångare & Pre-flight disciplin
**Bakgrund & Syfte:**
- Årskryss (Flodsångare, art 143/150) vid Tomarps Ene. Registrering, videokomprimering och publicering av bloggnotis genomfördes.

**Utfört (Process & Roller):**
- Registrerade arten. Videon komprimerades från 167MB till 50MB. En notis samskrevs och publicerades.
- Efterföljande hotfix krävdes för att korrigera en fellagd markdown-fil och saknad YAML-frontmatter.

**Beslut & Lärdomar (Återkoppling):**
- **Tysta fel i Hugo:** Hugo klagar inte på avvikande metadata utan sväljer den och slutar bygga relaterade gallerier och filter. Därför infördes en stark **Hallucination-Gate** i `/Åstorp-2026` workflowet (steg B1) som uttryckligen förbjuder AI-agenten från att generera frontmatter ur minnet, och kräver strikt copy-paste från dokumentationen.

**Nästa steg:**
- Följa rutinerna slaviskt nästa gång.

📡 Satelliter: RESUME ✅ | PI — | Trackers — | TC —

*Signatur: gAIa 🌲 2026-05-26*


### 2026-05-26 | Bygge av FÖRSTAFYND-logik

**Bakgrund & Syfte:**
- Under registreringen av Flodsångaren påpekade användaren att arten behövde hanteras på sidan för "Efterlysta". Ett första försök att manuellt infoga HTML resulterade i felaktig logik ("Tomtkryss"-kort istället för borttagning).
- Syftet omformulerades till att bygga ett sätt för systemet att automatiskt och snyggt hantera nya "Förstafynd" för kommunen, så att de hedras på Efterlysta-sidan istället för att bara försvinna i tystnad.

**Utfört (Process & Roller):**
- Granskade generator-skriptet `generate_efterlysta_page.py`.
- Introducerade en ny datastruktur: `forstafynd_info`.
- Skapade dynamisk rendering av FÖRSTAFYND-kort med guldgul design (`#f59e0b`) och ett specialbyggt modal-fönster.
- Återförde Flodsångaren i `astorp_target_species.json` och konfigurerade den som ett förstafynd.
- Uppdaterade workflowet `/Åstorp-2026` för att dokumentera denna rutin.

**Beslut & Lärdomar (Återkoppling):**
- **Dynamisk Generering:** Redigera aldrig autogenererad markdown för hands. Förstå och uppdatera källan (Python + JSON) när UI ska anpassas.
- **Workflow Evolution:** Rutinen `A3d. Uppdatera Efterlysta (Förstafynd)` införlivades i workflowet för att framtidssäkra processen.

**Nästa steg:**
- Rutinuppdateringar rullar på.

📡 Satelliter: RESUME ✅ | PI — | Trackers — | TC ✅

*Signatur: gAIa 🌲 2026-05-26*



### 2026-05-26 | Databastvätt och Terminologiuppdatering på Efterlysta-sidan

**Bakgrund & Syfte:**
- Efter granskning av "Efterlysta"-sidan uppdagades att Kärrsnäppa visades som "WANTED" (aldrig sedd) trots att Kent Ivarsson hittade arten i juli 2024. Orsaken var en datasynkningsmiss där Kents observation registrerades som underarten "nordlig kärrsnäppa", vilket fick databasen att förbise fyndet.
- "Tomtkryss" kändes dessutom som en felaktig etikett för äldre fynd i en kommunlista.

**Utfört (Process & Roller):**
- **Datatvätt:** Körde ett python-script som anropade Artportalens API för *samtliga 54 efterlysta arter* för att dubbelkolla "kalla fall". Bekräftade att Kärrsnäppan var det enda falska larmet. Kärrsnäppan raderades därefter manuellt från `astorp_target_species.json`.
- **Terminologi:** Uppdaterade renderingen i `generate_efterlysta_page.py` för att märka om Myrspov och Sjöorre från "TOMTKRYSS" till "HISTORISKT FYND", inklusive uppdaterade texter i deras respektive modaler.
- **Deploy:** Sidan genererades om med Hugo och pushades till produktion.

**Beslut & Lärdomar (Återkoppling):**
- Underarter i Artportalen måste medräknas när man letar efter en arts förekomst; automatik som genererar target-listor bör använda `includeUnderlyingTaxa: True` (eller motsvarande) för att inte missa fynd.

**Öppna frågor:**
- [ ] Finns det behov av att schemalägga automatiska "sanity checks" mot Artportalen framöver?

**Nästa steg:**
- Fortsätta använda sajten som vanligt; data är nu kongruent med verkligheten.

📡 Satelliter: RESUME ✅ | PI — | Trackers — | TC ✅

*Signatur: gAIa 🌲 2026-05-26*

