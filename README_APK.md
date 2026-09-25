# 🚚 American Truck Simulator 3D - Guía de Instalación APK para Android

¡Ya está todo configurado para que tengas tu APK lista para instalar en Android! Tienes **2 formas súper fáciles** de instalar el juego en tu celular:

---

## ⚡ Opción 1: Descargar el APK desde GitHub (Compilación Automática con GitHub Actions)

El proyecto incluye el flujo de trabajo automático en `.github/workflows/build-apk.yml`. 

### ¿Cómo obtener el archivo `.apk` en GitHub?
1. Haz **Push** de tus cambios a tu repositorio de GitHub (o ve a tu repositorio en GitHub).
2. Entra a la pestaña **Actions** arriba en tu repositorio.
3. Verás la acción llamada **"Build Android APK"**.
4. Haz clic en la ejecución (o pulsa el botón **"Run workflow"**).
5. Cuando termine (tarda unos 2 minutos), baja a la sección **Artifacts** al final de la página.
6. ¡Ahí verás para descargar con un clic: **`AmericanTruckSimulator-Debug-APK`**! 
7. Descomprímelo, pásalo a tu celular o descárgalo directo desde Chrome en tu Android, dale permisos para instalar apps de fuentes desconocidas ¡y listo para jugar!

---

## 📲 Opción 2: Instalar al Instante en tu Teléfono como App Nativa (Sin esperas)

El juego cuenta con soporte **PWA / WebAPK** completo:
1. Abre el enlace del juego en **Google Chrome** en tu teléfono Android.
2. Toca los **tres puntos (⋮)** arriba a la derecha en Chrome.
3. Selecciona **"Instalar aplicación"** o **"Agregar a la pantalla principal"**.
4. Android creará el icono oficial del camión en el menú de aplicaciones de tu teléfono y se abrirá a pantalla completa 100% como una app nativa APK con 60 FPS y aceleración por GPU.

---

## 🛠️ Opción 3: Compilar localmente con Android Studio (si eres desarrollador)

Si tienes Android Studio instalado en tu PC:
```bash
# 1. Instalar dependencias
npm install

# 2. Compilar la aplicación web y sincronizar con Android
npm run cap:build

# 3. Abrir en Android Studio
npm run cap:open
```
En Android Studio solo pulsas **Build > Build Bundle(s) / APK(s) > Build APK(s)** y tendrás tu archivo `app-debug.apk`.
