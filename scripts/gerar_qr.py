from pathlib import Path
import sys

import qrcode
from PIL import Image, ImageDraw


URL = "https://fink0612.github.io/SiteIntervensaoArtes/"
INK = "#101010"
PAPER = "#f0eee7"
ALERT = "#ff3b30"


def quadratic_bezier(start, control, end, steps=40):
    points = []
    for index in range(steps + 1):
        t = index / steps
        x = (1 - t) ** 2 * start[0] + 2 * (1 - t) * t * control[0] + t**2 * end[0]
        y = (1 - t) ** 2 * start[1] + 2 * (1 - t) * t * control[1] + t**2 * end[1]
        points.append((round(x), round(y)))
    return points


def criar_qr(destino: Path):
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=48,
        border=4,
    )
    qr.add_data(URL)
    qr.make(fit=True)
    imagem = qr.make_image(fill_color=INK, back_color=PAPER).convert("RGB")
    imagem = imagem.resize((2400, 2400), Image.Resampling.NEAREST)

    draw = ImageDraw.Draw(imagem)
    centro = 1200
    placa = 224

    # Área limpa em torno do símbolo central, pequena o bastante para a
    # correção de erro de nível H reconstruir os módulos encobertos.
    draw.ellipse(
        (centro - placa, centro - placa, centro + placa, centro + placa),
        fill=PAPER,
        outline=ALERT,
        width=28,
    )

    largura = 310
    altura = 130
    esquerda = (centro - largura, centro)
    direita = (centro + largura, centro)
    superior = quadratic_bezier(esquerda, (centro, centro - altura), direita)
    inferior = quadratic_bezier(direita, (centro, centro + altura), esquerda)
    olho = superior + inferior
    draw.polygon(olho, fill=PAPER)
    draw.line(olho + [olho[0]], fill=INK, width=30, joint="curve")

    draw.ellipse((centro - 108, centro - 108, centro + 108, centro + 108), fill=ALERT)
    draw.ellipse((centro - 54, centro - 54, centro + 54, centro + 54), fill=INK)
    draw.ellipse((centro - 28, centro - 42, centro + 5, centro - 9), fill=PAPER)

    destino.parent.mkdir(parents=True, exist_ok=True)
    imagem.save(destino, format="PNG", optimize=True, dpi=(300, 300))
    return qr.version


if __name__ == "__main__":
    destino = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("material-divulgacao/qr-code-olho.png")
    versao = criar_qr(destino)
    print(f"QR version {versao} salvo em {destino.resolve()}")
