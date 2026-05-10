# Design System – HexaMemória / Foto3D.pt

## Colour Palette
- **Primary (`#9b6b42`)** – warm earthy brown, used for buttons, links, icons and section titles. Conveys craftsmanship and natural materials.
- **Accent (`#1B6B45`)** – deep green, used for success messages, checkmarks, and subtle highlights. Evokes growth, trust and nature.
- **Background (`#FFFFFF`)** – clean white for main content.
- **Secondary background (`#F5F0EB`)** – soft warm off‑white, used for cards and subtle separations.
- **Foreground (`#2A2A2A`)** – dark grey for body text, high readability.
- **Muted foreground (`#666666`)** – for secondary text and labels.

## Typography
- **Headings:** Playfair Display (serif) – adds elegance and emotional appeal.
- **Body:** Inter (sans‑serif) – clean, modern, highly legible.

## Layout Approach
- **Mobile‑first** grid and flexbox.
- **Whitespace** generous – creates a premium, airy feel.
- **Cards** have light borders, subtle shadows, and rounded corners.

## Conversion Focus
- Primary CTA buttons use the `primary` colour with high contrast.
- Secondary actions use `outline` buttons with `primary` text.
- Social proof (testimonials, trust badges) placed strategically near purchase actions.

## Implementation Notes
- All colours are driven by CSS variables, making them easy to adjust globally.
- No hardcoded hex values in components – use Tailwind classes like `bg-primary`, `text-accent`, `border-border`.