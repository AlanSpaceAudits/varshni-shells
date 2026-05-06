# varshni_shells

Three.js visualisation of Y. P. Varshni's 1976 quasar coincidence result.

Varshni grouped 384 known quasars into 57 sets whose emission-line redshifts
fell within ±0.001 of each other. Under the cosmological interpretation of
redshift, members of a group lie on a thin spherical shell of equal distance
from Earth. The combined chance probability of all 57 coincidences is
≈ 3 × 10⁻⁹⁹.

This demo plots Earth at the origin and renders each group as a wireframe
shell at radius proportional to its mean redshift, with each quasar drawn as
a coloured point on its shell.

## Source

Y. P. Varshni, *The Red Shift Hypothesis for Quasars: Is the Earth the
Center of the Universe?*, Astrophysics and Space Science 43 (1976) 3–8.

## Run locally

ES modules require a web server (file:// won't load).

```sh
cd varshni_shells
python -m http.server 8000
# open http://localhost:8000
```

## Notes on positions

Quasar designations of the form `HHMM±DDMM` or `HHMM±DDD` (e.g.
`PKS 0119-04`) encode B1950 sky coordinates and are placed at their actual
direction. Catalog-only names (`3C 273`, `PHL 938`, `BSO 6`, etc.) do not
encode a position in the name; for the demo these are placed at a stable
hashed direction on their shell and tagged "approx position" in the tooltip.
The shell structure — same redshift = same distance — is unaffected.

## Files

- `index.html` — page + UI
- `main.js`    — three.js scene
- `data.js`    — Table I (57 groups, 200+ quasars)
