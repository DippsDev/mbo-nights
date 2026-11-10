/**
 * Legal pages shown at /legal/<slug> and linked from the footer.
 * Fill in `updated` and `sections` when the wording is ready; a page with no
 * sections shows a "being finalised" note instead.
 */
export type LegalSection = { heading: string; paragraphs: string[] }

export type LegalDoc = {
  slug: string
  title: string
  /** e.g. '10 Nov 2026' */
  updated: string
  sections: LegalSection[]
}

export const LEGAL: LegalDoc[] = [
  { slug: 'terms', title: 'Terms & Conditions', updated: '', sections: [] },
  { slug: 'privacy', title: 'Privacy Policy', updated: '', sections: [] },
  { slug: 'tickets', title: 'Ticket & Refund Policy', updated: '', sections: [] },
  { slug: 'event-rules', title: 'Event Rules', updated: '', sections: [] },
]

export const getLegal = (slug: string) => LEGAL.find((d) => d.slug === slug)
