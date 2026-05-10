# Puzzle Photo Cut Matrix

This folder contains the local OpenSCAD helper for the manual production flow.
It does not process the photo and it does not generate lithophane relief.

## Generate the cut matrix STL

Install OpenSCAD locally and make sure `openscad` is available in your `PATH`.

```bash
node scripts/puzzle-openscad/render-cut-matrix.mjs scripts/puzzle-openscad/example-params.json scripts/puzzle-openscad/cut-matrix.stl
```

You can also call OpenSCAD directly:

```bash
openscad -o scripts/puzzle-openscad/cut-matrix.stl \
  -D 'rows=7' \
  -D 'columns=8' \
  -D 'widthMm=150' \
  -D 'heightMm=120' \
  -D 'pieceGapMm=0.18' \
  -D 'connectorType="redondo"' \
  -D 'cutHeightMm=2' \
  scripts/puzzle-openscad/cut-matrix.scad
```

## Use as negative volume

1. Generate the flat lithophane from the customer's photo in PrusaSlicer or Bambu Studio.
2. Import the generated `cut-matrix.stl` into the same project.
3. Set the cut matrix object as a negative volume/modifier over the lithophane.
4. Align it to cover the full lithophane surface, then slice.

The result is a lithophane with the photo relief from the slicer and puzzle separation from the cut matrix.
