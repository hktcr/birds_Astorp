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

