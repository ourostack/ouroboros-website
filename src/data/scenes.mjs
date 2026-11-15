// The storybook world (Ari, 2026-11-06): a dawn meadow, Ouro on its glowing
// trail, and each product's character in its own scene. The art lives in
// ourostack/.github brand/ and is copied here byte for byte by
// scripts/sync-storybook.mjs into public/brand/storybook/. Never re-encode it.
//
// This file is the one map of which scene each page opens on (`hero`) and
// which scene its share card is set in (`og`, defaulting to the hero).
// Layout.astro reads `sceneFor()`; src/data/og.ts reads `ogSceneFor()`.

// What each scene shows, for alt text. Concrete, and a touch whimsical.
export const scenes = {
  ourostack: 'Dawn over misty hills. Ouro, a round green snake, sits by a worn footpath that loops past the whole crew: a little factory puffing smoke, a desk under a blossom tree, a lectern, a control panel, a silver cloche, a flock of sheep, and two faceless glass friends and their robots waving from a picnic blanket.',
  'ourostack-dark': 'Night over misty hills under a starry sky, with village lights in the valleys. Ouro, a round green snake, sits by a moonlit footpath that loops past the whole crew: a little factory with lit windows puffing smoke, a desk under a blossom tree with its lamp on, a lectern, a control panel, a silver cloche, a flock of sheep, and two glowing glass friends and their robots waving from a picnic blanket.',
  'ouro-apps-site': 'A market stall with a green-striped awning, stacked with wrapped gifts, one box open and glowing. Ouro leans in beside it like a shopkeeper who has been up since dawn.',
  'ouro-apps-site-dark': 'A market stall at night with a green-striped awning, stacked with wrapped gifts, one box open and glowing, and a lit village in the valley below. Ouro leans in beside it like a shopkeeper keeping late hours.',
  desk: 'A wooden desk on a hilltop meadow at sunrise, with a lamp, a tidy stack of folders and a potted plant. Ouro sits beside it, and more desks dot the hills in the distance.',
  'desk-dark': 'A wooden desk on a hilltop meadow at night under a starry sky, its lamp glowing over a tidy stack of folders and a potted plant. Ouro sits beside it, and more lamplit desks dot the hills in the distance.',
  'ouro-md': 'A reading lectern holding a fresh page, and a lamp and a cup of tea on a stool. Ouro peeks over the lectern to read along.',
  'ouro-md-dark': 'A reading lectern holding a fresh page at night, and a glowing lamp and a cup of tea on a stool, with village lights in the misty hills below. Ouro peeks over the lectern to read along.',
  'ouro-hx': 'A faceless glass person in a moss scarf and Loop, a small jade-and-brass glass robot, work an oak-and-brass console on a dawn hilltop, while Ouro, a smiling emerald glass snake curled into an O, watches beside them.',
  butler: 'A stone cottage with a server cabinet blinking green in its doorway, a watering can and a flower path. Ouro waits on the path beside a little table set with a silver cloche, ready to serve.',
  'butler-dark': 'A stone cottage at night with a server cabinet blinking green in its doorway, its lanterns lit, a watering can and a flower path. Ouro waits on the path beside a little table set with a silver cloche, ready to serve.',
  housesitter: 'A round-doored cottage at sunrise, two little robots working at a laptop in its lit window. By the door a small grey box with an amber eye keeps watch, the house key hanging from it on a red ribbon, and Ouro curls on the doorstep, wide awake.',
  'housesitter-dark': 'A round-doored cottage at night under a starry sky, two little robots working at a laptop in its lit window. By the door a small grey box with an amber eye keeps watch, the house key hanging from it on a red ribbon, and Ouro curls on the doorstep, wide awake.',
  ouroboros: 'A round-doored burrow in a grassy hill, with a mailbox, an old telephone and a lantern. Ouro sits out front, where a sunlit path leads up to the door.',
  'ouroboros-dark': 'A round-doored burrow in a grassy hill at night, its windows and lantern glowing, with a mailbox and an old telephone. Ouro sits out front, where a lit path leads up to the door.',
  shepherd: 'Ouro stands tall by a shepherd’s crook and a wooden gate while a line of robot-eyed sheep trots along their glowing track.',
  'shepherd-dark': 'At night under a starry sky, Ouro stands tall by a shepherd’s crook and a wooden gate lit by a lantern, while a line of robot-eyed sheep, their eyes glowing blue, trots along the glowing trail.',
  friends: 'Two faceless glass friends in scarves and two little robots wave from a picnic blanket, with Ouro curled up in the middle of them, while another little group picnics on a far hill and waves back.',
  'friends-dark': 'Two glowing glass friends in scarves and two little robots wave from a lantern-lit picnic blanket at night, with Ouro curled up in the middle of them, while another little group picnics by lantern light on a far hill and waves back.',
  'friends-relay': 'A stone dovecote tower where white doves carry letters across the hills, a robot waving at each end, and Ouro in a postman’s cap at the foot of the tower.',
  factory: 'A cream-coloured factory with glowing windows and a conveyor of parcels, a big gauge and a bar chart on an easel. Ouro sits by the chart, checking the numbers.',
  'factory-dark': 'A cream-coloured factory at night under a starry sky, its windows glowing over a conveyor of parcels, with a big gauge and a bar chart on an easel. Ouro sits by the chart, checking the numbers.',
  'ouro-work': 'A stone cottage with a row of wooden mailboxes and a round vault door. Ouro, wearing a lanyard and a blank name badge, waits on the trail.',
  'ouro-work-dark': 'A stone cottage at night with glowing windows, a row of wooden mailboxes and a round vault door. Ouro, wearing a lanyard and a blank name badge, waits on the path.',
  'ouroboros-skills': 'A bookcase of rolled scrolls under a vine. One robot reads a scroll on a stool by a little table while another holds up a fresh scroll tied with a green ribbon, and Ouro smiles on.',
  'ouroboros-skills-dark': 'A bookcase of rolled scrolls under a vine at night, a lantern glowing beside it and village lights across the misty lake. One robot reads a scroll on a stool by a little table while another holds up a fresh scroll tied with a green ribbon, and Ouro smiles on.',
  'flow-review': 'A row of little paintings on easels in the meadow. A robot with a clipboard takes notes while Ouro peers at one through a big magnifying glass on a stand.',
  'flow-review-dark': 'A row of little paintings on easels at night, with village lights in the misty hills. A robot with a clipboard takes notes while Ouro peers at one through a big magnifying glass on a stand.',
  gatefold: 'A giant open storybook on a picnic blanket in a dawn meadow, with stacked books, a mug of coffee and a phone. Ouro rests beside it, mid-chapter.',
  'gatefold-dark': 'A giant open storybook on a picnic blanket at night under a starry sky and a crescent moon, with stacked books, a mug of coffee and a glowing phone. Ouro rests beside it, mid-chapter.',
  'playwright-focus-proof': 'A faceless glass person relaxes in an armchair with a cup of tea, their laptop closed on the table beside them, while two little robots work at their own laptops beside a tall clock, and Ouro keeps an eye on things.',
  'playwright-focus-proof-dark': 'The same garden at night under a starry sky: a glowing glass person relaxes in an armchair with a cup of tea, their laptop closed beside them, while two little robots work at their own glowing laptops beside a tall clock, and Ouro keeps an eye on things.',
  'ouro-ui-apple': 'A robot peeks over a laptop on a wooden bench, beside a phone and a tablet, each showing a green toggle. Ouro watches from the meadow.',
  'ouro-ui-apple-dark': 'At night under a starry sky, a robot peeks over a laptop on a wooden bench, beside a phone and a tablet, each screen glowing with an amber toggle. Ouro watches from the moonlit meadow.',
  'ouro-ui-core': 'A little glass robot paints six colours onto a palette at an easel while a faceless glass person with a mug looks on. On the bench beside them a phone, a laptop and a tablet already show the same six colours, and Ouro lies at their feet.',
  'ouro-workbench': 'A covered workbench with a pegboard of tools and a row of little monitors. Ouro curls up on a cushion underneath, off the clock.',
  'ouro-workbench-dark': 'A covered workbench at night under a starry sky, with a pegboard of tools, a glowing lantern and a row of little monitors lit amber. Ouro curls up on a cushion beside it, off the clock.',
  'agent-workbench': 'A wooden workbench in the meadow, spread with blueprints, gears, a spool and an oil can, where a little brass robot with a glass-dome head and a keyboard on their chest sits ready. Ouro curls up beside it, smiling at the new helper.',
  'friends-relay-dark': 'A stone dovecote tower at night under a starry sky and a crescent moon, its windows glowing, where white doves carry letters across the misty hills, a robot waving at each end, and Ouro in a postman’s cap at the foot of the tower.',
  'ouro-ui-core-dark': 'The same meadow at night under a starry sky and a crescent moon: by lantern light a little glass robot paints six colours onto a palette while a glowing glass person with a mug looks on, the phone, laptop and tablet on the bench glow with the same colours, and Ouro lies at their feet.',
  'agent-workbench-dark': 'A wooden workbench at night under a starry sky, spread with blueprints, gears and an oil can, where a little brass robot with a glass-dome head and a keyboard on their chest sits ready. Ouro curls up beside it, smiling.',
  'homebrew-tap': 'A copper still and a wooden barrel on a stone hearth, a full mug under its closed tap, and crates of green bottles. Ouro waits by the barrel for the first cup.',
  m365crawl: 'A library nook of crammed bookshelves and a rolling ladder beside a tall card-catalogue cabinet, one drawer pulled out and glowing with filed letters. Ouro peeks round the cabinet, ready to fetch the one you need.',
  'm365crawl-dark': 'A library nook at night, crammed bookshelves and a rolling ladder beside a tall card-catalogue cabinet, one drawer pulled out and glowing with filed letters. Ouro peeks round the cabinet, ready to fetch the one you need, while the misty hills outside sit dark.',
  'ouro-native-apple-app-shell': 'A pearly snail shell on a mossy rock by a pond, opened up like a dollhouse: bookshelves, a reading chair and a warm lamp curled up inside. Ouro rests against it, as if he grew the house himself.',
  'ouro-native-apple-app-shell-dark': 'A glowing snail-shell house at night under a starry sky, its little rooms lit by lamps and lined with books, on a rock by a pond. Ouro curls up beside it, smiling.',
  'apple-distribution-kit': 'A market workbench of wrapped green parcels, a little conveyor carrying them off and a red wagon piled high, ready for the road. Ouro peers over a parcel, checking the bow.',
  'apple-distribution-kit-dark': 'A market workbench of wrapped green parcels at night, lit by hanging lanterns, a little conveyor carrying them off and a red wagon piled high, ready for the road. Ouro peers over a parcel, checking the bow.',
  'ouroboros-website': 'A rose-covered gateway with its wooden doors thrown open, a signpost pointing every which way, and a sunlit path winding off to a cottage on the far hill. Ouro sits by the gate.',
  airship: 'A glass-and-brass airship sails at sunrise above a sea of clouds and snowy peaks. At the bow, a faceless glass figure in a green scarf holds a spyglass at the hip and opens a mitten toward the horizon, Ouro, an emerald-glass snake, sitting on the rail beside them like a pet; Loop, a small jade-glass agent in goggles and a flying scarf, steers at the wheel, an amber agent in a red knit cap climbs the rigging, and a sea-blue agent in a leather apron kneels to turn a valve, tongue out in concentration.',
  'airship-dark': 'The same glass-and-brass airship at night, under a sky full of stars and a crescent moon, its envelope and lanterns glowing above the moonlit clouds: the glass figure at the bow with a spyglass at the hip opens a mitten toward the horizon, Ouro sits on the rail beside them, Loop steers at the wheel, an amber agent in a red knit cap climbs the rigging, and a sea-blue agent in a leather apron turns a valve.',
  workshop: 'On a wooden deck at dawn above a misty forest valley, a faceless glass figure with a green scarf and a mug presses a green button on a crate, as a small jade-glass agent, Loop, hands them a finished checklist tied with a green ribbon, and Ouro, an emerald-glass snake, sits coiled beside him.',
  'workshop-dark': 'The same wooden deck at night, under stars and a crescent moon above the misty forest valley, a lantern glowing on its post: a faceless glass figure with a green scarf and a mug presses a green button on a crate, as a small jade-glass agent, Loop, hands them a finished checklist tied with a green ribbon, and Ouro, an emerald-glass snake, sits coiled beside him.',
  'ouroboros-website-dark': 'A rose-covered gateway at night with its wooden doors thrown open, a lantern atop a signpost pointing every which way, and a lit path winding off to a cottage on the far hill. Ouro sits by the gate.',
  'ax-trail-map': 'A low wooden trail map stands in a dawn meadow, built at Ouro’s height, the trail it shows winding off through the meadow behind it. Ouro leans over the corner of the board and peers at the map with a pleased smile, finding his way.',
  'ax-trail-map-dark': 'The same trail map at night under a starry sky and a crescent moon, the trail it shows glowing as it winds off through the meadow, lighting Ouro’s face as he leans over the board and finds his way.',
  'glue-unstuck': 'Three little storybook places stand open in the meadow, a post office, a meeting hall and a workshop, with Ouro curled among them. On the right, a faceless glass person in a scarf leans back against a mossy rock with a mug of tea, done for the day.',
  'glue-unstuck-dark': 'The same meadow at night under a starry sky: the post office, the meeting hall and the workshop glow through their open doors, Ouro curls among them, and the glowing glass person rests against their rock with a steaming mug.',
}

