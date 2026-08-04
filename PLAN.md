# Plan — Habit Tracker + Calendario

Decisiones tomadas: persistencia `localStorage` + sync opcional a Gist secreto · **dos perfiles independientes** · responsive completo (celular y desktop por igual) · **toda la interfaz en inglés** · Mood tracker fuera del MVP · sin build step, HTML/CSS/JS plano en GitHub Pages.

> **Pendiente:** la lista de hábitos iniciales del segundo perfil (§1).

---

## 0. Qué se está construyendo

La versión digital de una hoja de bullet journal: arriba una **rejilla de hábitos** (filas = hábitos, columnas = días del mes, cada fila con su color), abajo un **calendario mensual** para anotar trabajos y pendientes. Nada más.

El principio que ordena lo demás sale de la transcripción:

> *"hay cosas que por ejemplo lavar la ropa, eso no lo voy a hacer todos los días, entonces no es como llenar todo, todo el tiempo, sino como tener un tipo de seguimiento"*

**La app puede empujar, pero no debe castigar lo que nunca fue diario.** En papel, una celda vacía en "Laundry" no significa nada. La constancia se incentiva donde la constancia es la meta; donde no lo es, el vacío se queda neutral.

---

## 1. Habit Tracker

### Tipos de hábito

| Tipo | Qué muestra | Por qué |
|---|---|---|
| `daily` | Racha en días + mejor racha + conteo del mes | La racha incentiva justo donde la constancia *es* el objetivo |
| `weekly` | Racha en **semanas** + conteo del mes | Rituales de cadencia semanal, no diaria |
| `flexible` | Conteo del mes + *"last done 4 days ago"* | Sin meta, sin racha, sin celda vacía penalizada |

Una racha en Laundry sería ruido — no lava ropa a diario y "racha rota" ahí no informa nada. Una racha en Night skincare sí es exactamente el empujón que sirve.

**El tipo `weekly` sale de "organizar el calendario de la semana".** No es diario ni es sin-ritmo: es una vez por semana. Su racha cuenta **semanas consecutivas con al menos un check**, no días. La semana corre SUN–SAT, igual que el calendario de §2.

Deliberadamente **no se restringe al fin de semana**: si organiza la semana un viernes en la noche o un lunes temprano, cuenta igual. Lo que importa es el ritmo semanal, no el día exacto — amarrarlo al sábado convertiría un ritual cumplido en una racha rota por un tecnicismo.

**Cómo se rompe la racha importa tanto como tenerla.** Se muestra siempre la mejor racha junto a la actual. Perder un día resetea el contador actual pero no borra el logro: sin rojo, sin mensaje de derrota, sin *"perdiste 12 días"*. La racha empuja mientras va bien y se corta en silencio — ese corte es justo el momento en que estas apps se abandonan, y el diseño tiene que sobrevivirlo.

Las rachas se **calculan al vuelo** desde `entries`, no se guardan. Así nunca quedan desincronizadas tras un merge entre dispositivos.

### Hábitos iniciales — perfil de ella

Diez hábitos precargados, nombres en inglés como el resto de la interfaz:

| Hábito | Tipo |
|---|---|
| Drink 2L of water | `daily` |
| Morning skincare | `daily` |
| Night skincare | `daily` |
| Make the bed | `daily` |
| Cat care | `daily` |
| Exercise | `flexible` |
| English lessons | `flexible` |
| No spend day | `flexible` |
| No sugar day | `flexible` |
| Laundry | `flexible` |

Los tipos son criterio mío y **todos son editables desde la app**. Los dos que dudo:

- **Exercise** — lo puse flexible porque poca gente entrena los 7 días, y una racha que se rompe cada semana desmotiva más de lo que empuja. Si su meta sí es diaria, se cambia.
- **No sugar day / No spend day** — flexibles a propósito. Como `daily` con racha, un solo postre borra el contador y eso se siente a castigo por algo que ya pasó. Como flexibles cuentan hacia arriba (*"14 no-spend days this month"*), que para este tipo de meta motiva más.

