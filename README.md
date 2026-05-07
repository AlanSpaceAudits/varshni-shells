# varshni_shells

Three.js demos for Y. P. Varshni's 1976 quasar coincidence paper.

Live: https://alanspaceaudits.github.io/varshni-shells/

Varshni grouped 384 known quasars into 57 sets whose emission-line redshifts
fell within ±0.001 of each other. Under the cosmological interpretation each
group's members lie on a thin spherical shell of equal distance from Earth.
The combined chance probability of all 57 coincidences is ≈ 3 × 10⁻⁹⁹.

Varshni offered three geometric explanations and ruled out two:
1. Local clustering
2. A crystal lattice with Earth at a node
3. Earth is the centre of the universe (the shells "would disappear if
   viewed from another galaxy or a quasar")

The demos let each possibility be inspected.

## Pages

- `index.html`      — overview and links
- `shells.html`     — basic 3D view of all 57 Earth-centred shells
- `observer.html`   — move the observer; live shell-fit metric
- `clustering.html` — RA/Dec map; pairwise angular separations per group
- `lattice.html`    — cubic-lattice equal-distance pattern vs actual group

## Source files

- `data.js`   — Table I (57 groups, 152 quasars)
- `coords.js` — name → (RA, Dec) parser and shared cartesian positions
- `main.js`   — `shells.html` scene
- `observer.js` — `observer.html` scene

## Run locally

ES modules need a server.

```sh
python -m http.server 8000
# http://localhost:8000
```

## Source

Y. P. Varshni, *The Red Shift Hypothesis for Quasars: Is the Earth the
Center of the Universe?*, Astrophysics and Space Science 43 (1976) 3–8.

## Position note

Quasar designations of the form `HHMM±DDMM` or `HHMM±DDD` (e.g.
`PKS 0119-04`) encode B1950 sky coordinates and are placed at their actual
direction. Catalog-only names (`3C 191`, `PHL 938`, `BSO 6`) do not encode
a position; they are placed at a stable hashed direction on their shell and
flagged in the UI. Shell radii (which is what Varshni's argument depends on)
are unaffected.