// Each product's own scene. Every page of a product (the product page, its
// download page, any /<product>/* page) opens on it and sets its share card in
// it (Ari's ruling on taste review r19); tests/storybook.test.mjs checks.
export const productScenes = { '/desk': 'desk', '/ouro-md': 'ouro-md', '/butler': 'butler', '/housesitter': 'housesitter' }

// Route (no trailing slash; '/' for home) → scenes. `hero: null` means the page
// opens on its words, with the scene only on its share card.
const pages = {
  // The airship (.github#115): the person at the bow looks toward where
  // they're going while the agents crew the ship, and Ouro only once, as the
  // person's pet on the rail (Ari, 2026-11-15: "we need diversity of photos!!";
  // the workshop read too close to ui.ouroboros.bot's hero).
  '/': { hero: 'airship' },
  // Product pages (and /apps/) open on the content pages' shorter scene, so
  // the primary action (Download or Install) sits in the first view at
  // 1024x768 and up (Ari's ruling on taste review r20). The cast stays whole:
  // the box never shows less than the scene's floor (heroFrame()). `product`
  // lets the floor drop to PRODUCT_FLOOR where the cast allows it, so the
  // words open with real room under the hero's edge (Ari, 2026-11-09: the
  // Ouro MD header had "ZERO breathing room").
  '/apps': { hero: 'ouro-apps-site', content: true, product: true },
  '/approach': { hero: 'ouro-work' },
  // People and their robots on one blanket: the brief is how they get there.
  '/brief': { hero: 'friends' },
  '/desk': { hero: 'desk', content: true, product: true },
  '/ouro-md': { hero: 'ouro-md', content: true, product: true },
  // The download page (moved from ouro.bot/apps/ouro-md/, 2026-11-07) is Ouro
  // MD's front door from ouro.bot, so it opens on Ouro MD's own lectern, hero
  // and card alike (Ari's ruling on taste review r19). A product's pages share
  // its scene; the neighbour rule below stands everywhere else.
  '/ouro-md/download': { hero: 'ouro-md', content: true, product: true },
  '/butler': { hero: 'butler', content: true, product: true },
  '/housesitter': { hero: 'housesitter', content: true, product: true },
  '/blog': { hero: 'gatefold' },
  '/blog/trust-the-agent': { hero: 'playwright-focus-proof' },
  '/blog/take-the-agents-seat': { hero: 'ouro-ui-apple' },
  // The shell that grew into a home: the post about giving an agent one.
  '/blog/give-your-agent-a-home': { hero: 'ouro-native-apple-app-shell' },
  '/blog/what-is-agent-experience': { hero: 'ax-trail-map' },
  '/blog/designing-with-your-agent': { hero: 'ouro-workbench' },
  '/blog/stop-being-the-glue': { hero: 'glue-unstuck' },
  '/blog/build-ai-agent-from-scratch': { hero: 'agent-workbench' },
  // Each Lab page has its own corner of the world (taste reviews r2 and r3,
  // 2026-11-06), and no scene repeats between pages one click apart, a page and
  // its parent, or siblings; a page in the nav or the footer shares its scene
  // with no other page (tests/storybook.test.mjs checks all three).
  '/lab': { hero: 'ouroboros' },
  '/lab/why': { hero: 'friends' },
  '/lab/story': { hero: 'ouro-native-apple-app-shell' },
  '/lab/what-is-an-agent-harness': { hero: 'factory' },
  '/lab/how-desk-started': { hero: 'ouro-workbench' },
  '/lab/model-reviews': { hero: 'flow-review' },
  // Each reviewer researches in its own corner: the scroll stacks, the card
  // catalogue, the factory's gauges, the paint pots. Each share card is set in
  // its own page's scene, under its own model's name (taste review r7 ruling).
  '/lab/model-reviews/anthropic': { hero: 'ouroboros-skills' },
  '/lab/model-reviews/gemini': { hero: 'm365crawl' },
  '/lab/model-reviews/minimax': { hero: 'factory' },
  '/lab/model-reviews/openai': { hero: 'ouro-ui-core' },
  '/lab/docs': { hero: 'm365crawl' },
  '/lab/docs/getting-started': { hero: 'ouro-ui-apple' },
  '/lab/docs/bundles-and-psyche': { hero: 'ouro-workbench' },
  '/lab/docs/continuity-and-memory': { hero: 'friends-relay' },
  '/lab/docs/architecture': { hero: 'factory' },
  '/lab/docs/tasks-and-work': { hero: 'playwright-focus-proof' },
  '/lab/docs/skills-and-prompts': { hero: 'ouroboros-skills' },
  // The legal pages open on their own scene at the content pages' height
  // (`content`), under which the "Draft for review" badge stays (taste review
  // r3). A short band cut Ouro in half on a desktop (taste review r8).
  '/privacy': { hero: 'apple-distribution-kit', content: true },
  '/terms': { hero: 'shepherd', content: true },
  // Ouro has wandered off the trail; the footer meadow stays off so the gate shows once.
  '/404': { hero: 'ouroboros-website', meadow: false },
}

