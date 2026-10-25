# Separat Hugo-prototyp: kommunportal och personligt fågelår

Utvecklingsgren: `dev/kommunportal-2026-10-25`, utgående från
`f196388d75e33cf30fcbcfca69bed4f54a962121`.

Detta är samma Hugo-projekt som den befintliga sajten, inte en ny Sites-kodbas.
Grenen ersätter inte `main`, ändrar inte GitHub Pages-inställningar och innehåller
ingen automatisk publicering. Denna source-only ändring inkluderar inte nya byggda
filer i `docs/`: bygg lokalt för att se prototypen. Gamla `docs/` i GitHub är inte
prototypens förhandsvisning. Använd inte `deploy.sh` för att prova grenen.

## Prova lokalt

Hugo **0.154.5 extended**, Python 3 och Node.js används i verifieringen.

```sh
git switch dev/kommunportal-2026-10-25
bash scripts/build.sh --baseURL /
# Valfritt: förhandsvisa på den egna datorn, inte som offentlig hosting:
hugo server --bind 127.0.0.1 --baseURL http://localhost:1313/ --disableFastRender
```

Byggskriptet synkar de befintliga godkända checklist-/lokaluppgifterna och gör
vanlig dataverifiering, utan commit, push eller observationshämtning. Hugo-servern
har inte startats i den här granskningen. `developmentPreview = true` ska ligga
kvar under granskningen. Det ger en tydlig banner, `noindex`, ingen GoatCounter
samt CSP `connect-src 'self'`: externa observation-/väderanrop blockeras. Bilder,
typsnitt, kartplattor och inbäddade medier kan fortfarande ha externa värdar.
Det är inte ett skydd för hemliga filer eller ett löfte om privat hosting.

## Vad prototypen visar

- `/`: kommunöversikt med **Underlag saknas**, källstatus och valbar jämförelsedag
  för 2024–2026. Datumreglaget ändrar periodetiketter, inte några påhittade tal.
- `/mitt-fagelar-2026/`: det befintliga personliga fågelåret, listan med 148 arter,
  tidslinje och notiser. 150 är en milstolpe, inte ett tak eller kommunmål.
- `/kommun/`: en tydlig platshållare för observatörer/rapportörer; inga namn,
  personantal eller placeringar. Namnsträngar är inte stabila person-ID:n.
- Artguide, årshjul och artsidor: personlig kryssmarkering skiljs från
  kommunstatistik. Ej källcertifierat äldre underlag visas som okänt, inte noll.
- Den gamla historiska fyndplatskartan är avsiktligt frånkopplad i förhandsläget,
  eftersom dess separat sammanställda källa ännu inte är avstämd.
- Befintlig text, bilder, galleri, notiser, vädersida och personlig karta bevaras.
  Ingen ny större väderkarta eller livekopplad års-/personjämförelse är byggd.

## Den reparerade datavägen

`artportalen_data.py` tar bara ett komplett, uttryckligt offentligt snapshot med
Artportalen `dataProviderId = 1` och Åstorp `municipalityId = "1277"`. Fynd-ID
bevaras exakt; taxon-ID används i stället för namn som identitet. Endast rank
`species` räknas i artaggregaten (`species-rank-only-v1`), med tydlig redovisning av
undantagna taxon. Detta är en dokumenterad urvalspolicy, inte färdig nationell
liststandard eller automatisk biologisk artbedömning.

Alla sidor, antal, ID:n, datum, källa och avgränsning kontrolleras före skrivning.
Transporten i `fetch_artportalen.py` är injicerad/testad med syntetiska fixtures;
den har inga credentials, live-HTTP-kommandon eller nytt appgodkännande.
Konservativ partitionering används före den lägre dokumenterade sökgränsen.
Lika Count före/efter är en kontroll, inte bevis på en atomisk snapshot.

Det framtida, godkända snapshotet behöver granskas före användning. Exemplen
nedan är **offline**, skriver separata utkast och hämtar ingenting:

