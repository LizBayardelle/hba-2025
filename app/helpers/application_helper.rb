module ApplicationHelper
  # Convert hex color to RGB values
  def hex_to_rgb(hex)
    clean_hex = hex.delete('#')
    {
      r: clean_hex[0..1].to_i(16),
      g: clean_hex[2..3].to_i(16),
      b: clean_hex[4..5].to_i(16)
    }
  end

  # Convert RGB to hex
  def rgb_to_hex(r, g, b)
    "##{[r, g, b].map { |c| c.clamp(0, 255).to_s(16).rjust(2, '0') }.join.upcase}"
  end

  # Convert RGB to HSL
  def rgb_to_hsl(r, g, b)
    r /= 255.0
    g /= 255.0
    b /= 255.0

    max = [r, g, b].max
    min = [r, g, b].min
    l = (max + min) / 2.0

    if max == min
      h = s = 0.0
    else
      d = max - min
      s = l > 0.5 ? d / (2.0 - max - min) : d / (max + min)

      h = case max
          when r then ((g - b) / d + (g < b ? 6 : 0)) / 6.0
          when g then ((b - r) / d + 2) / 6.0
          when b then ((r - g) / d + 4) / 6.0
          end
    end

    { h: (h * 360).round, s: (s * 100).round, l: (l * 100).round }
  end

  # Convert HSL to RGB
  def hsl_to_rgb(h, s, l)
    h /= 360.0
    s /= 100.0
    l /= 100.0

    if s == 0
      r = g = b = l
    else
      hue2rgb = ->(p, q, t) {
        t += 1 if t < 0
        t -= 1 if t > 1
        return p + (q - p) * 6 * t if t < 1.0/6
        return q if t < 1.0/2
        return p + (q - p) * (2.0/3 - t) * 6 if t < 2.0/3
        p
      }

      q = l < 0.5 ? l * (1 + s) : l + s - l * s
      p = 2 * l - q
      r = hue2rgb.call(p, q, h + 1.0/3)
      g = hue2rgb.call(p, q, h)
      b = hue2rgb.call(p, q, h - 1.0/3)
    end

    { r: (r * 255).round, g: (g * 255).round, b: (b * 255).round }
  end

  # Generate a light variant of a color (for backgrounds)
  # Aims for ~92% lightness while preserving hue
  def generate_light_color(hex)
    rgb = hex_to_rgb(hex)
    hsl = rgb_to_hsl(rgb[:r], rgb[:g], rgb[:b])

    new_l = 92
    new_s = [hsl[:s] * 0.4, 10].max

    new_rgb = hsl_to_rgb(hsl[:h], new_s, new_l)
    rgb_to_hex(new_rgb[:r], new_rgb[:g], new_rgb[:b])
  end

  # Generate a dark variant of a color (for text)
  # Aims for ~28% lightness while preserving hue
  def generate_dark_color(hex)
    rgb = hex_to_rgb(hex)
    hsl = rgb_to_hsl(rgb[:r], rgb[:g], rgb[:b])

    new_l = 28
    new_s = [hsl[:s] * 1.2, 80].min

    new_rgb = hsl_to_rgb(hsl[:h], new_s, new_l)
    rgb_to_hex(new_rgb[:r], new_rgb[:g], new_rgb[:b])
  end
end
