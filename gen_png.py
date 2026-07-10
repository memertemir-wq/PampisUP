from PIL import Image, ImageDraw, ImageFont

def create_icon(size, filename):
    # Create blue background #2563eb
    img = Image.new('RGB', (size, size), color=(37, 99, 235))
    d = ImageDraw.Draw(img)
    
    text = "pampişUp"
    
    # Try to load a generic font or use default
    try:
        # Scale font size relative to image size
        font_size = int(size * 0.15)
        # Try finding standard fonts on linux
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", font_size)
    except IOError:
        try:
            font = ImageFont.truetype("/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf", font_size)
        except IOError:
            font = ImageFont.load_default()
            
    # Calculate text bounding box
    bbox = d.textbbox((0, 0), text, font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]
    
    # Center text
    x = (size - text_w) / 2
    y = (size - text_h) / 2
    
    d.text((x, y), text, fill=(255, 255, 255), font=font)
    img.save(filename)

create_icon(192, 'icon-192.png')
create_icon(512, 'icon-512.png')
print("Icons generated successfully!")
