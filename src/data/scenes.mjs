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
  ourostack: 'Dawn over misty hills. Ouro, a round green snake, sits on a glowing trail that loops past the whole crew: a little factory puffing smoke, a desk under a blossom tree, a lectern, a control panel, a silver cloche, a flock of sheep, and two people and their robots waving from a picnic blanket.',
  'ouro-apps-site': 'A market stall with a green-striped awning, stacked with wrapped gifts, one box open and glowing. Ouro leans in beside it like a shopkeeper who has been up since dawn.',
  desk: 'A wooden desk on a hilltop meadow at sunrise, with a lamp, a tidy stack of folders and a potted plant. Ouro sits beside it, and the glowing trail winds off to more desks in the distance.',
  'ouro-md': 'A reading lectern holding a fresh page, a lamp and a cup of tea on a stool, and loose pages drifting in the breeze. Ouro peeks over the lectern to read along.',
  'ouro-hx': 'A woman and a little robot fit chunky green controls into a big panel on a workbench in the meadow, while Ouro watches from the trail.',
  butler: 'A stone cottage with a server cabinet blinking green in its doorway, a watering can and a flower path. Ouro waits by the step holding a silver cloche, ready to serve.',
  housesitter: 'A round-doored cottage at sunrise, two little robots working at a laptop in its lit window. By the door a small grey box with an amber eye keeps watch, the house key hanging from it on a red ribbon, and Ouro curls on the doorstep, wide awake.',
  ouroboros: 'A round-doored burrow in a grassy hill, with a mailbox, an old telephone and letters and speech bubbles fluttering home. Ouro sits out front, the glowing trail looping past the door.',
  shepherd: 'Ouro stands tall by a shepherd’s crook and a wooden gate while a line of robot-eyed sheep trots along the glowing trail.',
  friends: 'Two people and two robots wave from a picnic blanket, with Ouro curled up in the middle of them and paper notes floating between far-off picnics.',
  'friends-relay': 'A stone dovecote tower where white doves carry letters across the hills, a robot waving at each end, and Ouro in a postman’s cap at the foot of the tower.',
  factory: 'A cream-coloured factory with glowing windows and a conveyor of parcels, a big gauge and a bar chart on an easel. Ouro sits by the chart, checking the numbers.',
  'ouro-work': 'A stone cottage with a row of wooden mailboxes and a round vault door. Ouro, wearing a lanyard, carries an envelope up the trail.',
  'ouroboros-skills': 'A bookcase of rolled scrolls under a vine. One robot reads at a little desk while Ouro hands another robot a scroll.',
  'flow-review': 'A row of little paintings on easels along the trail. A robot with a clipboard takes notes while Ouro, in round spectacles, inspects one through a magnifying glass.',
  gatefold: 'A giant open storybook on a picnic blanket, with stacked books, a mug of coffee and a small notebook. Ouro rests beside it, mid-chapter.',
  'playwright-focus-proof': 'A person relaxes in an armchair with a laptop and a cup of tea while two little robots work at their own table beside a tall clock, and Ouro keeps an eye on the trail.',
  'ouro-ui-apple': 'A robot sits at a wooden bench with a phone, a tablet and a laptop, each showing a green toggle. Ouro watches from the meadow.',
  'ouro-ui-core': 'Paint pots on a bench pour ribbons of green and cream into a phone, a laptop and a tablet below. Ouro looks on, pleased with the colours.',
  'ouro-workbench': 'A covered workbench with a pegboard of tools and a row of little monitors. Ouro curls up on a cushion underneath, off the clock.',
  'agent-workbench': 'A wooden workbench in the meadow, spread with blueprints, gears, a spool and an oil can, where a little brass robot with a glass-dome head and a keyboard on its chest is wired to a glowing loop. Ouro curls up beside it, smiling at the new helper.',
  'agent-workbench-dark': 'A wooden workbench at night under a starry sky, spread with blueprints, gears and an oil can, where a little brass robot with a glass-dome head and a keyboard on its chest is wired to a loop that glows in the dark. Ouro curls up beside it, smiling.',
  'homebrew-tap': 'A copper still and a wooden barrel on a stone hearth, a tap pouring into a mug, and crates of green bottles. Ouro waits by the barrel for the first cup.',
  m365crawl: 'A library nook of crammed bookshelves and a rolling ladder beside a tall card-catalogue cabinet, one drawer pulled out and glowing with filed letters. Ouro peeks round the cabinet, ready to fetch the one you need.',
  'ouro-native-apple-app-shell': 'A pearly snail shell on a mossy rock by a pond, opened up like a dollhouse: bookshelves, a reading chair and a warm lamp curled up inside. Ouro rests against it, as if he grew the house himself.',
  'apple-distribution-kit': 'A market workbench of wrapped green parcels, a little conveyor carrying them off and a red wagon piled high, ready for the road. Ouro peers over a parcel, checking the bow.',
  'ouroboros-website': 'A rose-covered gateway with its wooden doors thrown open, a signpost pointing every which way, and the glowing trail winding off to a cottage on the far hill. Ouro sits by the gate.',
}

