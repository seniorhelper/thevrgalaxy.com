/* theVRgalaxy — world data. One engine reads this and builds every world. */

export const STORY = {
  title: 'The Harmony Run',
  intro: [
    'Long ago, all fifteen worlds of this galaxy sang one song of light called the Harmony.',
    'Then a crackling cloud called the Static crept out from the galactic core.',
    'It jams the song. Aliens who used to be friends now hear threats in every word.',
    'You are a Wayfinder. Your blaster fires Harmony pulses: they shake the Static loose and wake people up.',
    'Free the worlds. Collect the Harmony Shards. Find out where the Static really comes from.'
  ],
  win: [
    'The Static was never an army. It was every world, afraid of every other world.',
    'The moment you put your blaster down, there was nothing left to fight about.',
    'The song is back. The galaxy is singing. And it turns out we all get along just fine.'
  ]
};

/* Weapons: every shot is a Harmony pulse. Static drones pop; jammed aliens get freed. */
export const WEAPONS = {
  blaster: { name: 'Tuner Blaster', icon: '✦', color: 0x4cc3ff, rate: 0.16, speed: 90, dmg: 10, tune: 12, spread: 0, size: 0.28, desc: 'Quick Harmony pulses. Pops drones, tunes aliens.' },
  slime:   { name: 'Slime Launcher', icon: '●', color: 0x8dff4a, rate: 0.5, speed: 42, dmg: 26, tune: 30, arc: 1, splash: 6, size: 0.55, desc: 'Lobs gooey blobs that splash and slow drones.' },
  ring:    { name: 'Ring Cannon', icon: '◎', color: 0xff4fd8, rate: 0.8, speed: 70, dmg: 55, tune: 55, pierce: 1, size: 1.2, desc: 'A giant spinning ring that punches through lines of drones.' },
  prism:   { name: 'Prism Beam', icon: '◆', color: 0xfff27a, rate: 0.06, speed: 160, dmg: 4, tune: 5, size: 0.18, desc: 'A rainbow stream. Melts shields, great for crystals.' },
  gravity: { name: 'Gravity Orb', icon: '◉', color: 0xb08cff, rate: 1.2, speed: 30, dmg: 70, tune: 70, pull: 14, size: 0.9, desc: 'A slow orb that yanks drones together, then pops.' }
};

export const ABILITIES = {
  fuel:   { name: 'Bigger Jet Tanks', desc: 'Jetpack fuel lasts 50% longer.' },
  dash:   { name: 'Star Dash', desc: 'Press Shift (or the dash button) to zip forward.' },
  shield: { name: 'Harmony Shield', desc: 'You take 40% less damage.' },
  heal:   { name: 'Big Heart', desc: 'Your life gauge grows by 25.' },
  djump:  { name: 'Double Jump', desc: 'Jump again in midair.' },
  map:    { name: 'Glyph Sense', desc: 'Your compass now points to hidden Star Glyphs.' },
  fuel2:  { name: 'Mega Jet Tanks', desc: 'Even more jetpack fuel.' }
};

export const CHARACTERS = [
  { id: 'finn', name: 'Finn', blurb: 'Frog astronaut. Great jumper, greater hugger.', model: 'hero-finn', kind: 'hero', color: '#7cff6b' },
  { id: 'barbara', name: 'Barbara', blurb: 'Bee astronaut. Fast, fearless, always buzzing.', model: 'hero-barbara', kind: 'hero', color: '#ffd23f' },
  { id: 'fernando', name: 'Fernando', blurb: 'Flamingo astronaut. Stands on one leg in zero-g.', model: 'hero-fernando', kind: 'hero', color: '#ff7ab8' },
  { id: 'rae', name: 'Rae', blurb: 'Red panda astronaut. Loves maps, hates losing.', model: 'hero-rae', kind: 'hero', color: '#ff8a3d' },
  { id: 'nova', name: 'Nova', blurb: 'Sci-fi explorer. Put your own face on her.', model: 'char-scifi', kind: 'human', color: '#38f0ff', face: true },
  { id: 'jax', name: 'Jax', blurb: 'Punk pilot. Put your own face on them.', model: 'char-punk', kind: 'human', color: '#ff4fd8', face: true },
  { id: 'sage', name: 'Sage', blurb: 'Adventurer. Put your own face on them.', model: 'char-adventurer', kind: 'human', color: '#b08cff', face: true }
];

/* shared prop presets */
const P = (m, n, s0, s1, extra) => Object.assign({ m, n, s: [s0, s1] }, extra || {});

