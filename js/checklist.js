/**
 * Fågelåret i Åstorp — Årskrysslista
 * Interaktiv artlista med filter och sortering
 */


(function () {
    'use strict';


    // Swedish bird species in taxonomic order (subset for MVP)
    // Full list can be expanded from BirdLife Sverige taxonomy
    const SPECIES_LIST = [
        { id: 1, name: "Knölsvan", latin: "Cygnus olor", order: 1 },
        { id: 2, name: "Sångsvan", latin: "Cygnus cygnus", order: 2 },
        { id: 3, name: "Skogsgås", latin: "Anser fabalis", order: 3 },
        { id: 4, name: "Grågås", latin: "Anser anser", order: 4 },
        { id: 5, name: "Kanadagås", latin: "Branta canadensis", order: 5 },
        { id: 6, name: "Vitkindad gås", latin: "Branta leucopsis", order: 6 },
        { id: 7, name: "Gräsand", latin: "Anas platyrhynchos", order: 7 },
        { id: 8, name: "Kricka", latin: "Anas crecca", order: 8 },
        { id: 9, name: "Bläsand", latin: "Mareca penelope", order: 9 },
        { id: 10, name: "Knipa", latin: "Bucephala clangula", order: 10 },
        { id: 11, name: "Storskrake", latin: "Mergus merganser", order: 11 },
        { id: 12, name: "Fasan", latin: "Phasianus colchicus", order: 12 },
        { id: 13, name: "Storskarv", latin: "Phalacrocorax carbo", order: 13 },
        { id: 14, name: "Gråhäger", latin: "Ardea cinerea", order: 14 },
        { id: 15, name: "Röd glada", latin: "Milvus milvus", order: 15 },
        { id: 16, name: "Havsörn", latin: "Haliaeetus albicilla", order: 16 },
        { id: 17, name: "Sparvhök", latin: "Accipiter nisus", order: 17 },
        { id: 18, name: "Ormvråk", latin: "Buteo buteo", order: 18 },
        { id: 19, name: "Tornfalk", latin: "Falco tinnunculus", order: 19 },
        { id: 20, name: "Trana", latin: "Grus grus", order: 20 },
        { id: 21, name: "Strandskata", latin: "Haematopus ostralegus", order: 21 },
        { id: 22, name: "Tofsvipa", latin: "Vanellus vanellus", order: 22 },
        { id: 23, name: "Enkelbeckasin", latin: "Gallinago gallinago", order: 23 },
        { id: 24, name: "Morkulla", latin: "Scolopax rusticola", order: 24 },
        { id: 25, name: "Fiskmås", latin: "Larus canus", order: 25 },
