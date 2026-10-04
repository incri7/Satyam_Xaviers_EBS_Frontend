# Website design v3: the app's look, one scroll timeline, model v3

Every decision below names the skill it comes from. Skills read for this pass:
frontend-design, gsap-scrolltrigger, gsap-timeline, gsap-performance,
web3d-integration-patterns, modern-web-design, r3f-fundamentals, r3f-loaders,
r3f-materials, r3f-textures, r3f-shaders, r3f-postprocessing, r3f-animation.

## Subject, audience, job (frontend-design: ground the design in the subject)

- **Subject:** a Nursery-to-Class-10 English boarding school in Hetauda-4, Chisapani. A yellow
  four-storey building with blue slab edges, a gravel yard and a blue gate.
- **Audience:** families in Hetauda, mostly on phones, reading English or Nepali.
- **Job:** show that the school is alive and modern, and get a family to call or visit for
  admission. The parent app the school already runs is the proof of "modern", so the site
  wears the app's look.

## Tokens (the app's v3 logo-blue system, `src/styles/tokens.css` in the app)

| Name | Hex | Role on the site |
|---|---|---|
| Navy | `#13295B` | Ink, headings, the admissions block |
| Deep | `#0B1A3D` | The shade behind text inside the 3D stage, the loader, the footer |
| Royal | `#1F52A6` | Every action: buttons, links, focus |
| Sky | `#B4D8E4` | Small text on dark (the Nepali line, step numbers), the progress bar |
| Canvas | `#F4F7FA` | Page background outside the stage (the app's canvas) |
| Crest | `#D12A3C` | Dots only, as in the app: the current-floor marker and the "admissions open" dot |

Dark mode (`prefers-color-scheme: dark`) swaps to the app's dark values (canvas `#0B1220`,
surface `#111B2D`, ink `#EEF3F9`). The 3D stage keeps its own moods.

**The building is the only warm thing on the page.** Its yellow walls, the peach morning sky
and the green trees come from the model. Everything the page draws is the app's cool blue, so the
building stands out against it.

## Type

- **Bricolage Grotesque** (variable: opsz 12–96, wdth 75–100, wght 200–800). Used for display:
  headlines, floor titles, the phone number. At large sizes its optical axis gives it its quirky
  ink traps. The **width axis is the treatment**: on load the headline sets from condensed
  (wdth 75) to full width while the building rises floor by floor, so the type grows the way the
  building does.
- **Geist** for body text and the interface (as in the app).
- **Mukta** for every Devanagari line (as in the app). It has taller line height (`:lang(ne)`), so
  matras never clip.
- Scale (classic, *Elements of Typographic Style*): 14, 16, 18, 21, 24, 36, 48, 60, 72, 96.
  Body 18 on desktop, 16 on phones. Lines under 68 characters.

## Layout

**One lower-third system inside the stage.** Hero, floor captions and the end card all sit
bottom-left over the same deep-navy radial shade, like film titles. The building keeps the
upper and right part of the frame. No frosted cards.

```
desktop, hero
┌ crest Satyam Xavier's            About Academics Life Admissions News Contact  नेपाली [Start admission] ┐
│                                                                   Morning | Day   │
│                    ▲ the building, rising                                    ━ 3  │
│                                                                              ━ 2  │
│                                                                              ━ 1  │
│  Growing up in                                                               ━ 0  │
│  Chisapani                                                                        │
│  since 2059.                                                                      │
│  २०५९ देखि चिसापानीमा हुर्कँदै।                                                     │
│  [Start admission]  [Call 057-525563]                                             │
│  Hetauda-4, Chisapani. Nursery to Class 10.                Scroll to walk in      │
└───────────────────────────────────────────────────────────────────────────────────┘

desktop, a floor                                   phone, a floor
┌─────────────────────────────────────────────┐   ┌───────────────────┐
│            classroom / balcony view    ━ 3  │   │  3D view      ━ 3 │
│                                        ━ 2● │   │               ━ 2●│
│                                        ━ 1  │   │               ━ 1 │
│  Going deeper.                         ━ 0  │   │               ━ 0 │
│  अझ गहिराइमा।                              │   │ Going deeper.     │
│  Group work, projects for the ...           │   │ अझ गहिराइमा।      │
└─────────────────────────────────────────────┘   │ Group work, ...   │
                                                  └───────────────────┘
```

