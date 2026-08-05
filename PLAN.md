# Habit Tracker — arquitectura y decisiones

Documento de referencia. Empezó como plan y ahora describe lo construido, incluidas las cosas que se aprendieron rompiéndolas.

**En vivo:** https://JuanLeonn-1.github.io/habit-tracker/ · **Pruebas:** `/tests/`

Resumen: la versión digital de una hoja de bullet journal. Rejilla de hábitos arriba, calendario mensual abajo. Dos perfiles independientes (Mariana y Leon), interfaz en inglés, sin build step, hosteada en GitHub Pages, datos en `localStorage` con sync opcional a un Gist secreto.

---

## 1. El principio que ordena todo

De la transcripción original:

> *"hay cosas que por ejemplo lavar la ropa, eso no lo voy a hacer todos los días, entonces no es como llenar todo, todo el tiempo, sino como tener un tipo de seguimiento"*

**La app puede empujar, pero no castiga lo que nunca fue diario.** En papel, una celda vacía en Laundry no significa nada. La constancia se incentiva donde la constancia es la meta; donde no lo es, el vacío se queda neutral.

Consecuencias concretas: los hábitos flexibles no tienen racha ni meta; una racha rota muestra la mejor lograda en vez de un cero; no hay rojos, ni porcentajes de cumplimiento, ni mensajes de derrota. Cualquier feature futuro que rompa esto está en contra del diseño.

## 2. Hábitos

### Tipos

| Tipo | Qué muestra | Por qué |
|---|---|---|
| `daily` | Racha en días + mejor racha + conteo del mes | La racha incentiva donde la constancia *es* el objetivo |
| `weekly` | Racha en **semanas** + conteo del mes | Rituales de cadencia semanal |
| `flexible` | Conteo del mes + *"last done 4 days ago"* | Sin meta, sin racha, sin celda vacía penalizada |

`weekly` cuenta **semanas consecutivas con al menos un check**, y a propósito **no se restringe a un día concreto**: planear la semana un viernes en la noche o un lunes temprano cuenta igual. Amarrarlo a un día convertiría un ritual cumplido en racha rota por tecnicismo.

Las rachas se **calculan al vuelo** desde `entries`, nunca se guardan. Así no pueden quedar desincronizadas tras una fusión entre dispositivos.

### Listas iniciales

**Mariana** — Drink 2L of water · Morning skincare · Night skincare · Make the bed · Cat care *(daily)*; Exercise · English lessons · No spend day · No sugar day · Laundry *(flexible)*.

**Leon** — Morning skincare · Night skincare · Make the bed · Drink 2L of water · Review tasks & assignments · Sleep 7h+ · Walk 6k steps *(daily)*; Dog care (Candy) · Go to the gym · Sweep the room · Read · Organize clothes · Independent study session *(flexible)*; Plan the week *(weekly)*.

Todo editable desde la app: agregar, renombrar, cambiar tipo, color, icono, nota, reordenar, archivar, borrar.

Decisiones tomadas sobre estas listas:

- **Cat care es un solo check**, no sub-tareas. Los tres pendientes se hacen en el mismo viaje al rincón del gato; separarlos sumaría 3 filas a una rejilla de 10 y una celda parcial (2 de 3) no se dibuja legible. La nota `"litter · food · water"` resuelve el recordatorio.
- **Skincare sí está partido en dos** aunque Leon lo escribió como uno. No es el caso de Cat care: son dos rutinas en dos momentos, y un solo check no puede representar *"ya hice la de la mañana, falta la de la noche"*.
- **No spend / No sugar son flexibles a propósito.** Con racha, un solo postre borra el contador y eso se siente a castigo por algo que ya pasó. Como flexibles cuentan hacia arriba, que para ese tipo de meta motiva más.

### Archive vs Delete

**Archive** saca el hábito de las vistas y conserva el histórico — es el camino por defecto porque el impulso de "limpiar la lista" es justo lo que destruye el valor de un tracker a los seis meses. **Delete** borra el hábito y sus registros, detrás de confirmación en dos toques, y es para errores de captura.

