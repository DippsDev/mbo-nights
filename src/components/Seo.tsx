import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { TICKETS_ENABLED } from '../lib/flags'
import { canonical, DEFAULT_IMAGE, metaFor } from '../lib/seoMeta'

function setTag(selector: string, attr: 'name' | 'property' | 'rel', key: string, value: string) {
  let el = document.head.querySelector<HTMLElement>(selector)
  if (!el) {
    el = document.createElement(attr === 'rel' ? 'link' : 'meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute(attr === 'rel' ? 'href' : 'content', value)
}

/**
 * Keeps <title>, description, canonical, robots and social tags in sync as the
 * visitor moves between pages. The first load already has the right tags: the
 * build writes them into each public page's HTML (see vite.config.ts).
 */
export default function Seo() {
  const { pathname } = useLocation()

  useEffect(() => {
    const { title, description, noindex, jsonLd } = metaFor(pathname, TICKETS_ENABLED)
    const url = canonical(pathname)
    document.title = title
    setTag('meta[name="description"]', 'name', 'description', description)
    setTag('meta[name="robots"]', 'name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow')
    setTag('link[rel="canonical"]', 'rel', 'canonical', url)
    setTag('meta[property="og:title"]', 'property', 'og:title', title)
    setTag('meta[property="og:description"]', 'property', 'og:description', description)
    setTag('meta[property="og:url"]', 'property', 'og:url', url)
    setTag('meta[property="og:image"]', 'property', 'og:image', DEFAULT_IMAGE)
    setTag('meta[name="twitter:title"]', 'name', 'twitter:title', title)
    setTag('meta[name="twitter:description"]', 'name', 'twitter:description', description)

    document.getElementById('seo-jsonld')?.remove()
    if (jsonLd) {
      const script = document.createElement('script')
      script.id = 'seo-jsonld'
      script.type = 'application/ld+json'
      script.textContent = JSON.stringify(jsonLd)
      document.head.appendChild(script)
    }
  }, [pathname])

  return null
}