- **The storey rail** (right edge) is the one structural device. It is information, not
  decoration (frontend-design: structure must encode content). The building really has four
  floors in a real order, ground at the bottom, and each holds a real stage of school
  (Nursery–UKG, 1–5, 6–8, 9–10). The current floor gets the crest dot and its class range. Each
  floor is a button that walks the camera there (motion that answers a person's action).
- Text is **left-aligned** everywhere. Captions are capped at 30 characters per line for the
  title and 52ch for the body.
- Below the stage, the sections sit on the app canvas. They are static, with no
  fade-and-slide-up per section (frontend-design: one orchestrated moment, not scattered
  effects).
  - **Parents** shows a phone with the app's real parent home: a green "in school" status card
    with the week strip, and the fee and exam tiles, drawn with the app's own styles.
  - **Result:** the sentence and the photo.
  - **School life:** the photo grid, with the app's 20 px card radius.
  - **Admissions** on navy, with the three real steps numbered. They are a real sequence, so
    numbering is honest: Devanagari numerals in Nepali.
  - **Footer** on deep navy.

## Motion (gsap-timeline, gsap-scrolltrigger, gsap-performance, web3d-integration-patterns)

**One owner per property** (web3d-integration-patterns, pitfall 1):

- GSAP owns the camera rail value, caption opacity and transform, the scrims and the photo
  fades.
- React owns discrete state: which floor is current, inside or outside, and the mood.
- CSS owns only the one-time load entrance of the headline lines.

### The load moment (frontend-design: a single orchestrated moment)

1. A deep-navy loader with the progress line in sky.
2. When the scene is ready, the loader lifts. It moves with `yPercent` (transform only, per
   gsap-performance).
3. Floors 0–3 rise in sequence, followed by the tower, roof and gate.
4. The model's `students` fade in after the climb, as the v3 README asks. They stand on the
   corridors, so they must not float while the floors are still growing.
5. At the same time, the headline lines slide up and widen from wdth 75 to 100.

The width change animates `font-variation-settings`, which relayouts the text. That is
acceptable once, for three lines over about one second. It is **never** used on scroll: the
scroll exit uses only transform and opacity (gsap-performance).

### The scroll (one master timeline)

- One `gsap.timeline` carries everything, with one ScrollTrigger on the timeline itself
  (gsap-scrolltrigger: ScrollTriggers only on top-level timelines, never on child tweens).
- The ScrollTrigger runs `scrub: 0.6` with Lenis smoothing. Everything is scrubbed, so
  scrolling back plays the story backwards exactly. Captions no longer pop in by React key.
- **A label for every stop** (gsap-timeline: labels for readable sequencing): `hero`,
  `balcony0…3`, `room0…3`, `end`.
  - The rail tweens between stops use `sine.inOut`, with a 0.7 hold at each stop.
  - Captions are placed relative to the labels with the position parameter: in 0.5 before their
    balcony, out 1.0 before the next one.
  - The window photos fade in on `photos.fN`, scrubbed.
- The storey rail jumps with `scrollTrigger.labelToScroll('balconyN')` through Lenis
  (gsap-scrolltrigger API). It does not snap.
- **No snap** (modern-web-design pitfall 6: don't hijack scroll). The holds give the stops
  their weight instead.
- `ScrollTrigger.refresh()` runs after fonts load, because the font swap changes the height
  of the text below the stage (gsap-scrolltrigger: refresh after layout changes).
- Reduced motion:
  - no load choreography and no width animation;
  - `scrub: true` (no lag);
  - Lenis off;
  - captions still change, without movement.

## 3D (r3f-loaders, r3f-materials, r3f-textures, r3f-shaders, r3f-postprocessing)

- **Model v3** (`bec41da`): same nodes, slots and lightmap manifest, plus `students`, `fogNear`,
  `fogFar`, `sky` and `figureTint`.
- **Students:** `MeshBasicMaterial({ vertexColors, color: figureTint })`, unlit as the README
  says.
  - The material is created by us and owned by us (r3f-materials: clone or replace before
    editing cached glTF materials).
  - The tint follows the mood. `transparent` is on only while they fade, so no sorting cost
    after (r3f-materials: transparency).
- **Sky:** a three-stop gradient dome from `mood.sky`.
  - The colours go through `THREE.Color`, so they are linear.
  - The composer owns the output conversion, so the shader writes linear and adds no colorspace
    chunk of its own (r3f-shaders: let the composer own final output).
  - The dome grows to 10 km, because the hills now stand 1.3–3.7 km out.
- **Fog** from the manifest (400 m to 7 km) so the hill ridges recede in layers. The camera's
  far plane is raised to 12 km to match.
- **Lightmaps:** unchanged path. `channel = 1`, `flipY = false`, sRGB (r3f-textures: lightmap
  UV channel, colour space).
- **Composer:** the existing order, with DOF only on desktop:
  `DepthOfField → Bloom → Vignette → ToneMapping(AGX) → SMAA`. HDR effects stay before tone
  mapping (r3f-postprocessing), and nothing is added.

## Review against the brief (frontend-design: revise what reads as a default)

| First idea | Why it was a default | Changed to |
|---|---|---|
| Frosted glass cards for the floor text | The SaaS card kit and generic glassmorphism; it also covered the classroom | A lower-third over a navy shade. Nothing covers the building |
| A label above every caption ("Class 6 to 8.") | A typographic label above content | The class range moves into the storey rail, where it is information |
| Floor tabs as a row of pills along the bottom | Template chrome | A vertical storey rail ordered like the building, ground at the bottom |
| Fade-up reveals on every section below | The commonest generated-page tell | Static sections; the only motion is the climb and the load moment |
| A big "3.96" number with a small label for the result | The default stat treatment | Kept as the sentence the ward office gave, beside the photo |
| The yellow admissions block and the studio palette | Not the app; the client locked the logo blue | Navy admissions, app canvas, app tokens throughout |

## Checks before calling it done

- The `?u=` frames at every stop on desktop and phone show:
  - nothing between the camera and the building (v3 trees and shrubs are bigger);
  - captions readable;
  - the storey rail clear of the 3D focus.
- `npm run build` passes with no type errors.
- Reduced motion works.
- Keyboard: the storey rail buttons, the mood toggle and the nav all show visible focus.
- Nepali: no clipped matras; the Mukta line height applies.

## Critique pass (screenshots at 1440 × 900 and 390 × 844, both languages, both moods)

| Seen | Changed |
|---|---|
| The hero camera crowded the building: no sky, no hills | Lower and further back (`HERO` in `rig.ts`), so the v3 ridges stand behind it. The end shot mirrors it |
| The storey rail's bare bars read as decoration | The labels show (dimmed) at the hero and the end. On a floor only the current label shows. Inside a room only the bars show. Using the rail brings all the labels back: one state table in `styles.css` |
| A v3 tree crown filled the ground-floor balcony shot | Found by ray-casting the whole rail against the model (dev builds expose `window.__scene`). The ground floor is now seen from the open yard to the east |
| On a phone the classroom showed only the blackboard | Every classroom shot aims between the board and the photo wall |
| The students were invisible; only their baked shadows showed | Materials were assigned inside `useMemo`. React's strict mode runs a memo twice, so the meshes held a material nobody faded. Assignment moved to layout effects (the slots had the same flaw) |
| Phone number broke at its hyphen; TBC marks unreadable on navy | Non-breaking hyphen; light TBC marks on navy surfaces |