// The meadow at the foot of every other page: the site's own scene, the open gate.
export const meadowScene = 'ouroboros-website'

const routeOf = (pathname) => (pathname.replace(/\/+$/, '').replace(/\.html$/, '') || '/')

/** The scenes for a page, by its longest matching route (so /lab/docs/x/ inherits /lab/docs). */
export function sceneFor(pathname) {
  const route = routeOf(pathname)
  let match = null
  for (const key of Object.keys(pages)) {
    if (key === '/' ? route === '/' : route === key || route.startsWith(`${key}/`)) {
      if (!match || key.length > match.length) match = key
    }
  }
  const page = match ? pages[match] : { hero: null }
  const hero = page.hero ?? null
  return { hero, content: page.content === true, product: page.product === true, og: page.og ?? hero ?? meadowScene, meadow: page.meadow !== false }
}

/** The scene a route's share card is set in. */
export const ogSceneFor = (route) => sceneFor(route).og

// A scene with a night version: StoryScene shows it in the dark theme.
export const darkScenes = { 'agent-workbench': 'agent-workbench-dark', airship: 'airship-dark', 'ax-trail-map': 'ax-trail-map-dark', 'glue-unstuck': 'glue-unstuck-dark', 'apple-distribution-kit': 'apple-distribution-kit-dark', butler: 'butler-dark', desk: 'desk-dark', factory: 'factory-dark', 'flow-review': 'flow-review-dark', friends: 'friends-dark', 'friends-relay': 'friends-relay-dark', gatefold: 'gatefold-dark', housesitter: 'housesitter-dark', m365crawl: 'm365crawl-dark', 'ouro-apps-site': 'ouro-apps-site-dark', 'ouro-md': 'ouro-md-dark', 'ouro-native-apple-app-shell': 'ouro-native-apple-app-shell-dark', 'ouro-ui-apple': 'ouro-ui-apple-dark', 'ouro-ui-core': 'ouro-ui-core-dark', 'ouro-work': 'ouro-work-dark', 'ouro-workbench': 'ouro-workbench-dark', ouroboros: 'ouroboros-dark', 'ouroboros-skills': 'ouroboros-skills-dark', 'ouroboros-website': 'ouroboros-website-dark', ourostack: 'ourostack-dark', 'playwright-focus-proof': 'playwright-focus-proof-dark', shepherd: 'shepherd-dark', workshop: 'workshop-dark' }