### Hábitos iniciales — perfil de él

| Hábito | Tipo |
|---|---|
| Morning skincare | `daily` |
| Night skincare | `daily` |
| Make the bed | `daily` |
| Drink 2L of water | `daily` |
| Review tasks & assignments | `daily` |
| Sleep 7h+ | `daily` |
| Walk 6k steps | `daily` |
| Dog care (Candy) | `flexible` |
| Go to the gym | `flexible` |
| Sweep the room | `flexible` |
| Read | `flexible` |
| Organize clothes | `flexible` |
| Independent study session | `flexible` |
| Plan the week | `weekly` |

Un ajuste sobre la lista original: **"skincare mañana y noche" quedó partido en dos**, igual que en el perfil de ella. No es lo mismo que Cat care — ahí los tres pendientes se hacen en un mismo viaje, así que un check basta. Skincare son dos rutinas en dos momentos del día, y un solo check no puede representar *"ya hice la de la mañana, falta la de la noche"*. Con dos filas la información existe; con una se pierde. Si prefieres la versión unificada, es un cambio de un toque en la app.

### Cat care: un solo check

Me pediste evaluarlo. **Recomiendo dejarlo como uno.**

Separarlo en Litter / Food / Water agrega 3 filas a una rejilla de 10 — 30% más de rejilla para una sola preocupación — y en la práctica los tres se hacen en el mismo viaje al rincón de Mittens: una rutina, un gesto, un check. Hay además un problema concreto de render: una celda parcial (2 de 3 hechos) no se dibuja de forma legible en la rejilla del mes, y resolverlo mete complejidad real en la vista más densa de la app.

Se queda con el campo `note` = `"litter · food · water"`, visible al tocar el nombre. Si con el uso resulta que se le olvida específicamente la arena, ese es el momento de separarlo — y como es solo data, cambiarlo después no cuesta nada.

### Interacción

Tocar una celda alterna hecho / no hecho. Un tap, sin diálogos, sin confirmación. Es la acción que ocurre todos los días y tiene que costar cero.

### Layout — la parte difícil

10 hábitos × 31 días = 310 celdas. En desktop es la hoja de papel tal cual. En un celular de 375px, 31 columnas dan celdas de ~10px: imposibles de tocar sin errar.

**No se fuerza el mismo layout en ambos.** Dos vistas sobre los mismos datos:

- **`Today`** (por defecto en celular) — lista vertical de los hábitos del día con checkboxes grandes. Es la interacción diaria real: entrar, marcar tres cosas, salir en 5 segundos.
- **`Month`** (por defecto en desktop) — la rejilla completa. En celular, la misma rejilla con scroll horizontal y la columna de nombres fija (`position: sticky`), para *revisar* el mes.

Ambas accesibles desde cualquier pantalla con un toggle. La rejilla es para mirar hacia atrás; la lista es para el día a día.

### Gestión

Las listas iniciales son solo un punto de partida. Desde la app se puede **agregar, renombrar, cambiar tipo, cambiar color e icono, reordenar y quitar** cualquier hábito, en cualquier momento y sin tocar código.

Quitar tiene dos formas distintas, y la diferencia importa:

- **Archive** (el botón normal) — el hábito desaparece de las vistas pero su histórico se conserva. Si deja el gym en junio y lo retoma en septiembre, los meses viejos siguen ahí y la racha vieja no se inventó.
- **Delete** (detrás de una confirmación) — borra el hábito y sus registros. Es para errores de captura, no para "ya no lo hago".

Archive es el camino por defecto justamente porque el impulso de "limpiar" la lista es lo que destruye el histórico que da valor a un tracker a los seis meses.

---

## 2. Calendario

Rejilla mensual SUN–SAT, igual que la referencia. Cada celda: número de día + las notas apiladas.

Una nota es `{ title, color, done }`. **Sin hora** — ella dijo "trabajos o cosas que tengo que hacer", que son cosas de un día, no de una hora. Un campo de hora sería complejidad que nadie pidió.

