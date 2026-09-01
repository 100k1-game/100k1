"""
Генератор QR-кода для входа гостей на квиз.

Использование:
  python generate_qr.py
  python generate_qr.py --url http://192.168.1.100:5000/
  python generate_qr.py --url http://192.168.1.100:5000/ --output qr_guest.png
"""

import argparse
import socket
import sys
from pathlib import Path

try:
    import qrcode
    from qrcode.constants import ERROR_CORRECT_H
except ImportError:
    print("Установите зависимости: pip install qrcode[pil]")
    sys.exit(1)


def get_local_ip() -> str:
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except OSError:
        return "localhost"


def generate_qr(url: str, output: Path) -> None:
    qr = qrcode.QRCode(
        version=1,
        error_correction=ERROR_CORRECT_H,
        box_size=12,
        border=2,
    )
    qr.add_data(url)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")

    output.parent.mkdir(parents=True, exist_ok=True)
    img.save(output)

    print(f"\n  QR-код сохранён: {output.resolve()}")
    print(f"  URL для гостей:  {url}\n")


def main():
    local_ip = get_local_ip()
    default_url = f"http://{local_ip}:5000/"

    parser = argparse.ArgumentParser(
        description="Генерация QR-кода для входа гостей на квiz"
    )
    parser.add_argument(
        "--url",
        default=default_url,
        help=f"URL страницы регистрации гостей (по умолчанию: {default_url})",
    )
    parser.add_argument(
        "--output",
        default="qr_codes/guest_qr.png",
        help="Путь для сохранения PNG (по умолчанию: qr_codes/guest_qr.png)",
    )
    args = parser.parse_args()

    generate_qr(args.url, Path(args.output))

    base = args.url.rstrip("/")
    host_url = f"{base}/host"

    print(f"  Панель ведущего: {host_url}")
    print("\n  1. Запустите сервер:  python app.py")
    print("  2. Распечатайте QR или покажите на экране")
    print("  3. Откройте панель ведущего в браузере\n")


if __name__ == "__main__":
    main()
