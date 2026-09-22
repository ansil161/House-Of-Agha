# ShiptiFy — Luxury Editorial Theme

## 1. Theme Identity

**Theme name:** Luxury Editorial  
**Visual direction:** High-Fashion / Premium Fragrance / Monochrome Editorial  
**Brand feeling:** Sophisticated, exclusive, confident, mysterious, refined, premium.

The interface should feel closer to a luxury fashion magazine or premium fragrance campaign than a conventional e-commerce website.

### Core design statement

> **Minimal luxury with strong editorial art direction.**

The design should communicate quality through typography, composition, photography, spacing, and restraint rather than through excessive decoration.

---

## 2. Visual Keywords

Use these keywords when designing or generating new sections:

- Luxury editorial
- High-fashion art direction
- Monochrome luxury
- Premium fragrance aesthetic
- Fashion magazine layout
- Cinematic photography
- Sophisticated minimalism
- Editorial typography
- Asymmetric composition
- Premium commerce
- Quiet luxury
- Black-and-white photography
- High contrast
- Refined minimal UI

Avoid describing the theme as a generic "modern SaaS", "minimal startup", or "glassmorphism" design.

---

## 3. Color System

The primary visual language is monochrome.

### Primary colors

```css
--color-black: #080808;
--color-near-black: #111111;
--color-charcoal: #1A1A1A;
--color-white: #F5F5F3;
--color-soft-white: #E7E7E5;
--color-muted: #9A9A9A;
--color-border: #303030;
```

### Usage

- **Black / near-black:** Main page backgrounds and hero surfaces.
- **White / soft white:** Primary headlines and important text.
- **Muted gray:** Supporting descriptions and metadata.
- **Charcoal:** Secondary surfaces.
- **Thin gray borders:** Structural separation.
- Avoid unnecessary accent colors.
- If an accent color is introduced, it must be extremely restrained and feel premium.

### Color principle

**Contrast should come from black vs. white, not from multiple colors.**

---

## 4. Typography

Typography is one of the most important parts of the theme.

### Display typography

Use an elegant, high-contrast serif for major statements.

Characteristics:

- Editorial
- Fashion-oriented
- High contrast
- Large scale
- Elegant letterforms
- Tight visual composition

Example style:

```text
THE SCENT IS
THE LUXURY.
```

### Supporting typography

Use a clean modern sans-serif for:

- Paragraphs
- Navigation
- Buttons
- Metadata
- Product information
- Small labels

### Typography hierarchy

```text
Hero headline:
Very large / editorial serif / uppercase or title case

Section headline:
Large serif

Supporting headline:
Medium serif or refined sans-serif

Body:
Clean sans-serif / comfortable line-height

Metadata:
Small uppercase sans-serif / increased letter spacing

Buttons:
Small uppercase or refined title case
```

### Typography rules

- Use oversized headlines intentionally.
- Keep headlines short and powerful.
- Use generous line-height for large serif headlines.
- Use letter spacing on small uppercase labels.
- Do not make every element bold.
- Avoid excessive font variation.
- Typography should create hierarchy before decoration does.

---

## 5. Layout Philosophy

The layout should be **editorial and asymmetric**, not a standard centered website.

### Preferred compositions

- Split-screen hero
- Large image + text block
- Image extending beyond normal grid boundaries
- Offset content
- Uneven columns
- Full-bleed photography
- Overlapping labels
- Editorial grids
- Large negative space
- Horizontal compositions
- Strong vertical rhythm

### Avoid

- Repetitive 3-column card grids
- Generic centered hero sections
- SaaS-style dashboard layouts
- Excessive rounded cards
- Floating gradient blobs
- Random decorative shapes
- Excessive glassmorphism
- Overly colorful interfaces
- Every section using the same layout

---

## 6. Hero Section

The hero should immediately establish the premium identity.

### Recommended structure

A large viewport-based split composition:

```text
┌───────────────────────────────┬──────────────────────────────┐
│                               │                              │
│  SMALL EDITORIAL LABEL        │                              │
│                               │      LARGE EDITORIAL         │
│  HUGE SERIF HEADLINE          │         PHOTOGRAPHY          │
│                               │                              │
│  Supporting paragraph         │       Product / Model       │
│                               │                              │
│  [ PRIMARY CTA ] [ SECONDARY ]│                              │
│                               │                              │
│  ─────────────────────────    │                              │
│  STATS / PRODUCT INFORMATION  │                              │
└───────────────────────────────┴──────────────────────────────┘
```

### Hero characteristics

- Full viewport or near-full viewport.
- Dark background.
- Large editorial headline.
- High-quality photography.
- Image should feel integrated into the composition.
- Avoid placing the image inside a generic rounded card.
- Small floating labels can be used sparingly.
- CTAs should remain simple and premium.

---

## 7. Photography Direction

Photography is a major component of the theme.

### Preferred photography

