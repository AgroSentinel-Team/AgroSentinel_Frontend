import random
import sys
import threading
import time

import requests

REMOTE_DOCS_URL = "https://agrosentinel-predictivo.onrender.com/docs"
REMOTE_API_URL = "https://agrosentinel-predictivo.onrender.com/predecir"
LOCAL_API_URL = "http://localhost:8000/predecir"

ASSET_ID = 1
MACHINE_ID = "TRAC-001"
SAMPLE_INTERVAL_SECONDS = 1
OPERATING_SEND_INTERVAL_SECONDS = 30
DEMO_SEND_INTERVAL_SECONDS = 3
WARMUP_READINGS = 10
WARMUP_INTERVAL_SECONDS = 0.5

NORMAL_MODE = "NORMAL"
DEGRADATION_MODE = "DEGRADACION"
FAILURE_MODE = "FALLA CRITICA"

commands = []
commands_lock = threading.Lock()


def detect_api_url():
    try:
        response = requests.get(REMOTE_DOCS_URL, timeout=4)
        if response.ok:
            print(f"Servidor remoto disponible: {REMOTE_API_URL}")
            return REMOTE_API_URL
        print(f"El servidor remoto respondió HTTP {response.status_code}.")
    except requests.RequestException as error:
        print(f"No se pudo verificar el servidor remoto: {error}")

    print(f"Usando servidor local: {LOCAL_API_URL}")
    return LOCAL_API_URL


def choose_send_interval():
    sys.stdout.write(
        "Selecciona el intervalo de envío: "
        "[1] Operación real (30s)  [2] Modo Presentación (3s): "
    )
    sys.stdout.flush()
    try:
        choice = input().strip()
    except EOFError:
        choice = "1"

    if choice == "2":
        print("Modo Presentación: envío cada 3 segundos.")
        return DEMO_SEND_INTERVAL_SECONDS
    print("Operación real: envío cada 30 segundos.")
    return OPERATING_SEND_INTERVAL_SECONDS


def listen_for_commands():
    print("Controles: w=precarga LSTM, n=normal, d=degradación, f=falla crítica.")
    while True:
        try:
            command = input().strip().lower()
        except EOFError:
            return
        if command in ("w", "n", "d", "f"):
            with commands_lock:
                commands.append(command)
        else:
            print("Comando no reconocido. Usa w, n, d o f.")


def take_commands():
    with commands_lock:
        pending = commands[:]
        del commands[:]
    return pending


def average_readings(readings):
    count = len(readings)
    keys = (
        "temperature",
        "vibration",
        "humidity",
        "pressure",
        "energy_consumption",
    )
    averaged = {
        key: round(sum(reading[key] for reading in readings) / count, 2)
        for key in keys
    }
    averaged["asset_id"] = ASSET_ID
    averaged["machine_id"] = MACHINE_ID
    averaged["machine_status"] = 1
    return averaged


def generate_reading(mode, degradation_level=0):
    if mode == FAILURE_MODE:
        return {
            "temperature": round(random.uniform(88, 96), 2),
            "vibration": round(random.uniform(7.50, 9.20), 2),
            "humidity": round(random.uniform(55, 65), 2),
            "pressure": round(random.uniform(0.85, 1.25), 2),
            "energy_consumption": round(random.uniform(5.60, 6.80), 2),
        }, degradation_level

    if mode == DEGRADATION_MODE:
        level = min(1.0, degradation_level + 0.03)
        reading = {
            "temperature": round(48 + 42 * level + random.uniform(-1.5, 1.5), 2),
            "vibration": round(2.1 + 6.4 * level + random.uniform(-0.15, 0.15), 2),
            "humidity": round(random.uniform(55, 65), 2),
            "pressure": round(3.15 - 2.15 * level + random.uniform(-0.08, 0.08), 2),
            "energy_consumption": round(
                3.4 + 2.8 * level + random.uniform(-0.12, 0.12), 2
            ),
        }
        return reading, level

    return {
        "temperature": round(random.uniform(44, 52), 2),
        "vibration": round(random.uniform(1.80, 2.45), 2),
        "humidity": round(random.uniform(55, 65), 2),
        "pressure": round(random.uniform(2.95, 3.35), 2),
        "energy_consumption": round(random.uniform(3.10, 3.75), 2),
    }, 0


def describe_response(response):
    try:
        body = response.json()
    except requests.JSONDecodeError:
        return response.text.strip() or "(sin cuerpo)"

    if isinstance(body, dict):
        for key in (
            "diagnostico",
            "diagnosis",
            "diagnostic",
            "prediccion",
            "prediction",
            "message",
            "status",
            "detail",
        ):
            if key in body:
                return f"{key}={body[key]}; respuesta={body}"
    return str(body)


def send_reading(api_url, reading, mode):
    payload = dict(reading)
    payload["asset_id"] = ASSET_ID
    payload["machine_id"] = MACHINE_ID
    payload["machine_status"] = 1
    try:
        response = requests.post(api_url, json=payload, timeout=15)
        diagnosis = describe_response(response)
        print(
            f"[{mode}] HTTP {response.status_code} | "
            f"valores={payload} | diagnóstico={diagnosis}",
            flush=True,
        )
    except requests.RequestException as error:
        print(f"[{mode}] Error enviando telemetría a {api_url}: {error}", flush=True)


def send_warmup(api_url):
    print("Iniciando precarga: 10 lecturas normales separadas por 0.5 segundos.")
    for index in range(WARMUP_READINGS):
        reading, _ = generate_reading(NORMAL_MODE)
        send_reading(api_url, reading, f"PRECARGA NORMAL {index + 1}/{WARMUP_READINGS}")
        if index + 1 < WARMUP_READINGS:
            time.sleep(WARMUP_INTERVAL_SECONDS)
    print("Precarga terminada.")


def main():
    api_url = detect_api_url()
    send_interval = choose_send_interval()
    threading.Thread(target=listen_for_commands, daemon=True).start()

    mode = NORMAL_MODE
    degradation_level = 0
    readings = []
    next_sample = time.monotonic()
    next_send = next_sample + send_interval
    print(f"Simulador activo: muestreo cada 1s, envío cada {send_interval}s.")

    try:
        while True:
            for command in take_commands():
                if command == "w":
                    send_warmup(api_url)
                    readings.clear()
                    next_sample = time.monotonic() + SAMPLE_INTERVAL_SECONDS
                    next_send = time.monotonic() + send_interval
                elif command == "n":
                    mode = NORMAL_MODE
                    degradation_level = 0
                    print("Modo Normal activado.")
                elif command == "d":
                    mode = DEGRADATION_MODE
                    degradation_level = 0
                    print("Modo Degradación Progresiva activado.")
                elif command == "f":
                    mode = FAILURE_MODE
                    print("Modo Falla Crítica Inmediata activado.")

            now = time.monotonic()
            if now >= next_sample:
                reading, degradation_level = generate_reading(mode, degradation_level)
                readings.append(reading)
                print(
                    f"Muestra {len(readings)} | modo={mode} | valores={reading}",
                    flush=True,
                )
                next_sample = now + SAMPLE_INTERVAL_SECONDS

            if now >= next_send:
                if readings:
                    send_reading(api_url, average_readings(readings), mode)
                    readings.clear()
                next_send = time.monotonic() + send_interval

            time.sleep(0.05)
    except KeyboardInterrupt:
        print("\nSimulador detenido.")


if __name__ == "__main__":
    main()
