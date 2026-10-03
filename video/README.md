# Video templates (Remotion)

Each template is a Remotion composition that receives `{ spec }` as props, where `spec` is a validated `EventSpec` from `packages/shared/src/schema.ts`.

```
src/
  index.ts          registerRoot
  Root.tsx          registers the 14 compositions (+ schema, default sample, calculateMetadata)
  engine.tsx        shared scene engine: intro, names, invitation, details, functions, photos, closing
  timeline.ts       scene durations (30-45 s, or the audio length); used by the worker for stills too
  templates/        one Theme per template (fonts, palette use, artwork, entrance style);
                    birthday.tsx, engagement.tsx, wedding.tsx, plus haldi.tsx and mehndi.tsx for the ceremony templates
  art/art.tsx       original SVG artwork drawn in code (balloons, mandala, toran, arch, diyas, florals,
                    falling petals, splatter, icons...)
  art/svg-art.tsx   renders the artwork files in public/assets/svg as inline SVG, recoloured to the palette,
                    with any named part animatable (SvgArt)
  art/svg-motifs.tsx  one animated component per SVG file (garland, toran, mehndi corner, paisley, borders,
                    haldi bowl, diya, jhummar, rangoli, lotus, peacock feather and fan, Ganesha, jharokha)
  art/svg-docs.generated.ts  the SVG files as data; rebuilt by `npm run svg:build` (a test fails if stale)
  components/       text fitting (FitLine, Paragraph, FontGate) and animation helpers
  fonts.ts          Google Fonts via @remotion/google-fonts (Latin + Devanagari)
  i18n.ts           labels, Hindi time ("शाम 7 बजे"), ordinal birthdays
  samples.ts        sample specs (English, Hindi, stress cases) for Studio and `npm run stills`
```

## Rules every template follows

- Animate only with `useCurrentFrame`, `interpolate` and `spring` (no CSS animations, no timers).
- Text stays inside the 8% safe area (`SAFE_X` / `SAFE_Y`); use `FitLine` / `Paragraph` so long names and addresses shrink or wrap instead of overflowing.
- Every scene is at least 3 s long, so each detail line is on screen for more than 2.5 s.
- Artwork is original SVG/CSS: drawn in code, or the project's own files in `public/assets/svg` (see below). No copyrighted images, no third-party music. Fonts only from Google Fonts.
- Hindi must render: put a Devanagari font after every Latin font in a stack (see `F` in `fonts.ts`). Never letter-space Devanagari; `FitLine`/`Paragraph` handle that automatically.
- Use the palette from `resolvePalette(spec)` (the owner may set custom colours) and wrap text colours in `readable()` so custom palettes stay legible.

## Using and animating the SVG files

The files in `public/assets/svg/<name>/*.svg` are the source. Edit or add one, then run `npm run svg:build` to regenerate `src/art/svg-docs.generated.ts` (plain shapes only: g, defs, use, path, circle, ellipse, line, rect). Every file is drawn in one ink colour (`#5A1818`); `SvgArt` swaps it for the colour you pass, and `recolor` swaps other colours (the marigold garland uses real ones).

