// Photo puzzle cut matrix for use as a negative volume in PrusaSlicer/Bambu Studio.
// This file does not process the photo and does not generate lithophane relief.
//
// Override values from the CLI, for example:
// openscad -o cut-matrix.stl -D 'rows=7' -D 'columns=8' -D 'connectorType="redondo"' cut-matrix.scad

rows = 7;
columns = 8;
widthMm = 150;
heightMm = 120;
pieceGapMm = 0.18;
connectorType = "redondo"; // "recto", "redondo", "chanfrado"
cutHeightMm = 2;

pieceWidthMm = widthMm / columns;
pieceHeightMm = heightMm / rows;
bladeMm = max(pieceGapMm, 0.35);
tabRadiusMm = min(pieceWidthMm, pieceHeightMm) * 0.16;
$fn = 40;

module vertical_straight_cut(x) {
  translate([x - bladeMm / 2, 0]) square([bladeMm, heightMm]);
}

module horizontal_straight_cut(y) {
  translate([0, y - bladeMm / 2]) square([widthMm, bladeMm]);
}

module vertical_round_cut(x) {
  vertical_straight_cut(x);

  for (row = [0 : rows - 1]) {
    y = row * pieceHeightMm + pieceHeightMm / 2;
    direction = (row % 2 == 0) ? 1 : -1;
    translate([x + direction * bladeMm * 0.6, y]) circle(r = tabRadiusMm);
  }
}

module horizontal_round_cut(y) {
  horizontal_straight_cut(y);

  for (col = [0 : columns - 1]) {
    x = col * pieceWidthMm + pieceWidthMm / 2;
    direction = (col % 2 == 0) ? 1 : -1;
    translate([x, y + direction * bladeMm * 0.6]) circle(r = tabRadiusMm);
  }
}

module vertical_chamfer_cut(x) {
  vertical_straight_cut(x);

  for (row = [0 : rows - 1]) {
    y = row * pieceHeightMm + pieceHeightMm / 2;
    direction = (row % 2 == 0) ? 1 : -1;
    translate([x, y]) polygon([
      [0, -tabRadiusMm],
      [direction * tabRadiusMm, 0],
      [0, tabRadiusMm],
      [-direction * bladeMm, 0],
    ]);
  }
}

module horizontal_chamfer_cut(y) {
  horizontal_straight_cut(y);

  for (col = [0 : columns - 1]) {
    x = col * pieceWidthMm + pieceWidthMm / 2;
    direction = (col % 2 == 0) ? 1 : -1;
    translate([x, y]) polygon([
      [-tabRadiusMm, 0],
      [0, direction * tabRadiusMm],
      [tabRadiusMm, 0],
      [0, -direction * bladeMm],
    ]);
  }
}

module vertical_cut(x) {
  if (connectorType == "redondo") {
    vertical_round_cut(x);
  } else if (connectorType == "chanfrado") {
    vertical_chamfer_cut(x);
  } else {
    vertical_straight_cut(x);
  }
}

module horizontal_cut(y) {
  if (connectorType == "redondo") {
    horizontal_round_cut(y);
  } else if (connectorType == "chanfrado") {
    horizontal_chamfer_cut(y);
  } else {
    horizontal_straight_cut(y);
  }
}

module cut_matrix_2d() {
  union() {
    for (col = [1 : columns - 1]) {
      vertical_cut(col * pieceWidthMm);
    }

    for (row = [1 : rows - 1]) {
      horizontal_cut(row * pieceHeightMm);
    }
  }
}

linear_extrude(height = cutHeightMm) {
  cut_matrix_2d();
}
