# Storyline v4: step inside, and every object opens a page

Replaces the floor-by-floor climb in `design-v3.md`. Its look (app tokens, type, one shade for
text) stays. **Why the change:** visiting four similar classrooms to show a few photos explained
pictures, not the school. In v4 each thing you meet inside the school *is* a page: the blackboard
is the programmes, the teacher's book is the school's story, the laptop on the balcony is the
gallery and the gate is admissions. You zoom into it to read it, and zoom back out to walk on.

The skills behind it are cited inline: frontend-design, brag (story shape: hook, reveal,
highlights, punchline), gsap-scrolltrigger, gsap-timeline, gsap-performance,
web3d-integration-patterns, modern-web-design, r3f-textures, r3f-materials, r3f-postprocessing,
blender-pro-workflow, blender-modeling, blender-export and blender-web-pipeline.

## What a parent comes to find out (mapped before choosing the pages)

| A parent wants to know | Page | Object in the story | Status |
|---|---|---|---|
| What will my child learn, at what age? | **Programmes** | the blackboard | asked for |
| Who runs this school, and can I trust it? | **About us** (our story, people, pride) | the teacher's open book | asked for |
| What is school life really like? | **Gallery** | the laptop on the balcony | asked for |
| How do I get my child in? Where are you? | **Admissions and contact** | the signboard on the gate | missing until now, added |
| What is happening this week? | **News and notices** | the corridor notice board | missing; second phase |
| Will I know my child is safe in school? | the parent app, inside Admissions ("after you join") | a parent's phone at the gate | kept from v3 |

## The story (brag shape: hook, reveal, three highlights, punchline)

```
HOOK        the building at dawn rises floor by floor                    "Growing up in Chisapani since 2059."
REVEAL      across the yard, up the steps, through a classroom door
HIGHLIGHT 1 the teacher chalks on the board  → ZOOM INTO THE BOARD   → Programmes  → back out of the board
HIGHLIGHT 2 she reads from an open book      → ZOOM INTO THE BOOK    → About us    → back out of the book
HIGHLIGHT 3 balcony: teacher, pupil, laptop  → ZOOM INTO THE SCREEN  → Gallery     → back out of the screen
PUNCHLINE   over the roof, down to the gate  → ZOOM INTO THE GATE SIGN → Admissions and contact → footer
```

Scrolling up plays every move backwards, page by page.

### Keyframes

```
 1 HOOK (as v3)               2 INSIDE THE CLASSROOM          3 THE BOARD FILLS THE SCREEN
┌──────────────────────┐    ┌──────────────────────┐    ┌──────────────────────┐
│        ▲ hills       │    │  ┌──────────────┐    │    │ From first letters   │
│     ▐▀▀▀▀▀▀▀▌        │    │  │ From first   │ ☺  │    │ to the SEE.          │
│     ▐ school ▌       │    │  │ letters to   │ /| │    │                      │
│ Growing up in        │    │  │ the SEE.     │    │    │ Nursery · Class 10   │
│ Chisapani            │    │  └──────────────┘    │    │ (chalk on green)     │
│ since 2059.          │    │  ◘ ◘ ◘ ◘  ◘ ◘ ◘ ◘    │    │  ↓ the page begins   │
└──────────────────────┘    └──────────────────────┘    └──────────────────────┘
   the teacher writes; 14 children at desks, seen from behind; the camera walks up to the board

 4 THE BOOK IN HER HANDS      5 THE BALCONY LAPTOP            6 THE GATE SIGN
┌──────────────────────┐    ┌──────────────────────┐    ┌──────────────────────┐
│ ┌────────┬────────┐  │    │ ═══ railing ═══      │    │ ║ Admissions 2084  ║ │
│ │Chapter │ Our    │  │    │  ☺ ☺ ┌──────┐        │    │ ║ are open.        ║ │
│ │ 2059   │ story  │  │    │ /|\  │▦▦▦▦▦▦│        │    │ ╨──────────────────╨ │
│ └────────┴────────┘  │    │      └──────┘        │    │   gate pillars       │
└──────────────────────┘    └──────────────────────┘    └──────────────────────┘
```

## The pages: content that presents the school

Real facts only (`facts.md`). Anything unconfirmed shows as a dashed `[TBC]` mark until the
school confirms it. Photos are evidence beside the content, not the subject of the copy.

### Programmes (behind the blackboard)
- **Cover, in chalk:** "From first letters to the SEE." / "पहिलो अक्षरदेखि SEE सम्म।"
- **Four stages,** each with its ages, its classes, what a child learns there and one real moment
  as proof:
  - Early years, Nursery to UKG: the district drawing competition.
  - Primary, Class 1 to 5: newspaper day.
  - Lower secondary, Class 6 to 8: the activity-based exhibition.
  - Secondary, Class 9 and 10: preparing for the SEE, and the Chandragiri trip.
- **Subjects:** English medium, following Nepal's national curriculum. The exact list per stage is
  `[TBC]`.