## 3. Vistas

- **Today** (defecto) — checklist vertical del día. Es la interacción diaria: entrar, marcar tres cosas, salir en 5 segundos.
- **Month** — la rejilla de papel: hábitos en filas, días en columnas, columna TOTAL. La columna de nombres queda fija mientras la tabla scrollea horizontal, que es lo que hace usable 31 columnas en un celular. Los nombres envuelven a dos líneas en vez de truncarse.
- **Year** — una barra fina por día, una fila por hábito. Solo lectura: las celdas miden 5px y cualquier cosa tocable a ese tamaño es una trampa. El conteo va fijo al borde derecho, porque una fila mide ~1800px y dejarlo suelto esconde el dato más útil detrás de todo el scroll.
- **Calendar** — mes MON–SUN con las notas apiladas en cada día. En celular las notas se vuelven puntos de color y el texto vive en la hoja del día: siete columnas dejan ~50px, no cabe texto legible. Los días de meses vecinos siguen visibles y tocables.
- **Settings** — perfil, duplicados, sync, respaldo, reset.

**Por qué Today y Month son vistas distintas:** 10 hábitos × 31 días son 310 celdas; a 375px de ancho salen celdas de ~10px, imposibles de acertar. La rejilla es para *revisar*, la lista para *hacer*. Forzar la rejilla en el celular empeoraría la interacción que ocurre todos los días.

### Calendario

Una nota es `{ title, color, done }`. **Sin hora** — son cosas de un día, no de una hora. Los títulos son inputs siempre en vez de click-para-editar: un estado menos que puede fallar, y un toque en vez de dos para corregir un typo. Vaciar el título borra el pendiente, porque si no quedaría una fila en blanco sin forma obvia de eliminarla.

## 4. Diseño visual

Del par de referencias de bullet journal: papel crema, pastel, acentos dorados, **cero negro puro** — ninguna de las dos referencias lo usa y meterlo rompe la calidez de inmediato.

El detalle que vale copiar: el nombre del hábito va en una **píldora de color** y la rejilla al lado se queda neutra. El color identifica la fila sin teñir las celdas, así la matriz no se vuelve ruido con el mes avanzado — problema que sí tiene la foto del cuaderno.

Dos fuentes, no tres: script solo para el word-mark, sans para todo lo demás con los encabezados imitando el serif espaciado vía `letter-spacing`. Nada manuscrito en texto chico; es ilegible en celular.

**No se implementó** de la referencia impresa: Objetivo del mes, Progreso semanal, Prioridades, Recordatorios, Notas, Reflexión, ni la frase del pie. Sí se tomó la columna TOTAL.

### Temas por perfil

Todo el color vive en `css/tokens.css`, así que un tema es un bloque de override sobre `[data-profile='…']` y una línea en `main.js` que pone el atributo en `<html>`. Ningún componente cambia.

- **Mariana** — papel crema, pastel, oro.
- **Leon** — fondo oscuro, bronce, y 12 tonos saturados a una misma luminosidad para que ninguna fila grite más que las otras.

Sobre fondo oscuro, el color a plena fuerza deslumbra como bloque de fila, pero atenuarlo también en las celditas mataría lo que hace legible un mes lleno. Se resolvió con **un token, `--pill-mix`**: las superficies tiñen el color, las celdas marcadas lo mantienen puro. En 100% devuelve el color intacto, así que el tema pastel pasa por la misma regla CSS sin cambio.

También se ajustan `color-scheme` y el meta `theme-color` por perfil, o los scrollbars y la barra del navegador delatan un tema hecho a medias.

## 5. Hosteo y despliegue

Repo **público** (Pages gratis lo exige) → `https://JuanLeonn-1.github.io/habit-tracker/`, sirviendo `main` / raíz.

