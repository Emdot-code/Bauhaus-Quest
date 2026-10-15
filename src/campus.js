// The campus guide: which buildings of the city kit belong to the Bauhaus-Universität Weimar,
// and what a new student should know about them.
//
// Sources: the university's campus maps in `bauhaus maps/` (Faculty of Architecture and Urbanism,
// libraries, sports) and its building plans "Uni für Alle – Gebäudepläne" (December 2025), which
// give step-free access, lifts, toilets and the nearest bus stop for each building.
//
// `ids` are building ids in public/data/buildings.geojson. They were matched by laying the kit's
// footprints over the campus maps. Stops marked `verify: true` are the less certain matches.
//
// The kit ends just south of the main building, so Bauhausstraße 7b–15, Belvederer Allee 4–25a,
// Berkaer Straße and the sports centre have no footprint and are not in the game.

export const CATEGORIES = {
  heritage: { label: 'Bauhaus heritage', color: '#ffc93c' },
  study: { label: 'Teaching & studios', color: '#22e6ff' },
  library: { label: 'Libraries', color: '#a66bff' },
  life: { label: 'Student life', color: '#ff3fb4' },
}

export const STOPS = [
  {
    key: 'main',
    name: 'Main Building',
    alias: 'Hauptgebäude',
    address: 'Geschwister-Scholl-Straße 8',
    category: 'heritage',
    ids: ['14780'],
    unesco: true,
    hint: 'The building where the Bauhaus was founded.',
    about:
      'Built by Henry van de Velde in 1904–1911 as the Grand-Ducal Saxon School of Fine Arts. In 1919 Walter Gropius founded the Bauhaus here. Part of the UNESCO World Heritage Site "Bauhaus and its Sites in Weimar, Dessau and Bernau".',
    inside:
      "Dean's Office of the Faculty of Architecture and Urbanism, seminar rooms and many architecture departments.",
    facts: [
      'Step-free entrance: yes · lift: yes',
      'Accessible toilets: rooms 012 and 017 · all-gender toilet: 012',
      'Quiet and emergency room for the whole campus: room 101',
      'Bus stop: Marienstraße, Bauhaus-Universität',
    ],
  },
  {
    key: 'vdv',
    name: 'Van-de-Velde Building',
    alias: 'Van-de-Velde-Bau',
    address: 'Geschwister-Scholl-Straße 7',
    category: 'heritage',
    ids: ['14493'],
    unesco: true,
    hint: 'It faces the main building across a lawn.',
    about:
      'Built in 1905–1906 by Henry van de Velde for his School of Arts and Crafts; the Bauhaus workshops later moved in. Together with the main building it forms the UNESCO-listed ensemble.',
    inside: 'Studios and workshops. The lawn in front is the campus emergency assembly point.',
    facts: [
      'Step-free entrance: yes · lift: yes',
      'Accessible toilet: room 009',
      'Bus stop: Marienstraße, Bauhaus-Universität',
    ],
  },
  {
    key: 'atelier',
    name: 'Bauhaus.Atelier',
    alias: 'Info Shop Café',
    address: 'Geschwister-Scholl-Straße 6a',
    category: 'life',
    ids: ['0'],
    hint: 'Coffee, souvenirs and answers, just across from the main building.',
    about: "The university's info shop and café: a good first stop when you don't know where to go yet.",
    inside: 'Information desk, shop and café.',
    facts: [
      'Step-free entrance: yes',
      'Accessible toilets: next door in the main building, rooms 012 and 017',
      'Bus stop: Marienstraße, Bauhaus-Universität',
    ],
  },
  {
    key: 'campusoffice',
    name: 'Campus.Office & International Office',
    address: 'Geschwister-Scholl-Straße 15',
    category: 'life',
    ids: ['15246'],
    verify: true,
    hint: 'Enrolment, semester questions and help for international students.',
    about:
      'Your address for enrolment, re-registration and student papers, and the International Office for everyone coming from abroad. It is opposite the main building.',
    inside: 'Campus.Office and International Office.',
    facts: [
      'Opening hours for enrolment: Monday to Friday, 10:00–14:00',
      'Step-free entrance: yes · lift: no',
      'Accessible toilet and baby changing: room 009',
      'Bus stop: Marienstraße, Bauhaus-Universität',
    ],
  },
  {
    key: 'amalien',
    name: 'Amalienstraße 13',
    address: 'Amalienstraße 13',
    category: 'study',
    ids: ['15913'],
    verify: true,
    hint: 'Student workrooms on the street that leads to the cemetery.',
    about: 'Student workrooms of the Faculty of Architecture and Urbanism.',
    inside: 'Student workrooms.',
    facts: [
      'Step-free entrance: yes, from Geschwister-Scholl-Straße · lift: yes',
      'Accessible toilet and baby changing: room 012',
      'Bus stop: Am Poseckschen Garten',
    ],
  },
  {
    key: 'kubus',
    name: 'Kubus',
    address: 'Belvederer Allee 1a and 1b',
    category: 'study',
    ids: ['15399', '18208'],
    hint: 'Two cubes where models are built and computers glow blue.',
    about: 'Two cube-shaped buildings: 1a holds the media computer pool, the "Blue pool"; 1b the model-making workshops.',
    inside: 'Blue pool (computer pool), model-making workshops, student workrooms.',
    facts: [
      'Step-free entrance: yes, both buildings · lift: yes, both',
      'Accessible toilets: K11 and K13',
      'Bus stop: Marienstraße, Bauhaus-Universität',
    ],
  },
  {
    key: 'ba1',
    name: 'Belvederer Allee 1',
    address: 'Belvederer Allee 1',
    category: 'study',
    ids: ['14853'],
    hint: 'The first house on the avenue to Belvedere.',
    about:
      'Architecture departments: Design and Housing, Design and Building Construction, Computer Science in Architecture and Urbanism, Structural Design.',
    inside: 'Departments and studios of the Faculty of Architecture and Urbanism.',
    facts: [
      'Step-free entrance: yes · lift: yes',
      'Accessible toilet: room 009',
      'Bus stop: Marienstraße, Bauhaus-Universität',
    ],
  },
  {
    key: 'mensa',
    name: 'Mensa am Park',
    address: 'Marienstraße 15b',
    category: 'life',
    ids: ['15293'],
    hint: 'Lunch with a view of the Park an der Ilm.',
    about: 'The main canteen of the campus, right at the edge of the Park an der Ilm.',
    inside: 'Canteen and cafeteria.',
    facts: [
      'Step-free entrance: yes · lift: yes',
      'Accessible toilets: rooms 007, 008, 016',
      'Nursing room: 017, by the cafeteria',
      'Bus stop: Marienstraße, Bauhaus-Universität',
    ],
  },
  {
    key: 'm18',
    name: 'Students’ House M18',
    address: 'Marienstraße 18',
    category: 'life',
    ids: ['15065'],
    hint: 'A house run for and by students, on Marienstraße.',
    about: 'The students’ house, called "M18" after its address.',
    inside: 'Rooms for students and student groups.',
    facts: [
      'Step-free entrance: only to the first level · lift: no',
      'Accessible toilet: room 007 · all-gender toilets: 005 and 007',
      'Bus stop: Marienstraße, Bauhaus-Universität',
    ],
  },
  {
    key: 'm13',
    name: 'Lecture halls Marienstraße 13',
    address: 'Marienstraße 13 A–E',
    category: 'study',
    ids: ['151520', '151521', '15152', '14457', '14089', '17956', '17570'],
    hint: 'Five houses around a courtyard, with the big lecture halls.',
    about: 'A group of five buildings, A to E, around a courtyard. Building C is the lecture hall building.',
    inside: 'Lecture halls, seminar rooms and offices.',
    facts: [
      'Step-free entrance: yes, through the courtyard of M13C',
      'Lifts: in M13B and M13C, not in A and D',
      'Accessible toilet: C010 · defibrillator: M13C ground-floor foyer',
      'Bus stop: Marienstraße, Bauhaus-Universität',
    ],
  },
  {
    key: 'm9',
    name: 'Marienstraße 9',
    address: 'Marienstraße 9',
    category: 'study',
    ids: ['17127'],
    verify: true,
    hint: 'Small house, big desks: workrooms on Marienstraße.',
    about: 'Student workrooms of the Faculty of Architecture and Urbanism.',
    inside: 'Student workrooms.',
    facts: ['Step-free entrance: yes · lift: no', 'Accessible toilet: room 004', 'Bus stop: Marienstraße, Bauhaus-Universität'],
  },
  {
    key: 'm57',
    name: 'Marienstraße 5 and 7',
    address: 'Marienstraße 5, 7A, 7B',
    category: 'study',
    ids: ['15380', '18481', '17638'],
    verify: true,
    hint: 'Seminar rooms that are kind to your ears.',
    about: 'Seminar buildings. Rooms B101–106 in M7B have improved acoustics and height-adjustable tables.',
    inside: 'Seminar rooms and offices.',
    facts: [
      'Step-free entrance: yes, through Marienstraße 7',
      'Lift: yes, in Marienstraße 7',
      'Accessible toilet: M7 A003',
      'Bus stops: Marienstraße, Bauhaus-Universität / Wielandplatz',
    ],
  },
  {
    key: 'm1',
    name: 'Marienstraße 1',
    address: 'Marienstraße 1a, 1b / Bettina-von-Arnim-Straße 1',
    category: 'study',
    ids: ['16321', '17782', '16581'],
    verify: true,
    hint: 'The first university building you pass coming from Wielandplatz.',
    about: 'Three connected university houses at the top of Marienstraße, next to Beethovenplatz.',
    inside: 'University offices and rooms.',
    facts: [
      'Step-free entrance: M1a ground floor, M1b and BvA 1 yes',
      'Lift: only in M1b · accessible toilet: M1b room 103',
      'Parking: Parkhaus Beethovenplatz',
      'Bus stop: Wielandplatz',
    ],
  },
  {
    key: 'library',
    name: 'University Library',
    alias: 'Universitätsbibliothek',
    address: 'Steubenstraße 6',
    category: 'library',
    ids: ['16232'],
    hint: 'Books, quiet desks and the Maurice-Halbwachs auditorium.',
    about:
      'The central library of the university, with reading rooms and the Maurice-Halbwachs auditorium. A bridge connects it to the Limona building next door.',
    inside: 'Library, reading rooms, Maurice-Halbwachs auditorium.',
    facts: [
      'Step-free entrance: yes, at Steubenstraße 6A · lift: yes',
      'Accessible toilet and baby changing: room 215',
      'Defibrillator: ground floor',
      'Bus stop: Wielandplatz',
    ],
  },
  {
    key: 'limona',
    name: 'Limona',
    address: 'Steubenstraße 8',
    category: 'library',
    ids: ['14937'],
    hint: "The library's neighbour, joined to it by a bridge.",
    about: 'Part of the University Library, connected to the main library building by a bridge.',
    inside: 'Library rooms.',
    facts: [
      'Step-free entrance: yes · lift: yes',
      'Accessible toilets: K10 and 411.2',
      'Bus stop: Wielandplatz',
    ],
  },
  {
    key: 'coudray',
    name: 'Coudraystraße campus',
    address: 'Coudraystraße 7–13',
    category: 'study',
    ids: ['25617', '256170', '256170-2', '25617-2', '22917', '21022', '21988', '21337', '22338'],
    verify: true,
    hint: 'The second campus, west of the old town, near Goetheplatz.',
    about:
      "The university's second site: laboratories and institute buildings, and the branch library for building materials and natural sciences at Coudraystraße 7.",
    inside: 'Laboratories, institutes, branch library (Coudraystraße 7).',
    facts: [
      'Coudraystraße 7/9: step-free entrance and lift: yes',
      'Quiet and emergency room: Coudraystraße 13A, room 001',
      'Bus stop: Goetheplatz',
    ],
  },
]

