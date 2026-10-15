# Campus Quest · Weimar

A game-like 3D guide for students who are new to Weimar. The city is shown at night, with every building coloured by its use in muted tones. Only the buildings of the Bauhaus-Universität Weimar, the train station and the walking routes between them glow in neon. Click the university buildings to discover them, and click the ground to see how far you can walk.

This is a second version of the "Walking reach" app and keeps all of it. The first version is kept separately, in `city-test-main`.

## What the app does

- Shows central Weimar in 3D: buildings rise from their footprints to their measured height, coloured by their main use in muted tones (a legend names each colour), on a dark ground with the street network drawn as faint lines.
- **Start here.** The main station (Weimar Hauptbahnhof) glows green with a "Start here" label. Green ribbons with small moving arrows show the walk from the station to the main campus, the University Library and the Coudraystraße campus. Clicking the station shows the walking time to each.
- **By bus.** An orange ribbon with faster orange arrows shows city bus line 1 from the station via Goetheplatz and Wielandplatz/Steubenstraße to the stop "Bauhaus-Universität" in Marienstraße. Glowing orange poles mark the stops, each labelled with its lines. Labels on the map say "By foot" and "By bus".
- 16 university buildings glow in neon, in four colours: gold for Bauhaus heritage (UNESCO World Heritage), cyan for teaching and studios, violet for libraries, pink for student life.
- Each university building is drawn as a game checkpoint: 30% taller than in reality, with a glowing line at every floor and a ring on the ground. Buildings you haven't found yet pulse, send up a thin beam of light and have a spinning diamond above them; found ones fly a flag.
- Buildings you haven't found yet Hover over one for a hint; click it to discover it.
- A card then tells you what the building is, its story, what's inside, and practical facts: step-free entrance, lifts, accessible toilets and the nearest bus stop.
- The quest list on the left shows your progress and rank (Newcomer → Ersti → Campus explorer → Weimar insider → Bauhaus master), and gives a clue for each building still to find. Click an entry to fly there.
- **First time in Weimar?** A button in the quest panel (and on the welcome screen) opens a step-by-step guide to the International Office and Campus.Office, opposite the main building, to enrol: from the station by bus line 1 or on foot along pale gold arrows, with the office's opening hours, Monday to Friday 10:00–14:00 (as given by the project author). On the map the office label shows the hours only when you click it.
- Progress is remembered in your browser. "Start again" clears it.
- **Walking reach** (from the first version). Click anywhere on the ground: the app shades every building within 15 minutes' walk by its distance from the click, from blue right next to it through violet to pink at 15 minutes (nothing else is drawn on the ground), and lists in the "Walking reach" tab how many buildings are reached and about how many residents live there.

Drag to orbit, right-drag to pan and scroll to zoom.

## Run it

```
npm install     install the packages
npm run dev     start the app at http://localhost:5173
```

`npm run build` makes the published version in `dist/`. GitHub Pages builds and publishes it on every push to `main`, at `https://<user>.github.io/<repo>/`.

## Method

### Campus guide

- The campus buildings were found by laying the footprints of `buildings.geojson` over the university's campus maps (in `bauhaus maps/`) and matching their shapes and positions. The matches are listed with their building ids in `src/campus.js`.
- Names, addresses and what's inside come from the campus maps. Step-free access, lifts, toilets and bus stops come from the building plans "Uni für Alle – Gebäudepläne" (December 2025).
- The history of the main building and the Van-de-Velde building is general knowledge, not from the maps.
- The station is building 22132 in `buildings.geojson`, the large transport building on the station forecourt.
- **Routes from the station** are the shortest walks along the pedestrian network (`streets.graph.json`) from the junction nearest the station to the junctions nearest the main building, the library and the Coudraystraße campus. Walking times use 4.8 km/h, as below. They are shortest paths, not counts of where students actually walk.
- **Bus.** The lines come from the university's travel pages: line 1 runs from the Hauptbahnhof to "Bauhaus-Universität" (Marienstraße) in about 10 minutes and stops at Wielandplatz/Steubenstraße for the library; lines 1, 5, 6, 7 and 8 all go to Goetheplatz. The stops were placed by hand at the nearest junction, and the bus is drawn along the shortest path between consecutive stops in the pedestrian network.

### Walking reach