**Sin build step.** HTML/CSS/JS plano con ES modules. Sin Vite, sin React, sin GitHub Actions. `git push` es todo el ciclo de deploy; publica en ~1 minuto.

Dos cosas que rompen si se olvidan:

- **`.nojekyll`** en la raíz. Sin él Pages pasa todo por Jekyll e ignora carpetas que empiecen con `_`.
- **Todas las rutas relativas** (`./css/app.css`), porque la app vive en un subpath. Incluye `start_url` del manifest y el scope del service worker.

## 6. Estructura

```
/
├── index.html · manifest.webmanifest · sw.js · .nojekyll
├── css/          tokens.css (color, tipografía, temas) · app.css
├── js/
│   ├── main.js       arranque, tema, routing por hash
│   ├── profiles.js   perfil activo y prefijos de storage
│   ├── store.js      estado en memoria y todas las mutaciones
│   ├── sync.js       orquestación de sincronización
│   ├── seed.js       listas iniciales
│   ├── storage/      local.js · gist.js
│   ├── lib/          date.js · streaks.js · merge.js · month-cursor.js · id.js
│   └── views/        profile · today · grid · year · calendar · day-sheet
│                     habit-editor · month-nav · settings
├── assets/icons/
└── tests/        index.html · run.js
```

## 7. Modelo de datos

```js
{
  version: 1,
  updatedAt: 1785949721891,
  habits: [{
    id,                       // 'leon-0' en la semilla, aleatorio si lo creas tú
    name, color, icon,
    type,                     // 'daily' | 'weekly' | 'flexible'
    note,                     // "litter · food · water"
    order,
    createdAt, updatedAt, archivedAt, deletedAt
  }],
  entries: { "habitId|2026-08-05": { done: true, updatedAt } },
  events:  [{ id, date, title, color, done, createdAt, updatedAt, deletedAt }]
}
```

Las rachas no aparecen aquí: son derivadas. El plan original listaba un campo `deviceId` que **nunca se implementó** — con la fusión por entrada resultó innecesario.

**Los ids de la semilla son derivados (`leon-0`, `mariana-3`), no aleatorios.** Con ids aleatorios, dos dispositivos que siembran el mismo perfil por separado producían 10 hábitos con 10 ids distintos cada uno, y fusionarlos daba 20 — cada hábito duplicado. Esto pasó de verdad y hubo que construir una herramienta para limpiarlo.

## 8. Persistencia

**Lo local es la verdad; el sync es un lujo encima.** Cada cambio se escribe a `localStorage` de forma síncrona e instantánea, así la UI nunca espera a la red. Si el sync se rompe, se cae GitHub o expira el token, la app sigue funcionando idéntica.

Los perfiles viven en la **capa de storage**, no en el modelo: las claves son `ht:profile:mariana` / `ht:profile:leon`, y `store.js` junto con todas las vistas son código de un solo usuario que nunca se entera de que existen perfiles. Por eso la feature salió casi gratis.

### Sync a Gist

Un Gist secreto, no un archivo del repo: el repo es público y los datos de hábitos no tienen por qué serlo. Un Gist secreto tiene URL no adivinable y no se indexa. La app solo hace dos cosas con él: leer el archivo y sobreescribirlo entero.

El token es un PAT fine-grained con **un solo permiso: Gists, read and write**. Se guarda bajo una clave aparte del estado (`ht:profile:…:sync`) y **nunca entra al objeto de estado**, así no puede colarse en un respaldo exportado. Está en el localStorage del navegador: quien tenga acceso a ese navegador puede leerlo desde devtools, por eso solo en dispositivos propios.

Se sincroniza al abrir la app, al volver a ella desde segundo plano, y 3 segundos después de cualquier cambio.

### La fusión

**Por entrada, no por documento.** La forma ingenua —"gana el archivo más nuevo"— borra todo lo que hizo el otro dispositivo. Como los registros son un mapa plano `habitId|YYYY-MM-DD`, fusionar es juntar llaves: dos dispositivos que marcaron días distintos conservan ambos, y solo hay conflicto real si tocaron la *misma* llave, donde gana el `updatedAt` mayor.

