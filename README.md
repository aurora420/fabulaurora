# Fabulaurora

Portfolio, gallery and blog for Jeah Aurora Kim. Plain HTML, CSS and JavaScript: no build step, so GitHub Pages serves the folder as it is.

## Preview on your computer

```bash
python3 -m http.server 4173
```

Then open http://localhost:4173. (Opening `index.html` straight from Finder will not work, because the pages load their content from `/data`.)

## Where things live

| You want to change… | Edit this |
| --- | --- |
| Email, social links, résumé file, the collaborator logo band | `data/site.json` |
| Gallery pieces and their process trails | `data/works.json` |
| Blog posts | `data/posts.json` |
| About page and résumé | `data/about.json` |
| Buttons, headings and other fixed wording (English + Korean) | `assets/js/i18n.js` |
| Colours, type, layout | `assets/css/site.css` (colour tokens are at the top) |
| The 3D hero | `assets/models/diorama.glb`, exported from the Blender scene in the separate source folder (`3d/`, kept out of this repository); which three pieces each floor's card shows: `floors` in `data/site.json` |

Any text field in the data files can be a plain string, or `{ "en": "…", "ko": "…" }` when you have both languages. If Korean is missing, the English shows.

## Add a gallery piece

Add an object to `works` in `data/works.json`. Only `id`, `room`, `title` and one image are required.

```json
{
  "id": "my-new-piece",
  "room": "biology",
  "year": "2026",
  "featured": false,
  "title": { "en": "My new piece", "ko": "새 작품" },
  "kind": { "en": "Journal cover design" },
  "tools": "Autodesk Maya, Adobe Photoshop",
  "statement": { "en": "One sentence a visitor reads first." },
  "brief": { "problem": { "en": "…" }, "approach": { "en": "…" } },
  "hero": { "src": "assets/img/work/my-new-piece/final.jpg", "w": 1600, "h": 1200 },
  "trail": [
    { "stage": { "en": "Thumbnails" }, "note": { "en": "One line about this step." },
      "images": [ { "src": "assets/img/work/my-new-piece/thumb-1.jpg", "w": 1200, "h": 900, "cap": { "en": "Version 1" } } ] }
  ],
  "details": [],
  "videos": [],
  "outcomes": [ { "text": { "en": "Where it was published or shown." }, "href": "https://…" } ],
  "links": []
}
```

- `room` is one of `biology`, `medical`, `anatomy`, `journal`, `xr`, `promo`, `fun`. (`xr` is the "XR & interactive" room.)
- `brief` keys: `problem`, `audience`, `approach`, `contribution`. Use the ones that apply.
- `trail` is the "How it was made" strip. Keep each `note` to one line. The finished piece is added as the last step automatically.
- `"finalStep": false` leaves the automatic "Final" step off the end of the trail.
- `videos` are embeds shown in a section right after the trail, headed "Watch" unless the piece sets `videosTitle` (and an optional `videosNote`).
- `finalVideo` makes the trail end on a video instead of the hero image. Either a hosted one, `{ "embed": "https://www.youtube.com/embed/…", "cap": { "en": "…" } }`, or a small local file, `{ "src": "assets/video/….mp4", "poster": "…", "cap": … }` (H.264, well under 50 MB; GitHub refuses files over 100 MB). A long walkthrough belongs on YouTube or Vimeo.
- `details` is a picture grid shown after the trail and before "Where it went". It is headed "Details" unless the piece sets `detailsTitle` (and, optionally, a one-line `detailsNote`), as the toolkit piece does with "Characters and stickers".
- `featured: true` puts the piece on the home page (the first five are shown).
- Put new images in `assets/img/work/<id>/`. About 1600 px on the long side is plenty.
- Every image is `{ "src", "w", "h", "cap" }`. Two optional extras:
  - `"srcset": { "800": "…-sm.webp", "1920": "….webp" }` gives the browser a small file for grids and a large one for the enlarged view (the existing pieces all have this).
  - `"anim": "….webp"` marks an animated piece: the page shows `src` as a still with a play button, and the enlarged view plays the animation.
