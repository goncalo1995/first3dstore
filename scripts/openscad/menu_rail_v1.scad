// EM3D Modular menu rail v1.
// Print orientation: the visible front face is the flat plane at Z=0.
// The part extends upward in +Z, leaving the PEI build-plate texture on front.
// Back lower edge uses a 45-degree reinforced wedge for 3M tape mounting.

rail_length = 250;
rail_height = 32;
rail_depth = 8;
lip_depth = 3;
tape_back_width = 18;
border_thickness = 2;
text_string = "";
font_name = "Liberation Sans:style=Bold";

rear_chamfer = min(tape_back_width, rail_depth - border_thickness);
label_depth = 0.35;
label_size = min(rail_height * 0.22, 7);

$fn = 24;

// Cross-section points are [Y, Z]. The rail is extruded along X.
// The segment from [0, rail_depth - rear_chamfer] to
// [rear_chamfer, rail_depth] is the support-free 45-degree rear bridge.
profile_points = [
  [0, 0],
  [rail_height, 0],
  [rail_height, rail_depth],
  [rail_height - lip_depth, rail_depth],
  [rail_height - lip_depth, rail_depth + lip_depth],
  [rail_height - lip_depth - border_thickness, rail_depth + lip_depth],
  [rail_height - lip_depth - border_thickness, rail_depth],
  [rear_chamfer, rail_depth],
  [0, rail_depth - rear_chamfer]
];

module extruded_profile(points, length) {
  point_count = len(points);
  vertices = concat(
    [for (p = points) [0, p[0], p[1]]],
    [for (p = points) [length, p[0], p[1]]]
  );
  faces = concat(
    [[for (i = [point_count - 1 : -1 : 0]) i]],
    [[for (i = [0 : point_count - 1]) i + point_count]],
    [for (i = [0 : point_count - 1])
      [i, (i + 1) % point_count, ((i + 1) % point_count) + point_count, i + point_count]
    ]
  );

  polyhedron(points = vertices, faces = faces, convexity = 4);
}

module rear_tape_reference() {
  // A shallow, non-functional embossed guide on the back face showing where
  // the 3M tape should sit. It does not disturb the front PEI face.
  translate([rail_length / 2, rail_height / 2, rail_depth + 0.01])
    cube([rail_length * 0.86, max(2, tape_back_width * 0.65), 0.25], center = true);
}

module back_label() {
  if (len(text_string) > 0) {
    translate([rail_length / 2, rail_height * 0.5, rail_depth + 0.3])
      linear_extrude(height = label_depth)
        text(
          text_string,
          size = label_size,
          halign = "center",
          valign = "center",
          font = font_name
        );
  }
}

union() {
  extruded_profile(profile_points, rail_length);
  rear_tape_reference();
  back_label();
}
