# AgroSentinel Web y aplicación Android

Este repositorio contiene la aplicación web de AgroSentinel y una versión Android empaquetada con Capacitor. Android reutiliza las pantallas responsive de React y se conecta al mismo backend; no requiere el repositorio Flutter `agrosentinel_movile`.

## Requisitos

- Node.js 22 o posterior.
- Android Studio con Android SDK 36.
- JDK 21 compatible con la versión de Android Gradle Plugin del proyecto.
- Teléfono Android con depuración USB activada, o un emulador.
- Backend accesible desde el dispositivo.

## Ejecutar en un teléfono Android desde la terminal (cmd.exe)

Conecta el teléfono con un cable USB de datos, activa **Opciones de desarrollador → Depuración USB** y acepta en el teléfono la autorización del ordenador. Abre una terminal **Símbolo del sistema (cmd.exe)** en esta carpeta o ejecuta:

```cmd
cd /d C:\Users\Kese\Desktop\AGROSENTINEL\AgroSentinel_Frontend
set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
set "ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk"
set "ANDROID_SDK_ROOT=%ANDROID_HOME%"
set "PATH=%JAVA_HOME%\bin;%ANDROID_HOME%\platform-tools;%PATH%"
```

Comprueba que las herramientas y el teléfono estén disponibles:

```cmd
node --version
java -version
adb devices
```

El teléfono debe aparecer con estado `device`. Si aparece `unauthorized`, desbloquéalo y acepta el diálogo de depuración USB.

Instala dependencias (solo la primera vez), compila y sincroniza los archivos web, y ejecuta la aplicación en el teléfono. Sustituye `SERIAL_DEL_TELEFONO` por el identificador que muestra `adb devices`, por ejemplo `d777c88a`:

```cmd
npm ci
npm run cap:sync
npx cap run android --target SERIAL_DEL_TELEFONO
```

Si solo hay un dispositivo conectado, también puedes ejecutar `npm run android:run`. Si hay varios, usa `--target` para elegir el teléfono en lugar del emulador.

En algunos teléfonos Xiaomi, la instalación puede requerir activar **Opciones de desarrollador → Instalar vía USB** y aceptar las confirmaciones de seguridad en el teléfono. Si Android cancela la instalación, desbloquea el dispositivo, permite la instalación y vuelve a ejecutar el comando. No es necesario desinstalar la aplicación como primer paso.

Para compilar e instalar manualmente el APK generado:

```cmd
adb -s SERIAL_DEL_TELEFONO install -r ".\android\app\build\outputs\apk\debug\app-debug.apk"
```

Para abrir el proyecto Android en Android Studio:

```cmd
npm run cap:sync
npm run android:open
```

## Backend y acceso desde Android

`VITE_API_BASE_URL` permite definir explícitamente el origen del backend. Por defecto, el navegador usa `http://localhost:8080` y la aplicación Android usa `https://agrosentinel-backend-4f8q.onrender.com`, el mismo backend Spring configurado para el despliegue web en `render.yaml`.

Capacitor presenta la aplicación Android desde el origen `https://localhost`. El backend debe permitir ese origen en su configuración CORS efectiva, además de conservar los orígenes web existentes. En Render, revisa `CORS_ALLOWED_ORIGINS`: una variable configurada allí reemplaza el valor alternativo de `application.properties`. La solicitud CORS de login al backend desplegado respondió `403 Invalid CORS request`; agrega `https://localhost` a esa variable, conserva sus orígenes actuales y vuelve a desplegar el backend para habilitar el inicio de sesión y la sincronización desde Android.

## Acceso sin conexión: cobertura actual

La app puede abrir la interfaz incluida en el APK sin internet. Para acceder a datos offline, inicia sesión primero con conexión y activa **Recordarme en este dispositivo**. En Android, la sesión recordada se guarda mediante almacenamiento seguro respaldado por Android Keystore.

Las respuestas JSON correctas de las consultas `GET` que pasan por el cliente API compartido se guardan automáticamente en IndexedDB, separadas por cuenta. La caché permite consultar lo que se haya abierto previamente mientras había conexión. Si el servidor no responde y se muestran datos guardados, la app lo indica; comprueba la vigencia antes de tomar decisiones.

La app permite encolar reportes de fallas, intervenciones técnicas y mantenimientos preventivos, incluidas sus evidencias adjuntas. Al recuperar la conexión, esas operaciones se envían en orden cuando hay una sesión válida; la barra de estado permite consultar y reintentar la sincronización.

**El modo offline no convierte todas las funciones de la web en funciones sin conexión.** No se pueden consultar datos que nunca se hayan cargado, ni descargar evidencias adjuntas. Las escrituras de inventario y los cambios administrativos requieren conexión y no se guardan en la cola offline. El registro y el inicio de sesión también requieren conexión. Si el servidor procesa una operación pero se pierde su respuesta, el reintento podría duplicarla; para evitarlo se necesita soporte de idempotencia en el backend.

Los datos cacheados se guardan en el almacenamiento local privado de la aplicación y se separan por cuenta; esta caché de IndexedDB no es un almacén cifrado independiente. Protege el teléfono con bloqueo de pantalla y no compartas el dispositivo si contiene información operativa sensible.

La sesión recordada no omite la autenticación ni la autorización del backend. Si el token vence sin conexión, se pueden consultar los datos que ya estén guardados; para sincronizar, vuelve a conectarte e inicia sesión de nuevo.

## Pruebas y compilación

```cmd
npm test
npx eslint src/services/apiClient.js test/api-client-origin.test.js
npm run build
npm run cap:sync
```