- Black-and-white or highly desaturated
- Fashion editorial
- Studio photography
- Premium product photography
- Dramatic but natural lighting
- Strong shadows
- Close-up compositions
- Human-centered imagery
- Elegant poses
- High-end campaign photography
- Film/editorial feeling

### Image treatment

Images may use:

- Monochrome filters
- High contrast
- Soft grain
- Subtle vignette
- Deep blacks
- Controlled highlights

Do not over-process images.

### Image composition

Prefer:

- Faces partially cropped
- Product held close to the subject
- Strong foreground/background relationship
- Large image areas
- Unexpected crops
- Editorial framing

Avoid:

- Generic stock-photo poses
- Obvious corporate photography
- Perfectly centered product cards
- Excessive rounded image containers

---

## 8. Navigation

Navigation should be minimal and sophisticated.

### Recommended structure

```text
LOGO

COLLECTIONS
ABOUT
PHILOSOPHY
CONTACT

                    CART / MENU
```

### Navigation style

- Small typography
- Uppercase labels where appropriate
- Generous spacing
- Thin separators
- Minimal icons
- Transparent or dark background
- Navigation should not visually compete with the hero

On mobile, use a clean hamburger/menu interaction rather than showing too many links.

---

## 9. Buttons

Buttons should look refined rather than decorative.

### Primary button

```text
┌──────────────────────────┐
│  SHOP BESTSELLERS   →    │
└──────────────────────────┘
```

Characteristics:

- Light background on dark surfaces
- Dark text
- Square or subtly rounded corners
- Medium padding
- Small refined typography
- Subtle hover movement

### Secondary button

```text
┌──────────────────────────┐
│  OUR PHILOSOPHY          │
└──────────────────────────┘
```

Characteristics:

- Transparent
- Thin border
- White/light text
- Minimal hover transition

Avoid oversized pill-shaped CTA buttons unless specifically required.

---

## 10. Cards

Cards should be used carefully.

The theme should **not** become a collection of rounded cards.

### Preferred card treatment

- Flat dark surfaces
- Thin borders
- Minimal radius
- Large imagery
- Editorial metadata
- Strong typography
- Asymmetric dimensions

Cards should feel like **editorial modules**, not SaaS components.

---

## 11. Product Presentation

Products should be presented as luxury objects.

### Product layout

Prefer:

- Large product photography
- Generous negative space
- Minimal information
- Strong product name
- Small metadata
- Refined pricing
- Editorial descriptions

Example:

```text
ROMANCE

30 ML · EXTRAIT DE PARFUM

A refined composition built around
warm woods and soft florals.

₹ XXXX
```

Avoid overwhelming the user with badges, filters, shadows, and UI elements.

---

## 12. Editorial Sections

Content sections should feel like pages of a luxury magazine.

### Example composition

```text
SMALL LABEL

THE ART
OF SCENT

                         Large image

Short editorial paragraph

01 — ORIGIN
02 — CRAFT
03 — CONCENTRATION
```

Use visual rhythm by alternating:

- Text-heavy sections
- Image-heavy sections
- Full-bleed photography
- Dark/light transitions
- Large typographic statements

---

## 13. Statistics / Proof

Statistics should be treated as editorial information rather than dashboard widgets.

Example:

```text
35%
OIL CONCENTRATION

10–12
HOURS ON FABRIC

8–10
HOURS ON SKIN

52
FRAGRANCES
```

### Style

- Large numbers
- Small uppercase labels
- Thin divider lines
- Generous horizontal spacing
- Minimal decoration

---

## 14. Spacing

Use generous spacing.

### Suggested scale

```css
--space-xs: 8px;
--space-sm: 16px;
--space-md: 24px;
--space-lg: 40px;
--space-xl: 64px;
--space-2xl: 96px;
--space-3xl: 144px;
--space-4xl: 200px;
```

Luxury should feel **unhurried**.

Do not compress too much content into a small space.

---

## 15. Borders and Elevation

The theme relies more on borders and contrast than on shadows.

### Borders

```css
border: 1px solid rgba(255,255,255,0.14);
```

Use thin structural borders.

### Shadows

Use very subtle shadows only when necessary.

Avoid:

```text
large soft shadows
neon glow
colored glow
floating card shadows
```

The black/white contrast should create most of the depth.

---

## 16. Border Radius

Use restrained corner rounding.

Recommended:

```css
--radius-none: 0px;
--radius-sm: 2px;
--radius-md: 4px;
--radius-pill: 999px;
```

Use:

- Mostly square editorial surfaces.
- Small radius for functional UI.
- Pill shapes only for small metadata tags or selected controls.

Do not make every component heavily rounded.

---

## 17. Motion & Animation

Animation should feel **slow, intentional, and luxurious**.

### Recommended motion

- Image reveal
- Clip-path image transitions
- Slow image scale
- Text stagger
- Letter-by-letter headline reveal
- Mask reveals
- Subtle parallax
- Horizontal editorial transitions
- Smooth hover image zoom
- Product rotation/reveal
- Scroll-based typography movement

