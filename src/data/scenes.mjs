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
  'ouroboros-website': 'A rose-covered gateway with its wooden doors thrown open, a signpost pointing every which way, and the glowing trail winding off to a cottage on the far hill. Ouro sits by the gate.',
}

// Route (no trailing slash; '/' for home) → scenes. `hero: null` means the page
// opens on its words, with the scene only on its share card.
const pages = {
  '/': { hero: 'ourostack' },
  '/apps': { hero: 'ouro-apps-site' },
  '/approach': { hero: 'ouro-work' },
  '/brief': { hero: 'ouroboros-skills' },
  '/desk': { hero: 'desk' },
  '/ouro-md': { hero: 'ouro-md' },
  '/ouro-hx': { hero: 'ouro-hx' },
  '/butler': { hero: 'butler' },
  '/blog': { hero: 'gatefold' },
  '/blog/trust-the-agent': { hero: 'playwright-focus-proof' },
  '/blog/take-the-agents-seat': { hero: 'ouro-ui-apple' },
  '/blog/give-your-agent-a-home': { hero: 'ouroboros' },
  '/blog/what-is-agent-experience': { hero: 'ouro-ui-core' },
  '/blog/designing-with-your-agent': { hero: 'ouro-workbench' },
  '/blog/stop-being-the-glue': { hero: 'friends-relay' },
  '/blog/build-ai-agent-from-scratch': { hero: 'homebrew-tap' },
  '/lab': { hero: 'ouroboros' },
  '/lab/why': { hero: 'ouroboros' },
  '/lab/story': { hero: 'ouroboros' },
  '/lab/what-is-an-agent-harness': { hero: 'ouroboros' },
  '/lab/how-desk-started': { hero: 'desk' },
  '/lab/model-reviews': { hero: 'flow-review' },
  '/lab/docs': { hero: 'ouroboros' },
  '/privacy': { hero: null, og: 'ouroboros-website' },
  '/terms': { hero: null, og: 'ouroboros-website' },
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
  return { hero, og: page.og ?? hero ?? meadowScene, meadow: page.meadow !== false }
}

/** The scene a route's share card is set in. */
export const ogSceneFor = (route) => sceneFor(route).og

/** Every scene the site serves, for scripts/sync-storybook.mjs. */
export function usedScenes() {
  const used = new Set([meadowScene, 'friends', 'shepherd', 'factory', 'ouroboros'])
  for (const page of Object.values(pages)) {
    if (page.hero) used.add(page.hero)
    if (page.og) used.add(page.og)
  }
  for (const scene of ['desk', 'ouro-md', 'ouro-hx', 'butler']) used.add(scene)
  return [...used].sort()
}

/** The width:height of a scene's wide art. The whole-world panorama is 3:1; the rest are 8:3. */
export const sceneRatio = (scene) => (scene === 'ourostack' ? [1536, 512] : [1536, 576])
