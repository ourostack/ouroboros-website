// Pages that open on Ouro HX's Hero (PageHero.astro) rather than the full-bleed
// StoryScene under the nav: the words sit above the page's scene, and the art is
// shown whole inside the page's column, never under the text.
export const pageHeroRoutes = [
  /^\/$/,
  /^\/blog(\/[^/]+)?\/?$/,
  /^\/lab\/?$/,
  /^\/lab\/(why|story|how-desk-started|what-is-an-agent-harness|model-reviews|docs)\/?$/,
  /^\/desk\/?$/,
  /^\/butler\/?$/,
]

export const usesPageHero = (pathname) => pageHeroRoutes.some((route) => route.test(pathname))

// The art's box is the page's column: max-w-6xl inside px-6 md:px-12 lg:px-16.
// The preloads in Layout.astro use the same sizes, so the art is fetched once.
export const PAGE_HERO_SIZES = '(min-width: 1024px) min(72rem, calc(100vw - 8rem)), (min-width: 768px) calc(100vw - 6rem), calc(100vw - 3rem)'
