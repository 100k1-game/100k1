# Квиз — День нефтяной и газовой промышленности (5 сентября)

Онлайн-квиз с QR-входом для гостей и live-панелью для ведущего.

## Быстрый старт

```bash
pip install -r requirements.txt
python app.py
```

В другом терминале:

```bash
python generate_qr.py
```

## Адреса

| Страница | URL |
|----------|-----|
| Гости (QR) | http://localhost:5000/ |
| Панель ведущего | http://localhost:5000/host |

QR-код сохраняется в `qr_codes/guest_qr.png`.

## Как пользоваться

1. Запустите сервер (`python app.py`)
2. Сгенерируйте QR (`python generate_qr.py`) — для телефонов в той же Wi-Fi сети укажите IP: `python generate_qr.py --url http://192.168.x.x:5000/`
3. Откройте панель ведущего на проекторе/ноутбуке
4. Гости сканируют QR → вводят ФИО и специальность → нажимают «Начать»
5. Ведущий видит участников, баллы и прогресс в реальном времени

## Стек

- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Python, Flask, Flask-SocketIO
- **QR:** qrcode (Python)
