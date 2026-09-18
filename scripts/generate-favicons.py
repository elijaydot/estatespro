import os
from PIL import Image

src_path = r"C:\Users\Elijay\.gemini\antigravity-ide\brain\d53f95a8-323d-4921-a5cb-8dec9a9062f0\.user_uploaded\media_1789712329098.png"
public_dir = r"c:\Users\Elijay\estatepro\estatespro\public"

img = Image.open(src_path).convert("RGBA")
width, height = img.size

# 1. Save full logo
img.save(os.path.join(public_dir, "fishgate-logo.png"), "PNG")
print("Saved full logo: fishgate-logo.png")

# 2. Find bounding box of the top emblem (the golden gate / towers)
# The emblem is located in the upper portion above the text 'FishGate'.
emblem_pixels = []
for y in range(0, int(height * 0.62)):
    for x in range(width):
        r, g, b, a = img.getpixel((x, y))
        if (r > 60 and g > 40) or (r + g + b > 150):
            emblem_pixels.append((x, y))

if emblem_pixels:
    min_x = min(p[0] for p in emblem_pixels)
    max_x = max(p[0] for p in emblem_pixels)
    min_y = min(p[1] for p in emblem_pixels)
    max_y = max(p[1] for p in emblem_pixels)
    print(f"Emblem bounds: x=({min_x}, {max_x}), y=({min_y}, {max_y}), w={max_x - min_x}, h={max_y - min_y}")
    
    # Calculate a square crop centered on the emblem with padding
    emblem_w = max_x - min_x
    emblem_h = max_y - min_y
    center_x = (min_x + max_x) // 2
    center_y = (min_y + max_y) // 2
    
    box_size = int(max(emblem_w, emblem_h) * 1.25)
    crop_x1 = max(0, center_x - box_size // 2)
    crop_y1 = max(0, center_y - box_size // 2)
    crop_x2 = min(width, crop_x1 + box_size)
    crop_y2 = min(height, crop_y1 + box_size)
    
    emblem_crop = img.crop((crop_x1, crop_y1, crop_x2, crop_y2))
    
    # Resize to standard sizes
    mark_512 = emblem_crop.resize((512, 512), Image.Resampling.LANCZOS)
    mark_512.save(os.path.join(public_dir, "fishgate-mark.png"), "PNG")
    mark_512.save(os.path.join(public_dir, "android-chrome-512x512.png"), "PNG")
    
    mark_192 = emblem_crop.resize((192, 192), Image.Resampling.LANCZOS)
    mark_192.save(os.path.join(public_dir, "android-chrome-192x192.png"), "PNG")
    
    mark_180 = emblem_crop.resize((180, 180), Image.Resampling.LANCZOS)
    mark_180.save(os.path.join(public_dir, "apple-touch-icon.png"), "PNG")
    
    mark_32 = emblem_crop.resize((32, 32), Image.Resampling.LANCZOS)
    mark_32.save(os.path.join(public_dir, "favicon-32x32.png"), "PNG")
    mark_32.save(os.path.join(public_dir, "favicon.png"), "PNG")
    
    mark_16 = emblem_crop.resize((16, 16), Image.Resampling.LANCZOS)
    mark_16.save(os.path.join(public_dir, "favicon-16x16.png"), "PNG")
    
    # Multi-resolution ICO (16x16, 32x32, 48x48)
    mark_48 = emblem_crop.resize((48, 48), Image.Resampling.LANCZOS)
    mark_48.save(
        os.path.join(public_dir, "favicon.ico"),
        format="ICO",
        sizes=[(16, 16), (32, 32), (48, 48)]
    )
    print("Generated all favicon formats successfully!")
else:
    print("Could not find emblem pixels")