- **Centre.** The circles are centred on the point you click.
- **Radius.** Walking at 4.8 km/h, which is 80 m per minute: 400 m for 5 minutes, 800 m for 10, 1200 m for 15.
- **Areas.** Each area is a circle with that radius; only the buildings are shaded, by their distance. It is the straight-line distance and does not follow the street network (the first version, in `city-test-main`, followed the streets).
- **Buildings.** A building counts for an area if its footprint touches the circle. The 15-minute count includes the 10- and 5-minute buildings.
- **Residents.** For every 100 m cell of the Zensus 2022 grid that overlaps the area, its population is multiplied by the share of the cell's area that lies inside the area. These are added up and rounded to the nearest 10.
- **Cells without a figure.** Some cells have no published population (`null`). They are not zero. They are left out of the sum, and the panel shows how many such cells overlap the area.

## Limits

- The city kit ends just south of the main building. Bauhausstraße 7b–15, Belvederer Allee 4–25a, Berkaer Straße, the Preller house, x.stahl and the university sports centre have no footprint in the kit, so they are not in the game.
- Some matches are less certain, because the campus maps are drawings, not surveyed plans: Campus.Office (Geschwister-Scholl-Straße 15), Amalienstraße 13, Marienstraße 1, 5/7 and 9, and the Coudraystraße campus. They are marked `verify: true` in `src/campus.js`.
- On the Coudraystraße campus, the whole group of university buildings glows as one stop, not each house separately.
- Building facts are as of the plans' dates (2017–2025). Rooms and offices move; check the university website before you go.
- The bus route is drawn along the pedestrian network, so on some corners the real bus may use a different street. Bus lines and times can change; check the current timetable of Stadtwirtschaft Weimar.
- Campus buildings are drawn 30% taller than their measured height, as a game effect.
- The routes are the shortest paths in the network. Students may prefer other streets (quieter, through the park, past a café), and slopes, steps and crossings are not counted.
- Walking reach: the circles use straight-line distance, so they reach further than a real walk along the streets, which has to go around blocks. Time comes from distance alone, at the same 4.8 km/h for everyone. Residents are spread evenly over each 100 m cell, census figures are slightly changed at random for privacy, and cells without a published figure are left out, so totals are estimates. Near the kit's edges, walks stop where the network ends.
- The campus buildings glow instead of taking the reach colours, so they are counted in the walking reach but not recoloured.

## Data sources

City kit data is in `public/data/`; `public/data/SOURCES.md` describes every file.

- **Buildings:** footprints and heights from the 3D building models LoD2 of Thuringia, © GDI-Th, Datenlizenz Deutschland – Namensnennung – Version 2.0 (dl-de/by-2-0). Uses were added by Egor Gaydukov.
- **Pedestrian network and land use:** Egor Gaydukov, InfAU, Bauhaus-Universität Weimar.
- **Census grid:** Zensus 2022, 100 m grid, © Statistische Ämter des Bundes und der Länder, dl-de/by-2-0 (used for the residents in the walking reach).
- **Campus information:** Bauhaus-Universität Weimar, University Communications and Diversity Office: campus maps of the Faculty of Architecture and Urbanism, the libraries and the sports facilities, and the building plans "Uni für Alle – Gebäudepläne".
- **Bus lines:** Bauhaus-Universität Weimar travel pages: "Getting to Weimar" (uni-weimar.de/en/university/profile/finding-your-way-around-on-campus/getting-to-weimar), "Parken und Bushaltestelle »Bauhaus-Universität«" and the University Library contact page.

Attribution as shown on the map:

> Buildings: 3D building models LoD2 © GDI-Th (dl-de/by-2-0). Land use and pedestrian network: Egor Gaydukov, InfAU, Bauhaus-Universität Weimar. Census grid: Zensus 2022, © Statistische Ämter des Bundes und der Länder (dl-de/by-2-0). Campus information and bus lines: Bauhaus-Universität Weimar, University Communications and Diversity Office, campus maps, building plans (2017–2025) and travel pages.

## How this was made

1. Tools: Claude Code, with the model Claude Opus 5.5.
2. I decided:
3. The agent did: it matched the university buildings and the station in the campus PDFs to footprints in the city kit, wrote the building guide from the maps and plans, turned the walking-reach app into a night-time neon discovery game that keeps the building uses and the walking reach, added glowing walking and bus routes with arrows and labels from the station, made the campus buildings look like game checkpoints, checked it in the browser, and rewrote this README.
4. I checked:
