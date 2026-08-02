import type { Movie } from '../data/catalog';

export const GENRE_FILTERS = [
  'All',
  'Horror',
  'Sci-Fi',
  'Thriller',
  'Action',
  'Comedy',
  'Drama',
  'Documentary',
  'Animation',
  'Other',
] as const;

export const ERA_FILTERS = [
  { id: 'All', label: 'All Years', min: Number.NEGATIVE_INFINITY, max: Number.POSITIVE_INFINITY },
  { id: '2020s', label: '2020s', min: 2020, max: 2029 },
  { id: '2010s', label: '2010s', min: 2010, max: 2019 },
  { id: '2000s', label: '2000s', min: 2000, max: 2009 },
  { id: 'Classics', label: 'Before 2000', min: Number.NEGATIVE_INFINITY, max: 1999 },
] as const;

export type EraFilterId = (typeof ERA_FILTERS)[number]['id'];

export const MICRO_TAG_DEFINITIONS = [
  { id: '#ZombieOutbreak', label: 'Zombie outbreak', description: 'Zombies, zombie outbreaks, or organized undead hordes.' },
  { id: '#PostApocalyptic', label: 'Post-apocalyptic', description: 'Life during or after an apocalypse or collapse of civilization.' },
  { id: '#FoundFootage', label: 'Found footage', description: 'Stories explicitly presented as recovered, recorded, or found footage.' },
  { id: '#Slasher', label: 'Slasher', description: 'Slashers or masked killers stalking a sequence of victims.' },
  { id: '#Psychological', label: 'Psychological', description: 'Paranoia, sanity, hallucination, obsession, or psychological manipulation is central.' },
  { id: '#SciFiHorror', label: 'Sci-fi horror', description: 'Both science-fiction and horror evidence appears in the synopsis.' },
  { id: '#Monsters', label: 'Monsters', description: 'A monster, creature, beast, or kaiju is a central threat.' },
  { id: '#Vampires', label: 'Vampires', description: 'Vampires or Dracula are explicitly involved.' },
  { id: '#HauntedHouse', label: 'Haunted places', description: 'A house, home, hotel, mansion, or similar place is explicitly haunted.' },
  { id: '#Survival', label: 'Survival', description: 'Survival, being stranded, or a fight to stay alive is central.' },
  { id: '#DarkComedy', label: 'Dark comedy', description: 'The synopsis explicitly identifies dark, black, macabre, or horror comedy.' },
  { id: '#AlienInvasion', label: 'Alien invasion', description: 'Aliens or extraterrestrials invade or attack Earth.' },
  { id: '#MindBending', label: 'Mind-bending', description: 'Time loops, simulations, unstable reality, or dream manipulation is central.' },
  { id: '#SerialKiller', label: 'Serial killers', description: 'A serial killer is explicitly involved.' },
  { id: '#Cyberpunk', label: 'Cyberpunk', description: 'Cyberpunk, neural interfaces, cyberspace, or invasive human-computer technology is central.' },
  { id: '#SpaceExploration', label: 'Space exploration', description: 'Astronauts or a mission, expedition, or voyage through space is central.' },
  { id: '#BodyHorror', label: 'Body horror', description: 'Bodily mutation, transformation, or invasive biological corruption is central.' },
  { id: '#MartialArts', label: 'Martial arts', description: 'Martial arts, kung fu, karate, wuxia, or a dojo is explicitly involved.' },
] as const;