// Each product's own scene. Every page of a product (the product page, its
// download page, any /<product>/* page) opens on it and sets its share card in
// it (Ari's ruling on taste review r19); tests/storybook.test.mjs checks.
export const productScenes = { '/desk': 'desk', '/ouro-md': 'ouro-md', '/butler': 'butler', '/housesitter': 'housesitter' }

// Route (no trailing slash; '/' for home) → scenes. `hero: null` means the page
// opens on its words, with the scene only on its share card.
const pages = {
  '/': { hero: 'ourostack' },
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
  '/blog/what-is-agent-experience': { hero: 'ouro-ui-core' },
  '/blog/designing-with-your-agent': { hero: 'ouro-workbench' },
  '/blog/stop-being-the-glue': { hero: 'friends-relay' },
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

// The character beside each tool on the homepage, so the world carries on below the panorama.
export const homeTools = { desk: 'desk', 'ouro-md': 'ouro-md', 'ouro-ui': 'ouro-ui-core', m365crawl: 'm365crawl', spoonjoy: 'homebrew-tap' }

// A scene with a night version: StoryScene shows it in the dark theme.
export const darkScenes = { 'agent-workbench': 'agent-workbench-dark' }

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
  // The homepage's grown-inside rows and the factory, then the character beside each tool (homeTools).
  const used = new Set([meadowScene, 'friends', 'shepherd', 'factory', 'ouroboros', ...Object.values(homeTools)])
  for (const page of Object.values(pages)) {
    if (page.hero) used.add(page.hero)
    if (page.og) used.add(page.og)
  }
  for (const scene of [...used]) if (darkScenes[scene]) used.add(darkScenes[scene])
  for (const scene of ['desk', 'ouro-md', 'ouro-hx', 'butler', 'housesitter']) used.add(scene)
  return [...used].sort()
}

// The phone crop's size (ourostack/.github brand/tools/crops.json phoneAspect):
// 4:3 by default; 16:9, 2:1 or 12:5 where the characters stand too far apart for 4:3.
// The phone hero box takes the file's own aspect, so nothing is cropped again.
const phoneSizes = { ourostack: [768, 384], 'ouro-hx': [768, 432], 'ouroboros-skills': [768, 320], 'playwright-focus-proof': [768, 320], shepherd: [768, 320], 'ouro-ui-apple': [768, 432], 'flow-review': [768, 384], factory: [768, 384], friends: [768, 432], housesitter: [768, 432] }
export const phoneSize = (scene) => phoneSizes[scene] ?? [768, 576]

