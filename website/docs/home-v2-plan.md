# Home page v2 plan

**Status:** 2026-10-03. Replaces the v1 prototype, which the user called "a 90s uncle's WhatsApp status": a dozen effects (balloons, marquees, tilt cards, a custom cursor, grain, magnetic buttons) and no single idea.

Method: the /brag planning rubric (questions about the subject, then hook, key moments and the user flow) and the frontend-design skill (one bold element, everything else quiet, no default typography). Motion follows the official GSAP ScrollTrigger skill.

## The brag rubric, answered

1. **What is it?** A school in Hetauda-4, Chisapani, where a child arrives at three for Nursery and leaves at sixteen after the SEE.
2. **Most impressive real claim:** thirteen years in one place since 2059 BS, and a student honoured by the Ward No. 4 Office for a 3.96 GPA.
3. **Visual hook:** the building itself. Yellow walls, blue balcony rails, four floors, children lined along every balcony (the school's own cover photos). Nobody in Hetauda will mistake it for another school.
4. **What to show from the real product:** the parent app's home screen saying "In school today, marked present at 9:42 AM". It's the school's real software doing its job.
5. **Shortest satisfying story:** the building is built, then the camera climbs it floor by floor from the early years to Class 10, then pulls back.
6. **Tone:** brag's *cinematic*, held with restraint. Creative direction: **an architect's model of a real school**, a physical maquette in soft studio light.
7. **Sound:** none. It's a website.
8. **Share line:** "Satyam Xavier's, Hetauda: thirteen years of growing up, one building in Chisapani."
9. **User flow:** a parent opens the app in the morning and sees their child marked present.

## The one bold element

A **3D model of the school building** (Three.js), built from the photos: four floors, open corridors, blue rails, yellow walls, a stair tower, a parapet on the roof. Matte, like card and plaster, in soft light on a pale studio ground.

- **On load (the single orchestrated moment):** the building rises floor by floor in about 2.5 s while the headline sets beside it.
- **On scroll (pinned, scrubbed):** the camera climbs the building. At each floor, that stage's real photos appear in the windows, and the text panel beside it changes:
  ground floor → Nursery, LKG, UKG; first floor → Class 1 to 5; second floor → Class 6 to 8; third floor → Class 9 and 10 and the SEE. Then the camera pulls back to the whole building.
  The floors are a way of telling thirteen years, not a floor plan. If the school's classrooms are arranged differently, the labels move.
- **Pointer:** the model turns a few degrees toward the cursor. That's the only hover motion on the page.

Everything after the pinned story is quiet editorial layout with no entrance animations: the parent-app moment, the result, school life photos, admissions, contact.

## Tokens

| Name | Hex | Use |
|---|---|---|
| Studio | `#E8EDF0` | page ground and the model's table |
| Ink | `#13295B` | text, from the crest lettering |
| Slate | `#56627A` | secondary text |
| Wall | `#F0C84B` | the building's yellow; the one warm accent |
| Rail | `#2D5FA6` | balcony rails, links, buttons |
| Plaster | `#FFFFFF` | floor slabs, cards |

Crest crimson appears only in the crest itself.

**Type:** one family, **Anek** (Ek Type, an Indian foundry). Anek Latin and Anek Devanagari share one design, so English and Nepali speak in one voice. Its width axis is the type treatment: headlines set wide (wdth 125, weight 600), labels set narrow (wdth 75, weight 500), body at normal width. Sentence case everywhere. No accented single word, no all-caps labels, no middle-dot strings, no arrows on buttons.

## Layout

```
┌──────────────────────────────────────────────────────┐
│ crest  Satyam Xavier's        About Admissions  नेपाली │
│                                                      │
│ Growing up in                 ▟███████████▙          │
│ Chisapani                     █▌▌▌▌▌▌▌▌▌▌▌█  ← 3D model│
│ since 2059.                   █▌▌▌▌▌▌▌▌▌▌▌█           │
│ २०५९ देखि चिसापानीमा हुर्कँदै।  █▌▌▌▌▌▌▌▌▌▌▌█           │
│ [Start admission] [Call]      ▀▀▀▀▀▀▀▀▀▀▀▀▀           │
└──────────────────────────────────────────────────────┘
pinned climb: text panel left (stage, two lines, Nepali) | model right, camera climbing
then: phone (In school today) | short copy
then: result sentence + school life photo grid (editorial, captions)
then: admissions, three numbered steps (a real sequence) | call
then: contact
```

Left-aligned text throughout. Mobile: the model sits on top at 55% of the screen height, the text panel below it; the climb still works.

## Review against the brief: what I changed and why

- First instinct was a dark cinematic page with a yellow accent. That's the "near-black with one bright accent" default, so I chose a light studio ground, like a model on a table.
- First instinct for type was Bricolage plus an italic serif accent. That's the "one word in italic" tell, so I chose one family whose width axis does the work, and which covers Devanagari properly.
- Cut: balloons, marquees, a custom cursor, grain, tilt cards, magnetic buttons, the "Now in Class 4" pill and count-ups. Every one was a separate gimmick.