Tocar un día abre una hoja con los pendientes de ese día: agregar, editar, marcar hecho, borrar. En la celda, lo hecho se ve tachado y atenuado.

El día de hoy va resaltado. Los días de meses adyacentes se ven atenuados pero siguen siendo tocables (la referencia muestra el 30 y 31 del mes anterior en la primera fila).

---

## 3. Diseño visual

Dirección tomada de las dos referencias: papel crema, acuarelas pastel, acentos dorados, cero negro puro. Todo el contenido en inglés (títulos, meses, SUN–SAT, botones, estados vacíos).

### Paleta

- **Papel** — crema cálido `#FBF7F0`, con textura muy tenue hecha en CSS, sin imagen.
- **Tinta** — café grisáceo `#5A4A42`. En ninguna de las dos referencias hay negro puro; usarlo rompería la calidez de inmediato.
- **Acento** — dorado `#C9A227`, solo en filetes de sección y el word-mark. Es acento, no color de UI.
- **Filas de hábitos** — 12 pasteles del planner: menta, lila, azul polvo, mantequilla, rosa, salvia, durazno, periwinkle. Cada hábito toma uno.

Un detalle de la referencia que vale copiar tal cual: el nombre del hábito va en una **píldora de color pastel** a la izquierda, y la rejilla a su derecha se queda blanca con líneas finas. El color identifica la fila sin teñir las celdas — así la rejilla no se vuelve ruido visual cuando está llena, que es justo lo que le pasa a la primera referencia (la del cuaderno) cuando el mes va avanzado.

### Tipografía

Dos fuentes, no tres — cada `woff2` extra pesa en la carga offline de la PWA:

- **Script** solo para el word-mark "Habit Tracker", subset a los caracteres de esa palabra (~3KB).
- **Sans limpia** para todo lo demás. Los encabezados de sección imitan el serif espaciado de la referencia con `letter-spacing` amplio + mayúsculas, sin traer una tercera familia.

Nada manuscrito en texto chico: nombres de hábito, números y notas del calendario van en sans. Script en tamaño pequeño es ilegible en celular.

### Iconos

Ambas referencias ponen un ícono junto a cada hábito. Se agrega campo `icon` (un emoji) al modelo — costo cero, sin assets que hostear, y ayuda a escanear la lista de un vistazo.

### Lo que NO se toma de la referencia

Es un imprimible de página fija y trae secciones que no son funcionalidad acordada. **No se implementan**: Objetivo del mes, Progreso semanal, Prioridades de la semana, Recordatorios, Notas, Reflexión, ni la frase motivacional del pie.

Sí se toma la columna **TOTAL** del extremo derecho — coincide exacto con el conteo mensual que ya estaba en §1.

Y se descarta la **composición**: es un layout de hoja fija de dos mitades con borde rasgado que no sobrevive a 375px de ancho. Se toman paleta, papel, jerarquía tipográfica y las píldoras de color; el arreglo de página, no.

### Modo oscuro

Fuera del MVP. La identidad entera es papel crema; una versión oscura es una segunda paleta completa, no un ajuste. Anotado para después — tiene sentido real dado que "Night skincare" se marca de noche.

---

## 4. Hosteo en GitHub Pages

Repo **público** (Pages gratis lo exige). Dos opciones de URL:

| Repo | URL resultante |
|---|---|
| `usuario.github.io` | `https://usuario.github.io/` |
| `habit-tracker` | `https://usuario.github.io/habit-tracker/` |

Configuración: *Settings → Pages → Deploy from a branch → `main` / `(root)`*. Cada push publica en ~1 min.

**Sin build step.** HTML/CSS/JS plano con ES modules (`<script type="module">`). Sin Vite, sin React, sin GitHub Actions. Editar y hacer push es todo el ciclo de deploy.

Detalles que rompen si se olvidan:
- Archivo `.nojekyll` vacío en la raíz — sin él Pages pasa todo por Jekyll e ignora carpetas que empiecen con `_`.
- Con repo `habit-tracker` la app vive en un subpath: **todas las rutas relativas** (`./css/app.css`), incluidos `start_url` del manifest y el scope del service worker.

