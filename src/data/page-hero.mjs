// Pages that open on Ouro HX's Hero (PageHero.astro) rather than the full-bleed
// StoryScene under the nav: the words sit above the page's scene, and the art is
// shown whole inside the page's column, never under the text.
export const pageHeroRoutes = [
  /^\/$/,
  /^\/blog(\/[^/]+)?\/?$/,
  /^\/lab\/?$/,
  /^\/lab\/(why|story|how-desk-started|what-is-an-agent-harness|model-reviews|docs)\/?$/,
  /^\/lab\/docs\/[^/]+\/?$/,
  /^\/lab\/model-reviews\/[^/]+\/?$/,
  /^\/desk\/?$/,
  /^\/apps\/?$/,
  /^\/(approach|brief|privacy|terms)\/?$/,
  /^\/butler\/?$/,
  /^\/ouro-md(\/download)?\/?$/,
  /^\/housesitter\/?$/,
  /^\/shepherd\/?$/,
  /^\/404(\.html)?\/?$/,
]

export const usesPageHero = (pathname) => pageHeroRoutes.some((route) => route.test(pathname))

// The art's box is the page's column: max-w-6xl inside px-6 md:px-12 lg:px-16.
// The preloads in Layout.astro use the same sizes, so the art is fetched once.
export const PAGE_HERO_SIZES = '(min-width: 1024px) min(72rem, calc(100vw - 8rem)), (min-width: 768px) calc(100vw - 6rem), calc(100vw - 3rem)'

// A page whose art breaks out of the column from 1600px, to 1.5x the column's
// width (global.css, .page-hero--wide), so on a big screen the art is the page's
// stage and not a stamp in the middle of it. The words stay in the column. The
// sizes below are that width: min(100vw - 9rem, 1.5 x --container-6xl), where the
// container is 72rem, and 84rem from 2000px.
export const wideHeroRoutes = [/^\/blog\/build-ai-agent-from-scratch\/?$/]
export const WIDE_HERO_SIZES = '(min-width: 2000px) min(calc(100vw - 9rem), 126rem), (min-width: 1600px) min(calc(100vw - 9rem), 108rem), ' + PAGE_HERO_SIZES
export const usesWideHero = (pathname) => wideHeroRoutes.some((route) => route.test(pathname))
export const heroSizesFor = (pathname) => (usesWideHero(pathname) ? WIDE_HERO_SIZES : PAGE_HERO_SIZES)