export const WORLDS = [
  {
    id: 1, slug: 'lumora', name: 'Lumora', tag: 'A jungle that glows brighter when you laugh', kind: 'open',
    planet: { type: 0, c1: '#07352f', c2: '#19e3b1', c3: '#ff4fd8', glow: 0.8, bands: 0.1, size: 7, ring: 0, atmo: '#38f0ff', spin: 0.12 },
    sky: { top: '#0a0426', mid: '#321064', bot: '#ff4fd8', neb: '#19e3b1', stars: 1, sun: '#ffd6ff', sunDir: [0.4, 0.35, -0.8], moons: [['#ff9ae6', 90, [-0.6, 0.45, -0.7]], ['#7cf8ff', 40, [0.7, 0.6, -0.4]]], fog: '#2a0f52', fogD: 0.0022 },
    terrain: { style: 'jungle', seed: 11, height: 34, rough: 1, colors: ['#0c3b35', '#136b4d', '#2fbf71', '#b6ff8a'], glowLines: '#19e3b1', water: { type: 'water', level: 1.5, color: '#19e3b1' } },
    props: [P('tree-light', 90, 3, 6, { glow: '#ff4fd8' }), P('tree-spiral', 60, 3, 5, { glow: '#38f0ff' }), P('tree-swirl', 40, 3, 5), P('tree-maple-1', 45, 3, 5, { tint: '#19e3b1' }), P('plant-1', 160, 1.5, 3), P('plant-2', 160, 1.5, 3), P('rock-large-1', 30, 3, 7)],
    aliens: [['alien-mushnub', 14, 0.25], ['alien-pinkblob', 10, 0.3], ['alien-greenblob', 8, 0.3]],
    drones: [['drone-mini', 8], ['drone-small', 5]],
    mission: { type: 'collect', n: 6, item: 'Spark Cell', text: 'Orbi dropped his Spark Cells. Find all 6.' },
    reward: { ability: 'fuel' },
    features: ['glowshrooms', 'fireflies'],
    glyphs: [
      'The first song was sung here, under glowing leaves.',
      'Fireflies on Lumora are really tiny stars that got lost.',
      'The Static hates laughter. Nobody knows why yet.',
      'Every world has five Star Glyphs. Some worlds hide more than glyphs.',
      'Lumora\u2019s oldest tree says: the core is quiet, but not empty.'
    ],
    music: { root: 220, scale: [0, 3, 7, 10, 12] }
  },
  {
    id: 2, slug: 'gloopa', name: 'Gloopa', tag: 'Bouncy, gooey, and a little bit sticky', kind: 'open',
    planet: { type: 1, c1: '#1f4d05', c2: '#8dff4a', c3: '#e6ff5a', glow: 0.5, bands: 0.35, size: 6, ring: 1, ringColor: '#8dff4a', atmo: '#b6ff6a', spin: 0.18 },
    sky: { top: '#021a0c', mid: '#0f5b2c', bot: '#c8ff5a', neb: '#8dff4a', stars: 0.7, sun: '#f4ffb0', sunDir: [-0.3, 0.5, -0.8], moons: [['#ffd23f', 70, [0.5, 0.35, -0.8]]], fog: '#0f3a1c', fogD: 0.0025 },
    terrain: { style: 'craters', seed: 22, height: 26, rough: 0.8, colors: ['#1c3d0a', '#3f7d12', '#79c52a', '#d6ff7a'], water: { type: 'slime', level: 2.2, color: '#8dff4a' } },
    props: [P('tree-blob', 80, 3, 6), P('rock-1', 90, 2, 5, { tint: '#9cff5a' }), P('plant-2', 140, 1.5, 3), P('bush-large', 40, 2, 4, { tint: '#8dff4a' })],
    aliens: [['alien-greenblob', 12, 0.7], ['alien-pinkblob', 10, 0.7], ['alien-spikyblob', 8, 0.7]],
    drones: [['drone-mini', 6]],
    mission: { type: 'free', n: 8, text: 'The Static jammed the slime folk. Free 8 of them with Harmony pulses.' },
    reward: { weapon: 'slime' },
    features: ['bounce'],
    glyphs: [
      'Slime is just water that decided to be happy.',
      'Bounce pads on Gloopa were built by kids. Grown-ups just use them.',
      'A jammed alien isn\u2019t mean. It just can\u2019t hear you right now.',
      'Harmony pulses never hurt anyone. They only shake the noise loose.',
      'Gloopa\u2019s tallest blob remembers a war that started over one bad joke.'
    ],
    music: { root: 196, scale: [0, 2, 4, 7, 9] }
  },
  {
    id: 3, slug: 'vertigo-peaks', name: 'Vertigo Peaks', tag: 'Mountains so tall they scrape the stars', kind: 'lock', unlock: 1,
    planet: { type: 2, c1: '#2b3a55', c2: '#dfe9ff', c3: '#7fa6ff', glow: 0.1, bands: 0.2, size: 8, ring: 0, atmo: '#bcd6ff', spin: 0.08 },
    sky: { top: '#0b1a3d', mid: '#4a76c9', bot: '#ffd0a8', neb: '#8fb8ff', stars: 0.5, sun: '#fff1d0', sunDir: [0.5, 0.2, -0.8], moons: [['#dfe9ff', 120, [-0.4, 0.5, -0.8]]], fog: '#7b9ad6', fogD: 0.0012 },
    terrain: { style: 'mountains', seed: 33, height: 420, rough: 1.2, colors: ['#2d3b2c', '#5b6a52', '#8d93a0', '#ffffff'], water: { type: 'water', level: 4, color: '#3d74c9' } },
    props: [P('tree-spikes', 70, 3, 6), P('tree-birch-1', 80, 3, 6, { tint: '#dfe9ff' }), P('rock-large-2', 80, 4, 12), P('rock-large-1', 60, 4, 10)],
    aliens: [['alien-yeti', 10, 0.4], ['alien-birb', 10, 0.3]],
    drones: [['drone-flyer', 10]],
    mission: { type: 'summit', text: 'Climb the Great Peak to the Star Beacon. Jet fuel refills at every camp on the way up.' },
    reward: { ability: 'fuel2' },
    features: ['camps', 'wind'],
    glyphs: [
      'The higher you climb, the quieter the Static gets.',
      'Yetis on Vertigo keep warm by hugging. It works on people too.',
      'From the summit you can see a black hole that blinks slowly, like it\u2019s thinking.',
      'Camps were built by climbers who shared their fuel with strangers.',
      'The beacon on the peak used to call every world home for dinner.'
    ],
    music: { root: 174, scale: [0, 2, 5, 7, 9] }
  },
  {
    id: 4, slug: 'neon-rift', name: 'Neon Rift', tag: 'A city that never sleeps and never stops glowing', kind: 'lock', unlock: 2,
    planet: { type: 3, c1: '#0a0420', c2: '#ff4fd8', c3: '#38f0ff', glow: 1.1, bands: 0, lights: 1, size: 7, ring: 1, ringColor: '#ff4fd8', atmo: '#ff4fd8', spin: 0.1 },
    sky: { top: '#050014', mid: '#2a0550', bot: '#ff2f8f', neb: '#38f0ff', stars: 0.6, sun: '#ff9ae6', sunDir: [0, 0.18, -1], moons: [['#38f0ff', 60, [0.6, 0.5, -0.6]]], fog: '#1c0438', fogD: 0.0024 },
    terrain: { style: 'city', seed: 44, height: 8, rough: 0.3, colors: ['#10081f', '#1c0f33', '#2a1a4a', '#3d2a66'], glowLines: '#ff4fd8', water: { type: 'none' } },
    props: [P('cyber-light', 120, 2, 3), P('cyber-antenna', 60, 2, 4), P('cyber-ac', 40, 1.5, 2.5)],
    aliens: [['alien-squidle', 10, 0.5], ['alien-armabee', 8, 0.5]],
    drones: [['drone-cyber', 18], ['drone-small', 6]],
    mission: { type: 'boss', boss: 'drone-large', text: 'A Static Drone Mother is jamming the whole city. Take her down.' },
    reward: { weapon: 'ring' },
    features: ['city', 'holosigns'],
    glyphs: [
      'This city was built from an old sky mall. The shops are still open, just for robots.',
      'Neon signs here only say nice things. The Static tries to change the words.',
      'Drone Mothers don\u2019t hate you. They copy whatever the Static tells them.',
      'Somewhere past the rings of Coaster Nebula, there\u2019s a ride nobody finished building.',
      'Look up. The tallest tower points at the galactic core.'
    ],
    music: { root: 110, scale: [0, 3, 5, 7, 10] }
  },
  {
    id: 5, slug: 'coaster-nebula', name: 'Coaster Nebula', tag: 'The galaxy\u2019s wildest ride, loops included', kind: 'lock', unlock: 3,
    planet: { type: 4, c1: '#3b0a45', c2: '#ffd23f', c3: '#38f0ff', glow: 0.7, bands: 0.9, size: 7.5, ring: 2, ringColor: '#ffd23f', atmo: '#ffd23f', spin: 0.25 },
    sky: { top: '#12002b', mid: '#5b1a8a', bot: '#ff8a3d', neb: '#ffd23f', stars: 1, sun: '#fff1a8', sunDir: [-0.5, 0.4, -0.7], moons: [['#ff4fd8', 80, [0.4, 0.55, -0.7]], ['#38f0ff', 50, [-0.7, 0.3, -0.6]]], fog: '#3a0d5a', fogD: 0.0016 },
    terrain: { style: 'islands', seed: 55, height: 40, rough: 0.9, colors: ['#3a1450', '#7a2d8a', '#e05aa8', '#ffd23f'], water: { type: 'void', level: 6, color: '#8a3dff' } },
    props: [P('dome', 14, 4, 7), P('house-cyl', 24, 3, 5), P('tree-swirl', 50, 3, 5), P('plant-1', 80, 1.5, 3)],
    aliens: [['alien-birb', 10, 0.3], ['alien-hywirl', 8, 0.4]],
    drones: [['drone-flyer', 6]],
    mission: { type: 'coaster', n: 20, text: 'Hop on the Star Coaster and blast 20 Static targets during the ride.' },
    reward: { ability: 'dash' },
    features: ['coaster', 'balloons'],
    glyphs: [
      'The coaster was built so everyone could scream together. It\u2019s surprisingly relaxing.',
      'Riders who wave at strangers go faster. Scientifically unproven. Totally true.',
      'Carnival lights here never blink. They breathe.',
      'Some black holes are drains. Some are doors. Doors wait for the right key.',
      'A tablet on Dunestar tells the rest of this story.'
    ],
    music: { root: 261.6, scale: [0, 4, 7, 9, 12] }
  },
  {
    id: 6, slug: 'crystalis', name: 'Crystalis', tag: 'Crystal caves that sing when you touch them', kind: 'lock', unlock: 4,
    planet: { type: 5, c1: '#0a2a4a', c2: '#9ff0ff', c3: '#d6b8ff', glow: 0.6, bands: 0.15, size: 6.5, ring: 1, ringColor: '#d6b8ff', atmo: '#bff0ff', spin: 0.14 },
    sky: { top: '#030a1f', mid: '#1a3a7a', bot: '#9ff0ff', neb: '#d6b8ff', stars: 1, sun: '#e6f8ff', sunDir: [0.3, 0.4, -0.85], moons: [['#d6b8ff', 100, [-0.5, 0.4, -0.75]]], fog: '#1a3a6a', fogD: 0.0018 },
    terrain: { style: 'mesa', seed: 66, height: 70, rough: 1, colors: ['#1b2f55', '#3b5b8f', '#8fb8e6', '#eaf7ff'], water: { type: 'ice', level: 3, color: '#bff0ff' } },
    props: [P('rock-large-1', 70, 4, 10, { tint: '#9ff0ff' }), P('tree-spikes', 60, 3, 6, { tint: '#d6b8ff' }), P('plant-2', 90, 1.5, 3)],
    aliens: [['alien-yeti', 8, 0.4], ['alien-ghost', 10, 0.5]],
    drones: [['drone-small', 10]],
    mission: { type: 'crystal', n: 5, text: 'Five Singing Crystals are out of tune. Blast them from the lowest note to the highest.' },
    reward: { weapon: 'prism' },
    features: ['crystals', 'auroras'],
    glyphs: [
      'The biggest crystal sings the lowest note. The smallest sings the highest.',
      'Ghosts on Crystalis aren\u2019t scary. They\u2019re just very shy echoes.',
      'The aurora here spells a word, but only from the top of the tallest mesa.',
      'Crystals remember every song ever sung near them.',
      'One crystal remembers the day the Static arrived: it came from inside, not outside.'
    ],
    music: { root: 293.7, scale: [0, 2, 4, 7, 11] }
  },
  {
    id: 7, slug: 'magmara', name: 'Magmara', tag: 'Lava rivers, fire trees, and a very hot temper', kind: 'lock', unlock: 5,
    planet: { type: 6, c1: '#1a0500', c2: '#ff5a1f', c3: '#ffd23f', glow: 1.3, bands: 0.1, cracks: 1, size: 7, ring: 0, atmo: '#ff5a1f', spin: 0.1 },
    sky: { top: '#0a0000', mid: '#4a0a02', bot: '#ff5a1f', neb: '#ff8a3d', stars: 0.4, sun: '#ffb070', sunDir: [0.2, 0.25, -0.95], moons: [['#ffd23f', 60, [-0.6, 0.5, -0.6]]], fog: '#3a0a02', fogD: 0.0026 },
    terrain: { style: 'volcanic', seed: 77, height: 110, rough: 1.1, colors: ['#1a0a05', '#3b1508', '#6b2a10', '#2a2a2a'], glowLines: '#ff5a1f', water: { type: 'lava', level: 5, color: '#ff5a1f' } },
    props: [P('tree-lava', 90, 3, 6), P('rock-large-2', 80, 4, 12, { tint: '#3b1508' }), P('rock-1', 90, 2, 5)],
    aliens: [['alien-cactoro', 10, 0.6], ['alien-spikyblob', 10, 0.6]],
    drones: [['drone-large', 5], ['drone-flyer', 8]],
    mission: { type: 'race', n: 10, time: 150, text: 'Jet through 10 Fire Rings before time runs out. Every ring refuels your jetpack. Don\u2019t touch the lava!' },
    reward: { ability: 'shield' },
    features: ['geysers', 'embers'],
    glyphs: [
      'Magmara is angry because it\u2019s lonely. Lava is just a planet crying hot.',
      'Fire trees grow faster when you say thank you.',
      'Five glyphs burn here. Gather every one and the dark will open its eye.',
      'A black hole that opens its eye is not a trap. It\u2019s an invitation.',
      'On the far side of the dark, even shadows want friends.'
    ],
    music: { root: 146.8, scale: [0, 1, 5, 7, 8] }
  },
  {
    id: 8, slug: 'aquara', name: 'Aquara', tag: 'An ocean world where islands float on songs', kind: 'lock', unlock: 6,
    planet: { type: 7, c1: '#021a4a', c2: '#1d8cff', c3: '#7cffd4', glow: 0.3, bands: 0.2, clouds: 1, size: 8.5, ring: 0, atmo: '#7cc8ff', spin: 0.16 },
    sky: { top: '#021030', mid: '#1c5ab8', bot: '#8fe8ff', neb: '#7cffd4', stars: 0.4, sun: '#fff6d8', sunDir: [0.4, 0.45, -0.8], moons: [['#ffffff', 110, [-0.5, 0.35, -0.8]], ['#7cffd4', 45, [0.7, 0.55, -0.45]]], fog: '#3a7ac8', fogD: 0.0012 },
    terrain: { style: 'islands', seed: 88, height: 46, rough: 0.9, colors: ['#e6d6a0', '#6fbf5a', '#2f8a4a', '#d6e6c0'], water: { type: 'ocean', level: 9, color: '#1d8cff' } },
    props: [P('tree-floating', 60, 3, 6), P('tree-maple-1', 50, 3, 5), P('plant-1', 120, 1.5, 3), P('rock-1', 70, 2, 4)],
    aliens: [['alien-glub', 14, 0.4], ['alien-squidle', 8, 0.4]],
    drones: [['drone-flyer', 8]],
    mission: { type: 'collect', n: 8, item: 'Song Pearl', text: 'Eight Song Pearls hold the islands up. Collect them before the islands sink.' },
    reward: { ability: 'heal' },
    features: ['whales', 'waterfalls'],
    glyphs: [
      'Glub fish can fly because nobody ever told them they couldn\u2019t.',
      'The sea here keeps a count of every friend you make across the galaxy.',
      'When twenty friends sing together, the sea spins open.',
      'Deep water shows your reflection. Deeper water shows who you could be.',
      'Islands float on songs. Stop singing and they sink. So keep humming.'
    ],
    music: { root: 196, scale: [0, 2, 4, 7, 9] }
  },
  {
    id: 9, slug: 'mechanica', name: 'Mechanica', tag: 'A robot factory that forgot what it was building', kind: 'lock', unlock: 7,
    planet: { type: 8, c1: '#1a1d24', c2: '#8b96a6', c3: '#ffb23f', glow: 0.5, bands: 0.5, lights: 1, size: 7, ring: 1, ringColor: '#8b96a6', atmo: '#ffb23f', spin: 0.07 },
    sky: { top: '#0a0c12', mid: '#3a3f4a', bot: '#ffb23f', neb: '#ff8a3d', stars: 0.5, sun: '#ffd6a0', sunDir: [-0.4, 0.3, -0.85], moons: [['#8b96a6', 130, [0.5, 0.45, -0.75]]], fog: '#2a2d36', fogD: 0.0022 },
    terrain: { style: 'plates', seed: 99, height: 24, rough: 0.5, colors: ['#23262e', '#3a3f4a', '#5b6270', '#8b96a6'], glowLines: '#ffb23f', water: { type: 'oil', level: 1.5, color: '#2a1a4a' } },
    props: [P('solar', 50, 2, 4), P('base-large', 10, 2, 3), P('dome', 12, 3, 5), P('rover', 16, 1.5, 2.5), P('cyber-ac', 40, 1.5, 3), P('cyber-antenna', 50, 2, 4)],
    aliens: [['drone-large', 12, 0.85], ['alien-armabee', 6, 0.4]],
    drones: [['drone-cyber', 14], ['drone-flyer', 8]],
    mission: { type: 'free', n: 10, text: 'The Rustbots are stuck on Static. Free 10 so they remember they\u2019re builders.' },
    reward: { weapon: 'gravity' },
    features: ['conveyors', 'sparks'],
    glyphs: [
      'This factory was building gifts. The Static made it build drones instead.',
      'Rustbots love three things: oil baths, polka music, and you.',
      'Every drone was once a delivery bot. Somewhere, a birthday present never arrived.',
      'Machines only copy. If you want a machine to change, change the song.',
      'The factory\u2019s master plan says: the core needs a friend, not a fighter.'
    ],
    music: { root: 130.8, scale: [0, 3, 5, 6, 7, 10] }
  },
  {
    id: 10, slug: 'sporeveil', name: 'Sporeveil', tag: 'Giant mushrooms, glowing spores, sleepy giants', kind: 'lock', unlock: 8,
    planet: { type: 9, c1: '#2a0a3a', c2: '#ff7ab8', c3: '#7cffd4', glow: 0.9, bands: 0.3, size: 7, ring: 0, atmo: '#ff7ab8', spin: 0.13 },
    sky: { top: '#0c0218', mid: '#3a0a4a', bot: '#7cffd4', neb: '#ff7ab8', stars: 0.9, sun: '#ffe0f0', sunDir: [0.5, 0.4, -0.75], moons: [['#7cffd4', 90, [-0.6, 0.5, -0.6]]], fog: '#2a0a3a', fogD: 0.0024 },
    terrain: { style: 'jungle', seed: 110, height: 40, rough: 1, colors: ['#1c0a24', '#3a1a4a', '#6b2d7a', '#ff9ae6'], glowLines: '#7cffd4', water: { type: 'water', level: 2, color: '#b08cff' } },
    props: [P('plant-1', 180, 2, 4, { tint: '#ff7ab8' }), P('plant-2', 160, 2, 4, { tint: '#7cffd4' }), P('tree-blob', 40, 3, 5, { tint: '#b08cff' })],
    aliens: [['alien-mushnub', 18, 0.4], ['alien-mushking', 1, 0], ['alien-ghost', 6, 0.5]],
    drones: [['drone-small', 10]],
    mission: { type: 'collect', n: 7, item: 'Spore Lantern', text: 'Seven Spore Lanterns sit on top of the giant mushrooms. Bounce up and grab them.' },
    reward: { ability: 'djump' },
    features: ['giantshrooms', 'spores'],
    glyphs: [
      'The Mushroom King sleeps 300 years at a time. Please don\u2019t tell him about snooze buttons.',
      'Spores glow brighter near kind people. Look around you.',
      'Giant mushroom caps are bouncy. Very bouncy. Suspiciously bouncy.',
      'The King once said: every war is two people who haven\u2019t had a snack yet.',
      'Under the tallest cap, a map of the core is carved in spore-light.'
    ],
    music: { root: 207.6, scale: [0, 3, 5, 7, 10] }
  },
  {
    id: 11, slug: 'cloudrift', name: 'Cloudrift', tag: 'Islands of candy-colored sky', kind: 'lock', unlock: 9,
    planet: { type: 10, c1: '#ff9ae6', c2: '#ffffff', c3: '#8fd8ff', glow: 0.4, bands: 0.6, clouds: 1, size: 8, ring: 2, ringColor: '#ffffff', atmo: '#ffd6f0', spin: 0.2 },
    sky: { top: '#3a5aff', mid: '#ff9ae6', bot: '#ffe6a0', neb: '#ffffff', stars: 0.2, sun: '#fff6e0', sunDir: [-0.3, 0.5, -0.8], moons: [['#ffffff', 140, [0.5, 0.4, -0.75]]], fog: '#ffc6e6', fogD: 0.0014 },
    terrain: { style: 'sky', seed: 121, height: 60, rough: 0.8, colors: ['#ffe6f5', '#ffc6e6', '#c6f0ff', '#ffffff'], water: { type: 'cloud', level: -30, color: '#ffe6f5' } },
    props: [P('tree-floating', 70, 3, 6, { tint: '#ff9ae6' }), P('tree-birch-1', 60, 3, 5, { tint: '#ffffff' }), P('bush-large', 50, 2, 4, { tint: '#ffd6f0' })],
    aliens: [['alien-birb', 14, 0.4], ['alien-hywirl', 8, 0.4], ['alien-armabee', 6, 0.4]],
    drones: [['drone-flyer', 12]],
    mission: { type: 'race', n: 12, time: 180, text: 'Jet through 12 Sky Rings. Every ring refuels your jetpack, and the clouds toss you back if you fall.' },
    reward: { ability: 'fuel' },
    features: ['clouds', 'rainbows'],
    glyphs: [
      'Clouds here taste like cotton candy. Do not ask how anyone found out.',
      'Birbs never argue. They just sing louder until everyone is laughing.',
      'The highest island has a bench for two. It\u2019s never empty for long.',
      'Rainbows here end at the next friend you haven\u2019t met yet.',
      'Every shard you collect makes the core a little brighter. Count them.'
    ],
    music: { root: 329.6, scale: [0, 2, 4, 7, 9] }
  },
  {
    id: 12, slug: 'dunestar', name: 'Dunestar', tag: 'Twin suns, singing dunes, and a buried secret', kind: 'lock', unlock: 10,
    planet: { type: 11, c1: '#5a2a0a', c2: '#ffb870', c3: '#ffe6a0', glow: 0.2, bands: 0.7, size: 8, ring: 1, ringColor: '#ffb870', atmo: '#ffd6a0', spin: 0.09 },
    sky: { top: '#1a2a6a', mid: '#e0885a', bot: '#ffe6a0', neb: '#ffb870', stars: 0.3, sun: '#fff0c0', sunDir: [0.3, 0.3, -0.9], moons: [['#ffd23f', 150, [-0.6, 0.25, -0.75]], ['#ff8a3d', 90, [0.7, 0.2, -0.65]]], fog: '#e8b080', fogD: 0.0012 },
    terrain: { style: 'dunes', seed: 132, height: 60, rough: 0.7, colors: ['#b8763a', '#d99a52', '#f0c080', '#fff0c8'], water: { type: 'none' } },
    props: [P('ruin-temple', 5, 5, 7), P('ruin-wonder', 3, 5, 7), P('ruin-tower', 8, 5, 7), P('ruin-windmill', 6, 5, 7), P('ruin-market', 6, 5, 7), P('rock-large-2', 60, 4, 12, { tint: '#d99a52' }), P('plant-2', 60, 1.5, 3, { tint: '#9cbf5a' })],
    aliens: [['alien-cactoro', 14, 0.5], ['alien-yeti', 4, 0.3]],
    drones: [['drone-large', 6], ['drone-flyer', 8]],
    mission: { type: 'collect', n: 5, item: 'Relic Tablet', text: 'Five Relic Tablets tell how the war began. Dig them out of the ruins.' },
    reward: { ability: 'map' },
    features: ['sandgeysers', 'twinsuns'],
    glyphs: [
      'Tablet 1: Two worlds shared one song. One sang a little louder.',
      'Tablet 2: The other world thought the loud one was bragging. It sang louder back.',
      'Tablet 3: Soon every world was shouting. The shouting became the Static.',
      'Tablet 4: The Static gathered at the core, where all songs meet.',
      'Tablet 5: It cannot be beaten. It can only be listened to.'
    ],
    music: { root: 164.8, scale: [0, 1, 4, 5, 7, 8] }
  }
];