### Suggested timing

```text
Micro interaction: 200–350ms
Standard transition: 500–800ms
Editorial reveal: 800–1200ms
Hero image movement: 1200–1800ms
```

### Easing

Prefer:

```text
ease-out
cubic-bezier
expo.out
power3.out
power4.out
```

Avoid bouncy/cartoon-like animation.

### Motion principle

**Movement should feel like a fashion campaign, not a software demo.**

---

## 18. Scroll Experience

Scrolling should reveal the brand progressively.

Recommended techniques:

- GSAP ScrollTrigger
- Image clip-path reveals
- Pinning selected editorial sections
- Horizontal scroll moments
- Text/image synchronization
- Parallax
- Sticky editorial statements
- Number transitions
- Progressive image cropping

Do not animate every element.

Use motion to establish hierarchy.

---

## 19. Hover Interactions

Hover effects should be subtle.

Examples:

### Image

```text
Image scale: 1 → 1.03
Duration: 700ms
```

### Button

```text
Arrow moves slightly right
Background transitions
Text shifts subtly
```

### Product

```text
Image changes / reveals alternate crop
Product information remains stable
```

Avoid excessive hover transformations.

---

## 20. Responsive Design

The luxury editorial identity must remain intact on mobile.

### Desktop

- Large asymmetric compositions
- Split-screen layouts
- Large typography
- Full-bleed photography

### Tablet

- Reduce typography scale
- Preserve asymmetric structure where possible
- Rebalance image/text proportions

### Mobile

Do not simply stack everything into ordinary cards.

Use:

- Large typography
- Full-width photography
- Editorial cropping
- Horizontal media strips
- Sticky content where useful
- Strong vertical rhythm

The mobile version should feel like a **mobile fashion editorial**, not a collapsed desktop layout.

---

## 21. Content Tone

Copy should be:

- Short
- Confident
- Refined
- Sensory
- Direct
- Premium

Prefer:

> Crafted for those who know the difference.

Instead of:

> We provide high-quality perfumes at affordable prices.

### Writing style

Use short statements with strong emotional weight.

Examples:

```text
THE SCENT IS THE LUXURY.

CRAFTED TO LINGER.

LESS MARKETING.
MORE CONCENTRATION.

MADE FOR THOSE WHO NOTICE.

THE ART OF WEARING SCENT.
```

Avoid excessive marketing jargon.

---

## 22. UI Rules

### Always

- Prioritize typography.
- Use high-quality photography.
- Maintain strong contrast.
- Use generous whitespace.
- Keep UI elements restrained.
- Create asymmetry.
- Make imagery part of the layout.
- Use editorial hierarchy.
- Keep motion subtle and purposeful.

### Never

- Use generic SaaS cards.
- Overuse gradients.
- Overuse glassmorphism.
- Use random floating blobs.
- Add unnecessary glow.
- Make every section identical.
- Use excessive rounded rectangles.
- Overload the interface with icons.
- Use colorful dashboard-like UI.
- Turn the design into a generic template.

---

## 23. Component Design Language

Every component should answer:

**"Would this look natural inside a premium fashion magazine?"**

If not, simplify it.

### Component characteristics

```text
Minimal
Editorial
High contrast
Typography-led
Photography-led
Asymmetric
Refined
Quiet
Premium
```

---

## 24. Design Formula

The overall design can be summarized as:

```text
BLACK / WHITE
        +
EDITORIAL SERIF
        +
HIGH-END PHOTOGRAPHY
        +
ASYMMETRIC GRID
        +
LARGE TYPOGRAPHY
        +
GENERATIVE / SCROLL MOTION
        +
RESTRAINT
        =
LUXURY EDITORIAL EXPERIENCE
```

---

## 25. AI / Design Generation Prompt

When generating new UI concepts for ShiptiFy, use this base direction:

> Design a premium luxury fragrance e-commerce website inspired by high-fashion editorial campaigns and sophisticated perfume branding. Use a monochrome black, white, and charcoal palette, elegant high-contrast serif typography paired with a refined modern sans-serif, oversized editorial headlines, cinematic black-and-white fashion photography, asymmetric split-screen layouts, generous negative space, thin borders, subtle metadata labels, restrained square-corner UI, premium product presentation, and sophisticated editorial composition. Avoid generic SaaS layouts, excessive rounded cards, glassmorphism, colorful gradients, glowing effects, floating blobs, and template-like sections. The experience should feel like a luxury fashion magazine combined with a premium fragrance house. Use subtle cinematic motion, image reveals, typography transitions, and scroll-driven composition without making the interface feel flashy.

---

## 26. Final Art Direction

The goal is not simply to make the website black and white.

The goal is to create a **luxury editorial system** where:

**Typography creates authority.**  
**Photography creates emotion.**  
**Negative space creates luxury.**  
**Asymmetry creates personality.**  
**Motion creates refinement.**  
**Restraint creates premium perception.**

Every new page and component should remain consistent with this art direction.