To animate, pass `animate` to `SvgArt`: it is called for every element on every frame with its `id`, tag, attributes, ancestor ids (`path`), position among siblings (`idx`) and among same-kind elements (`nth`), and returns what to change: `transform` (applied inside the element's own transform, so a `use` or a rotated petal turns about its own origin), `opacity`, `draw` (0..1 strokes drawn in; inherited by children; dashed strokes fade instead), `fill`, `fillOpacity`, `stroke`, `strokeDashoffset`. See `svg-motifs.tsx` for ready-made motions. Use `Place` to position a motif; its transform is CSS, so write `scale(1, 1)` with commas.

### Where each SVG is used

| SVG | Used in |
|---|---|
| Marigold Garland | `haldi-marigold` (four hanging strands) |
| Toran Bandhanwar | `haldi-glow` (door-top toran) |
| Haldi Bowl | `haldi-marigold` (above the names) |
| Wedding Diya | `haldi-glow` (above the names) |
| Circular Rangoli | `haldi-glow`, `eng-sapphire` (large, faint, turning) |
| Mandala Border | `haldi-marigold` (bottom border) |
| Mehndi Corner Ornament | `mehndi-henna` (four corners) |
| Elegant Paisley (Ambi) | `mehndi-paisley` (four corners), `mehndi-henna` (above the names) |
| Sacred Lotus | `eng-rosegold` (top), `mehndi-paisley` (above the names) |
| Floral Border | `eng-rosegold` (bottom border) |
| Peacock Feather | `wed-peacock` (fan and corner feathers) |
| Royal Jhummar | `wed-midnight` (hanging from the top) |
| Ganesha | `wed-royal`: large hero in the arch cap on every scene (`strength` 2.6 for a solid golden wash). Blessing emblem above the blessing line: `wed-peacock`, `eng-traditional`, haldi and mehndi templates |
| Rajasthani Jharokha | `wed-royal` (frame) |
| Royal Heritage Peacock | not used by default (it was in the `wed-royal` arch cap until Ganesha took that spot) |
| Mandap Pillar | `wed-royal` (both inner sides) |
| Royal Elephant, Royal Chhatri | `wed-royal` (small top corner pieces) |
| Purna Kalash | `wed-royal` (details scene; its swastika engraving is hidden) |
| Baarat Horse, Sangeet Dhol, Shehnai | `wed-royal` Baraat scene (horse is the hero, dhol and shehnai secondary) |
| Hand Fan | unused |
| Swastika Mandala | unused by default; kept for a specifically requested Hindu wedding design |

**Baraat scene.** `wed-royal` adds a `celebration` scene when a function is named Baraat (see `CELEBRATION_TEMPLATES` and `BARAAT` in `timeline.ts`). A template opts in by being in that set and providing `celebrationHero` and `celebrationExtras`. Other theme hooks: `blessingDecor` (intro), `detailsDecor` (details scene), `detailsGap` / `detailsValueMax` (compact details for templates with a small text area).

Review motion with `npm run frames -- <templateId> 6,20,34,50,70,110` (contact sheet of those frames in `.render-cache/stills/`).

## Adding a template

1. **Register it in the shared list** (`packages/shared/src/templates.ts`): add `{ id, eventType, name, description, defaultPalette }`. The id becomes valid in the schema, the web template picker and automatic rotation. For a single-ceremony look (Haldi, Mehndi) also set `ceremony`: such a template is left out of the automatic rotation and only used for invitations `detectCeremony` recognises, or when the owner picks it.
2. **Write the theme** in `src/templates/<event>.tsx`. Copy the closest existing theme and change:
   - `Background` (art behind the text, animated from the global frame) and optional `Overlay` (art above text; keep it out of the text area),
   - `styles(p, spec)` (fonts and colours for headline, name, body, label, value, accent, small),
   - `entrance` (`rise` | `pop` | `fade` | `unfold` | `drop`), `divider`, `namesDecor`, `blessingDecor` (art above the blessing line on the intro, e.g. `GaneshaBlessing`),
   - `contentTop` / `contentBottom` to keep text clear of top/bottom art, `panel` for a backdrop behind text on busy art.

   ```tsx
   const myTheme: Theme = { entrance: "rise", Background: MyBackground, styles: (p) => ({ ... }), divider: (p) => <Divider color={p.primary} /> };
   export const BdayNeon: React.FC<{ spec: BirthdaySpec }> = ({ spec }) => <InvitationVideo spec={spec} theme={myTheme} />;
   ```
3. **Register the composition** in `src/Root.tsx`, with the matching schema wrapper and a sample:

   ```tsx
   <Composition id="bday-neon" component={BdayNeon} schema={props(BirthdaySpecSchema)} defaultProps={{ spec: bdayNeonSample }} {...common} />
   ```
   Keep the `{ spec }` wrapper: Remotion merges `defaultProps` into the render's props, and a flat spec would leak sample fields (blessing line, RSVP...) into real videos.
4. **Add samples** to `src/samples.ts` (English in `SAMPLES`, a Hindi variant in `hindiSamples`).
5. **Check every scene:** `npm run stills -- bday-neon` writes a contact sheet per sample to `.render-cache/stills/`. Look for overflow, spelling and Hindi rendering. `npm run studio` previews with live editing.
6. If the template should show wedding functions one per scene, add its id to `SEQUENTIAL_FUNCTIONS` in `timeline.ts`.

The worker needs no changes: it renders whatever `templateId` the spec names.