## 5. Estructura de archivos

```
/
├── index.html
├── manifest.webmanifest
├── sw.js
├── .nojekyll
├── css/
│   ├── tokens.css          # color, spacing, tipografía, radios
│   └── app.css
├── js/
│   ├── main.js             # bootstrap + routing por hash
│   ├── profiles.js         # resolución del perfil activo + prefijo de claves
│   ├── store.js            # estado en memoria + orquestación de guardado
│   ├── seed.js             # hábitos iniciales por perfil
│   ├── storage/
│   │   ├── local.js
│   │   └── gist.js
│   ├── views/
│   │   ├── profile.js      # selección de perfil (solo primer arranque)
│   │   ├── today.js
│   │   ├── grid.js
│   │   ├── calendar.js
│   │   └── settings.js
│   └── lib/
│       ├── date.js
│       └── streaks.js      # racha actual y mejor racha, en días o semanas
└── assets/
    ├── icons/              # 192, 512, maskable
    └── fonts/
```

## 6. Persistencia

**Los perfiles viven aquí, no en el modelo.** `profiles.js` resuelve el perfil activo al arrancar y devuelve el prefijo de claves: `ht:profile:her` / `ht:profile:him` en vez de `ht:state`. `store.js` carga el estado que le corresponda y de ahí en adelante **ninguna vista sabe que existen perfiles** — `today.js`, `grid.js`, `calendar.js` y todo `lib/` operan sobre un solo estado, igual que si la app fuera de un usuario.

Cada perfil lleva su propio Gist y su propio token, guardados también bajo su prefijo. El selector aparece solo en el primer arranque de cada dispositivo; después queda recordado, con opción de cambiarlo desde Settings.

Ambos adaptadores implementan la misma interfaz, para cambiar de estrategia sin tocar las vistas:

```js
async load()       -> AppState
async save(state)  -> void
get name()         -> string
```

**Escritura.** `store.js` mantiene el estado en memoria y escribe a `local.js` en cada cambio — síncrono, la UI nunca espera. Si el sync está activo, además dispara un `save` a `gist.js` con debounce de ~3s en segundo plano. Si la red falla se reintenta al siguiente cambio; el dato local ya está a salvo.

**Merge por entrada, no por documento.** Al cargar se fusiona por clave, no "gana el archivo más nuevo":

- `entries` es un mapa plano `"habitId|YYYY-MM-DD"`. Dos dispositivos que marcaron hábitos distintos offline se fusionan sin pérdida; solo hay conflicto si tocaron la *misma* celda, y ahí gana el `updatedAt` mayor.
- `habits` y `events` se fusionan por `id`, cada uno con su `updatedAt`.
- Los borrados se marcan con `deletedAt` (tombstone) para que no revivan al sincronizar.

Esto evita el caso feo de *marqué todo en el celular, abrí la laptop, se borró*. Y como las rachas se calculan desde `entries`, quedan correctas automáticamente después de cualquier merge.

**El token.** Fine-grained PAT con permiso únicamente de `gists` — no toca repos. Se guarda en `localStorage` en clave aparte del estado y **nunca** se incluye en el export. En Settings: instrucciones paso a paso, botón de *test connection*, y aviso de que quien tenga acceso al navegador puede leerlo desde devtools. Aceptable en un dispositivo personal, pero se dice.

**Gist y no archivo del repo:** el repo es público, un `data.json` ahí sería legible por cualquiera. El Gist secreto tiene URL no adivinable y no se indexa.

## 7. Modelo de datos

```js
{
  version: 1,
  updatedAt: 1754332800000,
  deviceId: "uuid-local",
  habits: [{
    id, name,
    color,                    // índice en la paleta
    icon,                     // emoji
    type,                     // 'daily' | 'weekly' | 'flexible'
    note,                     // "litter · food · water"
    order,
    createdAt, updatedAt, archivedAt, deletedAt
  }],
  entries: {
    "habitId|2026-08-04": { done: true, updatedAt }
  },
  events: [{
    id, date, title, color, done, updatedAt, deletedAt
  }]
}
```