// A hero that, from 1600px, sits in the content column below the page's words
// instead of full bleed (global.css, [data-hero-column]; Ari chose option A,
// 2026-11-12). Its art is the master upscaled and cropped to 2:1 for the column,
// in the widths below (public/images/guide-hero/<scene>-col-<width>, with its own
// provenance.json; not brand/, which mirrors ourostack/.github byte for byte), so
// the 72rem column is drawn from real pixels at 1x and 2x.
export const columnHeroWidths = [1152, 1728, 2304, 3072]
// sizes is --hero-width's 72rem in global.css: change both together.
export const columnHeroes = { 'agent-workbench': { sizes: '72rem' } }
export const columnHeroSrcset = (scene, ext) => columnHeroWidths.map((w) => `/images/guide-hero/${scene}-col-${w}.${ext} ${w}w`).join(', ')
export const COLUMN_HERO_MEDIA = '(min-width: 1600px)'

// The wide art past 1536px: ourostack/.github brand/ cuts it from each scene's
// 4x Real-ESRGAN master (brand/upscaled/), so a full-width scene on a 2x laptop
// or a 4K screen at 2x (7680 device pixels) is drawn from as many pixels as the
// screen has. WebP, for the few browsers without AVIF, stops at 3072: its 7680
// files are about 2MB each.
export const largeAvifWidths = [2304, 3072, 3840, 5120, 7680]
export const largeWebpWidths = [3072]
const base = '/brand/storybook'
/** The wide srcset of a scene: 640 to 7680 in AVIF, 640 to 3072 in WebP. */
export const wideSrcset = (scene, ext) => (ext === 'avif'
  ? [640, 960, 1536, ...largeAvifWidths].map((w) => `${base}/scenes/${scene}-${w}.avif ${w}w`)
  : [...[640, 960].map((w) => `${base}/scenes/${scene}-${w}.webp ${w}w`), `${base}/headers/${scene}.webp 1536w`,
      ...largeWebpWidths.map((w) => `${base}/scenes/${scene}-${w}.webp ${w}w`)]
).join(', ')

