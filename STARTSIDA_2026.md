# Kommunens startsida, 20 november 2026

Startsidan använder originalets logga, typsnitt, kort och observationsspår. Kommunens samtliga räknade arter visas direkt, med senaste tillskott överst och art nummer 1 längst ner. Den tidigare startsidemallen är bevarad på /mitt-fagelar-2026/ och nås under Fågelår. Den personliga checklistan, notiserna och bilderna är oförändrade.

Kommundata hämtas från Artportalen via SLU:s offentliga WFS: provider 1, exakt Åstorp, fåglar, positiva naturliga fynd utan osäker bestämning. Den befintliga AviList-mappningen återanvänds. Ofullständiga svar, okända taxa och tidsstämplar utan tidszon stoppas. En lyckad fullständig hämtning sparas i sessionStorage i 15 minuter; fel behåller daterat underlag och ersätts aldrig med noll. Ett saknat statiskt underlag hindrar inte livehämtning.

Årsvyn gäller 2026. Loader och verifierare är bundna till 2025/2026 och måste uppdateras inför nästa år. Årets första fynddatum är inte kommunens första fynd någonsin. Flera källfynd på samma första dag länkas utan att en ensam förstafinnare utses.

Publiceringskontrollen kördes i GitHub Actions med Hugo 0.154.5 extended. Den omfattade livehämtning, fullständighets- och taxonomikontroller, scripts/build.sh, data-/väder-/datum-/prediktionstester samt Chrome i 1440 och 390 pixlars bredd. Webbläsartestet kontrollerade hela listans ordning, dropdownmenyn, det bevarade årsprojektet, felhantering och en fullständig ny API-hämtning med CORS. Skärmbilder och kontrollresultat finns i arbetskörningens artifact:
https://github.com/hktcr/birds_Astorp/actions/runs/44688083413

Den tillfälliga byggworkflowen togs bort efter genomförd kontroll. Testskripten ligger kvar. Vid kommande ändringar:
- Kör node scripts/prepare-municipal-release.cjs för ny verifierad kommunfil.
- Kör bash scripts/build.sh och relevanta befintliga kontroller.
- Kör node scripts/test-municipal-home.cjs.
- Installera playwright@1.56.1 och Google Chrome i en stödd miljö för scripts/test-municipal-home-browser.cjs.
- Granska diffen och publicera källa tillsammans med motsvarande docs-filer.

Publiceringsbyggets kommunfil hämtades 2026-11-20 06:29:29 UTC: 156 arter, 1 496 offentliga fynd i årets kontrollerade urval. Det personliga årsprojektet har 150 arter.
