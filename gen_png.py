import struct
import zlib

def create_png(width, height, r, g, b, filename):
    # PNG signature
    png = b'\x89PNG\r\n\x1a\n'
    
    def chunk(tag, data):
        return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)

    # IHDR chunk
    ihdr = struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)
    png += chunk(b'IHDR', ihdr)
    
    # IDAT chunk (pixel data)
    # Each row starts with a filter byte (0)
    raw_data = b''
    row = b'\x00' + struct.pack('>BBB', r, g, b) * width
    for _ in range(height):
        raw_data += row
        
    compressed = zlib.compress(raw_data)
    png += chunk(b'IDAT', compressed)
    
    # IEND chunk
    png += chunk(b'IEND', b'')
    
    with open(filename, 'wb') as f:
        f.write(png)

# Create 192x192 and 512x512 solid blue (#2563eb = 37, 99, 235) PNGs
create_png(192, 192, 37, 99, 235, 'icon-192.png')
create_png(512, 512, 37, 99, 235, 'icon-512.png')