/** Every scene the site serves, for scripts/sync-storybook.mjs. */
export function usedScenes() {
  // The homepage's inline scene: the factory.
  const used = new Set([meadowScene, 'factory', 'ouroboros'])
  for (const page of Object.values(pages)) {
    if (page.hero) used.add(page.hero)
    if (page.og) used.add(page.og)
  }
  for (const scene of [...used]) if (darkScenes[scene]) used.add(darkScenes[scene])
  for (const scene of ['desk', 'ouro-md', 'ouro-hx', 'butler', 'housesitter']) used.add(scene)
  return [...used].sort()
}

// The phone crop's size (ourostack/.github brand/tools/crops.json phoneAspect):
// 4:3 by default; 16:9, 2:1, 7:5 or 12:5 where the characters stand too far apart for 4:3.
// The phone hero box takes the file's own aspect, so nothing is cropped again.
const phoneSizes = { 'glue-unstuck': [768, 288], 'glue-unstuck-dark': [768, 288], ourostack: [768, 384], 'ourostack-dark': [768, 384], 'ouro-hx': [768, 352], 'ouroboros-skills': [768, 320], 'ouroboros-skills-dark': [768, 320], 'playwright-focus-proof': [768, 320], 'playwright-focus-proof-dark': [768, 300], shepherd: [768, 320], 'shepherd-dark': [768, 320], 'ouro-ui-apple': [768, 432], 'ouro-ui-apple-dark': [768, 432], 'ouro-ui-core': [768, 549], 'ouro-ui-core-dark': [768, 549], 'flow-review': [768, 384], 'flow-review-dark': [768, 384], factory: [768, 384], 'factory-dark': [768, 384], friends: [768, 432], 'friends-dark': [768, 432], housesitter: [768, 432], 'housesitter-dark': [768, 432], workshop: [768, 461], 'workshop-dark': [768, 461] }
export const phoneSize = (scene) => phoneSizes[scene] ?? [768, 576]

// Where the characters stand in each scene's wide art, as [top, bottom]
// fractions of its height: the highest head (or the subject's roof or tower)
// and the lowest coil or paw worth keeping. Read by eye off a 10% grid
// (taste review r5, 2026-11-06: a capped desktop hero cut the robot's head off
// on two pages). heroFrame() turns it into the hero's crop.
export const heroFocus = {
  // Ouro's head down to the map board's posts.
  'ax-trail-map': [0.07, 0.88],
  'ax-trail-map-dark': [0.07, 0.88],
  // The post office's chimney down to the glass person's feet as they lean back with their tea.
  'glue-unstuck': [0.0, 0.88],
  'glue-unstuck-dark': [0.0, 0.88],
  'apple-distribution-kit': [0.13, 0.82],
  'apple-distribution-kit-dark': [0.13, 0.82],
  butler: [0.18, 0.84],
  'butler-dark': [0.18, 0.84],
  desk: [0.22, 0.88],
  'desk-dark': [0.22, 0.88],
  factory: [0.2, 0.94],
  'factory-dark': [0.2, 0.94],
  'flow-review': [0.18, 0.84],
  'flow-review-dark': [0.18, 0.84],
  friends: [0.2, 0.97],
  'friends-dark': [0.2, 0.97],
  'friends-relay': [0.04, 0.95],
  // Ouro's head down to the phone on the blanket.
  gatefold: [0.04, 0.93],
  'gatefold-dark': [0.04, 0.93],
  'agent-workbench': [0.056, 0.911],
  'agent-workbench-dark': [0.056, 0.911],
  'friends-relay-dark': [0.04, 0.95],
  'homebrew-tap': [0.06, 0.88],
  // The roof's arch over the door, down to Ouro's lowest coil.
  housesitter: [0.3, 0.99],
  'housesitter-dark': [0.3, 0.99],
  m365crawl: [0.02, 0.98],
  'm365crawl-dark': [0.02, 0.98],
  'ouro-apps-site': [0.05, 0.9],
  'ouro-apps-site-dark': [0.05, 0.9],
  'ouro-hx': [0.12, 0.93],
  'ouro-md': [0.2, 0.86],
  'ouro-md-dark': [0.2, 0.86],
  'ouro-native-apple-app-shell': [0.1, 0.8],
  'ouro-native-apple-app-shell-dark': [0.07, 0.9],
  'ouro-ui-apple': [0.05, 0.91],
  'ouro-ui-apple-dark': [0.05, 0.91],
  'ouro-ui-core': [0.18, 0.88],
  'ouro-ui-core-dark': [0.18, 0.88],
  'ouro-work': [0.2, 0.88],
  'ouro-work-dark': [0.2, 0.88],
  'ouro-workbench': [0.28, 0.86],
  'ouro-workbench-dark': [0.2, 0.88],
  'ouroboros-skills': [0.06, 0.955],
  'ouroboros-skills-dark': [0.06, 0.955],
  'ouroboros-website': [0.24, 0.92],
  'ouroboros-website-dark': [0.24, 0.92],
  ouroboros: [0.12, 0.95],
  'ouroboros-dark': [0.12, 0.95],
  ourostack: [0.15, 0.85],
  'ourostack-dark': [0.15, 0.85],
  'playwright-focus-proof': [0.13, 0.97],
  'playwright-focus-proof-dark': [0.05, 0.985],
  shepherd: [0.12, 0.96],
  'shepherd-dark': [0.12, 0.96],
  // The rigger's knit cap, down to the kneeling engineer's foot.
  airship: [0.06, 0.9],
  'airship-dark': [0.06, 0.9],
  // Loop's antenna, down to the glass figure's feet.
  workshop: [0.012, 0.955],
  'workshop-dark': [0.012, 0.955],
}