```sh
python3 scripts/update-species-guide.py --snapshot /path/to/reviewed-snapshot.json --output /tmp/species-guide-candidate.json
python3 scripts/generate_radial_data.py --snapshot /path/to/reviewed-snapshot.json --output /tmp/yearwheel-candidate.json
```

Båda aggregaten måste komma från samma snapshot/hash. Personliga exkursioner och
checklistor läses aldrig av dessa generatorer. `static/data/artportalen-public-snapshot.json`
är en framtida, minimal källfil för Fältpulsen; den skapas inte av prototypen.
Personnamn, kommentarer, exakta positioner och godtycklig metadata följer inte med
i den normaliserade offentliga projektionen.

**Migreringsvarning:** äldre instruktioner i `CONTRIBUTING.md` samt `sync-data.sh`
kan beskriva det gamla generatorflödet utan `--snapshot`. Det flödet stoppas nu
avsiktligt. Använd bygginstruktionen ovan för prototypen; ersätt inte okända
historiska data med nollor, personliga kryss eller syntetiska fixtures.

## Verifiering

```sh
bash scripts/build.sh --baseURL /
python3 scripts/test-artportalen-data.py
python3 scripts/test-crossbill-publication.py
python3 scripts/test-gallery-private-photo.py
python3 scripts/test-weather-archive.py
# Offline-sviter (inte browser-testet):
for test in scripts/test-*.cjs; do
  case "$test" in *test-photomap-browser.cjs) continue;; esac
  node "$test" || exit 1
done
```

Det nya testet `test-portal-integration.cjs` kör den byggda HTML:ens JavaScript i
VM med DOM-stubbar: källstatus, datumkontroll, personlig räknare, etikettescaping,
koordinatprojektion och lokala länkar. `test-prediction-links.cjs` testar också
upprepad laddning/fel och att ett äldre svar inte återinför inaktuella kort.
Fixtures är märkta som syntetiska och skrivs inte till publicerade data.

Full Hugo-build och offline-regressioner ersätter inte visuell browser-QA.
Browser-QA blev blockerad före sidkörning i denna cloudmiljö; inga skärmbilder,
interaktiva karttester eller renderingsbedömningar ska redovisas som godkända.

## Kvar före någon release

1. Bekräfta det befintliga SLU-appgodkännandets avsedda användning och eventuella
   krav på nytt godkännande. Ingen ny credential/åtkomst eller livefråga ingår här.
2. Verifiera driftsatt SOS-kontrakt, taxonrank/lokalisering, sorterbara fält,
   fullständig paginering och täckning med tillåten transport.
3. Regenerera och stäm av äldre potentiellt blandade underlag. Kodreparationen
   certifierar inte historiska JSON-filer; de har därför bevarats oförändrade.
4. Granska personidentitet, observatör/rapportör, integritet och villkor innan
   någon ranking byggs. Jämförbara kommunårsdata kräver samma artpolicy och urval.
5. Genomför visuell/browser-QA, kontrollera relevanta kartflöden och ny granskning.
6. Separat uttryckligt godkännande innan main-ersättning, offentlig preview eller
   produktion. Att grenen finns på GitHub är inte ett publiceringsbeslut.

### Officiella kontraktskällor

- [SOS: providerfilter](https://github.com/biodiversitydata-se/SOS/blob/master/Docs/SearchFilter.md#data-provider-filter)
- [SOS: observationsfält](https://github.com/biodiversitydata-se/SOS/blob/master/Docs/Observation.md)
- [SOS: fieldsets](https://github.com/biodiversitydata-se/SOS/blob/master/Docs/FieldSets.md)
- [SOS: provider-ID:n](https://github.com/biodiversitydata-se/SOS/blob/master/Src/SOS.Lib/Constants/DataProviderIdentifiers.cs)
- [SOS: paginerat svar](https://github.com/biodiversitydata-se/SOS/blob/master/Src/SOS.Api.Contracts/Common/Responses/PagedResultDto.cs)

Källorna har lästs som dokumentation/källkod. Ingen observationsfråga eller export
har utförts för denna prototyp.
