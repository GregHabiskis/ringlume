import { getAnchorTarget, prepareAnchorLayout } from '../lib/anchor-navigation'
import { navigationSection } from '../lib/header-navigation'

const controllers = new WeakMap<HTMLElement, AbortController>()
export function destroyHeader(root: HTMLElement) { controllers.get(root)?.abort(); controllers.delete(root) }
export function initHeader(root: HTMLElement) {
  if (controllers.has(root)) return
  const controller = new AbortController()
  controllers.set(root, controller)
  const signal = controller.signal

const toggle = root.querySelector<HTMLElement>('#mobile-menu-toggle')
const menu = root.querySelector<HTMLElement>('#mobile-menu')

function setMenu(open: boolean) {
  menu?.classList.toggle('hidden', !open)
  toggle?.setAttribute('aria-expanded', String(open))
}

if (toggle && menu) {
  toggle.addEventListener('click', () => {
    setMenu(menu.classList.contains('hidden'))
  }, { signal })

  // Any drawer link closes it, including same-page section anchors
  // where no page reload would clear the state.
  menu.addEventListener('click', (e) => {
    if (e.target instanceof Element && e.target.closest('a')) {
      setMenu(false)
    }
  }, { signal })

  document.addEventListener('click', (e) => {
    const target = e.target as Node | null
    if (!menu.classList.contains('hidden') && !menu.contains(target) && !toggle.contains(target)) {
      setMenu(false)
    }
  }, { signal })

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !menu.classList.contains('hidden')) {
      setMenu(false)
      toggle.focus()
    }
  }, { signal })

  // The toggle and drawer are md:hidden; above 768px nothing may stay open.
  window.matchMedia('(min-width: 768px)').addEventListener('change', (e) => {
    if (e.matches) setMenu(false)
  }, { signal })
}

// Condense the pill on scroll (visual only).
const nav = root.querySelector<HTMLElement>('[data-nav]')
if (nav) {
  const sync = () => nav.toggleAttribute('data-condensed', window.scrollY > 12)
  sync()
  window.addEventListener('scroll', sync, { passive: true, signal })
}

// Liquid indicator that slides between nav items. The indicator is
// absolutely positioned inside [data-nav-links] (that container is the
// `relative` containing block), so every measurement is taken against
// its box with getBoundingClientRect: exact, and structurally unable
// to land on the logo.
const linksBox = root.querySelector<HTMLElement>('[data-nav-links]')
const indicator = linksBox?.querySelector<HTMLElement>('.nav-indicator')
const links = linksBox
  ? Array.from(linksBox.querySelectorAll<HTMLAnchorElement>('[data-nav-link]'))
  : []

function currentLink() {
  return links.find((link) => link.hasAttribute('aria-current'))
}

let shown: HTMLAnchorElement | undefined

function moveTo(el: HTMLAnchorElement | undefined) {
  shown = el
  if (!indicator || !linksBox) return
  if (!el) {
    indicator.classList.remove('is-active')
    return
  }
  const box = linksBox.getBoundingClientRect()
  const rect = el.getBoundingClientRect()
  indicator.style.width = `${rect.width}px`
  indicator.style.height = `${rect.height}px`
  indicator.style.transform = `translate(${rect.left - box.left}px, ${rect.top - box.top}px)`
  indicator.classList.add('is-active')
}

// Re-measure the resting target after resize, webfont swap, or reflow.
const rest = () => moveTo(shown ?? currentLink())

links.forEach((link) => {
  link.addEventListener('pointerenter', () => moveTo(link), { signal })
  link.addEventListener('focus', () => moveTo(link), { signal })
})

linksBox?.addEventListener('pointerleave', () => {
  moveTo(currentLink())
}, { signal })

rest()
window.addEventListener('resize', rest, { signal })
document.fonts?.ready.then(() => { if (!signal.aborted) rest() })
if (linksBox && 'ResizeObserver' in window) {
  const resizeObserver = new ResizeObserver(rest)
  resizeObserver.observe(linksBox)
  signal.addEventListener('abort', () => resizeObserver.disconnect(), { once: true })
}

