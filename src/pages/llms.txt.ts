import type { APIRoute } from 'astro'
import template from '../data/llms.txt?raw'
import { familyLinks } from '../data/site.mjs'

// /llms.txt, from src/data/llms.txt with its family section built from
// src/data/family.json, so an agent reads the same seven sites, by the same
// names and in the same order, as the family bar at the top of every page.
const family = [
  '## The Ouro family',
  '',
  'The family bar at the top of every page of every family site lists these, in this order.',
  '',
  ...familyLinks.map((link) => `- [${link.label}](${link.href})`),
].join('\n')

export const GET: APIRoute = () =>
  new Response(template.replace('{{family}}', family), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