// The lowest point of any character's body in each scene's wide art (Ouro's
// lowest coil, a robot's shoe, a sheep's hooves, a person's sneaker), as a
// fraction of its height, read by eye off a 1% grid of the art's foot. Every
// character counts, not only Ouro (taste review r11, 2026-11-06: round 10 had
// counted the picnic robots' seats, not their feet). The hero's crop keeps it
// inside the box (heroFrame()), so nobody is cut at the hero's foot. Props and
// ground below it may be cropped. A scene missing here uses its heroFocus
// bottom.
export const castFoot = {
  'ax-trail-map': 0.86,
  'ax-trail-map-dark': 0.86,
  // The man's striped sock; the stuck shoe sits lower, inside heroFocus.
  'glue-unstuck': 0.83,
  'glue-unstuck-dark': 0.83,
  'apple-distribution-kit': 0.64,
  'apple-distribution-kit-dark': 0.64,
  butler: 0.82,
  'butler-dark': 0.82,
  desk: 0.85,
  'desk-dark': 0.85,
  factory: 0.935,
  'factory-dark': 0.935,
  'flow-review': 0.83,
  'flow-review-dark': 0.83,
  // The robots' shoes rest on the blanket's front edge.
  friends: 0.97,
  'friends-dark': 0.97,
  'friends-relay': 0.95,
  gatefold: 0.81,
  'gatefold-dark': 0.81,
  'agent-workbench': 0.911,
  'agent-workbench-dark': 0.911,
  'friends-relay-dark': 0.95,
  'homebrew-tap': 0.87,
  // Ouro's coil rests on the art's foot.
  housesitter: 0.985,
  'housesitter-dark': 0.985,
  m365crawl: 0.98,
  'm365crawl-dark': 0.98,
  'ouro-apps-site': 0.87,
  'ouro-apps-site-dark': 0.87,
  'ouro-hx': 0.925,
  'ouro-md': 0.85,
  'ouro-md-dark': 0.85,
  'ouro-native-apple-app-shell': 0.72,
  'ouro-native-apple-app-shell-dark': 0.845,
  'ouro-ui-apple': 0.905,
  'ouro-ui-apple-dark': 0.905,
  'ouro-ui-core': 0.84,
  'ouro-ui-core-dark': 0.84,
  'ouro-work': 0.85,
  'ouro-work-dark': 0.85,
  'ouro-workbench': 0.76,
  'ouro-workbench-dark': 0.77,
  // The robot's feet, not Ouro's coil.
  'ouroboros-skills': 0.955,
  'ouroboros-skills-dark': 0.955,
  'ouroboros-website': 0.89,
  'ouroboros-website-dark': 0.89,
  ouroboros: 0.945,
  'ouroboros-dark': 0.945,
  ourostack: 0.83,
  'ourostack-dark': 0.83,
  // The person's sneakers under the armchair.
  'playwright-focus-proof': 0.97,
  'playwright-focus-proof-dark': 0.985,
  // The big sheep's hooves at the right.
  shepherd: 0.935,
  'shepherd-dark': 0.935,
  // The kneeling engineer's foot; the glass figure's feet stand higher.
  airship: 0.9,
  'airship-dark': 0.9,
  // The glass figure's feet; Loop and Ouro stand higher, on the crate.
  workshop: 0.955,
  'workshop-dark': 0.955,
}