// Where the characters stand in each scene's wide art, as [top, bottom]
// fractions of its height: the highest head (or the subject's roof or tower)
// and the lowest coil or paw worth keeping. Read by eye off a 10% grid
// (taste review r5, 2026-11-06: a capped desktop hero cut the robot's head off
// on two pages). heroFrame() turns it into the hero's crop.
export const heroFocus = {
  'apple-distribution-kit': [0.13, 0.82],
  butler: [0.18, 0.84],
  desk: [0.22, 0.88],
  factory: [0.2, 0.94],
  'flow-review': [0.18, 0.84],
  friends: [0.2, 0.97],
  'friends-relay': [0.05, 0.95],
  gatefold: [0.15, 0.88],
  'agent-workbench': [0.056, 0.911],
  'agent-workbench-dark': [0.056, 0.911],
  'homebrew-tap': [0.06, 0.88],
  // The roof's arch over the door, down to Ouro's lowest coil.
  housesitter: [0.3, 0.99],
  m365crawl: [0.02, 0.98],
  'ouro-apps-site': [0.05, 0.9],
  'ouro-hx': [0.12, 0.93],
  'ouro-md': [0.2, 0.86],
  'ouro-native-apple-app-shell': [0.1, 0.8],
  'ouro-ui-apple': [0.05, 0.91],
  'ouro-ui-core': [0.18, 0.88],
  'ouro-work': [0.2, 0.88],
  'ouro-workbench': [0.28, 0.86],
  'ouroboros-skills': [0.06, 0.955],
  'ouroboros-website': [0.24, 0.92],
  ouroboros: [0.12, 0.95],
  ourostack: [0.15, 0.85],
  'playwright-focus-proof': [0.13, 0.97],
  shepherd: [0.12, 0.96],
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
  'apple-distribution-kit': 0.64,
  butler: 0.82,
  desk: 0.85,
  factory: 0.935,
  'flow-review': 0.83,
  // The robots' shoes rest on the blanket's front edge.
  friends: 0.97,
  'friends-relay': 0.95,
  gatefold: 0.8,
  'agent-workbench': 0.911,
  'agent-workbench-dark': 0.911,
  'homebrew-tap': 0.87,
  // Ouro's coil rests on the art's foot.
  housesitter: 0.985,
  m365crawl: 0.98,
  'ouro-apps-site': 0.87,
  'ouro-hx': 0.925,
  'ouro-md': 0.85,
  'ouro-native-apple-app-shell': 0.72,
  'ouro-ui-apple': 0.905,
  'ouro-ui-core': 0.84,
  'ouro-work': 0.85,
  'ouro-workbench': 0.76,
  // The robot's feet, not Ouro's coil.
  'ouroboros-skills': 0.955,
  'ouroboros-website': 0.89,
  ouroboros: 0.945,
  ourostack: 0.83,
  // The person's sneakers under the armchair.
  'playwright-focus-proof': 0.97,
  // The big sheep's hooves at the right.
  shepherd: 0.935,
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
  'apple-distribution-kit': [0.40, 0.82],
  // Ouro's body; the cloche he holds out reaches 0.955.
  butler: [0.43, 0.90],
  desk: [0.48, 0.89],
  // .github#14 moved this crop's centre to 850 (r14).
  factory: [0.65, 0.92],
  // .github#15: 2:1, centre 952.
  'flow-review': [0.099, 0.901],
  friends: [0.098, 0.906],
  // The dove at the left (.github#15: centre 705).
  'friends-relay': [0.063, 0.89],
  gatefold: [0.42, 0.88],
  'agent-workbench': [0.068, 0.934],
  'agent-workbench-dark': [0.068, 0.934],
  'homebrew-tap': [0.38, 0.88],
  // The robots in the window at the left, Ouro's body at the right.
  housesitter: [0.19, 0.905],
  m365crawl: [0.365, 0.885],
  'ouro-apps-site': [0.43, 0.88],
  // .github#15: centre 780.
  'ouro-hx': [0.063, 0.936],
  'ouro-md': [0.47, 0.87],
  'ouro-native-apple-app-shell': [0.5, 0.885],
  // .github#15: centre 840.
  'ouro-ui-apple': [0.21, 0.931],
  'ouro-ui-core': [0.4, 0.88],
  'ouro-work': [0.42, 0.88],
  'ouro-workbench': [0.55, 0.86],
  ouroboros: [0.49, 0.88],
  // The reading robot at the left, the robot taking the scroll at the right.
  // Phone crop box [120, 0, 1502, 576] of the 1536 header.
  'ouroboros-skills': [0.067, 0.933],
  'ouroboros-website': [0.43, 0.88],
  // Ouro at the left, the waving robot's hand at the right.
  ourostack: [0.069, 0.94],
  // The person in the armchair at the left, Ouro at the right.
  'playwright-focus-proof': [0.09, 0.923],
  // The sheep by the gate at the left, the big sheep at the right.
  // .github#16: 12:5 at centre 845, against the art's right edge.
  shepherd: [0.06, 0.91],
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
// against the trail while its primary action stays in the first view
// (scripts/primary-action.mjs). The cast stays whole; only sky and meadow go.
export const PRODUCT_FLOOR = 0.76

// Every hero ends on a hard edge: the picture runs to the box's foot and
// stops there, with no fade, and the site's gold trail closes it (global.css).
// The cast stays whole: its lowest point (castFoot) sits FOOT_ROOM clear of
// the box's foot at every desktop width, or, where the cast stands on the
// art's very foot, the box shows the art's own foot (y = 100%), so nothing is
// cut but the art's own edge. The trail sits centred on the edge, and its
// glow and fireflies reach about 11px above it: FOOT_ROOM keeps the feet
// above that in the shortest desktop hero (about 315px at 1024). Where the
// art's own foot leaves less room than that, the trail hangs below the edge
// instead (`trailBelow`), never across the feet. Ari's rulings: no hero box
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
 * feet less than FOOT_ROOM, so the trail hangs below the edge.
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

/** The width:height of a scene's wide art. The whole-world panorama is 3:1, the dovecote is a touch taller (1536x614), the rest are 8:3. */
export const sceneRatio = (scene) => (scene === 'ourostack' ? [1536, 512] : scene === 'friends-relay' ? [1536, 614] : [1536, 576])

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
