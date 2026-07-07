
CREATE TABLE IF NOT EXISTS public.style_seeds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seed_code text UNIQUE NOT NULL,
  seed_name text NOT NULL,
  vertical_tags text,
  content text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.style_seeds TO anon, authenticated;
GRANT ALL ON public.style_seeds TO service_role;

ALTER TABLE public.style_seeds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "style_seeds_read" ON public.style_seeds;
CREATE POLICY "style_seeds_read" ON public.style_seeds FOR SELECT USING (true);

INSERT INTO public.style_seeds (seed_code, seed_name, vertical_tags, content, active) VALUES
('SEED-01', 'Broadsheet Estate', 'R, 高階住宅感', $seed$STYLE SEED: BROADSHEET ESTATE

Personality: quiet luxury real-estate portfolio — reads like a printed
property magazine, not a lead-gen page.

Typography: display = high-contrast serif (Fraunces or Canela-like via
"Fraunces" 600, optical size large); body = neutral grotesk (Inter 400/500);
utility/caption = same grotesk 500, letter-spaced uppercase 11-12px eyebrows.

Type scale: hero 68-76px desktop / 40px mobile, tight 1.02 leading;
section titles 34-40px serif; generous 18px body.

Palette roles: near-white warm paper surface; ink text (#1A1A18 fallback);
ONE deep brand accent used sparingly (links, thin rules, small labels) —
no colored section backgrounds except a single full-bleed dark band for
the featured-listing / signature section.

Layout: asymmetric split hero — 60% oversized headline + agent name as a
byline, 40% full-height photograph bleeding to the edge. Sections separated
by 1px hairline rules, not background-color changes. Two-column editorial
grids; numbers set in serif italic.

Shape language: zero border-radius. No card shadows — hairline borders only.

Imagery: large, uncropped architectural photography; portraits in B&W or
muted color; captions under photos like a magazine.

Signature element: a "listing index" — properties/services presented as a
numbered editorial index (address set in serif, price right-aligned in
grotesk) with a hover state that reveals the photo. Order = real listing
order, so numbering carries meaning.

Motion: none except a subtle fade-up on scroll for photos. No parallax.

Avoid: rounded cards, gradient overlays, badge pills, drop shadows.$seed$, true),

('SEED-02', 'Clinic Daylight', 'D, 現代診所感', $seed$STYLE SEED: CLINIC DAYLIGHT

Personality: calm, air-filled, quietly medical — the feeling of a bright
waiting room with good architecture. Trust through light and order.

Typography: display = geometric humanist sans (Sora or Manrope 700);
body = Manrope 400/500; no serif anywhere.

Type scale: hero 56-64px, leading 1.08; section titles 30-36px;
body 17-18px with relaxed 1.7 line-height.

Palette roles: soft off-white surface with a barely-there cool tint;
primary brand color reserved for CTAs and small icons; ONE pale tinted
surface (brand color at ~6-8% opacity) alternating on every second
section to create rhythm without hard color blocks.

Layout: centered hero with a short, benefit-led headline, a single CTA,
and a wide clinic photo below in a softly rounded container (24px radius,
only large containers get radius — buttons stay 8-10px). Services as a
3-up grid of tall cards with real procedure photos on top, generous
padding, 1px borders + very soft diffuse shadow.

Imagery: real clinic and team photos mandatory where available; duotone
treatment (brand color) for decorative imagery only.

Signature element: a horizontal "patient journey" strip — 4-5 steps of
the first-visit experience rendered as a connected line with dots and
short labels (this is a real sequence, so numbering/connection is
meaningful). Appears once, above the booking CTA.

Motion: gentle 200ms hover lifts on cards; nothing else.

Avoid: dark sections, aggressive gradients, stocky icon grids, dense text.$seed$, true),

('SEED-03', 'Signal Block', 'G, 大膽現代 — 餐飲/活動/年輕品牌', $seed$STYLE SEED: SIGNAL BLOCK

Personality: confident, poster-like, high energy without chaos —
Swiss-poster bones with one loud voice.

Typography: display = condensed heavy sans (Archivo Expanded/Black or
Anton) set in uppercase for the hero only; body = Archivo 400;
captions = mono (JetBrains Mono 400) for times, prices, dates.

Type scale: hero massive 76-88px desktop / 44px mobile, 0.98 leading,
uppercase; everything else deliberately modest (sections 28-32px).

Palette roles: one saturated brand color used as FULL-BLEED section
backgrounds (hero or featured section), paired with near-black and
paper-white blocks — the page reads as stacked color fields; text
switches ink/paper per field for contrast.

Layout: hero = solid color field, giant stacked headline left-aligned,
one mono-type info line (date/location/offer), one high-contrast CTA.
Sections alternate color fields; content in a strict 12-col grid with
oversized numerals for stats ONLY if source data has real numbers.

Shape language: sharp corners on blocks; pill-shaped buttons as the
single soft element.

Imagery: photos displayed full-bleed within their color field or in a
strict grid gallery; no floating framed images.

Signature element: an oversized vertical or horizontal ticker of the
business's real tagline/menu items/event names in outlined display type
along one section edge — only using REAL source wording.

Motion: ticker scrolls slowly; color fields snap, no fades.

Avoid: soft shadows, pastel tints, thin elegant serifs, hairline rules.$seed$, true),

('SEED-04', 'Heritage Ledger', 'G, 傳產信任感 — 營造/法律/會計', $seed$STYLE SEED: HERITAGE LEDGER

Personality: established, dependable, been-here-thirty-years —
letterhead and ledger, modernized.

Typography: display = sturdy transitional serif (Source Serif 4 600);
body = PT Sans or Public Sans 400/500; small caps letter-spaced labels.

Type scale: restrained hero 52-60px; comfortable 17px body.

Palette roles: warm paper surface; deep desaturated brand tone (navy /
forest / oxblood family) as the anchor for header band, footer, and
section headings; a metallic-feel secondary (muted gold/brass tone)
STRICTLY for thin rules and small icons — never large surfaces.

Layout: hero split with a solid deep-tone left panel (headline + est.
year + credentials line) and full-height photo right. Below: a
credentials bar (years, licenses, associations — real data only) set in
small caps between thin double rules, like a ledger heading. Services
as a two-column list with serif headings and rule dividers, not cards.

Shape language: 2-4px radius max; solid 2px borders on CTAs.

Imagery: real project/team photography in slightly desaturated grade;
никогда stockish smiling-handshake imagery unless it's the client's own.

Signature element: the "record strip" — a horizontal band listing real
completed projects/clients/years in ledger typography (tabular figures,
dotted leader lines between name and year), scrolling on overflow.

Motion: essentially none; hover = underline and darken.

Avoid: gradients, floating cards, rounded-2xl, playful icons.$seed$, true),

('SEED-05', 'Gallery Negative', 'G, 作品導向 — 攝影/美髮/蛋糕/設計', $seed$STYLE SEED: GALLERY NEGATIVE

Personality: the work IS the site; chrome disappears. Dark-room gallery.

Typography: display = elegant low-contrast sans (Neue-Haas-like via
"Instrument Sans" 500) at moderate sizes — type defers to imagery;
body same family 400; meta info in 12px letter-spaced uppercase.

Palette roles: near-black surface (#111 fallback) throughout; white
text; brand color appears ONLY as the hover/active state and the CTA —
a single luminous accent in the dark.

Layout: hero = one full-viewport signature image (or slow crossfade of
2-3 best works) with the business name small in the top-left and a
one-line positioning statement bottom-left; no big headline block.
Portfolio as a masonry/justified grid with 8px gaps, images unadorned
(no cards, no borders); hover reveals title + category in the corner.
About/contact sections stay dark, narrow measure (~640px), lots of
negative space.

Shape language: no radius, no borders, no shadows — separation by
spacing alone.

Signature element: the "lightbox counter" — current image index over
total (03 / 24) in mono type fixed to a corner while browsing the
gallery, echoing a contact sheet.

Motion: slow 600ms crossfades; hover zoom at 1.02 max.

Avoid: white sections, colored backgrounds, decorative icons, busy nav.$seed$, true),

('SEED-06', 'Coastal Modern', 'R, 西岸住宅/新牌 realtor 個人品牌', $seed$STYLE SEED: COASTAL MODERN

Personality: fresh, personable, Pacific-Northwest light — a new agent's
personal brand that feels established without pretending to be a firm.

Typography: display = friendly serif with personality (Lora 600 or
"Newsreader" 500 italic for accent words); body = clean sans
(Figtree 400/500). One italic serif word inside the hero headline as
the type signature.

Type scale: hero 60-68px; airy 1.15 leading (a softer voice than Seed 01).

Palette roles: warm white surface; soft sand/stone secondary surface for
alternating sections; brand color in a muted coastal register for CTAs,
links, and the map pin motif; plenty of whitespace as an actual color.

Layout: hero = large friendly agent portrait right (organic arch-top
mask — the ONE curved element), headline + neighborhood-focused subline
left, dual CTA (view listings / free evaluation). Neighborhood expertise
as a 2-3 card row with real area photos. Testimonials as large single
quotes, one per viewport, serif italic.

Shape language: mostly square with 12px radius on cards; the arch mask
on portraits is the only expressive curve.

Signature element: the "neighborhood map card" — a stylized local map
section with the agent's real service areas pinned, each pin opening a
short area blurb (real areas from source data only).

Motion: soft fade-slide on scroll, 250ms; arch portrait has none.

Avoid: corporate navy+gold clichés, skyline stock photos, badge walls.$seed$, true),

('SEED-07', 'Precision Grid', 'G, 科技/顧問/B2B 服務', $seed$STYLE SEED: PRECISION GRID

Personality: engineered, exact, quietly confident — the design equivalent
of a well-organized workshop.

Typography: display = sharp neo-grotesk (Space Grotesk 600); body =
IBM Plex Sans 400; data/labels = IBM Plex Mono 400. Mono is a first-class
citizen: nav labels, section indices, stats all mono.

Type scale: hero 56-64px with mono eyebrow above; tight modular scale.

Palette roles: cool near-white surface with a VISIBLE baseline grid
(1px lines at 4-6% opacity across full sections — the grid is decor);
ink text; brand color for interactive elements and one framed
highlight box per page.

Layout: hero left-aligned on the visible grid, headline + mono subline +
CTA; a thin horizontal spec-bar under the hero listing 3-4 real facts
(founded / projects / response time — source data only) in mono.
Services as bordered grid cells sharing hairlines (a real table, not
floating cards); hovering a cell inverts it to ink.

Shape language: 0-2px radius; 1px hairlines everywhere; no shadows.

Signature element: the shared-hairline service TABLE with inversion
hover — sections feel like one engineered sheet rather than stacked
blocks.

Motion: instant inversions, 120ms; no easing theatrics.

Avoid: gradients, blobs, rounded cards, emoji-style icons.$seed$, true),

('SEED-08', 'Warm Table', 'G, 家庭餐飲/社區組織/農場', $seed$STYLE SEED: WARM TABLE

Personality: handmade warmth with professional bones — community, food,
family business. Inviting, never childish.

Typography: display = rounded-edge serif or slab with warmth
("Gelica"-like via Zilla Slab 600 or "Bricolage Grotesque" 600);
body = Nunito Sans 400/500.

Type scale: hero 56-64px; cozy 1.12 leading; body 17-18px.

Palette roles: warm cream-to-tan layered surfaces (two warm neutrals
alternating); brand color in an earthy register for CTAs and section
accents; a second accent from the brand family for small highlights —
this seed is allowed TWO accents, used like table linens.

Layout: hero = full-width warm photo with a soft dark gradient only at
the text zone, headline + one-line story + CTA; then an intro section
with a short real founder/family line beside a candid photo in a thick
paper-white frame (like a printed photo). Offerings as generous cards
with real food/product photos, 16px radius, warm shadow.

Signature element: the "table runner" divider — a thin repeating motif
strip (dots / stitch line / produce silhouette derived from the actual
business type) separating major sections, replacing plain whitespace
breaks. Only ONE motif, used consistently.

Motion: soft 300ms fades; gentle scale on food photos.

Avoid: corporate blue, sharp black sections, mono type, sterile grids.

---$seed$, true)
ON CONFLICT (seed_code) DO NOTHING;