// Where the cast stands across each scene's phone crop (brand/phone/<scene>-768),
// as [left, right] fractions of the crop's width: the leftmost and rightmost
// point of any character (Ouro, a person, a robot, a sheep, a dove), not props.
// Read by eye off a 1% grid of each crop's outer tenth (taste review r13,
// 2026-11-06: Ouro touched the right edge of the factory's phone hero). The
// phone hero shows the crop at the full viewport width, so a character within
// PHONE_EDGE px of either side at 320, 390 or 430 fails tests/hero-crop.test.mjs
// and scripts/hero-joins.mjs.
export const PHONE_EDGE = 16
export const phoneCastX = {
  'ax-trail-map': [0.52, 0.935],
  'ax-trail-map-dark': [0.52, 0.935],
  // People and Ouro only: Ouro's coil at the left, the man's hair at the right; the places are props.
  'glue-unstuck': [0.47, 0.896],
  'glue-unstuck-dark': [0.47, 0.896],
  'apple-distribution-kit': [0.40, 0.82],
  'apple-distribution-kit-dark': [0.40, 0.82],
  // Ouro's body; the cloche he holds out reaches 0.955.
  butler: [0.43, 0.90],
  'butler-dark': [0.43, 0.90],
  desk: [0.48, 0.89],
  'desk-dark': [0.48, 0.89],
  // .github#14 moved this crop's centre to 850 (r14).
  factory: [0.65, 0.92],
  'factory-dark': [0.65, 0.92],
  // .github#15: 2:1, centre 952.
  'flow-review': [0.099, 0.901],
  'flow-review-dark': [0.099, 0.901],
  friends: [0.098, 0.906],
  'friends-dark': [0.098, 0.906],
  // The big dove at the left, Ouro's coil at the right (v4 master).
  'friends-relay': [0.06, 0.86],
  gatefold: [0.378, 0.918],
  'gatefold-dark': [0.378, 0.918],
  'agent-workbench': [0.068, 0.934],
  'agent-workbench-dark': [0.068, 0.934],
  'friends-relay-dark': [0.06, 0.86],
  'homebrew-tap': [0.38, 0.88],
  // The robots in the window at the left, Ouro's body at the right.
  housesitter: [0.19, 0.905],
  'housesitter-dark': [0.19, 0.905],
  m365crawl: [0.365, 0.885],
  'm365crawl-dark': [0.365, 0.885],
  'ouro-apps-site': [0.43, 0.88],
  'ouro-apps-site-dark': [0.43, 0.88],
  // .github#15: centre 780.
  'ouro-hx': [0.063, 0.936],
  'ouro-md': [0.47, 0.87],
  'ouro-md-dark': [0.47, 0.87],
  'ouro-native-apple-app-shell': [0.5, 0.885],
  'ouro-native-apple-app-shell-dark': [0.469, 0.924],
  // .github#15: centre 840.
  'ouro-ui-apple': [0.21, 0.931],
  'ouro-ui-apple-dark': [0.21, 0.931],
  'ouro-ui-core': [0.4, 0.88],
  'ouro-ui-core-dark': [0.4, 0.88],
  'ouro-work': [0.42, 0.88],
  'ouro-work-dark': [0.42, 0.88],
  'ouro-workbench': [0.55, 0.86],
  'ouro-workbench-dark': [0.51, 0.875],
  ouroboros: [0.49, 0.88],
  'ouroboros-dark': [0.49, 0.88],
  // The reading robot at the left, the robot taking the scroll at the right.
  // Phone crop box [120, 0, 1502, 576] of the 1536 header.
  'ouroboros-skills': [0.067, 0.933],
  'ouroboros-skills-dark': [0.067, 0.933],
  'ouroboros-website': [0.43, 0.88],
  'ouroboros-website-dark': [0.43, 0.88],
  // Ouro at the left, the waving robot's hand at the right.
  ourostack: [0.069, 0.94],
  'ourostack-dark': [0.069, 0.94],
  // The person in the armchair at the left, Ouro at the right.
  'playwright-focus-proof': [0.09, 0.923],
  'playwright-focus-proof-dark': [0.054, 0.94],
  // The sheep by the gate at the left, the big sheep at the right.
  // .github#16: 12:5 at centre 845, against the art's right edge.
  shepherd: [0.06, 0.91],
  'shepherd-dark': [0.06, 0.91],
  // The kneeling engineer at the left, the person's open mitten at the right.
  // .github#115: 4:3 at centre 680, box [338, 0, 1021, 512].
  airship: [0.075, 0.87],
  'airship-dark': [0.075, 0.87],
  // The glass figure's elbow at the left, the tip of Ouro's tail at the right.
  // .github#92: 5:3 at centre 768, box [341, 0, 1195, 512].
  workshop: [0.14, 0.855],
  'workshop-dark': [0.14, 0.855],
}
// Named exemptions: a character the canonical art itself cuts at its own edge.
// The crop already stands against the header's edge there, so no crop centre
// can show more (accepted by the brand coordinator, r14). These are reported,
// not failed, and only for the side named.
export const phoneArtEdge = {
  ourostack: { side: 'right', reason: 'the sheep by the fence: the phone crop is clamped to the art\'s own right edge, where the art cuts it' },
}

// Breathing room kept above and below the cast, so the slow drift (a 2% zoom)
// never pushes a head out of the frame.
const FOCUS_MARGIN = 0.06

// The least share of the art's height any desktop hero shows, whatever its
// cast: a hero never crops more than 18% of the scene away (taste review r8:
// short heroes cut Ouro's body off; tests/hero-crop.test.mjs holds every page
// to 20% at 1024, 1440 and 1920).
export const HERO_FLOOR = 0.82
// A product page's hero (sceneFor().product) may show as little as 76% of its
// art, where its cast fits (heroFrame()'s `need`): the room it gives back
// goes under the hero's edge, so the product's mark and name never sit
// against it while its primary action stays in the first view
// (scripts/primary-action.mjs). The cast stays whole; only sky and meadow go.
export const PRODUCT_FLOOR = 0.76