/* The three hidden worlds are packed so nobody spoils them by reading the source. */
export const HIDDEN_PACK = 'W3siaWQiOiAxMywgInNsdWciOiAidW1icmEiLCAibmFtZSI6ICJVbWJyYSIsICJ0YWciOiAiVGhlIHdvcmxkIG9uIHRoZSBmYXIgc2lkZSBvZiB0aGUgZGFyayIsICJraW5kIjogImhpZGRlbiIsICJmaW5kIjogeyJ3b3JsZCI6IDcsICJnbHlwaHMiOiA1LCAiaGludCI6ICJBIGJsYWNrIGhvbGUgb24gTWFnbWFyYSBvcGVuZWQgaXRzIGV5ZS4ifSwgInBsYW5ldCI6IHsidHlwZSI6IDEyLCAiYzEiOiAiIzAwMDAwMCIsICJjMiI6ICIjNmEzZGZmIiwgImMzIjogIiNmZmZmZmYiLCAiZ2xvdyI6IDEuMiwgImJhbmRzIjogMCwgImNyYWNrcyI6IDEsICJzaXplIjogNiwgInJpbmciOiAyLCAicmluZ0NvbG9yIjogIiM2YTNkZmYiLCAiYXRtbyI6ICIjNmEzZGZmIiwgInNwaW4iOiAwLjN9LCAic2t5IjogeyJ0b3AiOiAiIzAwMDAwMCIsICJtaWQiOiAiIzBhMDQyMCIsICJib3QiOiAiIzFhMGE0YSIsICJuZWIiOiAiIzZhM2RmZiIsICJzdGFycyI6IDEuNCwgInN1biI6ICIjYjA4Y2ZmIiwgInN1bkRpciI6IFswLCAwLjYsIC0wLjhdLCAibW9vbnMiOiBbWyIjZmZmZmZmIiwgNjAsIFswLjQsIDAuNiwgLTAuN11dXSwgImZvZyI6ICIjMDUwMjEyIiwgImZvZ0QiOiAwLjAwM30sICJ0ZXJyYWluIjogeyJzdHlsZSI6ICJzaGFkb3ciLCAic2VlZCI6IDE0MywgImhlaWdodCI6IDkwLCAicm91Z2giOiAxLjMsICJjb2xvcnMiOiBbIiMwNTAzMGMiLCAiIzEyMGEyYSIsICIjMmExYTVhIiwgIiNiMDhjZmYiXSwgImdsb3dMaW5lcyI6ICIjNmEzZGZmIiwgIndhdGVyIjogeyJ0eXBlIjogInZvaWQiLCAibGV2ZWwiOiAtNCwgImNvbG9yIjogIiM2YTNkZmYifX0sICJwcm9wcyI6IFt7Im0iOiAidHJlZS1zcGlrZXMiLCAibiI6IDcwLCAicyI6IFszLCA3XSwgInRpbnQiOiAiIzFhMGEzYSIsICJnbG93IjogIiM2YTNkZmYifSwgeyJtIjogInJvY2stbGFyZ2UtMSIsICJuIjogNjAsICJzIjogWzQsIDEyXSwgInRpbnQiOiAiIzEyMGEyYSJ9XSwgImFsaWVucyI6IFtbImFsaWVuLWdob3N0IiwgMTYsIDAuOF0sIFsiYWxpZW4taHl3aXJsIiwgNiwgMC42XV0sICJkcm9uZXMiOiBbWyJkcm9uZS1taW5pIiwgMTBdXSwgIm1pc3Npb24iOiB7InR5cGUiOiAiZnJlZSIsICJuIjogMTIsICJ0ZXh0IjogIlRoZSBlY2hvZXMgaGVyZSBoYXZlIGZvcmdvdHRlbiB0aGVpciBvd24gbmFtZXMuIEZyZWUgMTIgb2YgdGhlbS4ifSwgInJld2FyZCI6IHsiYmFkZ2UiOiAiU2hhZG93IEZyaWVuZCJ9LCAiZmVhdHVyZXMiOiBbImludmVydGVkIiwgIndpc3BzIl0sICJnbHlwaHMiOiBbIlNoYWRvd3MgYXJlIGp1c3QgbGlnaHQgdGFraW5nIGEgbmFwLiIsICJUaGUgZWNob2VzIHJlbWVtYmVyOiB0aGUgU3RhdGljIGlzIG1hZGUgb2YgZXZlcnkgd29ybGQgc2hvdXRpbmcgYXQgb25jZS4iLCAiTm9ib2R5IGhlcmUgd2FzIGV2ZXIgZXZpbC4gVGhleSB3ZXJlIGp1c3QgbG91ZCBpbiB0aGUgZGFyay4iLCAiVHdvIG1vcmUgaGlkZGVuIHdvcmxkcyB3YWl0LiBPbmUgaXMgdW5kZXIgYSBzZWEuIE9uZSBpcyBhdCB0aGUgaGVhcnQgb2YgZXZlcnl0aGluZy4iLCAiRnJpZW5kcyBmb3VuZCBpbiB0aGUgZGFyayBjb3VudCBkb3VibGUuIl0sICJtdXNpYyI6IHsicm9vdCI6IDExMCwgInNjYWxlIjogWzAsIDIsIDMsIDcsIDhdfX0sIHsiaWQiOiAxNCwgInNsdWciOiAibWlycm9yd2FrZSIsICJuYW1lIjogIk1pcnJvcndha2UiLCAidGFnIjogIkEgc2VhIHRoYXQgc2hvd3MgeW91IHdobyB5b3UgY291bGQgYmUiLCAia2luZCI6ICJoaWRkZW4iLCAiZmluZCI6IHsid29ybGQiOiA4LCAiZnJpZW5kcyI6IDIwLCAiaGludCI6ICJUaGUgQXF1YXJhIHNlYSBoZWFyZCB0d2VudHkgdm9pY2VzIGFuZCBzcHVuIG9wZW4uIn0sICJwbGFuZXQiOiB7InR5cGUiOiAxMywgImMxIjogIiNkZmU5ZmYiLCAiYzIiOiAiIzdjZmZkNCIsICJjMyI6ICIjZmY5YWU2IiwgImdsb3ciOiAwLjcsICJiYW5kcyI6IDAuMiwgInNpemUiOiA2LCAicmluZyI6IDEsICJyaW5nQ29sb3IiOiAiI2ZmZmZmZiIsICJhdG1vIjogIiNmZmZmZmYiLCAic3BpbiI6IDAuMn0sICJza3kiOiB7InRvcCI6ICIjMWEyYTVhIiwgIm1pZCI6ICIjOWZiOGZmIiwgImJvdCI6ICIjZmZlNmY1IiwgIm5lYiI6ICIjN2NmZmQ0IiwgInN0YXJzIjogMC42LCAic3VuIjogIiNmZmZmZmYiLCAic3VuRGlyIjogWzAuMiwgMC41LCAtMC44NV0sICJtb29ucyI6IFtbIiNmZjlhZTYiLCAxMDAsIFstMC41LCAwLjQsIC0wLjc1XV0sIFsiIzdjZmZkNCIsIDEwMCwgWzAuNSwgMC40LCAtMC43NV1dXSwgImZvZyI6ICIjYzZkNmZmIiwgImZvZ0QiOiAwLjAwMTJ9LCAidGVycmFpbiI6IHsic3R5bGUiOiAibmVlZGxlcyIsICJzZWVkIjogMTU0LCAiaGVpZ2h0IjogMTYwLCAicm91Z2giOiAwLjgsICJjb2xvcnMiOiBbIiNjNmQ2ZmYiLCAiI2U2ZjBmZiIsICIjZmZmZmZmIiwgIiNmZmQ2ZjAiXSwgIndhdGVyIjogeyJ0eXBlIjogIm1pcnJvciIsICJsZXZlbCI6IDQsICJjb2xvciI6ICIjZGZlOWZmIn19LCAicHJvcHMiOiBbeyJtIjogInJvY2stbGFyZ2UtMiIsICJuIjogNTAsICJzIjogWzQsIDEwXSwgInRpbnQiOiAiI2ZmZmZmZiJ9LCB7Im0iOiAidHJlZS1mbG9hdGluZyIsICJuIjogNDAsICJzIjogWzMsIDZdLCAidGludCI6ICIjN2NmZmQ0In1dLCAiYWxpZW5zIjogW1siYWxpZW4tZ2x1YiIsIDEyLCAwLjNdLCBbImFsaWVuLWJpcmIiLCA4LCAwLjNdXSwgImRyb25lcyI6IFtbImRyb25lLWZseWVyIiwgOF1dLCAibWlzc2lvbiI6IHsidHlwZSI6ICJzdW1taXQiLCAidGV4dCI6ICJDbGltYiB0aGUgQ3J5c3RhbCBOZWVkbGUgYW5kIHJpbmcgdGhlIE1pcnJvciBCZWxsLiJ9LCAicmV3YXJkIjogeyJiYWRnZSI6ICJUcnVlIFJlZmxlY3Rpb24ifSwgImZlYXR1cmVzIjogWyJyZWZsZWN0aW9uIl0sICJnbHlwaHMiOiBbIllvdXIgcmVmbGVjdGlvbiBoZXJlIGlzIGFsd2F5cyBzbWlsaW5nLiBUcnkgdG8gY2F0Y2ggdXAuIiwgIkV2ZXJ5IGVuZW15IHlvdSBldmVyIGhhZCBoYWQgYSByZWZsZWN0aW9uIHRoYXQgbGlrZWQgeW91LiIsICJUaGUgSGVhcnQgaXMgYXQgdGhlIGdhbGFjdGljIGNvcmUuIEl0IGlzIG5vdCBhIG1vbnN0ZXIuIEl0IGlzIGEgbWlycm9yLiIsICJXaGVuIHlvdSByZWFjaCB0aGUgSGVhcnQsIHRoZSBicmF2ZXN0IG1vdmUgaXMgdGhlIHF1aWV0ZXN0IG9uZS4iLCAiUHV0IHRoZSBibGFzdGVyIGRvd24uIFdhbGsgdXAuIFNheSBoaS4gVGhhdOKAmXMgdGhlIHdob2xlIHNlY3JldC4iXSwgIm11c2ljIjogeyJyb290IjogMjYxLjYsICJzY2FsZSI6IFswLCA0LCA3LCAxMSwgMTJdfX0sIHsiaWQiOiAxNSwgInNsdWciOiAidGhlLWhlYXJ0IiwgIm5hbWUiOiAiVGhlIEhlYXJ0IiwgInRhZyI6ICJXaGVyZSBldmVyeSBzb25nIGluIHRoZSBnYWxheHkgbWVldHMiLCAia2luZCI6ICJoaWRkZW4iLCAiZmluZCI6IHsic2hhcmRzIjogMTIsICJoaWRkZW4iOiBbMTMsIDE0XSwgImhpbnQiOiAiVGhlIGdhbGFjdGljIGNvcmUgb3BlbmVkLiJ9LCAicGxhbmV0IjogeyJ0eXBlIjogMTQsICJjMSI6ICIjZmYyZjZhIiwgImMyIjogIiNmZmQyM2YiLCAiYzMiOiAiI2ZmZmZmZiIsICJnbG93IjogMS41LCAiYmFuZHMiOiAwLjIsICJjcmFja3MiOiAxLCAic2l6ZSI6IDksICJyaW5nIjogMiwgInJpbmdDb2xvciI6ICIjZmZkMjNmIiwgImF0bW8iOiAiI2ZmN2FiOCIsICJzcGluIjogMC4wNX0sICJza3kiOiB7InRvcCI6ICIjMDAwMDAwIiwgIm1pZCI6ICIjMmEwNDE4IiwgImJvdCI6ICIjZmYyZjZhIiwgIm5lYiI6ICIjZmZkMjNmIiwgInN0YXJzIjogMS41LCAic3VuIjogIiNmZmUwYTAiLCAic3VuRGlyIjogWzAsIDAuMywgLTFdLCAibW9vbnMiOiBbXSwgImZvZyI6ICIjMWEwMjEwIiwgImZvZ0QiOiAwLjAwMn0sICJ0ZXJyYWluIjogeyJzdHlsZSI6ICJhcmVuYSIsICJzZWVkIjogMTY1LCAiaGVpZ2h0IjogMzAsICJyb3VnaCI6IDAuNiwgImNvbG9ycyI6IFsiIzFhMDQxMCIsICIjM2EwYTI0IiwgIiM2YTFhM2EiLCAiI2ZmZDIzZiJdLCAiZ2xvd0xpbmVzIjogIiNmZjJmNmEiLCAid2F0ZXIiOiB7InR5cGUiOiAidm9pZCIsICJsZXZlbCI6IC02LCAiY29sb3IiOiAiI2ZmMmY2YSJ9fSwgInByb3BzIjogW3sibSI6ICJyb2NrLWxhcmdlLTEiLCAibiI6IDQwLCAicyI6IFs1LCAxNF0sICJ0aW50IjogIiMzYTBhMjQiLCAiZ2xvdyI6ICIjZmYyZjZhIn1dLCAiYWxpZW5zIjogW10sICJkcm9uZXMiOiBbWyJkcm9uZS1zbWFsbCIsIDZdXSwgIm1pc3Npb24iOiB7InR5cGUiOiAiZmluYWwiLCAiYm9zcyI6ICJhbGllbi13YXJkZW4iLCAidGV4dCI6ICJUaGUgV2FyZGVuIGd1YXJkcyB0aGUgSGVhcnQuIEl0IGlzIG1hZGUgb2YgU3RhdGljLiBCbGFzdGluZyBpdCBvbmx5IG1ha2VzIGl0IGJpZ2dlci4ifSwgInJld2FyZCI6IHsiYmFkZ2UiOiAiSGFybW9ueSJ9LCAiZmVhdHVyZXMiOiBbImhlYXJ0Il0sICJnbHlwaHMiOiBbIlRoZSBXYXJkZW4gd2FzIHRoZSBmaXJzdCB2b2ljZSBldmVyIGphbW1lZC4iLCAiSXQgaGFzIGJlZW4gc2hvdXRpbmcgZm9yIGEgdGhvdXNhbmQgeWVhcnMgYmVjYXVzZSBub2JvZHkgYW5zd2VyZWQuIiwgIllvdXIgYmxhc3RlciBtYWtlcyBpdCBsb3VkZXIuIFRoaW5rIGFib3V0IHdoeS4iLCAiSG9sc3RlciB5b3VyIGJsYXN0ZXIgKHByZXNzIEgsIG9yIHRoZSBob2xzdGVyIGJ1dHRvbikuIiwgIlRoZW4gd2FsayBjbG9zZSBhbmQgdGFsayAocHJlc3MgRSkuIFRoYXTigJlzIGl0LiBUaGF04oCZcyB0aGUgd2hvbGUgZ2FtZS4iXSwgIm11c2ljIjogeyJyb290IjogMTQ2LjgsICJzY2FsZSI6IFswLCA0LCA3LCA5LCAxMl19fV0=';

export function allWorlds() {
  let hidden = [];
  try { hidden = JSON.parse(decodeURIComponent(escape(atob(HIDDEN_PACK)))); } catch (e) { hidden = []; }
  return WORLDS.concat(hidden);
}

/* Orbi's riddles, unlocked by progress. Never direct answers. */
export const RIDDLES = [
  { need: s => s.shards.length < 2, text: 'Every shard you earn wakes another world. Start with Lumora or Gloopa.' },
  { need: s => s.shards.length >= 2 && s.glyphCount() < 5, text: 'Star Glyphs float where nobody bothers to look. Up high. Behind things. Past the edge.' },
  { need: s => !s.found.includes(13) && s.unlocked(7), text: 'On a world that cries hot, five burning words open a dark eye.' },
  { need: s => !s.found.includes(14) && s.unlocked(8), text: 'Count your friends across the stars. When the sea hears twenty voices, it spins.' },
  { need: s => !s.found.includes(15) && s.shards.length >= 12, text: 'The core is where all songs meet. Bring every shard, and the friends nobody else found.' },
  { need: () => true, text: 'Try waving at a jammed alien after you free it. You\u2019d be surprised what they tell you.' }
];
