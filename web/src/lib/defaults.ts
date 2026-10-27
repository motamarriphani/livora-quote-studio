import type { Catalog, Customer, Quote, Section, Spec } from './types';
import { todayStr, uid } from './format';

/** Letterhead printed on every quote. One place to change it. */
export const COMPANY = {
  name: 'LIVORA INTERIORS',
  address: 'Miyapur, Hyderabad, Telangana 502034',
  phone: '8886767991',
};

/** Built-in rate card — seeds a brand-new account's catalog. */
const LIBRARY = [
  { id: 'wardrobe', name: 'Wardrobe Box', rate: 1500, w: 5, h: 8, cat: 'Woodwork' },
  { id: 'loft', name: 'Loft Box', rate: 1200, w: 12, h: 7, cat: 'Woodwork' },
  { id: 'loft-wall', name: 'Loft & Wall Unit Box', rate: 1200, w: 24, h: 10, cat: 'Woodwork' },
  { id: 'bed', name: 'Bed', rate: 1200, w: 7, h: 6, cat: 'Woodwork' },
  { id: 'headboard', name: 'Headboard', rate: 600, w: 8, h: 4, cat: 'Woodwork' },
  { id: 'wallpanel', name: 'Wall Panelling', rate: 800, w: 8, h: 5, cat: 'Woodwork' },
  { id: 'toiletbox', name: 'Toilet Box', rate: 1500, w: 2, h: 1, cat: 'Woodwork' },
  { id: 'dresser', name: 'Dresser with Mirror', rate: 1500, w: 3, h: 6, cat: 'Woodwork' },
  { id: 'tvunit', name: 'TV Unit Box', rate: 1500, w: 3, h: 8, cat: 'Woodwork' },
  { id: 'tvtrolley', name: 'TV Trolley Unit Box', rate: 1500, w: 1.5, h: 8, cat: 'Woodwork' },
  { id: 'tvpanel', name: 'TV Panelling Work', rate: 900, w: 6, h: 8, cat: 'Woodwork' },
  { id: 'crockery', name: 'Crockery Unit Box', rate: 1500, w: 6, h: 7, cat: 'Woodwork' },
  { id: 'puja', name: 'Pooja Mandir Box', rate: 1500, w: 6, h: 2, cat: 'Woodwork' },
  { id: 'pujapanel', name: 'Pooja Mandir Panelling', rate: 1200, w: 6, h: 6, cat: 'Woodwork' },
  { id: 'pujadoor', name: 'Pooja Mandir Door', rate: 450, w: 3, h: 7, cat: 'Woodwork' },
  { id: 'kitchlow', name: 'Lower Cabinet Box', rate: 1500, w: 30, h: 11, cat: 'Kitchen' },
  { id: 'kitchloft', name: 'Kitchen Loft Box', rate: 1200, w: 34, h: 10, cat: 'Kitchen' },
];
const LUMP = [
  { id: 'gypsum', name: 'Gypsum Ceiling', rate: 83500, cat: 'False Ceiling' },
  { id: 'paint', name: 'Painting Work', rate: 115000, cat: 'Finishes' },
  { id: 'electrical', name: 'Electrical Wiring & Material', rate: 100000, cat: 'Electrical' },
];

export const DEFAULT_TERMS = [
  'Décor items not included',
  '40% payment as the project starts',
  '30% at mid way of the project',
  '20% at the time of handle installation',
  '10% at the time of final handover after snag list clearance',
  'Full payment to be released at the time of handover',
  'Any extra work other than the mentioned in the quote will be charged accordingly and should be paid in full (executed only after written approval)',
  'Workmanship warranty of 1 year from the date of handover (excludes damage caused by misuse)',
];

export const DEFAULT_SPEC: Spec[] = [
  { c: 'Plywood / Core Material', d: 'Premium 710 Grade BWP Plywood – Century Club Prime / Greenply, 16mm & 6mm thickness, as per design and application.' },
  { c: 'Laminates', d: 'Premium 1mm Merino / Greenlam Laminates – HGL / Matte / Fluted finishes, as per client-approved design and colour selection (internal laminate 0.8mm).' },
  { c: 'Kitchen Finish', d: 'Premium Acrylic finish for kitchen shutters, as per approved design and colour.' },
  { c: 'Kitchen Accessories', d: 'Premium modular kitchen accessories – baskets, cutlery unit, bottle pull-out, tandem units and required fittings, as per approved BOQ / scope of work.' },
  { c: 'Hardware & Fittings', d: 'Premium branded soft-close hinges, channels and fittings, as per approved specifications.' },
  { c: 'Wardrobes & Other Units', d: 'Century / Greenply 710 Grade BWP plywood with Merino / Greenlam 1mm laminate, internal storage and fittings as per approved design.' },
  { c: 'Kitchen', d: 'HDMR (High Density Moisture Resistant) board for kitchen carcass, as per approved design.' },
];

