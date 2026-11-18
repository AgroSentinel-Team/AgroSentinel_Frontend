# Simulador de sensores AgroSentinel

Simulador 100% por software: genera telemetría sin ESP32, Arduino ni conexión serial. Al iniciar, verifica el servidor remoto y, si no responde, selecciona `http://localhost:8000/predecir`.

## Instalación y ejecución

Desde la raíz del proyecto:

```powershell
pip install -r iot/requirements.txt
python iot/simulador_sensores.py
```

Selecciona **[1] Operación real** para enviar cada 30 segundos o **[2] Modo Presentación** para enviar cada 3 segundos. El simulador genera muestras cada segundo y promedia las lecturas antes de cada envío. Los identificadores se configuran al inicio de `simulador_sensores.py`.

## Controles en vivo

Escribe el control y presiona Enter:

- `w`: envía diez lecturas normales de precarga, una cada 0.5 segundos, para llenar la ventana LSTM.
- `n`: vuelve al modo normal (temperatura 44–52 °C, vibración 1.80–2.45 mm/s, humedad 55–65 %, presión 2.95–3.35 bar y energía 3.10–3.75 kW).
- `d`: inicia una degradación progresiva de temperatura, vibración y energía, mientras desciende la presión.
- `f`: activa una falla crítica inmediata.

Cada envío muestra el modo, el payload, el código HTTP y el diagnóstico devuelto por FastAPI. `202` indica que el servicio sigue acumulando la ventana; una predicción aparece cuando el servidor la genera.
