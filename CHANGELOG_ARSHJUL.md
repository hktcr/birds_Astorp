# Changelog: Årshjul som standardvy (VEP-hybrid)

**Datum:** 2026-03-07
**Syfte:** Göra Årshjulet till den centrala och visuella standardvyn för hela "Artguide"-sektionen, och förvisa Artkalendern (Månadsvyerna) till ett dedikerat verktyg för användning ute i fält.

## Ändringar utförda

1. **`hugo.toml`**: 
   - Huvudmenyns länk, som tidigare hette "Artkalender", har bytt namn till "Årshjul" (pekar fortfarande på `/artguide/`).

2. **`layouts/artguide/single.html`**:
   - `artguide-progress` (0/150 arter-mätaren) flyttades ur Kalender-diven till en egen global position i toppen av sidan.
   - Den gamla tab-switchen (`.artguide-tabs`) byttes ut mot en specifik "CTA-Banner" (Call to action): *Ute i fält? Öppna Aktuellt Just Nu-guiden*.
   - Månadsvyn ("Artkalendern") rensades på "Helårsöversikt"-toggles och de gamla heatmap-strukturerna.
   - `panel-arshjul` sattes som synlig från start (`display:block`), medan kalendern gömdes som default (`display:none`).

3. **`static/js/artguide.js`**:
   - Rensat bort `renderYearView()` (heatmappen).
   - Uppdaterat logik för "Fält-knappen" istället för den gamla tab-logiken.
   - Korten i Månadsvyn klickar nu fram `openModal()` (från `arshjul.js`) istället för inline-detaljer.

## ⏪ Hur du backar ändringarna

Om detta spårar ur eller om du ångrar hybrid-lösningen, kan du enkelt återställa hela projektet till tillståndet det befann sig i innan dessa ändringar. Eftersom alla ändringar görs ovanpå Git kan du köra:

```bash
# Se vilka filer som är ändrade
git status

# Om du vill slänga alla nuvarande (ej commitade) ändringar och återgå:
git checkout -- hugo.toml layouts/artguide/single.html static/js/artguide.js

# Eller för att återställa hela katalogen om andra filer blivit påverkade:
git restore .
```

*Har du redan hunnit committa detta upp till GitHub?*
Då backar du genom att hitta den specifika commit-hashen (via `git log`) innan denna ändring:
```bash
git log --oneline
# (hitta hash, t.ex. abc1234)
git reset --hard abc1234
git push -f origin main
```
