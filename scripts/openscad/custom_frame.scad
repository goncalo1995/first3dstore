// Wall-Forge custom frame.
// Print orientation: the visible face sits on Z=0, face down on the build plate.

width = 150;
height = 100;
border_width = 18;
thickness = 5;
color = "black";
text_string = "Bali 2023";

lip_width = 1.5;
lip_depth = 1.2;
engrave_depth = 0.55;

$fn = 32;

photo_width = max(1, width - border_width * 2);
photo_height = max(1, height - border_width * 2);
text_size = min(border_width * 0.42, 7);

module rounded_box(size, radius = 2) {
  hull() {
    translate([radius, radius, 0]) cylinder(h = size[2], r = radius);
    translate([size[0] - radius, radius, 0]) cylinder(h = size[2], r = radius);
    translate([radius, size[1] - radius, 0]) cylinder(h = size[2], r = radius);
    translate([size[0] - radius, size[1] - radius, 0]) cylinder(h = size[2], r = radius);
  }
}

module frame_body() {
  difference() {
    rounded_box([width, height, thickness], 2.4);
    translate([border_width, border_width, -0.1])
      cube([photo_width, photo_height, thickness + 0.2]);
  }
}

module inner_lip() {
  lip_inner_width = max(1, photo_width - lip_width * 2);
  lip_inner_height = max(1, photo_height - lip_width * 2);

  translate([border_width, border_width, thickness - lip_depth])
    difference() {
      cube([photo_width, photo_height, lip_depth]);
      translate([lip_width, lip_width, -0.1])
        cube([lip_inner_width, lip_inner_height, lip_depth + 0.2]);
    }
}

module mirrored_bottom_engraving() {
  if (len(text_string) > 0 && border_width >= 15) {
    translate([width / 2, border_width * 0.48, -0.05])
      mirror([1, 0, 0])
        linear_extrude(height = engrave_depth)
          text(
            text_string,
            size = text_size,
            halign = "center",
            valign = "center",
            font = "Liberation Sans:style=Bold"
          );
  }
}

color(color)
  difference() {
    union() {
      frame_body();
      inner_lip();
    }
    mirrored_bottom_engraving();
  }
