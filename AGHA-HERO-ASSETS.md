# AGHA cinematic hero — asset manifest

All hero media was generated in **Google Flow** on 22 Sep 2026 from the authentic
Agha bottle photograph `assets/bestseller_oud_royal.jpg` (AGHA · OUD ROYAL ·
Extrait de Parfum), which was attached as the visual reference for every bottle
shot so the bottle, cap, label and proportions stay identical.

- Stills: Nano Banana 2 (0 credits) · 16:9 at 1376×768, 9:16 at 768×1376 / 1536×2752
- Clips: Veo 3.1 Lite (10 credits each) · 1280×720 · 24 fps · 8 s · silent
- Flow project: "Sept 22 – 16:55" in the connected Google account

Shopify does not allow sub-folders inside `/assets`, so the files are flat and
prefixed `agha-hero-` instead of living in `assets/agha-hero/`.

Every asset is delivered twice: `.webp` + `.jpg` for stills, `.webm` (VP9) +
`.mp4` (H.264, faststart) for clips. Total weight of the set is about 8.5 MB, but a
visitor only ever downloads the scene they reach (see performance notes).

## Shot list

| Scene | Shot | Files | Notes |
| --- | --- | --- | --- |
| 01–02 Darkness / Atmosphere | Narrow beam through haze in a black studio | `agha-hero-atmosphere.{webp,jpg,webm,mp4}` | Clip: slow dolly forward, haze drift. Loops. |
| 03 Ingredient | Saffron threads and a black rose petal on aged agarwood (Oud Royal notes) | `agha-hero-ingredient.{webp,jpg,webm,mp4}` | Clip: sliver of light travels across the wood grain. Loops. |
| 04 Material transition | Agarwood grain dissolving into the bevelled black glass edge | `agha-hero-material.{webp,jpg,webm,mp4}` | Clip: camera travels from the grain to the glass edge while one light crosses both. Plays once. |
| 04 Bottle surface | Extreme macro of the gold AGHA OUD ROYAL label on glass | `agha-hero-bottle-macro.{webp,jpg,webm,mp4}` | Clip: slow glide across the lettering with a sliding highlight. Plays once. |
| 05 Bottle reveal | Full bottle on slate, bottle in the right third, negative space left | `agha-hero-bottle-reveal.{webp,jpg,webm,mp4}` | Clip: pull-back, light sweep, haze grows. Plays once. |
| 06–07 Campaign | Bottle on a black stone plinth, rim light, haze | `agha-hero-bottle-campaign.{webp,jpg,webm,mp4}` | Still is used by default. The orbit clip changes the bottle material mid-shot, so it is shipped but switched off (`campaign_video` setting). |
| 08 Closing | Warm haze corridor, plinth silhouette at the bottom edge | `agha-hero-closing.{webp,jpg,webm,mp4}` | Clip: forward move into the haze. Plays once and hands off to THE HOUSE. |
| Mobile 01–02 | Vertical beam onto a stone floor | `agha-hero-mobile-atmosphere.{webp,jpg}` | 1080×1935 (from the 2K export). |
| Mobile 03 | Vertical ingredient still life | `agha-hero-mobile-ingredient.{webp,jpg}` | |
| Mobile 05–08 | Vertical bottle on plinth, negative space in the top third | `agha-hero-mobile-bottle.{webp,jpg}` | |

## Known limitations

- The Google account is on the free Flow tier (50 credits per day, visible
  watermarking mandatory in this region). Every Flow file therefore carries a
  small mark in the bottom-right corner ("Veo" on clips, a sparkle on stills).
  It sits under the vignette but is still there. Upgrading the plan removes it;
  the hero code needs no change to swap the files.
- Clips are 720p. Flow offers 1080p / 4K upscales on paid plans; the section
  reads the same filenames, so re-exporting is a drop-in replacement.
- Unused alternates (a second take of every shot) remain in the Flow project.

## Section, styles, script

- `sections/agha-hero.liquid` — markup + Theme Editor schema
- `assets/agha-hero.css` — layout, layers, typography, mobile, reduced motion
- `assets/agha-hero.js` — one master GSAP timeline scrubbed by ScrollTrigger
