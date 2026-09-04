"""Gera os ícones do PWA (192, 512, 512 maskable) e uma aproximação do favicon.
Executado uma vez durante a criação do projeto — não é necessário rodar de novo,
mas fica disponível caso você queira trocar o ícone/nome do app depois.

Observação: o `public/favicon.svg` é a versão "oficial" do logo (um livro aberto
com um brilho no canto). Este script desenha uma aproximação do mesmo desenho
usando só formas simples do Pillow, então o resultado fica bem parecido, mas
não é pixel a pixel idêntico ao SVG.
"""
from PIL import Image, ImageDraw
import os

OUT = os.path.join(os.path.dirname(__file__), "..", "public", "icons")
os.makedirs(OUT, exist_ok=True)

BG = (169, 120, 95, 255)  # cocoa-500
FG = (250, 246, 241, 255)  # cream
SPARKLE = (230, 184, 172, 255)  # blush-300


def draw_book(d, size, scale=1.0, offset_y=0.0):
    """Livro aberto: duas 'páginas' com lombada central, feito com linhas curvas."""
    w = int(size * 0.075 * scale)  # espessura do traço
    cx = size / 2
    top = size * (0.30) - offset_y
    bottom = size * (0.62) + offset_y * 0.3
    spread = size * 0.19 * scale

    # lombada central (curva simples: um "V" suave até o centro)
    d.line([(cx, top + size * 0.02), (cx, bottom - size * 0.05)], fill=FG, width=w)

    for side in (-1, 1):
        outer_top = (cx + side * spread * 1.55, top)
        outer_bottom = (cx + side * spread * 1.55, bottom - size * 0.03)
        inner_bottom = (cx, bottom)
        # capa externa (vertical)
        d.line([outer_top, outer_bottom], fill=FG, width=w)
        # topo da página
        d.line([outer_top, (cx, top + size * 0.02)], fill=FG, width=w, joint="curve")
        # base da página (curva até a lombada)
        d.line([outer_bottom, inner_bottom], fill=FG, width=w, joint="curve")


def draw_sparkle(d, size):
    cx, cy = size * 0.775, size * 0.245
    r = size * 0.075
    pts = [
        (cx, cy - r), (cx + r * 0.42, cy - r * 0.42),
        (cx + r, cy), (cx + r * 0.42, cy + r * 0.42),
        (cx, cy + r), (cx - r * 0.42, cy + r * 0.42),
        (cx - r, cy), (cx - r * 0.42, cy - r * 0.42),
    ]
    d.polygon(pts, fill=SPARKLE)


def draw_mark(size, maskable=False):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if maskable:
        d.rectangle([0, 0, size, size], fill=BG)
        draw_book(d, size, scale=0.72, offset_y=size * 0.02)
    else:
        radius = int(size * 0.25)
        d.rounded_rectangle([0, 0, size, size], radius=radius, fill=BG)
        draw_book(d, size, scale=1.0)
    draw_sparkle(d, size)
    return img


for size, name, maskable in [
    (192, "icon-192.png", False),
    (512, "icon-512.png", False),
    (512, "icon-512-maskable.png", True),
]:
    im = draw_mark(size, maskable)
    im.save(os.path.join(OUT, name))

print("Ícones gerados em", OUT)
