from pathlib import Path
import sys

import qrcode
from PIL import Image, ImageDraw, ImageFont


URL = "https://fink0612.github.io/SiteIntervensaoArtes/"
INK = "#101010"
PAPER = "#f0eee7"
ALERT = "#ff3b30"
ACID = "#d7ff35"
ROOT = Path(__file__).resolve().parent.parent
REFERENCE = ROOT / "material-divulgacao" / "olho-referencia.png"


def fonte(tamanho: int):
    candidatos = [
        Path("C:/Windows/Fonts/impact.ttf"),
        Path("C:/Windows/Fonts/arialbd.ttf"),
        Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),
    ]
    for caminho in candidatos:
        if caminho.exists():
            return ImageFont.truetype(str(caminho), tamanho)
    return ImageFont.load_default()


def logo_vermelho(largura: int):
    original = Image.open(REFERENCE).convert("L")
    # Usa apenas a silhueta escura da imagem enviada pelo usuário.
    mascara = original.point(lambda pixel: max(0, min(255, (230 - pixel) * 5)))
    bbox = mascara.getbbox()
    if not bbox:
        raise ValueError("A imagem de referência não contém uma silhueta reconhecível.")
    mascara = mascara.crop(bbox)
    altura = round(largura * mascara.height / mascara.width)
    mascara = mascara.resize((largura, altura), Image.Resampling.LANCZOS)
    logo = Image.new("RGBA", mascara.size, ALERT)
    logo.putalpha(mascara)
    return logo


def esta_no_marcador(x: int, y: int, total: int, borda: int):
    inicio = borda
    fim = total - borda - 7
    return (
        inicio <= x < inicio + 7 and inicio <= y < inicio + 7
    ) or (
        fim <= x < fim + 7 and inicio <= y < inicio + 7
    ) or (
        inicio <= x < inicio + 7 and fim <= y < fim + 7
    )


def desenhar_marcador(draw: ImageDraw.ImageDraw, x: int, y: int, modulo: float):
    x0 = round(x * modulo)
    y0 = round(y * modulo)
    x7 = round((x + 7) * modulo)
    y7 = round((y + 7) * modulo)
    recuo = round(modulo)
    draw.rounded_rectangle((x0, y0, x7, y7), radius=round(modulo * .42), fill=ALERT)
    draw.rounded_rectangle(
        (x0 + recuo, y0 + recuo, x7 - recuo, y7 - recuo),
        radius=round(modulo * .28),
        fill=PAPER,
    )
    draw.rounded_rectangle(
        (x0 + recuo * 2, y0 + recuo * 2, x7 - recuo * 2, y7 - recuo * 2),
        radius=round(modulo * .2),
        fill=ALERT,
    )


def criar_painel_qr(tamanho: int = 2450):
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=1,
        border=4,
    )
    qr.add_data(URL)
    qr.make(fit=True)
    matriz = qr.get_matrix()
    total = len(matriz)
    modulo = tamanho / total

    painel = Image.new("RGB", (tamanho, tamanho), PAPER)
    draw = ImageDraw.Draw(painel)
    folga = max(1, round(modulo * 0.035))
    raio = max(2, round(modulo * 0.13))

    for y, linha in enumerate(matriz):
        for x, ativo in enumerate(linha):
            if not ativo:
                continue
            if esta_no_marcador(x, y, total, qr.border):
                continue
            x0 = round(x * modulo) + folga
            y0 = round(y * modulo) + folga
            x1 = round((x + 1) * modulo) - folga
            y1 = round((y + 1) * modulo) - folga
            draw.rounded_rectangle((x0, y0, x1, y1), radius=raio, fill=INK)

    inicio = qr.border
    fim = total - qr.border - 7
    desenhar_marcador(draw, inicio, inicio, modulo)
    desenhar_marcador(draw, fim, inicio, modulo)
    desenhar_marcador(draw, inicio, fim, modulo)

    # Placa central: grande e visível, sem encobrir mais do que a correção H tolera.
    placa_largura = 800
    placa_altura = 590
    cx = cy = tamanho // 2
    placa = (
        cx - placa_largura // 2,
        cy - placa_altura // 2,
        cx + placa_largura // 2,
        cy + placa_altura // 2,
    )
    draw.rounded_rectangle(placa, radius=115, fill=PAPER, outline=ALERT, width=25)
    draw.rounded_rectangle(
        (placa[0] + 24, placa[1] + 24, placa[2] - 24, placa[3] - 24),
        radius=92,
        outline=INK,
        width=10,
    )

    logo = logo_vermelho(690)
    painel.paste(logo, (cx - logo.width // 2, cy - logo.height // 2), logo)
    return painel, qr.version


def criar_qr_tematico(destino: Path):
    tamanho = 3000
    imagem = Image.new("RGB", (tamanho, tamanho), INK)
    draw = ImageDraw.Draw(imagem)

    # Cabeçalho de câmera/vigilância.
    draw.ellipse((145, 109, 193, 157), fill=ALERT)
    draw.text((220, 80), "REC", fill=ALERT, font=fonte(90))
    draw.text((tamanho - 150, 94), "CAM_04  [ CORREDOR ]", fill=PAPER, font=fonte(54), anchor="ra")
    draw.line((145, 210, tamanho - 145, 210), fill="#56534e", width=5)

    painel, versao = criar_painel_qr()
    posicao = ((tamanho - painel.width) // 2, 275)
    imagem.paste(painel, posicao)

    # Mira e moldura de gravação fora da área de leitura.
    canto = 120
    comprimento = 185
    largura = 18
    for sx, sy in ((1, 1), (-1, 1), (1, -1), (-1, -1)):
        x = canto if sx == 1 else tamanho - canto
        y = canto if sy == 1 else tamanho - canto
        draw.line((x, y, x + sx * comprimento, y), fill=ALERT, width=largura)
        draw.line((x, y, x, y + sy * comprimento), fill=ALERT, width=largura)

    rodape_y = 2810
    draw.rectangle((275, rodape_y - 34, 330, rodape_y + 21), fill=ACID)
    draw.text((360, rodape_y - 72), "APONTE A CÂMERA", fill=PAPER, font=fonte(96))
    draw.text((tamanho - 275, rodape_y - 43), "SEMPRE OBSERVADOS", fill=ALERT, font=fonte(66), anchor="ra")
    draw.text((360, 2915), "O QUE VOCÊ NÃO VÊ TAMBÉM PODE ESTAR OLHANDO.", fill="#aaa69d", font=fonte(40))

    destino.parent.mkdir(parents=True, exist_ok=True)
    imagem.save(destino, format="PNG", optimize=True, dpi=(300, 300))
    return versao


if __name__ == "__main__":
    destino = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "material-divulgacao" / "qr-code-olho.png"
    versao = criar_qr_tematico(destino)
    print(f"QR version {versao} salvo em {destino.resolve()}")
