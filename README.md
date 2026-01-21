# Fågelåret i Åstorp

En hybrid fågelblogg för Åstorps kommun — observationer, bilder och interaktiv årskrysslista.

## 🐦 Funktioner

- **Blogginlägg** med bilder och YouTube-klipp
- **Interaktiv årslista** med filter och sortering
- **Responsiv design** med Naturbutiken-estetik
- **Statisk hosting** på GitHub Pages

## 🚀 Utveckling

### Förutsättningar

- [Hugo](https://gohugo.io/) (extended version)

### Lokal server

```bash
cd astorp-faglar
hugo server -D
```

Öppna http://localhost:1313/astorp-faglar/

### Nytt inlägg

```bash
hugo new posts/YYYY-MM-DD-titel.md
```

## 📁 Struktur

```
content/
├── posts/          # Blogginlägg
├── arslista.md     # Årskrysslista
├── arkiv/          # Arkivsida
├── karta.md        # Karta (Fas 2)
└── om.md           # Om-sida

static/
├── css/style.css   # Design system
├── js/checklist.js # Krysslistans logik
└── data/           # JSON-data
```

## 📄 Licens

© 2026 Håkan Karlsson
