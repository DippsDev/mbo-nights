import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BRAND_KICKER,
  BRAND_TAGLINE,
  CAPABILITIES,
  nextOpenNight,
} from '../data'
import HighlightReel from '../components/HighlightReel'
import { cheapMotion, reducedMotion, softScrollReveal } from '../lib/motion'
import { useSound } from '../sound'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

const HERO_CLIP_DESKTOP = '/video/DippsDevHero.mp4'
const HERO_CLIP_MOBILE = '/video/DippsDevMobile.mp4'
const HERO_POSTER_DESKTOP = '/video/DippsDevHero.jpg'
const HERO_POSTER_MOBILE = '/video/DippsDevMobile.jpg'
const HERO_MOBILE_MQ = '(max-width: 799px)'

function heroForViewport() {
  const mobile = typeof window !== 'undefined' && window.matchMedia(HERO_MOBILE_MQ).matches
  return mobile
    ? { src: HERO_CLIP_MOBILE, poster: HERO_POSTER_MOBILE }
    : { src: HERO_CLIP_DESKTOP, poster: HERO_POSTER_DESKTOP }
}

export default function Home() {
  const next = nextOpenNight()
  const { on, toggle } = useSound()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [hero, setHero] = useState(heroForViewport)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia(HERO_MOBILE_MQ)
    const sync = () => setHero(heroForViewport())
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  // After Enter, warm the next-night clip so the event page isn't cold.
  useEffect(() => {
    if (!next?.clips[0]) return
    if (!window.matchMedia(HERO_MOBILE_MQ).matches) return

    const src = next.clips[0]
    const poster = next.image
    let cancelled = false
    const warm = () => {
      if (cancelled) return
      void fetch(src, { credentials: 'same-origin' }).catch(() => undefined)
      if (poster) {
        const img = new Image()
        img.src = poster
      }
    }

    const onEntered = () => {
      window.setTimeout(warm, 1800)
    }
    window.addEventListener('mbo:entered', onEntered)
    // If splash already gone (HMR / revisit), warm after a beat.
    window.setTimeout(warm, 4000)

    return () => {
      cancelled = true
      window.removeEventListener('mbo:entered', onEntered)
    }
  }, [next])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const play = () => {
      void video.play().catch(() => undefined)
    }

    const markReady = () => setReady(true)

    const onVis = () => {
      if (document.visibilityState === 'visible') play()
    }

    const onEntered = () => {
      window.scrollTo(0, 0)
      ScrollTrigger.refresh()
      play()
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return
        if (entry.isIntersecting && entry.intersectionRatio > 0.12) play()
        else video.pause()
      },
      { threshold: [0, 0.12, 0.5] },
    )
    io.observe(video)

    // First decoded frame is enough to swap off the still.
    video.addEventListener('loadeddata', markReady)
    video.addEventListener('playing', markReady)
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('pageshow', play)
    window.addEventListener('mbo:entered', onEntered)

    // Kick load immediately — don't wait for intro dismiss.
    if (video.readyState >= 2) {
      markReady()
      play()
    } else {
      video.addEventListener('loadeddata', play, { once: true })
      video.addEventListener('canplay', play, { once: true })
    }

    return () => {
      io.disconnect()
      video.removeEventListener('loadeddata', markReady)
      video.removeEventListener('playing', markReady)
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('pageshow', play)
      window.removeEventListener('mbo:entered', onEntered)
    }
  }, [hero])

  useEffect(() => {
    if (reducedMotion()) return

    if (cheapMotion()) {
      return softScrollReveal(
        '.home-immerse .highlight, .home-immerse .capability, .home-immerse .contact-split > div',
        '.home-immerse',
      )
    }

    const ctx = gsap.context(() => {
      gsap.to('.hero-copy', {
        yPercent: -8,
        opacity: 0.35,
        ease: 'none',
        scrollTrigger: {
          trigger: '.spotlight-hero',
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        },
      })

      gsap.utils.toArray<HTMLElement>('.capability').forEach((el) => {
        const img = el.querySelector('img')
        const copy = el.querySelector('div')
        if (img) {
          gsap.fromTo(
            img,
            { yPercent: -6, scale: 1.04 },
            {
              yPercent: 0,
              scale: 1,
              ease: 'none',
              force3D: true,
              scrollTrigger: {
                trigger: el,
                start: 'top bottom',
                end: 'bottom top',
                scrub: true,
              },
            },
          )
        }
        if (copy) {
          gsap.fromTo(
            copy,
            { y: 28, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              ease: 'none',
              immediateRender: false,
              scrollTrigger: {
                trigger: el,
                start: 'top 82%',
                end: 'top 48%',
                scrub: true,
              },
            },
          )
        }
      })
    })

    return () => ctx.revert()
  }, [])

  return (
    <main className="page home-immerse">
      <section className="hero spotlight-hero">
        <img
          className={`hero-still${ready ? ' is-hidden' : ''}`}
          src={hero.poster}
          alt=""
          aria-hidden
          fetchPriority="high"
          decoding="async"
        />
        <video
          key={hero.src}
          ref={videoRef}
          className={`hero-clip${ready ? ' is-ready' : ''}`}
          src={hero.src}
          muted
          playsInline
          loop
          preload="auto"
          autoPlay
          poster={hero.poster}
          aria-hidden
        />
        <div className="hero-copy">
          <p className="kicker">{BRAND_KICKER}</p>
          <h1 className="display xl stacked">
            <span>More Bands</span>
            <span>On the way</span>
          </h1>
          <p className="serif hero-lede">{BRAND_TAGLINE}</p>
          <div className="hero-meta">
            <button className="btn ghost" type="button" data-sound-toggle onPointerDown={toggle}>
              {on ? 'Mute' : 'Sound on'}
            </button>
            {next && (
              <Link className="btn" to={`/events/${next.id}`}>
                Get tickets
              </Link>
            )}
          </div>
        </div>
      </section>

      <HighlightReel />

      <section className="capabilities">
        {CAPABILITIES.map((item) => (
          <Link className="capability" key={item.id} to={item.to}>
            <img src={item.image} alt="" loading="lazy" decoding="async" />
            <div>
              <p className="kicker">{item.id}</p>
              <h2 className="display lg">{item.title}</h2>
              <p className="serif">{item.blurb}</p>
              <span className="link-arrow">Explore →</span>
            </div>
          </Link>
        ))}
      </section>

      <section className="contact-split">
        <div>
          <p className="kicker">Next up</p>
          <h2 className="display lg">Next night</h2>
          <p className="serif">Lineup, doors, and tickets for the next show.</p>
          <Link className="btn" to={next ? `/events/${next.id}` : '/artists'}>
            Get tickets
          </Link>
        </div>
      </section>
    </main>
  )
}
