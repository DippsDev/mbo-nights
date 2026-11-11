import { useRef, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { team } from '../data'

const VENUES = ['The Ponds', 'House of Habanos', 'Ayoba', 'Deja Vu']

export default function About() {
  const rail = useRef<HTMLElement>(null)
  const [active, setActive] = useState(0)

  // Phone carousel: which card is snapped in, for the dots.
  const onScroll = () => {
    const el = rail.current
    const card = el?.firstElementChild as HTMLElement | null
    if (!el || !card) return
    setActive(Math.round(el.scrollLeft / (card.offsetWidth + 12)))
  }

  const goTo = (i: number) => {
    const card = rail.current?.children[i] as HTMLElement | undefined
    card?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' })
  }

  return (
    <main className="page about">
      <section
        className="about-team"
        aria-label="The MBO team"
        ref={rail}
        onScroll={onScroll}
        style={{ '--count': team.length } as CSSProperties}
      >
        {team.map((member) => (
          <figure className="about-member" key={member.id}>
            <img src={member.image} alt={member.name} loading="lazy" decoding="async" />
            <figcaption>
              <span className="kicker">{member.role}</span>
              <span className="about-member-name">{member.name}</span>
            </figcaption>
          </figure>
        ))}
      </section>
      <div className="about-dots">
        {team.map((member, i) => (
          <button
            key={member.id}
            type="button"
            aria-label={`Show ${member.name}`}
            aria-current={i === active}
            onClick={() => goTo(i)}
          />
        ))}
      </div>

      <section className="about-copy">
        <h1 className="sr-only">About MBO — More Bands On the way</h1>
        <p className="kicker">About</p>
        <p className="about-lede">
          MBO — More Bands OTW — is a Botswana-born event collective built for the youth, by the
          youth. What started as a simple idea has grown into one of Gaborone’s most talked-about
          nightlife names, known for turning ordinary nights into experiences people actually
          remember.
        </p>
        <p className="about-lede">
          From intimate restaurant takeovers to full warehouse productions, every MBO Night is
          built on one thing: <em>giving the culture what it’s been missing.</em>
        </p>
      </section>

      <section className="about-background" aria-labelledby="about-background-title">
        <div className="about-background-head">
          <p className="kicker" id="about-background-title">
            Background
          </p>
          <ul className="about-venues" aria-label="Venues we've worked with">
            {VENUES.map((venue) => (
              <li key={venue}>{venue}</li>
            ))}
          </ul>
        </div>
        <div className="about-background-body">
          <p>
            Over the past year, MBO Nights has hosted and collaborated on events at some of
            Gaborone’s most recognised venues, including The Ponds, House of Habanos, Ayoba and Deja
            Vu. These partnerships have built the brand a strong reputation for high-energy events,
            driving venue attendance and creating memorable experiences for patrons.
          </p>
          <p>
            With a focus on quality entertainment, strategic marketing and strong partnerships, MBO
            Nights continues to grow its presence in Botswana’s nightlife industry. Every event is
            designed to offer a unique atmosphere while supporting local DJs, artists, creatives and
            businesses.
          </p>
          <p>
            As the brand expands, MBO Nights remains committed to innovation, consistency and
            long-term relationships with venues, sponsors and audiences —{' '}
            <em>a trusted name in premium nightlife and entertainment.</em>
          </p>
        </div>
      </section>

      <section className="about-background" aria-labelledby="about-mission-title">
        <div className="about-background-head">
          <p className="kicker" id="about-mission-title">
            Vision / Mission
          </p>
          <ul className="about-venues" aria-hidden>
            <li>Mission</li>
            <li>Vision</li>
          </ul>
        </div>
        <div className="about-background-body">
          <p>
            Our mission is to create unforgettable experiences that bring young people together
            through music, culture and entertainment. We are committed to delivering high-quality
            events that inspire connection, celebrate creativity and continually raise the standard
            of nightlife.
          </p>
          <p>
            Our vision is to grow MBO Nights into{' '}
            <em>the country’s biggest and most influential youth event.</em>
          </p>
          <Link className="btn" to="/">
            See upcoming events
          </Link>
        </div>
      </section>
    </main>
  )
}