export const ROOM_SUGGESTIONS = [
  'Master Bedroom', 'Guest Bedroom', 'Kids Bedroom', 'Hall', 'Kitchen', 'Dining',
  'Crockery Unit', 'Pooja Mandir', 'Foyer', 'Balcony', 'False Ceiling', 'Painting', 'Electrical',
];

export function seedCatalog(): Catalog {
  return {
    items: LIBRARY.map((x) => ({ ...x })),
    services: LUMP.map((x) => ({ ...x })),
    materials: DEFAULT_SPEC.map((x) => ({ ...x })),
    terms: [...DEFAULT_TERMS],
  };
}

/** A blank quote: today's date, draft, terms & specification from the catalog. */
export function newQuote(catalog: Catalog | null | undefined, customer?: Customer, clientId: Quote['clientId'] = null): Quote {
  return {
    id: null,
    version: 0,
    quoteNo: '',
    date: todayStr(),
    customer: customer ?? { name: '', phone: '', address: '' },
    clientId,
    sections: [],
    finalCharge: 0,
    gst: 0,
    validityDays: 15,
    timeline: '',
    terms: catalog?.terms.length ? [...catalog.terms] : [...DEFAULT_TERMS],
    spec: catalog?.materials.length ? catalog.materials.map((x) => ({ ...x })) : DEFAULT_SPEC.map((x) => ({ ...x })),
    showDims: true,
    showSpec: true,
    status: 'draft',
  };
}

/** A copy of an existing quote as a NEW draft (duplicate / revision). */
export function copyAsNew(q: Quote): Quote {
  return {
    ...q,
    id: null,
    version: 0,
    quoteNo: '',
    date: todayStr(),
    status: 'draft',
    sections: q.sections.map((s) => ({ ...s, id: uid(), items: s.items.map((it) => ({ ...it, id: uid() })) })),
    terms: [...q.terms],
    spec: q.spec.map((x) => ({ ...x })),
  };
}

/** Terms printed on the quote: the quote's own terms + GST / validity / timeline lines. */
export function printedTerms(q: Pick<Quote, 'terms' | 'gst' | 'validityDays' | 'timeline'>) {
  const t = q.terms.filter((x) => x.trim());
  t.push(q.gst > 0 ? `GST @ ${q.gst}% is charged extra and is shown in the grand total` : 'GST (if applicable) is charged extra at the prevailing rate');
  t.push(`Validity of this quotation: ${q.validityDays || 15} days from the date of issue`);
  if (q.timeline.trim()) t.push(`Project timeline: approximately ${q.timeline.trim()} from the start date`);
  return t;
}

const item = (name: string, w: number, h: number, rate: number) => ({ id: uid(), name, w, h, rate });
const lump = (name: string, rate: number) => ({ id: uid(), name, rate, lump: true });
const room = (name: string, items: Section['items']): Section => ({ id: uid(), name, items });

/** The reference LIVORA quote — shown as a demo only, never saved. */
export function sampleQuote(): Quote {
  return {
    ...newQuote(null),
    quoteNo: 'SAMPLE',
    customer: { name: 'Sample Customer', phone: '', address: 'Hyderabad' },
    sections: [
      room('Master Bedroom', [item('Wardrobe Box', 5, 8, 1500), item('MBR Bed', 7, 6, 1200), item('Head Board', 8, 4, 600), item('Wall Panelling', 8, 5, 800), item('Toilet Box', 2, 1, 1500)]),
      room('GBR Bedroom', [item('Wardrobe Box', 7, 8, 1500), item('Dresser With Mirror', 3, 6, 1500), item('Toilet Box', 2, 1, 1500)]),
      room('CBR Bedroom', [item('Wardrobe Box', 11.9, 7, 1500), item('Loft Box', 11.9, 3, 1200), item('Toilet Box', 2, 1, 1500)]),
      room('Hall', [item('TV Unit Box', 3, 8, 1500), item('TV Trolley Unit Box', 1.5, 8, 1500), item('TV Panelling Work', 6, 8, 900)]),
      room('Crockery Unit', [item('Crockery Unit Box', 6, 7, 1500)]),
      room('Pooja Mandir', [item('Pooja Mandir Box', 6, 2, 1500), item('Pooja Mandir Panelling', 6, 6, 1200), item('Pooja Mandir Door', 3, 7, 450)]),
      room('Kitchen', [item('Lower Cabinet Box', 30.6, 11.2, 1500), item('Loft & Wall Unit Box', 24.3, 10, 1200), item('Loft Box', 34.6, 10.9, 1200)]),
      room('False Ceiling', [lump('Gypsum Ceiling', 83500)]),
      room('Painting', [lump('Painting Work', 115000)]),
      room('Electrical', [lump('Electrical Wiring & Material', 100000)]),
    ],
    finalCharge: 2200000,
  };
}
