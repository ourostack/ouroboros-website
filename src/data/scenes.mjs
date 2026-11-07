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
  'homebrew-tap': 'A copper still and a wooden barrel on a stone hearth, a tap pouring into a mug, and crates of green bottles. Ouro waits by the barrel for the first cup.',
  m365crawl: 'A library nook of crammed bookshelves and a rolling ladder beside a tall card-catalogue cabinet, one drawer pulled out and glowing with filed letters. Ouro peeks round the cabinet, ready to fetch the one you need.',
  'ouro-native-apple-app-shell': 'A pearly snail shell on a mossy rock by a pond, opened up like a dollhouse: bookshelves, a reading chair and a warm lamp curled up inside. Ouro rests against it, as if he grew the house himself.',
  'apple-distribution-kit': 'A market workbench of wrapped green parcels, a little conveyor carrying them off and a red wagon piled high, ready for the road. Ouro peers over a parcel, checking the bow.',
  'ouroboros-website': 'A rose-covered gateway with its wooden doors thrown open, a signpost pointing every which way, and the glowing trail winding off to a cottage on the far hill. Ouro sits by the gate.',
}

// Route (no trailing slash; '/' for home) → scenes. `hero: null` means the page
// opens on its words, with the scene only on its share card.
const pages = {
  '/': { hero: 'ourostack' },
  '/apps': { hero: 'ouro-apps-site' },
  '/approach': { hero: 'ouro-work' },
  // People and their robots on one blanket: the brief is how they get there.
  '/brief': { hero: 'friends' },
  '/desk': { hero: 'desk' },
  '/ouro-md': { hero: 'ouro-md' },
  '/ouro-hx': { hero: 'ouro-hx' },
  '/butler': { hero: 'butler' },
  '/blog': { hero: 'gatefold' },
  '/blog/trust-the-agent': { hero: 'playwright-focus-proof' },
  '/blog/take-the-agents-seat': { hero: 'ouro-ui-apple' },
  // The shell that grew into a home: the post about giving an agent one.
  '/blog/give-your-agent-a-home': { hero: 'ouro-native-apple-app-shell' },
  '/blog/what-is-agent-experience': { hero: 'ouro-ui-core' },
  '/blog/designing-with-your-agent': { hero: 'ouro-workbench' },
  '/blog/stop-being-the-glue': { hero: 'friends-relay' },
  '/blog/build-ai-agent-from-scratch': { hero: 'homebrew-tap' },
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
  return { hero, content: page.content === true, og: page.og ?? hero ?? meadowScene, meadow: page.meadow !== false }
}

/** The scene a route's share card is set in. */
export const ogSceneFor = (route) => sceneFor(route).og

// The character beside each tool on the homepage, so the world carries on below the panorama.
export const homeTools = { desk: 'desk', 'ouro-md': 'ouro-md', 'ouro-ui': 'ouro-ui-core', m365crawl: 'm365crawl', spoonjoy: 'homebrew-tap' }

/** Every scene the site serves, for scripts/sync-storybook.mjs. */
export function usedScenes() {
  // The homepage's grown-inside rows and the factory, then the character beside each tool (homeTools).
  const used = new Set([meadowScene, 'friends', 'shepherd', 'factory', 'ouroboros', ...Object.values(homeTools)])
  for (const page of Object.values(pages)) {
    if (page.hero) used.add(page.hero)
    if (page.og) used.add(page.og)
  }
  for (const scene of ['desk', 'ouro-md', 'ouro-hx', 'butler']) used.add(scene)
  return [...used].sort()
}

// The phone crop's size (ourostack/.github brand/tools/crops.json phoneAspect):
// 4:3 by default; 16:9, 2:1 or 12:5 where the characters stand too far apart for 4:3.
// The phone hero box takes the file's own aspect, so nothing is cropped again.
const phoneSizes = { ourostack: [768, 384], 'ouro-hx': [768, 432], 'ouroboros-skills': [768, 384], 'playwright-focus-proof': [768, 320], shepherd: [768, 384], 'ouro-ui-apple': [768, 432], 'flow-review': [768, 432], factory: [768, 384], friends: [768, 432] }
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
  factory: [0.2, 0.92],
  'flow-review': [0.18, 0.84],
  friends: [0.2, 0.97],
  'friends-relay': [0.05, 0.92],
  gatefold: [0.15, 0.88],
  'homebrew-tap': [0.06, 0.88],
  m365crawl: [0.22, 0.92],
  'ouro-apps-site': [0.05, 0.9],
  'ouro-hx': [0.1, 0.86],
  'ouro-md': [0.2, 0.86],
  'ouro-native-apple-app-shell': [0.1, 0.8],
  'ouro-ui-apple': [0.05, 0.9],
  'ouro-ui-core': [0.18, 0.88],
  'ouro-work': [0.2, 0.88],
  'ouro-workbench': [0.28, 0.86],
  'ouroboros-skills': [0.05, 0.92],
  'ouroboros-website': [0.24, 0.92],
  ouroboros: [0.12, 0.9],
  ourostack: [0.15, 0.85],
  'playwright-focus-proof': [0.13, 0.97],
  shepherd: [0.12, 0.96],
}

// Breathing room kept above and below the cast, so the slow drift (a 3% zoom)
// never pushes a head out of the frame.
const FOCUS_MARGIN = 0.06

// The least share of the art's height any desktop hero shows, whatever its
// cast: a hero never crops more than 18% of the scene away (taste review r8:
// short heroes cut Ouro's body off; tests/hero-crop.test.mjs holds every page
// to 20% at 1024, 1440 and 1920).
export const HERO_FLOOR = 0.82

/**
 * The desktop hero's crop for a scene. `need` is the least share of the art's
 * height the box may show (the cast plus margin): the hero's height cap never
 * goes below it, at any width. `y` is the object-position that, at that least
 * share or any taller one, keeps the whole cast in view. `floor` is the
 * share global.css actually holds the box to: `need`, but never under
 * HERO_FLOOR.
 */
export function heroFrame(scene) {
  const [top, bottom] = heroFocus[scene] ?? [0.2, 0.88]
  const need = Math.min(1, bottom - top + FOCUS_MARGIN)
  const y = need >= 1 ? 0.5 : Math.min(1, Math.max(0, (top - FOCUS_MARGIN / 2) / (1 - need)))
  return { need: +need.toFixed(3), floor: +Math.max(need, HERO_FLOOR).toFixed(3), y: +(y * 100).toFixed(1) }
}

/** The width:height of a scene's wide art. The whole-world panorama is 3:1, the dovecote is a touch taller (1536x614), the rest are 8:3. */
export const sceneRatio = (scene) => (scene === 'ourostack' ? [1536, 512] : scene === 'friends-relay' ? [1536, 614] : [1536, 576])