// The train station: where most new students arrive. Not part of the quest; it is where the
// glowing routes start. Walking times are added by the app from the routes.
export const STATION = {
  key: 'station',
  name: 'Weimar Hauptbahnhof',
  alias: 'Main station',
  address: 'North edge of the city centre',
  category: 'arrival',
  ids: ['22132'],
  about:
    'Where most new students arrive. Follow the glowing arrows south: they show the shortest walk along the pedestrian network to the main campus, the library and the Coudraystraße campus.',
  inside: 'Trains, and buses into town from the station forecourt.',
  facts: [],
}

// The guide for students who arrive in Weimar for the very first time: from the station to the
// International Office, to enrol. Opening hours as given by the project author.
export const FIRST_TIME = {
  target: 'campusoffice',
  days: 'Monday to Friday',
  hours: '10:00–14:00',
}

// The destinations of the walking routes from the station.
export const ROUTE_TARGETS = ['main', 'library', 'coudray']

// City bus from the station. Source: the university's travel pages ("Getting to Weimar",
// "Parken und Bushaltestelle »Bauhaus-Universität«", University Library contact page) and the
// nearest stops named in the building plans. Line 1 runs to the stop "Bauhaus-Universität" in
// Marienstraße in about ten minutes; lines 1, 5, 6, 7 and 8 all go to Goetheplatz.
// Stop positions are placed by hand on the map, at the nearest street junction.
export const BUS = {
  line: '1',
  minutes: 10,
  direction: 'towards Belvedere / Ehringsdorf / Taubach',
  stops: [
    { key: 'hbf', name: 'Hauptbahnhof', lines: '1, 5, 6, 7, 8', lonlat: [11.3262, 50.9907] },
    { key: 'goetheplatz', name: 'Goetheplatz', lines: '1, 5, 6, 7, 8', note: 'for the Coudraystraße campus', lonlat: [11.32456, 50.98035] },
    { key: 'wielandplatz', name: 'Wielandplatz / Steubenstraße', lines: '1', note: 'for the library', lonlat: [11.3279, 50.97698] },
    { key: 'uni', name: 'Bauhaus-Universität', lines: '1', note: 'Marienstraße, by the main building and the Mensa', lonlat: [11.329, 50.97572] },
  ],
}

export const RANKS = [
  { min: 0, title: 'Newcomer' },
  { min: 1, title: 'Ersti' },
  { min: 5, title: 'Campus explorer' },
  { min: 10, title: 'Weimar insider' },
  { min: STOPS.length, title: 'Bauhaus master' },
]

export function rankFor(found) {
  return RANKS.filter((r) => found >= r.min).at(-1).title
}

export const CAMPUS_CREDIT =
  'Campus information and bus lines: Bauhaus-Universität Weimar, University Communications and Diversity Office, campus maps, building plans (2017–2025) and travel pages.'