**Los borrados son lápidas (`deletedAt`), no ausencias.** La ausencia es ambigua: un dispositivo no puede distinguir "esto fue borrado" de "esto todavía no lo he visto". Sin lápidas, borrar un hábito en el celular haría que la laptop lo reviviera en cada sincronización, para siempre. Lo mismo con un des-marcado, que se guarda como `done: false` en vez de eliminar la llave.

**Cada push trae y fusiona primero.** La API de Gists no puede expresar "escribe solo si nadie lo cambió", así que traer inmediatamente antes de escribir reduce la ventana de carrera a milisegundos. Y como la fusión es por entrada, perder esa carrera cuesta un toque, no la jornada del otro.

### Dos fallos que costó encontrar

**Escribir siempre → 409.** Al principio la app escribía en cada sincronización, hubiera cambiado algo o no. Con dos dispositivos abiertos cada uno subía una copia idéntica y se pisaban; un Gist es un repo git por debajo, así que dos escrituras simultáneas se rechazan con **409** en vez de fusionarse. El push fallaba y parecía que el sync estuviera muerto. Ahora solo escribe cuando tiene algo que aportar, y un 409 que se cuele se reintenta releyendo y refusionando (la fusión es idempotente, así que repetirla es gratis).

**Marca de pendiente, no marca de tiempo.** El primer intento de "¿tengo algo que subir?" comparaba `updatedAt` local contra remoto. Cuando dos cambios caen en el mismo milisegundo, la app concluye que no tiene nada nuevo y **se salta la subida en silencio**. Ahora hay un flag `pending` explícito, guardado **en disco** para que un cambio hecho sin señal y luego cerrado no se olvide al reabrir.

### Salvaguardas

- Cada Gist lleva grabado **a qué perfil pertenece**, verificado antes de fusionar nada. Pegar el ID del perfil equivocado rebota en vez de mezclar los hábitos de dos personas y empujar la mezcla a ambos Gists.
- **Dejar el Gist ID vacío busca antes de crear.** Crear a ciegas es cómo un segundo dispositivo termina sincronizando contra su propia copia privada mientras muestra "Connected. Last synced just now" — el fallo se veía igual que el éxito. Si encuentra varios candidatos, pregunta en vez de adivinar.
- Un dispositivo que **nunca se ha usado adopta el remoto entero** en vez de fusionar, porque su lista inicial intacta no tiene nada que valga la pena y fusionarla reintroduce los duplicados.
- El **import valida** antes de tocar nada: apuntar al JSON equivocado no puede borrar un perfil.

## 9. Fechas

Todas las claves `YYYY-MM-DD` se construyen **en hora local**, nunca vía `toISOString()`. Ese método convierte a UTC y en zona horaria negativa corre el día: marcar un hábito a las 9pm quedaría registrado al día siguiente y partiría una racha en dos. Todo centralizado en `lib/date.js`.

`daysBetween` normaliza a mediodía antes de restar, o el ±1h de un cambio de horario de verano redondea a un día entero.

**Las semanas van MON–SUN.** `WEEKDAYS` sigue indexado por `getDay()` (índice 0 = domingo) porque es una *búsqueda*, y hay un `WEEK_ORDER` aparte para el *orden de visualización*. Juntar las dos en una sola lista es exactamente por donde entran los errores de corrimiento de semana.

## 10. PWA

`manifest.webmanifest` con `display: standalone` e iconos 192/512 + maskable (con zona segura, porque algunos launchers de Android recortan a círculo). El `sw.js` precachea el shell y sirve *stale-while-revalidate*.

Como los datos ya viven en `localStorage`, la app es **100% funcional offline** — pero **la primera carga de cada dispositivo necesita internet**, porque es cuando el navegador guarda la copia.

