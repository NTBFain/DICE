import os
import math
from datetime import datetime
from PIL import Image, ImageDraw, ImageFont

def get_system_font(font_size: int):
    font_paths = [
        "C:\\Windows\\Fonts\\arial.ttf",
        "C:\\Windows\\Fonts\\tahoma.ttf",
        "C:\\Windows\\Fonts\\calibri.ttf",
        "arial.ttf",
    ]
    for path in font_paths:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, font_size)
            except Exception:
                pass
    return ImageFont.load_default()

def format_watermark_text(text: str, context: dict = None) -> str:
    if not text:
        text = "WIP DICE"
    if not context:
        context = {}
    
    replacements = {
        "{order_id}": str(context.get("order_id", "DICE")),
        "{client}": str(context.get("client_name", "CLIENT")),
        "{artist}": str(context.get("artist_name", "DICE ARTIST")),
        "{date}": datetime.now().strftime("%Y-%m-%d"),
        "{status}": str(context.get("status", "WIP")),
    }
    
    formatted = text
    for key, val in replacements.items():
        formatted = formatted.replace(key, val)
    return formatted

def create_text_stamp(
    text: str,
    font_size: int,
    opacity: float,
    rotation: int = 0
) -> Image.Image:
    font = get_system_font(font_size)
    
    # Calculate text bounding box
    dummy_img = Image.new('RGBA', (1, 1), (0, 0, 0, 0))
    dummy_draw = ImageDraw.Draw(dummy_img)
    bbox = dummy_draw.textbbox((0, 0), text, font=font)
    text_w = max(10, bbox[2] - bbox[0] + 16)
    text_h = max(10, bbox[3] - bbox[1] + 16)
    
    stamp = Image.new('RGBA', (text_w, text_h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(stamp)
    
    alpha_val = int(opacity * 255)
    stroke_alpha = int(opacity * 255 * 0.7)
    
    # Draw text with stroke for high contrast on light/dark art
    draw.text(
        (8, 8),
        text,
        fill=(255, 255, 255, alpha_val),
        font=font,
        stroke_width=max(1, font_size // 15),
        stroke_fill=(10, 10, 20, stroke_alpha)
    )
    
    if rotation != 0:
        stamp = stamp.rotate(rotation, expand=True, resample=Image.Resampling.BICUBIC)
        
    return stamp

def create_logo_stamp(
    logo_filename: str,
    target_width: int,
    opacity: float,
    rotation: int = 0
) -> Image.Image:
    logo_path = os.path.join("uploads/watermark_logos", logo_filename)
    if not os.path.exists(logo_path):
        return None
        
    try:
        with Image.open(logo_path) as logo:
            if logo.mode != 'RGBA':
                logo = logo.convert('RGBA')
            
            logo_w, logo_h = logo.size
            if logo_w <= 0 or logo_h <= 0:
                return None
                
            target_w = max(30, target_width)
            target_h = max(10, int(logo_h * (target_w / logo_w)))
            
            logo_resized = logo.resize((target_w, target_h), Image.Resampling.LANCZOS)
            
            # Apply opacity to alpha channel
            r, g, b, a = logo_resized.split()
            a = a.point(lambda p: int(p * opacity))
            stamp = Image.merge('RGBA', (r, g, b, a))
            
            if rotation != 0:
                stamp = stamp.rotate(rotation, expand=True, resample=Image.Resampling.BICUBIC)
            return stamp
    except Exception as e:
        print(f"Error loading watermark logo stamp: {e}")
        return None

def apply_watermark(
    input_image_path: str,
    output_image_path: str,
    text: str = "WIP DICE",
    watermark_type: str = "text",      # 'text', 'image', 'hybrid'
    logo_filename: str = "",
    opacity: float = 0.25,
    pattern: str = "tiled",            # 'tiled', 'center', 'corner', 'cross'
    rotation: int = -25,               # degrees
    tile_density: str = "medium",      # 'low', 'medium', 'high'
    include_anti_ai_grid: bool = False,
    context: dict = None
) -> bool:
    try:
        formatted_text = format_watermark_text(text, context)
        
        with Image.open(input_image_path) as im:
            if im.mode != 'RGBA':
                im = im.convert('RGBA')
            
            width, height = im.size
            watermark_layer = Image.new('RGBA', (width, height), (0, 0, 0, 0))
            
            # 1. Anti-AI Protection Mesh Grid
            if include_anti_ai_grid:
                grid_draw = ImageDraw.Draw(watermark_layer)
                grid_alpha = int(max(0.04, opacity * 0.4) * 255)
                grid_step = max(30, min(width, height) // 15)
                
                # Diagonal lines pattern
                for diag in range(-height, width + height, grid_step):
                    grid_draw.line([(diag, 0), (diag + height, height)], fill=(255, 255, 255, grid_alpha), width=1)
                    grid_draw.line([(diag, height), (diag + height, 0)], fill=(0, 0, 0, grid_alpha), width=1)
            
            # 2. Build Watermark Stamp (Text / Image / Hybrid)
            base_scale = min(width, height)
            font_size = max(14, int(base_scale / 22))
            logo_target_w = max(60, int(width * 0.18))
            
            stamp = None
            if watermark_type == "image" and logo_filename:
                stamp = create_logo_stamp(logo_filename, logo_target_w, opacity, rotation)
            elif watermark_type == "hybrid" and logo_filename:
                logo_stamp = create_logo_stamp(logo_filename, int(logo_target_w * 0.8), opacity, 0)
                text_stamp = create_text_stamp(formatted_text, font_size, opacity, 0)
                
                if logo_stamp and text_stamp:
                    comb_w = max(logo_stamp.width, text_stamp.width) + 20
                    comb_h = logo_stamp.height + text_stamp.height + 12
                    hybrid_img = Image.new('RGBA', (comb_w, comb_h), (0, 0, 0, 0))
                    hybrid_img.paste(logo_stamp, ((comb_w - logo_stamp.width) // 2, 0), logo_stamp)
                    hybrid_img.paste(text_stamp, ((comb_w - text_stamp.width) // 2, logo_stamp.height + 6), text_stamp)
                    
                    if rotation != 0:
                        hybrid_img = hybrid_img.rotate(rotation, expand=True, resample=Image.Resampling.BICUBIC)
                    stamp = hybrid_img
            
            # Fallback to Text Stamp if image failed or type == "text"
            if stamp is None:
                stamp = create_text_stamp(formatted_text, font_size, opacity, rotation)
            
            # 3. Apply Stamp according to Pattern
            s_w, s_h = stamp.size
            
            if pattern == "center":
                # Single large stamp at center
                center_x = (width - s_w) // 2
                center_y = (height - s_h) // 2
                watermark_layer.paste(stamp, (center_x, center_y), stamp)
                
            elif pattern == "corner":
                # Bottom-Right corner
                margin_x = int(width * 0.04)
                margin_y = int(height * 0.04)
                pos_x = max(10, width - s_w - margin_x)
                pos_y = max(10, height - s_h - margin_y)
                watermark_layer.paste(stamp, (pos_x, pos_y), stamp)
                
            elif pattern == "cross":
                # Diagonal cross lines + Center stamp
                cross_draw = ImageDraw.Draw(watermark_layer)
                c_alpha = int(opacity * 0.6 * 255)
                cross_draw.line([(0, 0), (width, height)], fill=(255, 255, 255, c_alpha), width=max(2, font_size // 6))
                cross_draw.line([(0, height), (width, 0)], fill=(255, 255, 255, c_alpha), width=max(2, font_size // 6))
                
                center_x = (width - s_w) // 2
                center_y = (height - s_h) // 2
                watermark_layer.paste(stamp, (center_x, center_y), stamp)
                
            else: # 'tiled' (default)
                # Determine grid spacing based on density
                density_multipliers = {"low": 3.2, "medium": 2.2, "high": 1.5}
                mult = density_multipliers.get(tile_density, 2.2)
                
                step_x = max(int(s_w * mult), 120)
                step_y = max(int(s_h * mult), 100)
                
                row_index = 0
                for y in range(-s_h // 2, height + s_h, step_y):
                    # Stagger alternate rows for cleaner aesthetic
                    offset_x = (step_x // 2) if (row_index % 2 == 1) else 0
                    for x in range(-s_w // 2 + offset_x, width + s_w, step_x):
                        watermark_layer.paste(stamp, (x, y), stamp)
                    row_index += 1
            
            # Composite layers
            watermarked_im = Image.alpha_composite(im, watermark_layer)
            
            # Save output
            os.makedirs(os.path.dirname(output_image_path) or '.', exist_ok=True)
            _, ext = os.path.splitext(output_image_path.lower())
            if ext in ['.jpg', '.jpeg']:
                watermarked_im = watermarked_im.convert('RGB')
                watermarked_im.save(output_image_path, 'JPEG', quality=90)
            else:
                watermarked_im.save(output_image_path, 'PNG')
            return True
            
    except Exception as e:
        print(f"Error in apply_watermark: {e}")
        try:
            with Image.open(input_image_path) as im:
                im.save(output_image_path)
            return True
        except Exception:
            return False