`version` permite migrar el esquema cuando ella ya tenga datos cargados. Las rachas no aparecen aquí: son derivadas, no almacenadas.

## 8. Fechas

Claves `YYYY-MM-DD` construidas **siempre en hora local** (`getFullYear/getMonth/getDate`), nunca vía `toISOString()` — ese método convierte a UTC y en zona horaria negativa corre el día hacia atrás. Es el bug clásico: marcas un hábito a las 9pm y aparece al día siguiente. Con rachas de por medio importa el doble, porque un día mal asignado parte una racha en dos. Todo centralizado en `lib/date.js`.

## 9. PWA

- `manifest.webmanifest` con `display: standalone`, `theme_color`, iconos 192/512 + maskable, `start_url: "./"`.
- `sw.js` cache-first para el app shell. Como los datos viven en `localStorage`, la app queda **100% funcional offline**; el sync se pone al día cuando vuelve la red.
- Constante `CACHE_VERSION` que se bumpea en cada deploy para invalidar el caché — si no, ella seguiría viendo la versión anterior indefinidamente.

Resultado: "Add to Home Screen" la abre sin barra de navegador, como app nativa.

## 10. Orden de implementación

1. Esqueleto + Pages sirviendo un "hola mundo" — validar la URL antes de construir encima
2. `tokens.css` — papel, paleta pastel, tipografía (§3)
3. `lib/date.js`, `lib/streaks.js`, `profiles.js`, `store.js`, `storage/local.js`, `seed.js` — el núcleo
4. Vista `Today` (checklist) — la interacción diaria, lo primero que se usará
5. Vista `Month` (rejilla) + gestión de hábitos
6. Calendario + pendientes
7. Selector de perfil + Settings
8. `storage/gist.js` + merge
9. PWA: manifest, service worker, iconos
10. Export/import JSON como red de seguridad

Los pasos 1–6 producen una app ya usable con la identidad visual puesta. Del 7 en adelante es multi-perfil y robustez.

## 11. Perfiles

**Decidido: dos perfiles independientes.** Cada quien sus hábitos, sus registros y su calendario, sin verse. Misma URL; cada uno elige perfil una vez por dispositivo y queda recordado.

La implementación vive en §6 — la separación es un prefijo de claves en la capa de storage, no una dimensión del modelo. Por eso el costo es casi nulo: ninguna vista cambia.

> **Por qué ahora y no después:** meter la dimensión de perfil antes de que exista data real es prácticamente gratis. Meterla cuando ella lleve tres meses de registros implica una migración sobre datos que importan.

### Camino de crecimiento (no se implementa ahora)

Si más adelante quieren **calendario compartido** manteniendo los hábitos privados, se monta encima sin rediseñar. Lo que habría que resolver ahí, anotado para cuando llegue el momento:

**Los Gists no admiten colaboradores con permiso de escritura** — un Gist tiene un dueño y nadie más puede escribirle. Dos salidas:

- **Token compartido** — el Gist del calendario vive en una cuenta y ambos dispositivos usan ese token. Simple y suficiente para una pareja, pero es una credencial común.
- **Repo privado con ambos como colaboradores** — cada quien con su PAT restringido a ese repo, escribiendo con guarda de SHA: leer → fusionar → escribir, y al 409 releer y reintentar. Concurrencia optimista correcta y sin credencial compartida, pero sería el pedazo de código más delicado del proyecto.

Compartirlo **todo** (verse los hábitos, comparar) ya es multiusuario real: exige auth y backend, y rompe la premisa de "solo GitHub Pages" sobre la que se sostiene el resto del plan. Descartado.

---

## Fuera de alcance

- Mood tracker (descartado explícitamente)
- Horas y recordatorios push en el calendario
- Sub-tareas dentro de un hábito (§1, Cat care)
- Modo oscuro (§3)
- Secciones decorativas de la referencia impresa (§3)
- Auth real / multiusuario con backend (§11, Nivel 3)
