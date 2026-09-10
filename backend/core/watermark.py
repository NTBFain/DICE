import os
import math
import re
import logging
from datetime import datetime
from typing import Optional
from PIL import Image, ImageDraw, ImageFont, ImageSequence

logger = logging.getLogger(__name__)

# Enforce strict pixel limit against decompression bomb DoS
Image.MAX_IMAGE_PIXELS = 50_000_000

MAX_TEXT_LENGTH = 60

def get_system_font(font_size: int):
    font_paths = [
        "C:\\Windows\\Fonts\\arial.ttf",
        "C:\\Windows\\Fonts\\tahoma.ttf",
        "C:\\Windows\\Fonts\\calibri.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
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
        text = "WIP DICE #{order_id}"
    if not context:
        context = {}
        
    def sanitize_var(val: str, max_len: int = 24) -> str:
        clean = re.sub(r'[\r\n\t\x00-\x1f]', ' ', str(val)).strip()
        return clean[:max_len] if len(clean) > max_len else clean
    
    replacements = {
        "{order_id}": sanitize_var(context.get("order_id", "DICE"), 12),
        "{client}": sanitize_var(context.get("client_name", "CLIENT"), 20),
        "{artist}": sanitize_var(context.get("artist_name", "DICE ARTIST"), 20),
        "{date}": datetime.now().strftime("%Y-%m-%d"),
        "{status}": sanitize_var(context.get("status", "WIP"), 12),
    }
    
    formatted = text
    for key, val in replacements.items():
        formatted = formatted.replace(key, val)
        
    clean_formatted = re.sub(r'[\r\n\t]', ' ', formatted).strip()
    return clean_formatted[:MAX_TEXT_LENGTH]

def safe_convert_to_rgba(img: Image.Image) -> Image.Image:
    """Safely converts any Pillow image mode (CMYK, P, L, 1, etc.) to RGBA."""
    if img.mode == 'RGBA':
        return img.copy()
    if img.mode == 'CMYK':
        return img.convert('RGB').convert('RGBA')
    if img.mode == 'P':
        return img.convert('RGBA')
    if img.mode in ('L', '1', 'LA'):
        return img.convert('RGBA')
    return img.convert('RGBA')

def save_image_securely(img: Image.Image, output_path: str, quality: int = 90):
    """Saves image ensuring mode and format compatibility."""
    os.makedirs(os.path.dirname(output_path) or '.', exist_ok=True)
    _, ext = os.path.splitext(output_path.lower())
    
    if ext in ['.jpg', '.jpeg']:
        if img.mode in ('RGBA', 'LA', 'P'):
            bg = Image.new('RGB', img.size, (255, 255, 255))
            if img.mode != 'RGBA':
                img = img.convert('RGBA')
            bg.paste(img, mask=img.split()[3])
            bg.save(output_path, 'JPEG', quality=quality, optimize=True)
            bg.close()
        else:
            rgb_img = img.convert('RGB')
            rgb_img.save(output_path, 'JPEG', quality=quality, optimize=True)
            rgb_img.close()
    elif ext == '.gif' and getattr(img, "is_animated", False):
        frames = []
        for frame in ImageSequence.Iterator(img):
            f_rgba = safe_convert_to_rgba(frame)
            frames.append(f_rgba.convert('P', palette=Image.Palette.ADAPTIVE))
        if frames:
            frames[0].save(
                output_path,
                save_all=True,
                append_images=frames[1:],
                loop=img.info.get('loop', 0),
                duration=img.info.get('duration', 100)
            )
    else:
        # Default to PNG
        if img.mode != 'RGBA':
            img = safe_convert_to_rgba(img)
        img.save(output_path, 'PNG', optimize=True)

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
    text_w = max(10, bbox[2] - bbox[0] + 20)
    text_h = max(10, bbox[3] - bbox[1] + 20)
    dummy_img.close()
    
    stamp = Image.new('RGBA', (text_w, text_h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(stamp)
    
    alpha_val = int(opacity * 255)
    stroke_alpha = int(opacity * 255 * 0.7)
    
    # Dual-layer rendering: crisp white text with dark outline for high contrast on any background
    draw.text(
        (10, 10),
        text,
        font=font,
        fill=(255, 255, 255, alpha_val),
        stroke_width=max(1, font_size // 12),
        stroke_fill=(0, 0, 0, stroke_alpha)
    )
    
    if rotation != 0:
        stamp = stamp.rotate(rotation, expand=True, resample=Image.Resampling.BICUBIC)
        
    return stamp

def create_logo_stamp(
    logo_filename: str,
    target_width: int,
    opacity: float,
    rotation: int = 0
) -> Optional[Image.Image]:
    clean_filename = os.path.basename(logo_filename)
    base_dir = os.path.abspath("uploads/watermark_logos")
    logo_path = os.path.abspath(os.path.join(base_dir, clean_filename))
    
    if not logo_path.startswith(base_dir) or not os.path.exists(logo_path):
        return None
        
    try:
        with Image.open(logo_path) as logo:
            logo = safe_convert_to_rgba(logo)
            w, h = logo.size
            if w <= 0 or h <= 0:
                return None
            ratio = target_width / float(w)
            target_height = max(10, int(float(h) * ratio))
            
            resized_logo = logo.resize((target_width, target_height), Image.Resampling.LANCZOS)
            
            # Apply alpha opacity
            r, g, b, a = resized_logo.split()
            a = a.point(lambda p: int(p * opacity))
            resized_logo.putalpha(a)
            
            if rotation != 0:
                resized_logo = resized_logo.rotate(rotation, expand=True, resample=Image.Resampling.BICUBIC)
            return resized_logo
    except Exception as e:
        logger.warning(f"Error loading watermark logo {logo_filename}: {e}")
        return None

def apply_watermark(
    input_image_path: str,
    output_image_path: str,
    text: str = "WIP DICE",
    watermark_type: str = "text",
    logo_filename: Optional[str] = None,
    opacity: float = 0.25,
    pattern: str = "tiled",
    rotation: int = -25,
    tile_density: str = "medium",
    include_anti_ai_grid: bool = False,
    context: dict = None
) -> bool:
    src_im = None
    rgba_im = None
    watermark_layer = None
    stamp = None
    watermarked_im = None
    
    try:
        if not os.path.exists(input_image_path):
            return False
            
        formatted_text = format_watermark_text(text, context)
        
        src_im = Image.open(input_image_path)
        rgba_im = safe_convert_to_rgba(src_im)
        width, height = rgba_im.size
        
        watermark_layer = Image.new('RGBA', (width, height), (0, 0, 0, 0))
        
        # 1. Anti-AI Protection Mesh Grid
        if include_anti_ai_grid:
            grid_draw = ImageDraw.Draw(watermark_layer)
            grid_alpha = int(max(0.04, opacity * 0.4) * 255)
            grid_step = max(30, min(width, height) // 15)
            
            for diag in range(-height, width + height, grid_step):
                grid_draw.line([(diag, 0), (diag + height, height)], fill=(255, 255, 255, grid_alpha), width=1)
                grid_draw.line([(diag, height), (diag + height, 0)], fill=(0, 0, 0, grid_alpha), width=1)
        
        # 2. Build Watermark Stamp (Text / Image / Hybrid)
        base_scale = min(width, height)
        font_size = max(14, int(base_scale / 22))
        logo_target_w = max(60, int(width * 0.18))
        
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
                logo_stamp.close()
                text_stamp.close()
                
                if rotation != 0:
                    rotated = hybrid_img.rotate(rotation, expand=True, resample=Image.Resampling.BICUBIC)
                    hybrid_img.close()
                    hybrid_img = rotated
                stamp = hybrid_img
        
        # Fallback to Text Stamp if image failed or type == "text"
        if stamp is None:
            stamp = create_text_stamp(formatted_text, font_size, opacity, rotation)
        
        # 3. Apply Stamp according to Pattern
        s_w, s_h = stamp.size
        
        if pattern == "center":
            center_x = (width - s_w) // 2
            center_y = (height - s_h) // 2
            watermark_layer.paste(stamp, (center_x, center_y), stamp)
            
        elif pattern == "corner":
            margin_x = int(width * 0.04)
            margin_y = int(height * 0.04)
            pos_x = max(10, width - s_w - margin_x)
            pos_y = max(10, height - s_h - margin_y)
            watermark_layer.paste(stamp, (pos_x, pos_y), stamp)
            
        elif pattern == "cross":
            cross_draw = ImageDraw.Draw(watermark_layer)
            c_alpha = int(opacity * 0.6 * 255)
            cross_draw.line([(0, 0), (width, height)], fill=(255, 255, 255, c_alpha), width=max(2, font_size // 6))
            cross_draw.line([(0, height), (width, 0)], fill=(255, 255, 255, c_alpha), width=max(2, font_size // 6))
            
            center_x = (width - s_w) // 2
            center_y = (height - s_h) // 2
            watermark_layer.paste(stamp, (center_x, center_y), stamp)
            
        else: # 'tiled' (default)
            density_multipliers = {"low": 3.2, "medium": 2.2, "high": 1.5}
            mult = density_multipliers.get(tile_density, 2.2)
            
            step_x = max(int(s_w * mult), 120)
            step_y = max(int(s_h * mult), 100)
            
            row_index = 0
            for y in range(-s_h // 2, height + s_h, step_y):
                offset_x = (step_x // 2) if (row_index % 2 == 1) else 0
                for x in range(-s_w // 2 + offset_x, width + s_w, step_x):
                    watermark_layer.paste(stamp, (x, y), stamp)
                row_index += 1
        
        # Composite layers
        watermarked_im = Image.alpha_composite(rgba_im, watermark_layer)
        save_image_securely(watermarked_im, output_image_path)
        return True
        
    except Exception as e:
        logger.error(f"Error in apply_watermark for {input_image_path}: {e}", exc_info=True)
        # Fail closed: never leak unwatermarked original images into preview paths!
        if os.path.exists(output_image_path):
            try:
                os.remove(output_image_path)
            except OSError:
                pass
        return False
    finally:
        for img_obj in (src_im, rgba_im, watermark_layer, stamp, watermarked_im):
            if img_obj is not None:
                try:
                    img_obj.close()
                except Exception:
                    pass
