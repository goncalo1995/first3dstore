// Wall-Forge custom frame.
// Print orientation: the visible/front face sits flat on Z=0.
// Any engraved text on the front lip is mirrored so it reads correctly after
// printing face-down on a textured PEI bed.

rail_length = 150;
border_thickness = 18;
text_string = "Bali 2023";
font_name = "Liberation Sans:style=Bold";

frame_height = 100;
frame_thickness = 5;
frame_color = "black";
corner_radius = 2.4;
lip_width = 1.5;
lip_depth = 1.2;
engrave_depth = 0.55;

$fn = 32;

photo_width = max(1, rail_length - border_thickness * 2);
photo_height = max(1, frame_height - border_thickness * 2);
text_size = min(border_thickness * 0.42, 7);

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
    rounded_box([rail_length, frame_height, frame_thickness], corner_radius);
    translate([border_thickness, border_thickness, -0.1])
      cube([photo_width, photo_height, frame_thickness + 0.2]);
  }
}

module inner_lip() {
  lip_inner_width = max(1, photo_width - lip_width * 2);
  lip_inner_height = max(1, photo_height - lip_width * 2);

  translate([border_thickness, border_thickness, frame_thickness - lip_depth])
    difference() {
      cube([photo_width, photo_height, lip_depth]);
      translate([lip_width, lip_width, -0.1])
        cube([lip_inner_width, lip_inner_height, lip_depth + 0.2]);
    }
}

module mirrored_bottom_engraving() {
  if (len(text_string) > 0 && border_thickness >= 15) {
    translate([rail_length / 2, border_thickness * 0.48, -0.05])
      mirror([1, 0, 0])
        linear_extrude(height = engrave_depth)
          text(
            text_string,
            size = text_size,
            halign = "center",
            valign = "center",
            font = font_name
          );
  }
}

color(frame_color)
  difference() {
    union() {
      frame_body();
      inner_lip();
    }
    mirrored_bottom_engraving();
  }