- Videos in `videos` are embeds. The current ones still stream from Adobe's player, so re-host them (YouTube, Vimeo) before closing the Adobe Portfolio account.
- `outcomes` are the "Where it went" lines. Each is `{ "text": …, "href": "https://…" }` (the link shows the site's domain), or a quote: `{ "quote": …, "by": … }`. To link to a page on this site, use a relative `href` and add a `"label"`, as in `{ "text": …, "href": "post.html?slug=my-post", "label": { "en": "Read the post" } }`.

## The four floors on the home page

The home page is the hero and the collaborator band, nothing else. The hero is one scene with four labels on the right; a label, its ring on the model, or the floor itself zooms in and opens a card with three pieces from that floor and a link to that room of the gallery. The card reads `floors` in `data/site.json`:

```json
{ "id": "anatomy", "room": "anatomy", "picks": ["flow-of-urine", "loop-of-emotion", "carbon-dust"] }
```

- `id` is the floor (`anatomy`, `biology`, `medical`, `xr`, top to bottom) and never changes; `room` is the gallery room the button opens.
- `picks` are work ids from `data/works.json`, in the order they appear. Fewer than three, and the room's featured pieces fill the gaps. A piece without an image is skipped.
- A link such as `index.html#medical` opens the page with that floor already open.
- Floor names and sub-lines are the `callout.*` strings in `assets/js/i18n.js`; the camera angle for each floor is `FLOORS` at the top of `assets/js/hero.js`.
- The ring of each floor sits on its `Anchor_*` empty in the Blender file, so move the empty to move the ring.

## Collaborator logos on the home page

The band under the hero reads `collaborators` in `data/site.json`:

```json
{ "id": "university-of-toronto", "name": { "en": "University of Toronto", "ko": "토론토 대학교" }, "logo": "assets/img/logos/university-of-toronto.svg" }
```

With `"logo": ""` the name is set in type instead. SVG, or PNG on a transparent background at least 120 px tall, works best; logos are shown in grey and turn to colour on hover. Check each organisation's brand guidelines before publishing its logo.

## Add a blog post

Add an object to `posts` in `data/posts.json`:

```json
{
  "slug": "my-post", "title": "My post", "category": "technology",
  "tags": ["Unity", "VR"], "date": "Mar 3, 2026", "sort": "2026-03-03",
  "image": "assets/img/blog/my-post.jpg", "imageAlt": "What the picture shows",
  "author": "Jeah Kim", "authorRole": "Biomedical communicator.",
  "excerpt": "One sentence for the card.", "lead": "Optional opening line.",
  "content": [
    "A paragraph. <a href=\"https://example.com\">Links</a> and <b>bold</b> are fine.",
    "## A heading",
    "- a bullet",
    "1. a numbered step",
    { "figure": { "src": "assets/img/blog/pic.jpg", "w": 1600, "h": 900 }, "caption": "Optional caption" },
    { "gallery": [ { "src": "assets/img/blog/a.jpg" }, { "src": "assets/img/blog/b.jpg" } ] },
    { "video": { "src": "assets/img/blog/clip.mp4", "poster": "assets/img/blog/clip.webp", "w": 960, "h": 672 }, "caption": "Optional caption" },
    { "quote": "Words someone said.", "by": "Who said it" }
  ]
}
```

- Any text block can also be `{ "en": "…", "ko": "…" }`, which gives that paragraph, heading or bullet in both languages. Titles, excerpts and captions work the same way.
- Videos need to be H.264 MP4, because the HEVC files an iPhone records do not play in every browser. On a Mac, `avconvert -s in.mp4 -p Preset960x540 -o out.mp4` converts one.
- `category`: `biomedical`, `technology` or `art`. Work logs go under `technology`, with `worklog` among their `tags`. The category also picks the avatar in the byline: the medical sticker for `biomedical`, the XR sticker for `technology`, the anatomy sticker for `art` (`AVATAR` at the top of `assets/js/post.js`).
- `tags` drive the tag cloud, the search and the "Related notes" at the bottom of each post.
- `sort` (YYYY-MM-DD) decides the order; `date` is what readers see.
- Old links of the form `article.html?slug=…` still work.

## Contact form

With `contact.formEndpoint` empty in `data/site.json`, the form opens the visitor's email app with the message filled in. To have it send from the page instead, create a form at Formspree (or a similar service) and paste its endpoint URL there.

## The 3D hero

`assets/models/diorama.glb` is what the home page loads. Its source is the Blender scene in the separate source folder, which is not part of this repository (`3d/fabulaurora-diorama-final.blend`): a four-tier "cake" diorama after Jeah's sketch (`3d/sketch-heroImage-website.jpg`). Top to bottom: the art studio (baby blue), the biology lab behind glass (light green), the medical floor (light yellow) and the XR beach (baby pink). One column runs down the left side and changes with each floor: bonsai trunk → DNA → artery and vein into a heart → the X of "XR". The figures are appended from `3d/fabulaurora-avatar001.blend`; everything else is built by the script. The previous tower version is kept in `3d/archive/`.

**Editing in Blender:** open the `.blend`, change what you like, then *File → Export → glTF 2.0 (.glb)* over `assets/models/diorama.glb`. Tick *Apply Modifiers* and *Custom Properties*; under *Animation* choose the scene mode. Draco compression is optional (the site reads both).

The website looks for a few names. All are optional, so nothing breaks if you rename or delete them:

| Name | What it does |
| --- | --- |
| `Room_art`, `Room_bio`, `Room_med`, `Room_xr` | Parents of each room. Hovering or clicking anything inside lights up that label and opens that part of the gallery. |
| `Anchor_art`, `Anchor_bio`, `Anchor_med`, `Anchor_xr` | Empties the label lines point at. Move them to move the line ends. |
| `Glow_*` | Empties that become soft point lights. Custom properties: `color` (hex), `power`, `reach`. |
| Any animation | Plays on a loop. The file ships with a 240-frame loop (the drawing arm, balloons, E. coli, the heartbeat, hologram rings, gold cubes, floating Jeah, the tide). |

**Rebuilding from the script** (this overwrites the `.blend`, so save hand edits under another name first):

```bash
/Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup -P 3d/build_diorama.py
```

Add `-- --glb` to also export `assets/models/diorama.glb`, `-- --render DIR` for preview stills (`--views hero,art,bio,med,xr`, `--frame N`, `--quick`). The appended heads and kidney are dense meshes, so the exported `.glb` is heavier than the old one; decimate them in Blender before exporting if the page needs to stay light.

**Avatar stickers** on the home page are rendered from the same file:

```bash
/Applications/Blender.app/Contents/MacOS/Blender -b 3d/fabulaurora-diorama.blend -P 3d/render_stickers.py
python3 3d/outline_stickers.py
```

`assets/img/hero-poster.jpg` is the still image shown when a browser cannot run WebGL. To refresh it after changing the model, open the home page, run `__hero.snapshot(1300, 1500)` in the browser console and save the image it returns.

## Publishing

Push to GitHub and enable Pages for the branch. For the custom domain, add it under *Settings → Pages*; GitHub writes a `CNAME` file into the repository. All links in the site are relative, so it works both at `username.github.io/blog/` and at `fabulaurora.com`.

three.js and the fonts load from public CDNs (jsDelivr and Google Fonts).