`VERSION` en `sw.js` **hay que subirla en cada deploy que toque archivos cacheados.** El navegador compara el archivo byte a byte, ve el cambio, instala el worker nuevo y descarta el caché viejo. Con *stale-while-revalidate* los cambios entrarían igual en la segunda carga, pero subir la versión los hace inmediatos y limpios.

## 11. Pruebas

`tests/index.html`, corre en el navegador sin build ni dependencias: abre `/tests/`. 35 pruebas sobre los sitios donde un bug es **silencioso** — no se cae nada, simplemente un día queda mal asignado o una marca desaparece.

Cubren: claves en hora local, `daysBetween` cruzando horario de verano, semanas del lunes, fusión por entrada, lápidas que no reviven, des-marcado que se propaga, semillas idénticas que no duplican, un día sin marcar que no lee como racha rota, dedupe moviendo registros antes de retirar la copia, y los cinco casos de sync detrás de los 409.

Las de sync usan un perfil `__test__` y una API simulada — nunca tocan un perfil ni un token real.

**Si tocas `date.js`, `merge.js` o `sync.js`, corre esto.** Son los tres archivos donde un error no se nota hasta semanas después.

## 12. Operarlo

| Tarea | Cómo |
|---|---|
| Desplegar | `git push` a `main`. Publica en ~1 min. |
| Tras un deploy | Subir `VERSION` en `sw.js`. En el celular puede necesitar cerrar y reabrir la app. |
| Correr pruebas | Abrir `/tests/` |
| Ver la versión en caché | Laptop: `Ctrl+Shift+R` fuerza la nueva |
| Respaldar | Settings → Export a copy, por perfil |
| Duplicados | Settings → Merge duplicates (la tarjeta solo aparece si hay) |

**Sobre los Gists:** quedaron 4 en la cuenta, 2 en uso y 2 huérfanos de cuando se dejó el ID vacío en los celulares. Se decidió dejarlos; no molestan. Si alguna vez se reconecta un perfil dejando el ID vacío, la app va a avisar que hay varios candidatos y pedirá el ID explícito — es el comportamiento correcto, no un error.

## 13. Límites conocidos

- **Sin notificaciones ni recordatorios.** Sin backend no son confiables: solo se pueden programar mientras la app está abierta, y las APIs que lo harían de verdad son de un solo navegador, exigen la PWA instalada y corren cuando el navegador quiere. Un recordatorio que llega a veces es peor que ninguno.
- **La primera carga de cada dispositivo necesita internet.**
- **Sin recurrencia en el calendario.**
- **Sin modo oscuro para Mariana** (existe la maquinaria, falta la paleta).
- **Cada cambio de estado re-renderiza la vista completa.** A esta escala es imperceptible, pero la vista de año son ~5000 nodos y es el primer sitio que se sentiría lento si los datos crecieran mucho.
- **La ventana de carrera del sync no es cero.** Ver §8.

## 14. Ideas parqueadas

En orden de lo que yo haría primero:

1. **Modo pareja** — una tarjeta con *"Mariana: 4 de 5 hoy"*. Es lo único que una app de pareja puede hacer que una individual no, y como comparten token cada perfil puede leer el Gist del otro en solo lectura. Dos condiciones para que no se vuelva vigilancia: opt-in por perfil y solo el conteo de hoy, nunca el histórico ni comparaciones.
2. **Marcar días pasados desde Today** — hoy hay que ir a Month y buscar la columna. La gente olvida marcar, no olvida el hábito.
3. **Hoja imprimible** (`@media print`) — cierra el círculo con el cuaderno del que salió esto.
4. **Estadísticas al tocar un hábito** — mes, mejor racha, últimos 90 días.
5. **Dark mode para Mariana** · **atajos en el icono** (`shortcuts` del manifest).

Descartado a propósito: **retos o competencia entre perfiles.** Choca de frente con §1 — una racha compartida convierte el día flojo de uno en la culpa del otro.
