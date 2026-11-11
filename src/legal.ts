/**
 * Legal pages shown at /legal/<slug> and linked from the footer.
 * A page with no sections shows a "being finalised" note instead.
 * Keep each section to two short paragraphs (~30 words each) so the cards stay even.
 */
export type LegalSection = { heading: string; paragraphs: string[] }

export type LegalDoc = {
  slug: string
  title: string
  /** e.g. '10 Nov 2026' */
  updated: string
  sections: LegalSection[]
}

const UPDATED = '11 Nov 2026'

export const LEGAL: LegalDoc[] = [
  {
    slug: 'terms',
    title: 'Terms & Conditions',
    updated: UPDATED,
    sections: [
      {
        heading: 'Who we are',
        paragraphs: [
          'MBO — More Bands On the way — is an event collective based in Gaborone, Botswana, that organises live music events.',
          'By using this site, buying a ticket or attending an event, you agree to these Terms, our Ticket Policy, Event Rules and Privacy Policy.',
        ],
      },
      {
        heading: 'Minors',
        paragraphs: [
          'All events are strictly 18+. This is stated on our website, our tickets and at the door, and valid photo ID may be requested at any time.',
          'Having given this warning, MBO is not responsible for any minor who gains entry. Parents remain responsible, and minors are removed without a refund.',
        ],
      },
      {
        heading: 'Belongings',
        paragraphs: [
          'You are responsible for your own belongings at all times, including phones, wallets, bags, cash and vehicles.',
          'MBO is not responsible for any lost, stolen or damaged items at, or on the way to or from, any event. Report any theft to the police.',
        ],
      },
      {
        heading: 'Injury',
        paragraphs: [
          'Events involve crowds, loud music, strobe lights and alcohol. You attend entirely at your own risk and are responsible for your own safety.',
          'As far as Botswana law allows, MBO is not responsible for any injury, illness or loss suffered by anyone at, or travelling to or from, an event.',
        ],
      },
      {
        heading: 'Venues',
        paragraphs: [
          'Our events are held at venues run by third parties. Their own rules and security procedures apply in addition to ours.',
          'MBO is not responsible for the actions of venues, their staff, security, vendors, transport providers or other guests.',
        ],
      },
      {
        heading: 'Event changes',
        paragraphs: [
          'Line-ups, set times, venues and dates may change, and artist appearances are not guaranteed. We will post major changes on this site.',
          'MBO is not liable for disruption beyond our control, such as weather, power cuts, government action or artist illness.',
        ],
      },
      {
        heading: 'Photos & filming',
        paragraphs: [
          'Our events are photographed and filmed. By attending, you agree that MBO may use this content to promote its events, without payment.',
          'If you would like a specific photo of yourself taken down from our channels, contact us and we will remove it.',
        ],
      },
      {
        heading: 'Right of admission',
        paragraphs: [
          'MBO and the venue reserve the right of admission and may refuse entry to, or remove, anyone at any time.',
          'This includes anyone who breaks the Event Rules, is heavily intoxicated, behaves unsafely or refuses a search. No refund is given.',
        ],
      },
      {
        heading: 'Governing law',
        paragraphs: [
          'These Terms are governed by the laws of Botswana. Nothing in them limits rights you have under the Consumer Protection Act.',
          'We may update these Terms from time to time. The version on this page when you buy or attend is the one that applies.',
        ],
      },
    ],
  },
  {
    slug: 'privacy',
    title: 'Privacy Policy',
    updated: UPDATED,
    sections: [
      {
        heading: 'What we collect',
        paragraphs: [
          'When you buy tickets, we collect your name, phone number, email, order details and Pay2Cell payment reference. We never store card details.',
          'We also record ticket scans at the door, and the site keeps small items like your bag on your device.',
        ],
      },
      {
        heading: 'How we use it',
        paragraphs: [
          'We use your details to process orders, issue and check tickets, contact you about your order or event changes, and handle refunds.',
          'We also use them to prevent fraud and keep events safe. We only send marketing if you agree, and you can opt out anytime.',
        ],
      },
      {
        heading: 'Who we share it with',
        paragraphs: [
          'We never sell your information. We share it only with the services that run our ticketing and website, and with venues where needed for entry.',
          'We share it with authorities only when the law requires it. Some providers may store data outside Botswana, under appropriate protection.',
        ],
      },
      {
        heading: 'Your rights',
        paragraphs: [
          'Under Botswana’s Data Protection Act, you can ask to see, correct or delete the personal information we hold about you.',
          'We keep records only as long as needed for the event, refunds and the law, then delete them. Contact us to make a request.',
        ],
      },
    ],
  },
  {
    slug: 'tickets',
    title: 'Ticket & Refund Policy',
    updated: UPDATED,
    sections: [
      {
        heading: 'Buying tickets',
        paragraphs: [
          'Tickets are sold on this site and paid via Pay2Cell in Pula. Your order is held for a limited time while you pay, then released.',
          'Tickets are issued once we confirm your payment. Each ticket admits one person, once, and a limit per order applies.',
        ],
      },
      {
        heading: 'Your ticket',
        paragraphs: [
          'Each ticket has a unique QR code. Only the first scan is admitted, so keep it private — MBO is not responsible for shared or lost tickets.',
          'Tickets bought from resellers are not guaranteed. A ticket does not override the 18+ rule, and ID may be checked.',
        ],
      },
      {
        heading: 'Refunds',
        paragraphs: [
          'All sales are final. There are no refunds if you cannot attend, arrive late, or are refused entry or removed for breaking the rules.',
          'If MBO cancels an event, you get a full refund. If it is postponed or moved, your ticket stays valid, or you can ask for a refund within 7 days.',
        ],
      },
      {
        heading: 'Order problems',
        paragraphs: [
          'If you paid but did not receive your tickets, use “Find my tickets” with your order reference and phone number.',
          'If that does not help, contact us through the footer. Approved refunds are paid to the number you paid from within 14 days.',
        ],
      },
    ],
  },
  {
    slug: 'event-rules',
    title: 'Event Rules',
    updated: UPDATED,
    sections: [
      {
        heading: 'Entry',
        paragraphs: [
          '18+ only. Bring valid photo ID such as your Omang, passport or driver’s licence. No ID means no entry and no refund.',
          'Have your QR code ready. Bags and guests may be searched, and refusing a search means refused entry. Re-entry is not guaranteed.',
        ],
      },
      {
        heading: 'Not allowed',
        paragraphs: [
          'No weapons, illegal drugs, outside drinks, glass bottles, fireworks, laser pens or professional cameras without our permission.',
          'No violence, harassment or discrimination of any kind. Breaking these rules means removal without a refund, and may be reported to the police.',
        ],
      },
      {
        heading: 'Stay safe',
        paragraphs: [
          'You attend at your own risk, and MBO is not responsible for injuries. Drink responsibly, never drink and drive, and look out for others.',
          'Keep your belongings with you — MBO is not responsible for lost or stolen items. Report anyone hurt or unsafe to staff immediately.',
        ],
      },
      {
        heading: 'Final say',
        paragraphs: [
          'Events are filmed for promotion, and attending means you agree to appear. Music is loud and strobes may be used.',
          'Always follow instructions from MBO staff, venue staff and security. These rules form part of our Terms & Conditions.',
        ],
      },
    ],
  },
]

export const getLegal = (slug: string) => LEGAL.find((d) => d.slug === slug)
