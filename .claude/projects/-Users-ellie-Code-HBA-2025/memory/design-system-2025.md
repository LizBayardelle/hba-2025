# Design System Reference (Feb 2025)

## Page Background
- Color: `#adadb3` on outer wrapper div
- Grain texture: `grain-bg` class on content area div
- Requires inline `<style>` block + `<script>` block per page:
  ```html
  <style>
    .grain-bg {
      background-blend-mode: overlay;
      background-repeat: repeat;
      background-size: 200px 200px;
    }
  </style>
  <script>
    document.addEventListener('DOMContentLoaded', function() {
      const canvas = document.createElement('canvas');
      canvas.width = 200; canvas.height = 200;
      const ctx = canvas.getContext('2d');
      const imageData = ctx.createImageData(200, 200);
      for (let i = 0; i < imageData.data.length; i += 4) {
        const v = Math.random() * 255;
        imageData.data[i] = v; imageData.data[i+1] = v;
        imageData.data[i+2] = v; imageData.data[i+3] = 40;
      }
      ctx.putImageData(imageData, 0, 0);
      const el = document.querySelector('.grain-bg');
      if (el) el.style.backgroundImage = 'url(' + canvas.toDataURL() + ')';
    });
  </script>
  ```
- Apply `grain-bg` class + `style="background-color: #adadb3;"` to the content div (NOT `<main>`, to avoid grain on header/cards)

## Sidebar
- Background: `#e5e7e9`
- Text/icons: `#000000` (black) for non-category items
- Category icons: keep `category.color`
- Active vs inactive: opacity 1.0 / 0.7
- Shadow: `4px 0 24px rgba(0, 0, 0, 0.5)` (same as `shadow-deep`)
- Hover: `hover:bg-black/10`
- Section dividers: `border-bottom-color: rgba(0, 0, 0, 0.12)`

## White Sticky Header
- Background: `#FFFFFF`
- Shadow: `shadow-deep` class

## Cards
- Background: `#FFFFFF`
- Shadow: `shadow-deep` class
- Border radius: `rounded-xl`

## Section Header Bars
- Default (non-category): `bar-default` class (polished onyx — subtle pinpoints, diagonal sheen, chrome edge, bottom reflection)
- Category-colored: `bar-colored` class + `--bar-color` CSS variable
  - JS: `headerDiv.style.setProperty('--bar-color', groupColor)`
- Both in `application.tailwind.css`

## Buttons
- Dark action buttons: `btn-onyx` class (simplified chrome edge + gradient, no pinpoints)
- In-bar + buttons: white bg `rgba(255,255,255,0.95)` with dark grey `#333` icon
- Badges/pills: `liquid-surface` / `liquid-surface-subtle` (existing)

## Search Bar
- Background: `#FFFFFF`
- Border: `1px solid #8E8E93` (matches magnifying glass icon)
- Inset shadow: `inset 0 3px 6px rgba(0, 0, 0, 0.08)`
- Bottom highlight: `0 1px 0 rgba(255, 255, 255, 0.8)`
- Font: Inter, weight 400, `letter-spacing: 0.01em`
- Icon color: `#8E8E93`

## CSS Classes (in application.tailwind.css)
| Class | Use |
|---|---|
| `.shadow-deep` | Deep card/panel shadow |
| `.bar-default` | Polished onyx header bar |
| `.bar-colored` | Onyx treatment over `--bar-color` |
| `.btn-onyx` | Simplified dark button |
| `.grain-bg` | Noise texture blend (needs script) |
| `.liquid-surface` | Metallic badge/pill (existing) |
| `.liquid-surface-subtle` | Subtle metallic badge (existing) |
| `.btn-glass` | Glassmorphic button on colored bg (existing) |

## Pages Updated So Far
- `/dashboard` — full treatment (background, grain, cards, bars, header)
- `/journal` — full treatment (background, grain, cards, bars, header, search, buttons)

## Pages Still Needing Update
- `/notes`
- `/habits`
- `/tasks`
- `/goals`
- `/documents`
- `/lists`
- `/tags`
- `/daily_prep`
- `/analytics`
- `/settings`
- Category pages