export type MicroTag = (typeof MICRO_TAG_DEFINITIONS)[number]['id'];
export const POPULAR_TAGS = MICRO_TAG_DEFINITIONS.map(({ id }) => id);

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[^a-z0-9+#' -]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

type CanonicalGenre = Exclude<(typeof GENRE_FILTERS)[number], 'All'>;

interface EditorialClassification {
  genres: CanonicalGenre[];
  tags?: MicroTag[];
}

function editorialKey(title: string, year: number) {
  return `${normalizeText(title)}|${year}`;
}

// The bundled source has sparse, synopsis-only metadata. These exact title/year
// corrections cover a deliberately small set of widely established mainstream
// films and franchises whose categories are otherwise lost (or misread) by text
// rules. Exact keys avoid title-word guesses leaking into unrelated movies.
const EDITORIAL_CLASSIFICATION_OVERRIDES: Record<string, EditorialClassification> = {
  'blade runner 2049|2017': {
    genres: ['Sci-Fi', 'Thriller', 'Drama'],
    tags: ['#Cyberpunk'],
  },
  'the revenant|2015': {
    genres: ['Drama', 'Thriller'],
    tags: ['#Survival'],
  },
  'john wick|2014': {
    genres: ['Action', 'Thriller'],
  },
  'gone girl|2014': {
    genres: ['Thriller', 'Drama'],
    tags: ['#Psychological'],
  },
  'i am legend|2007': {
    genres: ['Sci-Fi', 'Horror', 'Drama'],
    tags: ['#PostApocalyptic', '#Survival'],
  },
  'interstellar|2014': {
    genres: ['Sci-Fi', 'Drama'],
  },
  'inception|2010': {
    genres: ['Sci-Fi', 'Thriller', 'Action'],
  },
  'godzilla x kong the new empire|2024': {
    genres: ['Action', 'Sci-Fi'],
    tags: ['#Monsters'],
  },
  'alien romulus|2024': {
    genres: ['Horror', 'Sci-Fi'],
  },
  'alien outpost|2014': {
    genres: ['Action', 'Sci-Fi'],
  },
  'monster|2008': {
    genres: ['Horror'],
    tags: ['#Monsters'],
  },
  'hollywood in the atomic age monsters martians mad scientists|2021': {
    genres: ['Documentary'],
  },
  'robot planet|2018': {
    genres: ['Documentary'],
  },
  'android music videos volume 1|2004': {
    genres: ['Other'],
  },
  'shaun of the dead|2004': {
    genres: ['Horror', 'Comedy'],
    tags: ['#DarkComedy'],
  },
  'avengers doomsday|2026': {
    genres: ['Action', 'Sci-Fi'],
  },
  'spider-man 4|2026': {
    genres: ['Action', 'Sci-Fi'],
  },
  'the mandalorian grogu|2026': {
    genres: ['Action', 'Sci-Fi'],
  },
  'avatar fire and ash|2025': {
    genres: ['Action', 'Sci-Fi'],
  },
  'superman|2025': {
    genres: ['Action', 'Sci-Fi'],
  },
  'the fantastic four first steps|2025': {
    genres: ['Action', 'Sci-Fi'],
  },
  'mickey 17|2025': {
    genres: ['Sci-Fi', 'Comedy'],
  },
  'captain america brave new world|2025': {
    genres: ['Action', 'Thriller', 'Sci-Fi'],
  },
  'thunderbolts|2025': {
    genres: ['Action', 'Sci-Fi'],
  },
  'm3gan 2 0|2025': {
    genres: ['Action', 'Thriller', 'Sci-Fi'],
  },
  'predator badlands|2025': {
    genres: ['Action', 'Sci-Fi'],
  },
  'kong skull island|2017': {
    genres: ['Action', 'Sci-Fi'],
    tags: ['#Monsters'],
  },
  'the dark knight|2008': {
    genres: ['Action', 'Thriller', 'Drama'],
  },
  'mad max fury road|2015': {
    genres: ['Action', 'Sci-Fi'],
    tags: ['#PostApocalyptic', '#Survival'],
  },
  'prisoners|2013': {
    genres: ['Thriller', 'Drama'],
  },
  'shutter island|2010': {
    genres: ['Thriller', 'Drama'],
    tags: ['#Psychological'],
  },
  'paranormal activity|2007': {
    genres: ['Horror'],
    tags: ['#FoundFootage'],
  },
  'paranormal activity 2|2010': {
    genres: ['Horror'],
    tags: ['#FoundFootage'],
  },
  'paranormal activity 3|2011': {
    genres: ['Horror'],
    tags: ['#FoundFootage'],
  },
  'paranormal activity 4|2012': {
    genres: ['Horror'],
    tags: ['#FoundFootage'],
  },
  'paranormal activity the marked ones|2014': {
    genres: ['Horror'],
    tags: ['#FoundFootage'],
  },
  'paranormal activity the ghost dimension|2015': {
    genres: ['Horror'],
    tags: ['#FoundFootage'],
  },
  'paranormal activity next of kin|2021': {
    genres: ['Horror'],
    tags: ['#FoundFootage'],
  },
  'paranormal activity 8|2027': {
    genres: ['Horror'],
  },
};

function getEditorialClassification(movie: Movie) {
  if (movie.id.startsWith('tmdb-')) return undefined;
  return EDITORIAL_CLASSIFICATION_OVERRIDES[editorialKey(movie.title, movie.year)];
}

function movieText(movie: Movie) {
  // The synopsis is the primary evidence source. Titles are consulted only for
  // exact editorial keys and narrow negative context such as festival programs.
  return normalizeText(movie.description);
}

function hasAny(text: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(text));
}

