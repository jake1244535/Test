# Plan de Implementación: Corrección de Dirección, Curva de Torque Realista, Físicas de Suspensión y Shaders para Android

Corregir los bugs críticos de jugabilidad y matemáticas del motor 3D en Three.js, implementando dirección estricta y sincronizada (no invertida), curva de torque y potencia diésel realista dependiente de la masa total de carga (0 a 100 km/h), balanceo dinámico de cabina con riesgo de vuelco calibrado, materiales PBR optimizados para Android con reflejos solares/lunares, y animación fluida (Lerp) en agujas y controles táctiles.

---

## 1. Corrección de Dirección y Control Táctil (Volante y Flechas)

### Diagnóstico de la Inversión
* En `physicsEngine.ts`, `SceneManager.ts` y `HUD.tsx`, existía una discrepancia de signo entre la rotación visual de las ruedas (`visualSteerAngle = -controls.steer`), la orientación del volante táctil y el incremento angular del yaw del camión (`this.yaw += angularVel * dt`).
* Al pulsar **DERECHA** o girar el volante a la derecha, el camión y sus ruedas deben orientarse y avanzar unívocamente hacia la derecha relativa a la vista de conducción, tanto en avance (D) como en retroceso (R).

### Solución Técnica
1. **Unificación de Signos**:
   * En `HUD.tsx`: Flecha derecha genera `steer = +1.0`, flecha izquierda `steer = -1.0`.
   * En el volante virtual (`HUD.tsx`): Arrastre táctil hacia la derecha genera ángulo positivo (`steerFactor > 0`) con auto-retorno suave amortiguado mediante resorte virtual cuando el usuario levanta el dedo.
   * En `SceneManager.ts`: Las ruedas delanteras girarán con `visualSteerAngle = controls.steer * maxSteerVisual` (sin invertir el signo).
   * En `physicsEngine.ts`: El ángulo de giro de ruedas produce una velocidad angular coherente:
     $$\omega = \frac{v \cdot \tan(\delta)}{L}$$
     donde $\delta$ es el ángulo de dirección efectivo y $L$ la batalla entre ejes (*wheelbase*). Al girar a la derecha con velocidad hacia adelante, la orientación del chasis vira a la derecha sin ambigüedad.

---

## 2. Aceleración y Curva de Torque Diésel Realista (0 a 100 km/h)

### Diagnóstico
* La aceleración previa utilizaba un factor lineal simplificado que no transmitía el esfuerzo de un motor turbodiésel comercial pesado ni la resistencia inercial del tonelaje del remolque en pendientes.

### Solución Técnica
1. **Curva de Torque y Potencia No Lineal**:
   * Modelar la curva característica de un motor diésel de 6 cilindros / 13 litros:
     * **Zona de ralentí / arranque** (650–900 RPM): entrega moderada para evitar caladas.
     * **Meseta de torque máximo** (1,100–1,600 RPM): 100% del par disponible (hasta 2,500 Nm escalado según mejoras de motor).
     * **Caída de torque a altas revoluciones** (1,800–2,400 RPM): la potencia se estabiliza y el par desciende hacia la línea roja.
2. **Relaciones de Transmisión Efectivas**:
   * **L (Low / Corta)**: Relación 12.5:1. Torque descomunal para trepar pendientes de montaña con carga completa a velocidad controlada ($< 35\text{ km/h}$).
   * **D (Drive / Automática 6 marchas)**: Relaciones escalonadas de 6.2:1 (1ª) a 0.75:1 (6ª marcha *overdrive*).
   * **R (Reverse)**: Relación 5.8:1 con limitación de par reversa.
   * **N (Neutral)**: Pérdida total de tracción, ralentí o aceleración libre de RPM sin avance.
3. **Masa Total y Resistencia a la Pendiente**:
   * Inercia efectiva: $m_{\text{total}} = m_{\text{camión}} + m_{\text{remolque}} + m_{\text{carga}}$.
   * Con remolque cisterna o caja al 100% de carga (hasta 45 toneladas), el tiempo 0–100 km/h aumenta drásticamente (de ~9s descargado a ~30-40s cargado al máximo), exigiendo gestionar las marchas y el impulso.
   * Resistencia gravitacional en subidas: $F_{\text{grade}} = m_{\text{total}} \cdot g \cdot \sin(\theta)$.

---

## 3. Físicas de Suspensión, Balanceo de Cabina y Calibración de Vuelco

### Diagnóstico
* Se requiere que la cabina y el chasis reaccionen dinámicamente con balanceo lateral (*roll*) y cabeceo (*pitch*), transmitiendo la sensación física de peso sin descontrolarse en condiciones normales, pero castigando el exceso de velocidad en curvas pronunciadas.

