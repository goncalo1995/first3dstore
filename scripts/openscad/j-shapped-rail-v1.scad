/* PREMIUM L-SHAPED MODULAR MENU RAIL
   Includes Magnet Alignment & Tape Recess
*/

// --- VIEW CONTROLS ---
render_part = "assembly"; // [rail, tile, assembly, print_rail]

// --- RAIL PARAMETERS ---
rail_length = 200;       // Length of this section
rail_height = 45;        // Total height against the wall
rail_thickness = 6.5;    // Backplate thickness (must be > 5mm to hide magnets + tape)
shelf_width = 8.0;       // Usable depth of the shelf where letters sit
shelf_height = 4.0;      // Thickness of the bottom shelf
lip_width = 2.0;         // Thickness of the front retaining lip
lip_height = 5.5;        // Height of the front retaining lip

// --- MAGNET ALIGNMENT PARAMETERS ---
// Designed for standard 5x2mm cylindrical neodymium magnets
magnet_dia = 5.2;        // 0.2mm tolerance for easy supergluing
magnet_depth = 2.2;      // 0.2mm tolerance to ensure magnets sit flush or slightly sub-flush

// --- TAPE RECESS PARAMETERS ---
tape_width = 15;         // Width of your 3M tape
tape_depth = 0.5;        // Recess depth so the rail sits perfectly flush on the wall

// --- TILE PARAMETERS ---
tile_width = 45;
tile_height = 38;        // Fits cleanly inside the rail's vertical space
tile_thickness = 7.5;    // shelf_width minus 0.5mm tolerance for sliding
letter = "G";
font_name = "Arial:style=Bold";

// ==========================================

module premium_rail() {
    // Calculate the center Y position for the magnets
    // Tape takes 0.5mm from the back, so center is between 0.5 and rail_thickness
    mag_y = tape_depth + ((rail_thickness - tape_depth) / 2);
    
    difference() {
        // 1. MAIN RAIL BODIES
        union() {
            // The Backplate (Vertical)
            cube([rail_length, rail_thickness, rail_height]);
            
            // The Bottom Shelf (Horizontal)
            cube([rail_length, rail_thickness + shelf_width + lip_width, shelf_height]);
            
            // The Front Retaining Lip (Vertical)
            translate([0, rail_thickness + shelf_width, shelf_height])
                cube([rail_length, lip_width, lip_height]);
        }
        
        // 2. TAPE RECESS (Cut from the back face)
        // Recessed by tape_depth on the y=0 face, centered vertically
        translate([-1, -0.1, (rail_height - tape_width) / 2])
            cube([rail_length + 2, tape_depth + 0.1, tape_width]);
            
        // 3. LEFT MAGNET HOLES (x = 0)
        // Cut towards +X
        translate([-0.1, mag_y, rail_height - 8])
            rotate([0, 90, 0])
            cylinder(h=magnet_depth + 0.1, d=magnet_dia, $fn=30);
            
        translate([-0.1, mag_y, shelf_height + 6])
            rotate([0, 90, 0])
            cylinder(h=magnet_depth + 0.1, d=magnet_dia, $fn=30);
            
        // 4. RIGHT MAGNET HOLES (x = rail_length)
        // Cut towards -X
        translate([rail_length + 0.1, mag_y, rail_height - 8])
            rotate([0, -90, 0])
            cylinder(h=magnet_depth + 0.1, d=magnet_dia, $fn=30);
            
        translate([rail_length + 0.1, mag_y, shelf_height + 6])
            rotate([0, -90, 0])
            cylinder(h=magnet_depth + 0.1, d=magnet_dia, $fn=30);
    }
}

module premium_tile() {
    // The flat blank block
    cube([tile_width, tile_thickness, tile_height]);
    
    // Extrude the text on the front face
    // Extruding 1.5mm out from the tile face
    translate([tile_width/2, tile_thickness + 1.5, tile_height/2])
        rotate([90, 0, 0])
        linear_extrude(1.5)
        text(letter, font=font_name, size=tile_height*0.5, valign="center", halign="center");
}

// ==========================================
// RENDER LOGIC

if (render_part == "rail") {
    // Standard view
    color("DimGray") premium_rail();
} 
else if (render_part == "print_rail") {
    // Rotated to lay flat on the printer bed (backplate down)
    rotate([-90, 0, 0]) premium_rail();
}
else if (render_part == "tile") {
    // Print orientation for tile (back down)
    rotate([-90, 0, 0]) premium_tile();
} 
else if (render_part == "assembly") {
    // Rail
    color("DimGray") premium_rail();
    
    // Tile sitting in the shelf
    color("White")
    translate([(rail_length - tile_width)/2, rail_thickness + 0.25, shelf_height])
        premium_tile();
}
