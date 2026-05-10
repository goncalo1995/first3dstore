// HexaMemória frame generator.
// Example:
// openscad -o hexa_s.stl -D 'width=160' -D 'height=138.6' -D 'engrave_text="Familia 2026"' scripts/openscad/hexa_frame.scad
//
// Print orientation: visible face down on the build plate, with the front face at Z=0.

width = 160;
height = 138.6;
border_thickness = 12;
depth_thickness = 5;
color_name = "Preto";
engrave_text = "";

inner_lip = 1.5;
lip_depth = 1.2;
engrave_depth = 0.55;

$fn = 48;

module hex_2d(w, h) {
  polygon(points = [
    [w / 2, 0],
    [w, h / 4],
    [w, h * 3 / 4],
    [w / 2, h],
    [0, h * 3 / 4],
    [0, h / 4],
  ]);
}

module hex_prism(w, h, z) {
  linear_extrude(height = z)
    hex_2d(w, h);
}

module centered_hex(w, h, z) {
  translate([-w / 2, -h / 2, 0])
    hex_prism(w, h, z);
}

module frame_shell() {
  inner_w = max(1, width - border_thickness * 2);
  inner_h = max(1, height - border_thickness * 2);

  difference() {
    centered_hex(width, height, depth_thickness);
    translate([0, 0, -0.1])
      centered_hex(inner_w, inner_h, depth_thickness + 0.2);
  }
}

module photo_lip() {
  opening_w = max(1, width - border_thickness * 2);
  opening_h = max(1, height - border_thickness * 2);
  clear_w = max(1, opening_w - inner_lip * 2);
  clear_h = max(1, opening_h - inner_lip * 2);

  translate([0, 0, depth_thickness - lip_depth])
    difference() {
      centered_hex(opening_w, opening_h, lip_depth);
      translate([0, 0, -0.1])
        centered_hex(clear_w, clear_h, lip_depth + 0.2);
    }
}

module mirrored_engraving() {
  if (len(engrave_text) > 0) {
    translate([0, -height * 0.32, -0.05])
      mirror([1, 0, 0])
        linear_extrude(height = engrave_depth)
          text(
            engrave_text,
            size = min(border_thickness * 0.5, 7),
            halign = "center",
            valign = "center",
            font = "Liberation Sans:style=Bold"
          );
  }
}

color(color_name)
  difference() {
    union() {
      frame_shell();
      photo_lip();
    }
    mirrored_engraving();
  }
