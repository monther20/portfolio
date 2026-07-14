from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ABOUT_DIR = Path("public/textures/textures/about")
GALLERY_DIR = Path("public/textures/textures/gallery")
ABOUT_DIR.mkdir(parents=True, exist_ok=True)
GALLERY_DIR.mkdir(parents=True, exist_ok=True)


def font(size: int, bold: bool = False):
    names = ["C:/Windows/Fonts/arialbd.ttf", "arialbd.ttf", "arial.ttf"] if bold else ["C:/Windows/Fonts/arial.ttf", "arial.ttf"]
    for name in names:
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            pass
    return ImageFont.load_default()


def size(draw: ImageDraw.ImageDraw, text: str, fnt) -> tuple[int, int]:
    box = draw.textbbox((0, 0), text, font=fnt)
    return box[2] - box[0], box[3] - box[1]


def wrap(draw: ImageDraw.ImageDraw, text: str, fnt, max_width: int) -> list[str]:
    lines: list[str] = []
    line = ""
    for word in text.split():
        test = f"{line} {word}".strip()
        if not line or size(draw, test, fnt)[0] <= max_width:
            line = test
        else:
            lines.append(line)
            line = word
    if line:
        lines.append(line)
    return lines


def centered(draw: ImageDraw.ImageDraw, text: str, x: int, y: int, fnt, fill, max_width: int, gap: int = 10) -> int:
    lines = wrap(draw, text, fnt, max_width)
    total_h = sum(size(draw, line, fnt)[1] for line in lines) + gap * max(0, len(lines) - 1)
    y -= total_h // 2
    for line in lines:
        w, h = size(draw, line, fnt)
        draw.text((x - w // 2, y), line, font=fnt, fill=fill)
        y += h + gap
    return y


def save_webp(img: Image.Image, path: Path, *, alpha: bool = False):
    img.save(path, "WEBP", quality=95, lossless=alpha, method=6)
    print(f"created {path}")


def skill_texture(base: str, label: str, color: tuple[int, int, int]):
    w, h, scale = 512, 1024, 3
    for painted in (False, True):
        img = Image.new("RGBA", (w * scale, h * scale), (0, 0, 0, 0))
        d = ImageDraw.Draw(img)
        s = scale
        body = [92 * s, 96 * s, 420 * s, 676 * s]
        knot = [(222 * s, 650 * s), (290 * s, 650 * s), (267 * s, 724 * s), (245 * s, 724 * s)]
        if painted:
            fill = (*color, 246)
            outline = tuple(max(0, int(c * 0.58)) for c in color) + (255,)
            text_fill = (18, 24, 31, 255)
            sub_fill = (18, 24, 31, 205)
        else:
            fill = (255, 253, 244, 246)
            outline = (30, 30, 30, 255)
            text_fill = (22, 22, 22, 255)
            sub_fill = (22, 22, 22, 190)

        d.ellipse(body, fill=fill, outline=outline, width=8 * s)
        d.polygon(knot, fill=fill, outline=outline)
        d.line(knot + [knot[0]], fill=outline, width=6 * s, joint="curve")
        d.line([(256 * s, 724 * s), (247 * s, 790 * s), (270 * s, 855 * s), (246 * s, 928 * s), (263 * s, 1010 * s)], fill=(45, 45, 45, 220), width=4 * s)

        if painted:
            d.arc([145 * s, 145 * s, 340 * s, 470 * s], 205, 282, fill=(255, 255, 255, 145), width=9 * s)
            d.arc([163 * s, 585 * s, 350 * s, 708 * s], 8, 172, fill=(255, 255, 255, 90), width=5 * s)
        else:
            d.arc([132 * s, 122 * s, 382 * s, 648 * s], 93, 266, fill=(40, 40, 40, 110), width=3 * s)
            d.arc([169 * s, 153 * s, 342 * s, 462 * s], 205, 282, fill=(40, 40, 40, 120), width=4 * s)

        label_size = 50 if len(label) <= 14 else 42 if len(label) <= 19 else 36
        f_label = font(label_size * s, True)
        f_small = font(25 * s)
        centered(d, label.upper(), 256 * s, 360 * s, f_label, text_fill, 270 * s, 11 * s)
        tw, th = size(d, "SKILL", f_small)
        d.text((256 * s - tw // 2, 515 * s), "SKILL", font=f_small, fill=sub_fill)

        img = img.resize((w, h), Image.Resampling.LANCZOS)
        save_webp(img, ABOUT_DIR / f"{base}{'_painted' if painted else ''}.webp", alpha=True)


def dashed_rect(d: ImageDraw.ImageDraw, box, fill, width: int):
    x1, y1, x2, y2 = box
    dash, gap = width * 8, width * 5
    x = x1
    while x < x2:
        d.line([(x, y1), (min(x + dash, x2), y1)], fill=fill, width=width)
        d.line([(x, y2), (min(x + dash, x2), y2)], fill=fill, width=width)
        x += dash + gap
    y = y1
    while y < y2:
        d.line([(x1, y), (x1, min(y + dash, y2))], fill=fill, width=width)
        d.line([(x2, y), (x2, min(y + dash, y2))], fill=fill, width=width)
        y += dash + gap


def project_texture(base: str, title: str, tech: str, bullets: list[str], color: tuple[int, int, int]):
    for painted, (w, h) in [(False, (800, 1600)), (True, (1024, 2048))]:
        scale = 2
        img = Image.new("RGB", (w * scale, h * scale), (245, 241, 232))
        d = ImageDraw.Draw(img)
        s = scale
        ink = (30, 28, 25)
        muted = (92, 86, 78)
        dark = tuple(max(0, int(c * 0.55)) for c in color)
        accent = dark if painted else ink
        paper = [int(w * 0.075) * s, int(h * 0.035) * s, int(w * 0.925) * s, int(h * 0.965) * s]
        if painted:
            shadow = [paper[0] + 12 * s, paper[1] + 18 * s, paper[2] + 12 * s, paper[3] + 18 * s]
            d.rounded_rectangle(shadow, radius=32 * s, fill=(210, 200, 185))
        d.rounded_rectangle(paper, radius=32 * s, fill=(255, 252, 244), outline=accent, width=6 * s)

        margin = int(w * 0.125) * s
        top = paper[1] + 76 * s
        f_title = font((62 if w < 900 else 78) * s, True)
        f_tech = font((28 if w < 900 else 36) * s)
        f_body = font((27 if w < 900 else 35) * s)
        f_head = font((35 if w < 900 else 45) * s, True)
        f_place = font((46 if w < 900 else 58) * s, True)
        f_footer = font((24 if w < 900 else 31) * s, True)

        header = [margin, top, w * s - margin, top + (124 if w < 900 else 156) * s]
        header_fill = tuple(int(c * 0.16 + 255 * 0.84) for c in color) if painted else (255, 252, 244)
        d.rounded_rectangle(header, radius=22 * s, fill=header_fill, outline=accent, width=4 * s)
        tw, _ = size(d, title, f_title)
        d.text((w * s // 2 - tw // 2, top + (22 if w < 900 else 28) * s), title, font=f_title, fill=accent)
        tw, _ = size(d, tech, f_tech)
        d.text((w * s // 2 - tw // 2, header[3] + 28 * s), tech, font=f_tech, fill=muted)

        ph_top = header[3] + 100 * s
        ph_h = (520 if w < 900 else 670) * s
        ph = [margin, ph_top, w * s - margin, ph_top + ph_h]
        d.rounded_rectangle(ph, radius=22 * s, fill=(248, 249, 250) if painted else (255, 252, 244), outline=accent, width=5 * s)
        if painted:
            d.rectangle([ph[0] + 46 * s, ph[1] + 46 * s, ph[2] - 46 * s, ph[3] - 46 * s], outline=(190, 198, 208), width=3 * s)
            d.polygon([(ph[0] + 80 * s, ph[3] - 96 * s), (ph[0] + 245 * s, ph[1] + 250 * s), (ph[0] + 360 * s, ph[3] - 96 * s)], fill=(224, 232, 240))
            d.polygon([(ph[0] + 275 * s, ph[3] - 96 * s), (ph[0] + 460 * s, ph[1] + 210 * s), (ph[2] - 75 * s, ph[3] - 96 * s)], fill=(214, 224, 235))
            d.ellipse([ph[2] - 165 * s, ph[1] + 75 * s, ph[2] - 95 * s, ph[1] + 145 * s], fill=tuple(int(c * 0.35 + 255 * 0.65) for c in color))
        else:
            dashed_rect(d, [ph[0] + 35 * s, ph[1] + 35 * s, ph[2] - 35 * s, ph[3] - 35 * s], ink, 3 * s)
            d.line([(ph[0] + 80 * s, ph[3] - 96 * s), (ph[0] + 245 * s, ph[1] + 250 * s), (ph[0] + 360 * s, ph[3] - 96 * s), (ph[2] - 85 * s, ph[3] - 96 * s)], fill=ink, width=4 * s)
            d.ellipse([ph[2] - 165 * s, ph[1] + 75 * s, ph[2] - 95 * s, ph[1] + 145 * s], outline=ink, width=4 * s)

        centered(d, "PROJECT IMAGE PLACEHOLDER", w * s // 2, ph[1] + ph_h // 2 - 24 * s, f_place, accent, int(w * 0.62) * s, 8 * s)
        hint = "replace this area with your screenshot/art"
        tw, _ = size(d, hint, f_body)
        d.text((w * s // 2 - tw // 2, ph[1] + ph_h // 2 + 92 * s), hint, font=f_body, fill=muted)

        rule_y = ph[3] + 70 * s
        d.line([(margin, rule_y), (w * s - margin, rule_y)], fill=accent, width=5 * s)
        d.text((margin, rule_y + 45 * s), "Highlights", font=f_head, fill=accent)
        y = rule_y + 108 * s
        for bullet in bullets:
            d.text((margin + 4 * s, y), "•", font=f_body, fill=accent)
            line_y = y
            for line in wrap(d, bullet, f_body, w * s - margin * 2 - 48 * s):
                d.text((margin + 45 * s, line_y), line, font=f_body, fill=ink)
                line_y += size(d, line, f_body)[1] + 8 * s
            y = line_y + 20 * s

        footer = "Monther Abdelrazek · Portfolio"
        tw, _ = size(d, footer, f_footer)
        d.text((w * s // 2 - tw // 2, paper[3] - 78 * s), footer, font=f_footer, fill=muted)
        d.arc([margin, paper[3] - 185 * s, w * s - margin, paper[3] - 65 * s], 8, 174, fill=accent, width=(5 if painted else 3) * s)

        img = img.resize((w, h), Image.Resampling.LANCZOS)
        save_webp(img, GALLERY_DIR / f"{base}{'_painted' if painted else ''}.webp")


SKILLS = [
    ("reactnativeduzybalon", "React Native", (97, 218, 251)),
    ("tailwindsrednibalon", "Tailwind CSS", (56, 189, 248)),
    ("reactquerysrednibalon", "React Query", (255, 83, 111)),
    ("nodejssrednibalon", "Node.js", (116, 196, 118)),
    ("i18nmalybalon", "i18n", (246, 196, 83)),
    ("webperformancesrednibalon", "Web Performance", (168, 139, 250)),
    ("web3dmalybalon", "Web3D", (244, 114, 182)),
    ("webglmalybalon", "WebGL", (45, 212, 191)),
    ("reactthreefibersrednibalon", "React Three Fiber", (34, 197, 94)),
]

PROJECTS = [
    (
        "bassitaprzod",
        "Bassita",
        "Next.js · Firestore · Kanban",
        [
            "Real-time collaborative task management platform",
            "Organizations → Workspaces → Boards → Tasks",
            "Google and email/password authentication",
            "Drag-and-drop tasks with custom labels",
        ],
        (33, 74, 154),
    ),
    (
        "ezorroprzod",
        "eZorro",
        "React · Market dashboards · AI chat",
        [
            "Financial trading frontend with real-time market analysis",
            "Portfolio management and interactive dashboards",
            "AI-powered trading assistance and streaming chat",
        ],
        (21, 128, 97),
    ),
    (
        "rechletprzod",
        "Rechlet",
        "React Native · Ads · QR links",
        [
            "Mobile frontend for advertisement display app",
            "Dynamic multimedia content with images and videos",
            "Auto-scrolling ads and QR-code external links",
        ],
        (185, 80, 40),
    ),
]

if __name__ == "__main__":
    for skill in SKILLS:
        skill_texture(*skill)
    for project in PROJECTS:
        project_texture(*project)