const STRONG_NONFICTION_PATTERNS = [
  /\b(?:this|the|a|an) (?:award[- ]winning |feature[- ]length |short |heartfelt )?documentary (?:examines|explores|traces|chronicles|documents|reveals|investigates|looks|invites|presents|offers|follows)\b/,
  /\barchival footage\b/,
  /\binterviews? with\b/,
  /\bdocuseries\b/,
  /\bconcert film\b/,
  /\bhistorical and critical look\b/,
  /\boverview of\b/,
  /\btracks? the origins\b/,
  /\bstudied in (?:vivid )?detail\b/,
  /\bbehind[- ]the[- ]scenes (?:story|look|account|documentary|feature|featurette|special)\b/,
  /\bdocumentarian [a-z' -]{0,60} (?:documents|chronicles|witnesses|explores|examines|follows)\b/,
];

const GENERAL_DOCUMENTARY_PATTERNS = [
  /\bdocumentary\b/,
  /\bdocumentarians?\b/,
  /\bbehind[- ]the[- ]scenes (?:story|look|account|documentary|feature|featurette|special)\b/,
];

const FICTIONAL_DOCUMENTARY_CONTEXT_PATTERNS = [
  /\bdocumentary crew (?:follows?|travels?|sets? out|arrives?|investigates?|explores?|captures?)\b/,
  /\b(?:make|making|produce|producing|shoot|shooting|film|filming|release|releasing|create|creating)\b.{0,40}\b(?:a|the|their|his|her|its) .{0,35}\bdocumentary\b/,
  /\bdocumentary (?:film )?(?:project|style)\b/,
  /\baspiring documentary filmmakers?\b/,
  /\bdocumentary filmmakers? .{0,80}\b(?:looking|searching|trying|sets? out|finds?|travels?|arrives?)\b/,
  /\bdocumentarians? follow .{0,80}\b(?:filmmaker|characters?|subjects?)\b/,
  /\bdocumentarian\b.{0,120}\b(?:investigat(?:e|es|ed|ing|ion)|interviews?|search(?:es|ing)?|uncovers?|finds?|solv(?:e|es|ing))\b/,
];

function isSynopsisDocumentary(text: string) {
  if (!hasAny(text, [...STRONG_NONFICTION_PATTERNS, ...GENERAL_DOCUMENTARY_PATTERNS])) return false;
  if (hasAny(text, FICTIONAL_DOCUMENTARY_CONTEXT_PATTERNS)) return false;
  return true;
}

const TAG_RULES: Record<MicroTag, (text: string, genres: string[]) => boolean> = {
  '#ZombieOutbreak': (text, genres) =>
    !genres.includes('Documentary')
    && hasAny(text, [
      /\bzombies?\b/,
      /\bzombie (?:apocalypse|outbreak|plague|horde)\b/,
      /\bundead (?:army|horde|outbreak|rise|walkers?)\b/,
      /\b(?:infected|reanimated) (?:people|dead|corpses|victims)\b/,
      /\bdead return to life\b/,
      /\bvirus turns (?:people|those|humans|victims|the infected)\b/,
      /\bvirus .{0,50}\bturns? .{0,35}\binto (?:homicidal|zombie|undead)\b/,
      /\b(?:people|humans|victims) (?:are|become) infected\b/,
    ]),
  '#PostApocalyptic': (text, genres) =>
    !genres.includes('Documentary')
    && hasAny(text, [
      /\bpost[- ]?apocal(?:ypse|yptic)\b/,
      /\bzombie apocalypse\b/,
      /\bafter (?:the|an) apocalypse\b/,
      /\b(?:civilization|society|the world) (?:has )?(?:collapsed|fallen|ended)\b/,
      /\bduring (?:the )?end of (?:the )?world\b/,
      /\bnuclear wasteland\b/,
    ]),
  '#FoundFootage': (text, genres) =>
    !genres.includes('Documentary')
    && !hasAny(text, [
      /\bfestival\b/,
      /\bmaking of\b/,
      /\bhistory of\b/,
      /\bdocumentarians?\b/,
      /\bfilm genre\b/,
      /\bfilmmaker\b/,
      /\btechnique\b/,
    ])
    && hasAny(text, [
      /\bfound[- ]footage\b/,
      /\brecovered footage\b/,
      /\b(?:camera|video) footage (?:is|was) found\b/,
      /\bfilmed (?:entirely )?(?:on|with) (?:a )?(?:camcorder|handheld camera)\b/,
    ]),
  '#Slasher': (text, genres) =>
    !genres.includes('Documentary')
    && !hasAny(text, [
      /\bhistory of\b/,
      /\bmaking of\b/,
      /\bdocumentary\b/,
      /\boverview of\b/,
      /\bslasher (?:movie )?genre\b/,
      /\bslasher films\b/,
    ])
    && hasAny(text, [
      /\bslasher\b/,
      /\bmasked killer\b/,
      /\bghostface killer\b/,
      /\bkiller stalks (?:a |the )?(?:group|students|friends|teens|victims)\b/,
      /\bstalked (?:and|, then) (?:killed|murdered)\b/,
    ]),
  '#Psychological': (text) => hasAny(text, [
    /\bpsychological\b/,
    /\bparanoi(?:a|d)\b/,
    /\bhallucinat(?:e|es|ion|ions|ing)\b/,
    /\b(?:loses|losing|questions) (?:his|her|their) sanity\b/,
    /\bmind games?\b/,
    /\bmental breakdown\b/,
    /\bobsess(?:ion|ed|ive)\b/,
  ]),
  '#SciFiHorror': (_text, genres) =>
    !genres.includes('Documentary') && genres.includes('Sci-Fi') && genres.includes('Horror'),
  '#Monsters': (text, genres) =>
    !genres.includes('Documentary')
    && !hasAny(text, [
      /\bclubs?\b.{0,80}\bthe monster\b/,
      /\bbirth of (?:a|the) monster\b/,
      /\b(?:called|known as|nicknamed) ['"]?(?:a |the )?monster\b/,
      /\bthe true monster is\b/,
      /\bbecome a monster (?:himself|herself|themselves)\b/,
      /\bcompany .{0,40}\bbecome a monster\b/,
      /\b(?:monster|creature) who (?:proceeds to )?helps?\b/,
      /\bcreature named .{0,90}\bnew friend\b/,
      /\bcaptive creature\b/,
      /\bbeast .{0,80}\bkind by nature\b/,
      /\bmonster high\b/,
      /\bmonster who seeks to be a detective\b/,
      /\bmonster .{0,100}\bharmless\b/,
    ])
    && hasAny(text, [
      /\bkaiju\b/,
      /\bgiant (?:beast|creature|insect|spider|snake|shark|monster)\b/,
      /\bmonster[- ](?:plagued|infested)\b/,
      /\b(?:deadly|dangerous|terrifying|hungry|homicidal|killer|monstrous|murdering|murderous|rampaging|relentless|undead|unstoppable|vicious|blood[- ]thirsty|demonic|mutant|alien|reptilian|weaponized|predatory) (?:monsters?|creatures?|beasts?)\b/,
      /\b(?:monsters?|creatures?|beasts?) (?:who |that |which |and (?:is |are )?|is |are )?(?:[a-z]+ ){0,5}(?:attack(?:s|ed|ing)?|invad(?:e|es|ed|ing)|hunt(?:s|ed|ing)?|stalk(?:s|ed|ing)?|threaten(?:s|ed|ing)?|wreaks? havoc|terroriz(?:e|es|ed|ing)|kill(?:s|ed|ing)?|devour(?:s|ed|ing)?|destroy(?:s|ed|ing)?|turns? violent|takes? over)\b/,
      /\bcreatures? .{0,80}\breplicate .{0,80}\bturn violent\b/,
      /\b(?:attacked|hunted|stalked|terrorized|threatened|killed|devoured|chased|trapped) by .{0,40}\b(?:monsters?|creatures?|beasts?)\b/,
      /\b(?:fight|battle|face|confront|defeat|escape|flee|survive|protect|struggle with|stop|catch|recapture).{0,65}\b(?:monsters?|creatures?|beasts?)\b/,
      /\b(?:monsters?|creatures?|beasts?) (?:lurk|lurks|wait|waits|hide|hides|hidden|emerge|emerges|escape|escapes)\b/,
      /\b(?:monsters?|creatures?|beasts?) (?:is|are) (?:[a-z]+ ){0,3}(?:lurking|waiting|hiding|hunting|stalking|attacking|threatening|terrorizing|killing)\b/,
      /\b(?:monsters?|creatures?|beasts?) rule\b/,
      /\b(?:war|battle) against .{0,60}\b(?:monsters?|creatures?|beasts?)\b/,
      /\b(?:monsters?|creatures?|beasts?)\b.{0,40}\bbent on destroying\b/,
      /\b(?:monsters?|creatures?|beasts?)\b.{0,35}\b(?:becomes? a deadly danger|out for revenge|gets? loose)\b/,
      /\b(?:unleashes?|releases?) .{0,50}\b(?:monsters?|creatures?|beasts?)\b/,
      /\b(?:killings?|panic)\b.{0,100}\b(?:the )?(?:monster|creature|beast)'?s?\b/,
      /\b(?:monster|creature|beast)'?s?\b.{0,100}\b(?:killings?|panic)\b/,
      /\bmutant (?:radioactive )?(?:bugs?|insects?) attack\b/,
    ]),
  '#Vampires': (text) => hasAny(text, [/\bvampires?\b/, /\bdracula\b/, /\bbloodsuckers?\b/]),
  '#HauntedHouse': (text) =>
    !hasAny(text, [/\bhaunted house (?:attraction|experience)\b/, /\bhidden camera reality\b/])
    && hasAny(text, [
      /\bhaunted (?:house|home|hotel|mansion|building|farmhouse|apartment|school|hospital)\b/,
      /\b(?:house|home|hotel|mansion|building|farmhouse|apartment|school|hospital) (?:is|becomes|seems) haunted\b/,
    ]),
  '#Survival': (text) => hasAny(text, [
    /\bsurviv(?:al|e|es|ed|ing|ors?)\b/,
    /\bfight (?:to|for) (?:stay alive|survive|their lives)\b/,
    /\bstranded (?:on|in|at)\b/,
    /\brace to stay alive\b/,
  ]),
  '#DarkComedy': (text) => hasAny(text, [
    /\bdark comed(?:y|ies)\b/,
    /\bhorror comed(?:y|ies)\b/,
    /\bmacabre comed(?:y|ies)\b/,
    /\bcomedic horror\b/,
  ]),
  '#AlienInvasion': (text) => hasAny(text, [
    /\balien invasion\b/,
    /\baliens? invade\b/,
    /\bextraterrestrials? invade\b/,
    /\b(?:alien|extraterrestrial) (?:attack|assault) (?:on )?(?:earth|humanity|the world)\b/,
    /\bearth (?:is|comes) under (?:alien|extraterrestrial) attack\b/,
  ]),
  '#MindBending': (text) => hasAny(text, [
    /\bmind[- ]bending\b/,
    /\btime loop\b/,
    /\b(?:computer|virtual) simulation\b/,
    /\balternate realit(?:y|ies)\b/,
    /\breality (?:begins to|starts to|is) (?:fracture|collapse|shift|unravel|distort)\b/,
    /\bdream(?:s)? within (?:a )?dream\b/,
    /\bdream[- ]sharing\b/,
    /\binfiltrat(?:e|es|ing) the subconscious\b/,
    /\bimplantation of (?:an?|another person's) idea\b/,
  ]),
  '#SerialKiller': (text) =>
    !hasAny(text, [/\bserial killer .{0,45}\brumou?r .{0,45}\bfalse\b/])
    && hasAny(text, [/\bserial killers?\b/]),
  '#Cyberpunk': (text) => hasAny(text, [
    /\bcyberpunk\b/,
    /\bcyberspace\b/,
    /\bneural (?:implant|interface|link|port)s?\b/,
    /\bbrain(?:s)? (?:can be|is|are) (?:directly )?connected to computers?\b/,
    /\bmegacorporation\b/,
  ]),
  '#SpaceExploration': (text) => hasAny(text, [
    /\bastronauts?\b/,
    /\bspace (?:mission|expedition|voyage|exploration)\b/,
    /\bmission (?:into|to|through) (?:deep )?space\b/,
    /\binterstellar (?:mission|journey|voyage|expedition)\b/,
    /\bexpedition to (?:a |an )?(?:distant |alien )?(?:planet|moon)\b/,
  ]),
  '#BodyHorror': (text) => hasAny(text, [
    /\bbody horror\b/,
    /\bbod(?:y|ies) (?:begins?|starts?) to (?:change|transform|mutate|decay)\b/,
    /\b(?:his|her|their|the human) bod(?:y|ies) (?:mutates?|transforms?|changes?)\b/,
    /\b(?:man|woman|person|student|patient|scientist|victim) (?:begins? to |starts? to )?(?:mutate|transform)\b/,
    /\b(?:parasite|organism) (?:inside|invades|infects) (?:his|her|their|the) bod(?:y|ies)\b/,
    /\bflesh (?:begins to|is) (?:change|transform|melt|decay)\b/,
  ]),
  '#MartialArts': (text) => hasAny(text, [
    /\bmartial arts?\b/,
    /\bkung fu\b/,
    /\bkarate\b/,
    /\bwuxia\b/,
    /\bdojo\b/,
  ]),
};

const GENRE_RULES: Array<{ genre: Exclude<(typeof GENRE_FILTERS)[number], 'All'>; patterns: RegExp[] }> = [
  {
    genre: 'Documentary',
    patterns: [...STRONG_NONFICTION_PATTERNS, ...GENERAL_DOCUMENTARY_PATTERNS],
  },
  {
    genre: 'Animation',
    patterns: [/\banimat(?:ed|ion)\b/, /\banime\b/, /\bstop[- ]motion\b/],
  },
  {
    genre: 'Horror',
    patterns: [
      /\bhorror\b/,
      /\bterrifying\b/,
      /\bnightmare\b/,
      /\bhaunt(?:ed|ing|s)\b/,
      /\bdemonic?\b/,
      /\bpossess(?:ed|ion)\b/,
      /\bzombies?\b/,
      /\bvampires?\b/,
      /\bghosts?\b/,
      /\bslasher\b/,
      /\bmacabre\b/,
      /\bthe horrors?\b/,
      /\bvirus .{0,70}\b(?:homicidal|infected)\b/,
      /\bdead return to life\b/,
    ],
  },
  {
    genre: 'Sci-Fi',
    patterns: [
      /\bsci[- ]?fi\b/,
      /\bscience fiction\b/,
      /\baliens?\b/,
      /\bextraterrestrials?\b/,
      /\bastronauts?\b/,
      /\bspace (?:mission|station|voyage|exploration|ship)\b/,
      /\bspace travel\b/,
      /\bspaceships?\b/,
      /\bwormholes?\b/,
      /\binterstellar (?:travel|voyage|journey|mission)\b/,
      /\btime travel\b/,
      /\bandroids?\b/,
      /\bcyborgs?\b/,
      /\brobots?\b/,
      /\bartificial intelligence\b/,
      /\bvirtual reality\b/,
      /\bclones?\b/,
      /\bcyberpunk\b/,
      /\b(?:killer|deadly) virus\b/,
    ],
  },
  {
    genre: 'Thriller',
    patterns: [
      /\bthriller\b/,
      /\bsuspense\b/,
      /\bconspirac(?:y|ies)\b/,
      /\bkidnap(?:ped|ping|s)?\b/,
      /\bstalk(?:s|ed|er|ing)\b/,
      /\bserial killers?\b/,
      /\bkillers?\b/,
      /\bmurder(?:s|ed|er|ers|ing)?\b/,
      /\bmasked killer\b/,
      /\bghostface killer\b/,
      /\bkiller (?:emerges|targets|hunts|terrorizes)\b/,
      /\bespionage\b/,
      /\bhostage\b/,
      /\brace against time\b/,
      /\bdeadly game\b/,
    ],
  },
  {
    genre: 'Action',
    patterns: [
      /\baction[- ]packed\b/,
      /\bassassins?\b/,
      /\bmercenar(?:y|ies)\b/,
      /\bspecial ops\b/,
      /\bsuperheroes?\b/,
      /\bmartial arts?\b/,
      /\bkung fu\b/,
      /\bkarate\b/,
      /\bwarriors?\b/,
      /\bbattle(?:s|field)?\b/,
      /\bcombat\b/,
    ],
  },
  {
    genre: 'Comedy',
    patterns: [
      /\bcomed(?:y|ies|ic)\b/,
      /\bparod(?:y|ies)\b/,
      /\bsatir(?:e|ical)\b/,
      /\bspoof\b/,
      /\bhilarious\b/,
      /\bhijinks\b/,
    ],
  },
  {
    genre: 'Drama',
    patterns: [
      /\bdrama\b/,
      /\bgrief\b/,
      /\btrauma\b/,
      /\bfamily (?:struggles|conflict|tragedy|secret|drama)\b/,
      /\bcoming[- ]of[- ]age\b/,
      /\brelationship\b/,
      /\btrue story\b/,
      /\bcharacter study\b/,
    ],
  },
];

function classifyGenres(movie: Movie, text: string) {
  if (movie.id.startsWith('tmdb-')) {
    const allowed = new Set<string>(GENRE_FILTERS.filter((genre) => genre !== 'All'));
    const trustedGenres = movie.genre.filter((genre) => allowed.has(genre));
    if (trustedGenres.length > 0) return [...new Set(trustedGenres)];
  }

  const editorialClassification = getEditorialClassification(movie);
  if (editorialClassification) return editorialClassification.genres;

  if (isSynopsisDocumentary(text)) return ['Documentary'];

  const genres = GENRE_RULES
    .filter(({ genre }) => genre !== 'Documentary')
    .filter(({ patterns }) => hasAny(text, patterns))
    .map(({ genre }) => genre);

  return genres.length > 0 ? genres : ['Other'];
}

function hasMicroTag(movie: Movie, tag: MicroTag, text: string, genres: string[]) {
  if (getEditorialClassification(movie)?.tags?.includes(tag)) return true;

  if (
    tag === '#FoundFootage'
    && (
      /\bfound footage (?:film )?festival\b/.test(normalizeText(movie.title))
      || /\bscreening .{0,50}\bfound[- ]footage films?\b/.test(text)
    )
  ) {
    return false;
  }

  return TAG_RULES[tag](text, genres);
}

export function hasMicroTagEvidence(movie: Movie, tag: MicroTag) {
  const text = movieText(movie);
  const genres = classifyGenres(movie, text);
  return hasMicroTag(movie, tag, text, genres);
}

export function normalizeMovieClassification(movie: Movie): Movie {
  const text = movieText(movie);
  const genre = classifyGenres(movie, text);
  const tags = MICRO_TAG_DEFINITIONS
    .filter(({ id }) => hasMicroTag(movie, id, text, genre))
    .map(({ id }) => id);

  return { ...movie, genre, tags };
}

export function matchesEra(year: number, era: EraFilterId) {
  const definition = ERA_FILTERS.find(({ id }) => id === era);
  return definition ? year >= definition.min && year <= definition.max : false;
}

export interface CatalogFilters {
  era: EraFilterId;
  genre: string;
  tag: string | null;
  providerIds?: string[];
}

export function applyCatalogFilters(movies: Movie[], filters: CatalogFilters) {
  return movies.filter((movie) => {
    if (!matchesEra(movie.year, filters.era)) return false;
    if (filters.genre !== 'All' && !movie.genre.includes(filters.genre)) return false;
    if (filters.tag && !movie.tags.includes(filters.tag)) return false;
    if (filters.providerIds && !movie.streamingPlatforms.some(({ id }) => filters.providerIds?.includes(id))) {
      return false;
    }
    return true;
  });
}

export interface CatalogFilterCounts {
  eras: Record<string, number>;
  genres: Record<string, number>;
  tags: Record<string, number>;
  providers: Record<string, number>;
}

export function getCatalogFilterCounts(movies: Movie[]): CatalogFilterCounts {
  const counts: CatalogFilterCounts = { eras: {}, genres: {}, tags: {}, providers: {} };

  for (const { id } of ERA_FILTERS) {
    counts.eras[id] = movies.filter((movie) => matchesEra(movie.year, id)).length;
  }

  for (const movie of movies) {
    for (const genre of movie.genre) counts.genres[genre] = (counts.genres[genre] ?? 0) + 1;
    for (const tag of movie.tags) counts.tags[tag] = (counts.tags[tag] ?? 0) + 1;
    for (const provider of new Set(movie.streamingPlatforms.map(({ id }) => id))) {
      counts.providers[provider] = (counts.providers[provider] ?? 0) + 1;
    }
  }

  counts.genres.All = movies.length;
  return counts;
}