### Solución Técnica
1. **Chassis Roll & Pitch Dinámico**:
   * **Cabeceo (*Pitch*)**:
     * Al acelerar fuerte: la parte trasera se hunde y el morro se eleva ligeramente (*squat*).
     * Al frenar a fondo: transferencia masiva de peso hacia el eje delantero (*dive*).
   * **Balanceo (*Roll*)**:
     * En giros, la aceleración centrípeta $a_{\text{lat}} = \frac{v^2}{R}$ actúa sobre el centro de masas elevado ($h_{\text{CoG}}$), comprimiendo la suspensión exterior y levantando la interior.
2. **Umbral Crítico de Vuelco Calibrado**:
   * Límite estático de estabilidad: cuando la inclinación excede el ángulo de vuelco crítico ($\theta_{\text{crit}} \approx 0.52\text{ rad} \approx 30^\circ$ ajustado por altura de carga).
   * Alerta preventiva en el HUD (`¡PELIGRO DE VUELCO!`) si la fuerza G lateral supera $0.38\text{G}$.
   * Si el usuario no desacelera y entra a más de $70\text{ km/h}$ en una horquilla cerrada con el remolque lleno, el camión pierde adherencia y vuelca de costado sobre el asfalto.

---

## 4. Visuales y Shaders Ligeros para Android (PBR Optimizado)

### Diagnóstico
* En dispositivos móviles Android, los shaders complejos o texturas pesadas provocan caídas de FPS. Se deben calibrar materiales `MeshStandardMaterial` ligeros con valores físicos precisos.

### Solución Técnica
1. **Acabado de Pintura Automotriz Metálica**:
   * `metalness = 0.75` – `0.85` y `roughness = 0.22` – `0.28` en la cabina y carrocería para capturar destellos nítidos del sol diurno y los reflejos lunares/farolas nocturnos.
   * Acabado de llantas y tubos de escape: `metalness = 0.95`, `roughness = 0.15` (cromo pulido reflectante).
2. **Asfalto y Carretera**:
   * Textura procedural optimizada con `roughness = 0.88` y `metalness = 0.08` en seco, reduciéndose suavemente a `roughness = 0.25` durante lluvia para simular asfalto mojado brillante sin recargar la GPU.
3. **Optimización de Luces y Sombras**:
   * Ajuste de sesgo (*bias*) en sombras direccionales y resolución adaptada para garantizar 60 FPS estables en Android.

---

## 5. Interpolación Suave (Lerp) en UI, Agujas y Pedales

### Diagnóstico
* Las agujas del velocímetro/tacómetro y los pedales táctiles pueden sentirse rígidos si saltan instantáneamente al valor numérico sin amortiguación.

### Solución Técnica
1. **Lerp en Indicadores Analógicos**:
   * En `HUD.tsx`, aplicar interpolación lineal continua en cada frame:
     $$\text{needleAngle} = \text{lerp}(\text{needleAngle}, \text{targetAngle}, 0.18)$$
   * La aguja del tacómetro responderá con una suave vibración de inercia analógica al soltar o apretar el acelerador.
2. **Animación y Feedback en Pedales Táctiles**:
   * Micro-animación de compresión `scale-95` y transición de gradiente de iluminación progresiva en los pedales de **GAS** y **FRENO** mientras están pulsados.
   * Volante virtual con retorno amortiguado `spring back` al centro cuando el usuario levanta el pulgar.

---

## Plan de Verificación

### Pruebas de Conducción y Controles
1. **Prueba de Dirección Directa**:
   * Tocar la flecha derecha o girar el volante virtual hacia la derecha; verificar que las ruedas delanteras y la trayectoria del camión giren sin vacilación hacia la DERECHA.
   * Probar el volante táctil en Android y comprobar que regresa suavemente a la posición central al soltarlo.
2. **Prueba de Curva de Par y 0 a 100 km/h**:
   * Camión sin remolque en marcha **D**: cronometrar el 0 a 100 km/h (~10-12s).
   * Camión con remolque cisterna lleno (40t): verificar que la aceleración sea notablemente más pesada (~30-38s) y que el motor trabaje en su rango óptimo de RPM.
   * Probar la marcha **L** en la cuesta de la cantera; verificar que trepe con fuerza y torque máximo sin ahogarse.
3. **Prueba de Suspensión y Vuelco**:
   * Tomar la curva cerrada del Gran Puente o la horquilla de montaña a 80 km/h con remolque cargado; verificar que la cabina se incline dramáticamente y que el camión vuelque de costado si no se frena a tiempo.
4. **Verificación de Rendimiento y Shaders**:
   * Comprobar que los reflejos solares y lunares en la pintura metálica resalten con nitidez.
   * Validar que la compilación (`compile_applet`) y el linter (`lint_applet`) finalicen con 0 errores.