- **Beyond the timetable:** rice planting on Asar 15, Teej and Janmashtami, medal days, the
  Manav Sewa Ashram visit.
- **A school day:** times `[TBC]`.
- **Close:** the board again, chalked "Now, our story." The camera pulls back.

### About us (inside the teacher's book)
Written as chapters, because it is a book:
- **Cover spread:** "Chapter 2059" on the left page, "Our story" on the right.
1. **Since 2059 in Chisapani.** The year is from a public listing, so it is `[TBC]` until the
   school confirms it.
2. **One building, thirteen classes.** The yellow building with blue balconies, Nursery to
   Class 10.
3. **The people.** The teachers and staff photos, and the principal's message `[TBC]`.
4. **What we are proud of.**
   - The 3.96 GPA and the Ward No. 4 Office honour.
   - LKG and UKG picked for the district drawing competition.
   - A student at the province level.
5. **What we believe.** The motto `[TBC]`, in English and Nepali.

### Gallery (on the laptop screen)
- **Cover:** the screen's photo mosaic, the same nine photos in the same grid.
- **Albums by real event:**
  - Teej
  - Krishna Janmashtami
  - Asar 15
  - Class 10 trip (Chitlang and Chandragiri)
  - Farewell
  - Exhibition
  - Newspaper day
  - Medal days
  - Manav Sewa Ashram
- **Layout:** filter chips by album, a masonry grid and a lightbox. About 100 photos come from the
  school's own page, so families' consent is `[TBC]`.

### Admissions and contact (on the gate sign)
- **Cover:** the sign, "Admissions for 2084 are open."
- **Three steps:** visit or call, bring the documents (`[TBC]` list), your child joins.
- **After you join:** the parent app phone (attendance the moment it is taken).
- **Contact and map:** the phone number, email and address, with directions from the bus park
  `[TBC]`.

Every page also has its own route (`/en/programmes`, `/en/about`, `/en/gallery`,
`/en/admissions`), so it can be linked, shared and found by search. A visitor arriving directly
gets the page without the 3D. The nav on the home page rides the camera to the object; on other
pages it opens the route.

## How the zoom into an object works

**The portal** (web3d-integration-patterns: GSAP owns the camera, React owns the pages).

1. **The surface carries the page's cover.**
   - The board, the book spread, the laptop screen and the gate sign each get a `CanvasTexture`.
   - It is drawn with the page cover's exact layout and fonts, in the surface's aspect ratio, after
     `document.fonts.load` resolves.
   - The colour textures are sRGB (r3f-textures).
2. **The camera fits the surface to the screen.**
   - It dollies along the surface's normal to the distance where the surface just covers the
     viewport: `visible = min(h, w / aspect)`, `distance = visible / (2 · tan(fov / 2))`.
   - On the way in, the vignette and depth of field fade to zero (r3f-postprocessing: animate
     effect props, never rebuild the composer). At the fit there is no lens effect left between
     the texture and the screen.
3. **The handoff.**
   - At the fit, the DOM cover sits exactly on top of the texture. It uses the same layout box,
     sized as `max(vw, vh · aspect)` and centred.
   - It crossfades in over 0.25 s, then becomes the top of a normal page that scrolls up.
   - No flash and no cut: the layouts match, and only tone mapping differs slightly.
   - The 3D loop pauses (`frameloop="never"`) while a page is open (gsap-performance: stop
     off-screen work).
4. **The way out is the same thing backwards.**
   - The page ends on its cover again: "Now, our story" chalked on the board, or the closed book.
   - That cover crossfades into the texture, and the camera pulls back and walks on.

**Scroll structure** (gsap-scrolltrigger):

- The page alternates between scenes and pages:
  `[scene: hero → board] [Programmes] [scene: board → book] [About] [scene: book → laptop] [Gallery] [scene: laptop → gate] [Admissions] [footer]`.
- Each scene segment is pinned, with its own top-level timeline and labels.
- The ScrollTriggers are created in page order. The pages load content, so the code calls
  `refreshPriority`, then `ScrollTrigger.refresh()` after images load.
- There is no snapping.

**Scroll budget** (in viewport heights, on desktop):
- Hero hold 0.6.
- Walk to the board 3.0, then the board zoom 1.0.
- Out and to the book 1.5, then the book zoom 1.0.
- Out and to the balcony 2.5, then the screen zoom 1.0.
- Over the roof to the gate 3.0, then the sign zoom 1.0.
- About 14.6 viewports of 3D in all, around the four pages.

## New 3D assets (blender-pro-workflow order, built through Blender MCP on this PC)

The new things go in **`props.glb`**, beside `school.glb`, so the building is never rebuilt.

| Asset | Notes |
|---|---|
| Teacher at the board | Arm raised, chalk in hand |
| Teacher with an open book | Book held at chest height |
| Teacher and pupil at the laptop | On the floor-2 corridor |
| 14 seated pupils | Two instanced variants (`EXT_mesh_gpu_instancing`), at the floor-1 desks |
| Open book | Two-page slot `slot_book` |
| Laptop | Screen slot `slot_laptop` |
| Board overlay | `slot_board` |
| Gate signboard | `slot_gate` |
| Notice board | Phase 2 |