// Scroll-spy (index only, signalled by data-spy on the nav): ONE
// IntersectionObserver maps section position on the page to the active
// link. Use an explicit mapping for page sections and their links.
// Bands without a link (the FOMO strip) keep the previous active link.
if (nav?.hasAttribute('data-spy')) {
  // Prepare direct fragment visits as well as clicks within the homepage.
  prepareAnchorLayout(getAnchorTarget(window.location.hash))

  const allLinks = Array.from(
    root.querySelectorAll<HTMLAnchorElement>('[data-nav-link]'),
  )
  const pairs = links.flatMap(link => {
    const href = link.getAttribute('href') ?? ''
    const section = navigationSection(href, new URL(window.location.href))
    const el = section === 'hero'
      ? document.querySelector<HTMLElement>('main > section:first-child')
      : section ? document.getElementById(section) : null
    return el ? [{ el, href }] : []
  }).sort((a, b) => {
    // Nested sections must win over their containing hero.
    if (a.el !== b.el && a.el.contains(b.el)) return 1
    if (a.el !== b.el && b.el.contains(a.el)) return -1
    return 0
  })

  let activeHref: string | null = null
  let locked = false
  let lockTimer = 0

  function applyActive(href: string) {
    if (href === activeHref) return
    activeHref = href
    const selected = new Set<Element | null>()
    for (const link of allLinks) {
      const group = link.closest('[data-nav-links], #mobile-menu')
      if (link.getAttribute('href') === href && !selected.has(group)) {
        link.setAttribute('aria-current', 'location')
        selected.add(group)
      } else link.removeAttribute('aria-current')
    }
    // The indicator follows the active link; it lives inside
    // [data-nav-links], so it can never land on the logo.
    moveTo(links.find((l) => l.getAttribute('href') === href))
  }

  // Active = the section covering the upper-third line of the viewport
  // (34% — exactly where the observer's rootMargin band ends). The
  // sticky-header clearance (-80px) prunes sections that are already
  // fully above the band. The nested demo takes precedence only once
  // it reaches its anchor clearance, keeping Home active at page load.
  // Unlinked sections keep the previous active link.
  function pick(): string | null {
    const line = window.innerHeight * 0.34
    for (const { el, href } of pairs) {
      const r = el.getBoundingClientRect()
      if (
        el.id === 'demo' &&
        r.top > parseFloat(getComputedStyle(el).scrollMarginTop) + 1
      )
        continue
      if (r.top < line && r.bottom > line) return href
    }
    return null
  }

  function sync() {
    if (locked) return
    const href = pick()
    if (href !== null) applyActive(href)
  }

  // Synchronous state at script run: adopt the server-rendered marker
  // first, then reconcile immediately (covers restored scroll).
  activeHref =
    root
      .querySelector('[data-nav-link][aria-current]')
      ?.getAttribute('href') ?? null
  sync()

  const observer = new IntersectionObserver(sync, {
    rootMargin: '-80px 0px -66% 0px',
  })
  for (const { el } of pairs) observer.observe(el)
  signal.addEventListener('abort', () => { observer.disconnect(); clearTimeout(lockTimer) }, { once: true })

  // Lock only the active-link indicator during native smooth scrolling.
  // This fallback changes highlighting, never the page's scroll position.
  const unlock = () => {
    clearTimeout(lockTimer)
    locked = false
    sync()
  }
  if ('onscrollend' in window)
    window.addEventListener('scrollend', unlock, { signal })

  document.addEventListener('click', (event) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return
    const link =
      event.target instanceof Element
        ? event.target.closest<HTMLAnchorElement>('a[href]')
        : null
    if (
      !link ||
      link.hasAttribute('download') ||
      (link.target && link.target !== '_self')
    )
      return

    const url = new URL(link.href, window.location.href)
    if (
      url.origin !== window.location.origin ||
      url.pathname !== window.location.pathname ||
      url.search !== window.location.search
    )
      return
    const target = getAnchorTarget(url.hash)
    if (!target) return

    // Expand intervening placeholders before the browser's default action.
    // Do not preventDefault or issue a second programmatic scroll.
    prepareAnchorLayout(target)
    const pair = pairs.find(({ el }) => el === target || el.contains(target))
    if (pair) applyActive(pair.href)
    locked = true
    clearTimeout(lockTimer)
    lockTimer = window.setTimeout(unlock, 2000)
  }, { signal })
}
}