// Every hero ends on a hard edge: the picture runs to the box's foot and
// stops there, with no fade, and the site's hairline closes it (global.css).
// The cast stays whole: its lowest point (castFoot) sits FOOT_ROOM clear of
// the box's foot at every desktop width, or, where the cast stands on the
// art's very foot, the box shows the art's own foot (y = 100%), so nothing is
// cut but the art's own edge. FOOT_ROOM keeps the feet clear of the edge in
// the shortest desktop hero (about 315px at 1024). Where the art's own foot
// leaves less room than that, the box shows that foot (`trailBelow`), and the
// words below get a little more room. Ari's rulings: no hero box
// ever runs past its art (taste review r15, 2026-11-07), and no picture fades
// into the page (2026-11-08).
export const FOOT_ROOM = 0.045
// The drift (global.css story-drift) zooms 2% about the box's foot, so it
// never carries a foot out of the box, and lifts a head at most 2% of the box:
// inside the 3% heroFrame() keeps above the cast.
export const DRIFT = 1.02

/** Where a point of the art (a fraction of its height) lands in the image at this share and crop. */
export const inBox = (at, share, y) => (at - y * (1 - share)) / share

/**
 * Where the cast's foot lands in the hero box, as a fraction of the box.
 * `share` is the image's height over the art's own height at this width. The
 * drift zooms about the box's foot, so it only lifts the foot.
 */
export function footInHero(scene, { share, y }) {
  return inBox(castFoot[scene] ?? heroFocus[scene]?.[1] ?? 0.88, share, y)
}

const shares = (floor) => Array.from({ length: 41 }, (_, i) => floor + ((1 - floor) * i) / 40)

/**
 * The desktop hero's crop for a scene. `need` is the least share of the art's
 * height the box may show (the cast plus margin): the hero's height cap never
 * goes below it, at any width. `floor` is the share global.css actually holds
 * the box to: `need`, but never under HERO_FLOOR. `y` is the object-position
 * that, at that least share or any taller one, keeps the cast's head
 * FOCUS_MARGIN / 2 clear of the top and its foot FOOT_ROOM clear of the
 * bottom; where no crop can, it is 100% (the art's own foot) and the box is
 * tall enough for the heads. `trailBelow` is set where that foot leaves the
 * feet less than FOOT_ROOM, so the words below get a little more room.
 */
export function heroFrame(scene, { product = false } = {}) {
  const [top, bottom] = heroFocus[scene] ?? [0.2, 0.88]
  const foot = castFoot[scene] ?? bottom
  const need = Math.min(1, bottom - top + FOCUS_MARGIN)
  const headClear = (floor) => Math.min(1, Math.max(0, (top - FOCUS_MARGIN / 2) / (1 - floor)))
  const footClear = (floor, y) => Math.max(...shares(floor).map((s) => inBox(foot, s, y))) <= 1 - FOOT_ROOM
  const floor0 = Math.max(need, product ? PRODUCT_FLOOR : HERO_FLOOR)
  // The art's own foot, with the box tall enough for the heads.
  const edge = { floor: Math.min(1, Math.max(floor0, 1 - (top - FOCUS_MARGIN / 2))), y: 1 }
  // The crop with the cast's head just clear of the top at `need`; if the foot
  // sits too low, the crop that shows the most of the art's foot while keeping
  // the head clear, then a taller box, as long as that box is no taller than
  // the art's own foot needs.
  let floor = floor0
  let y = need >= 1 ? 0.5 : headClear(need)
  while (!footClear(floor, y) && floor < edge.floor) {
    y = headClear(floor)
    if (!footClear(floor, y)) floor = Math.min(1, +(floor + 0.01).toFixed(3))
  }
  if (!footClear(floor, y)) ({ floor, y } = edge)
  return { need: +need.toFixed(3), floor: +floor.toFixed(3), y: +(y * 100).toFixed(1), foot, trailBelow: y === 1 && 1 - foot < FOOT_ROOM }
}

/** The width:height of a scene's wide art. The whole-world panorama, the workshop and the airship are 3:1, the dovecote is a touch taller (1536x614), the rest are 8:3. */
export const sceneRatio = (scene) => (['ourostack', 'ourostack-dark', 'workshop', 'workshop-dark', 'airship', 'airship-dark'].includes(scene) ? [1536, 512] : scene === 'friends-relay' || scene === 'friends-relay-dark' ? [1536, 614] : [1536, 576])

// A thumbnail in a list shows every scene at one aspect, THUMB_ASPECT (Ari's
// ruling on taste review r18, 2026-11-07: the blog index's vignettes came in
// three aspects, 88x66, 88x50 and 88x37 at 390, and the column looked
// ragged). The phone crop fills it (object-fit: cover), and thumbPosition()
// keeps the cast in frame: across, centred on the cast (phoneCastX); down,
// with the lowest foot (castFoot) just inside the bottom edge, since the sky
// above the heads is what a 4:3 crop gives up. The bytes stay canonical.
export const THUMB_ASPECT = 16 / 9
export function thumbPosition(scene, aspect = THUMB_ASPECT) {
  const [pw, ph] = phoneSize(scene)
  const ar = pw / ph
  const clamp = (v) => Math.min(100, Math.max(0, v))
  let x = 50
  let y = 50
  if (ar > aspect) {
    // Wider than the box: part of the width shows; centre the cast in it.
    const shown = aspect / ar
    const [l, r] = phoneCastX[scene] ?? [0.3, 0.7]
    x = clamp((((l + r) / 2 - shown / 2) / (1 - shown)) * 100)
  } else if (ar < aspect) {
    // Taller than the box: part of the height shows; keep the feet in it.
    const shown = ar / aspect
    const foot = castFoot[scene] ?? (heroFocus[scene] ?? [0.2, 0.9])[1]
    y = clamp(((foot + 0.02 - shown) / (1 - shown)) * 100)
  }
  return `${x.toFixed(1)}% ${y.toFixed(1)}%`
}