- **Style:** the figures are built from v3's student variants, so they look like the same set
  (reference-look-calibration). They are low-poly, with vertex colours, drawn unlit and tinted to
  the mood, exactly like the students.
- **Teachers' clothes:** neutral clothes, plus a kurta-style top for one, because no teacher
  uniform is documented.
- **Order (blender-pro-workflow):**
  1. Block out the figures at true scale in the classroom.
  2. Lock the four web cameras first, so their framing decides the poses.
  3. Model.
  4. Apply vertex colours.
  5. Check against v3 renders.
  6. Export glTF with Draco, Y up, transforms applied, slots with 0–1 UVs (blender-export).
- **Budget:** under 400 KB for `props.glb`.

## Build order, each step shown to you before the next

1. **Portal engine on the existing model.**
   - The board zoom into Programmes and back out works with today's classroom and a code-made board
     texture.
   - It proves the handoff has no flash before any modelling.
2. **Pages.**
   - Programmes, About and Gallery written as real content components, in EN and NE.
   - Each component is shared between the story and its route.
3. **`props.glb` in Blender:** the teachers, seated pupils, book, laptop and sign.
4. **The remaining scenes:** book, balcony, gate. Then the critique pass at desktop and phone, in
   both languages and both moods.

## Needed from the school (all show as `[TBC]` until then)

- The motto.
- The principal's name, photo and message.
- Confirmation of the founding year.
- Subjects per stage.
- The school-day times.
- The admission documents and dates.
- Consent from families for gallery photos.
- Directions from the bus park.

## Progress

**Step 1, done.** The blackboard portal runs on the current model.
- Scene A goes hero → classroom → board.
- The Programmes sheet slides over the board's cover.
- Scene B pulls back out of the board and leaves the building.
- **Checked by screenshots at the handoff moment** (1536 × 730 and 390 × 844, EN and NE). The 3D
  board at the end of the zoom and the overlay cover land on the same pixels. The only difference
  is the chalk's sharpness, which reads as a focus pull.
- **On a phone** the board shows its narrow layout: the four stages as a chalk list.
- **Two rules made it work:**
  - The text shade and the Morning/Day toggle step aside at the portal.
  - The tone mapping, bloom, vignette and depth of field fade with the rail's `lens` value, so the
    board keeps its true colours.

**Step 2, done.** The pages are real content components, each shared by the story and its route.
- **About** (`/about`): the teacher's book, in five numbered chapters:
  - since 2059;
  - one building, thirteen classes;
  - the people;
  - what we are proud of;
  - what we believe.
- **Gallery** (`/gallery`, which replaces `/life`):
  - eight albums by real event, sorted from a contact sheet of the 39 photos;
  - chips, a masonry grid of 640 px thumbnails, and a native `<dialog>` lightbox with arrow keys;
  - then the year and the activities.
- Admissions is split the same way.

**Step 3, done.** `props.glb` (27 KB, Draco) was built in Blender 5.2 through the MCP from model v3's
students. Working file: `model/props_v4.blend`.
- **The class:** 12 seated pupils, made by bending the legs at hip and knee and putting the forearms on
  the desks. They sit at the measured benches, 0.44 m, and desks, 0.72 m.
- **The board teacher:** a maroon kurta, her right arm raised to present the board, her left hand
  holding an open book towards the class.
- **The laptop scene:** a second teacher and a pupil at a laptop on the floor-1 corridor.
- **The gate:** a sign board on the gate beam.
- **Book, screen and sign:** each is a slot plane with UVs 0..1, and its frame is measured into
  `rig.ts` SURFACES.

**Step 4, done.** The full walk works:
`hero → board → Programmes → book → About → laptop → Gallery → gate sign → Admissions → end`.
- **Checked by screenshots** at every handoff, on desktop and phone.
- **What it took:**
  - **One master timeline** in scroll pixels. With per-scene ScrollTriggers, two scrubbing
    timelines fought over the same cover on a long jump.
  - **NORMAL blend on ToneMapping.** In postprocessing 6.39 the default SRC blend ignores opacity,
    so the lens fade never reached tone mapping, and bright covers came out grey.
  - **Covers laid out inside the visible slice**, horizontally and vertically. A phone's slice of the
    book is anchored to its right page.
  - **Cover-out tweens start just after 0.** ScrollTrigger renders every timeline at time 0 when it
    measures the page.

**Time of day (2026-10-04).** The Morning/Day toggle is gone. The story starts in the morning and turns to day as the visitor walks out of the classroom for the balcony. It is scrubbed with the camera, so scrolling back brings the morning back.
- **How the blend works:** a patch to the built-in material mixes the two baked lightmaps, each with its own intensity (onBeforeCompile, one shared program key). The sky, fog, background and figure tints blend with it, damped so a long jump fades instead of popping.
- **The door step:** stepping out of the door, the camera looks down the corridor to the laptop. This keeps the end of the hill range out of frame.
