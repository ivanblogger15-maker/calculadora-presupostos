# 📊 Proyecto: Calculadora de Presupuestos Compartidos (Tipo Splitwise)

Una Calculadora de presupuestos compartidos es uno de los proyectos más útiles y atractivos que puedes programar. Al público general le encanta porque resuelve un problema real y muy incómodo: las cuentas con amigos, parejas o compañeros de piso.

Este documento sirve como guía completa de desarrollo, incluyendo funcionalidades, arquitectura, programación y diseño.

---

## 🚀 Funcionalidades clave (De MVP a Pro)

### 1. Nivel Básico (El Producto Mínimo Viable)
*   **Añadir gastos rápidos:** El usuario introduce un concepto (ej. *"Cena del viernes"*), un importe (60€) y quién lo pagó.
*   **División equitativa:** El sistema divide el gasto a partes iguales entre todos los miembros del grupo de forma automática.
*   **Algoritmo de liquidación (Minimizar deudas):** Si el *Usuario A* le debe 10€ al *B*, y el *B* le debe 10€ al *C*, el sistema calcula directamente que *A* le pague 10€ a *C*.

### 2. Nivel Intermedio (Uso diario)
*   **Divisiones no equitativas:** División por porcentajes, por partes o por importes exactos.
*   **Control de gastos recurrentes:** Configurar gastos fijos mensuales (alquiler, internet).
*   **Acceso mediante enlace (Sin registro):** Creación de grupos anónimos con enlaces únicos (ej. `app.com/grupo/123xyz`) para eliminar la fricción de entrada.

### 3. Nivel Avanzado (Pro / Portafolio)
*   **Escáner de tickets (OCR):** Integración de IA para extraer total, fecha y productos de una foto.
*   **Sincronización en tiempo real:** Uso de WebSockets para actualizar balances al instante en todos los dispositivos.
*   **Múltiples divisas:** Conversión automática aplicando el tipo de cambio del día.

---

## 💻 Guía de Programación y Arquitectura

Para construir esta aplicación de forma robusta, se recomienda separar el proyecto en Frontend y Backend (Arquitectura Cliente-Servidor).

### 1. Stack Tecnológico Sugerido
*   **Frontend:** React, Vue o Svelte. Son ideales por su reactividad (el balance debe actualizarse inmediatamente al añadir un gasto).
*   **Backend:** Node.js (Express/NestJS), Python (Django/FastAPI) o un BaaS como Firebase / Supabase si quieres ir rápido.
*   **Base de Datos:** PostgreSQL o MongoDB. Las bases de datos relacionales (SQL) son excelentes aquí para mantener la integridad de las transacciones financieras.

### 2. Estructura de la Base de Datos
*   **Usuarios:** `id`, `nombre`, `email` (opcional).
*   **Grupos:** `id`, `nombre`, `fecha_creacion`.
*   **Grupo_Usuario (Tabla intermedia):** `grupo_id`, `usuario_id`.
*   **Gastos:** `id`, `grupo_id`, `pagado_por` (FK a Usuarios), `importe`, `concepto`, `fecha`, `tipo_division`.
*   **Participantes_Gasto (Tabla intermedia):** `gasto_id`, `usuario_id`, `cantidad_debida`.

### 3. El Algoritmo de Liquidación (Simplificación de deudas)
Esta es la lógica principal que debes programar en tu backend (o frontend si no hay servidor). Se divide en dos pasos:
1.  **Calcular el balance neto de cada usuario:** Recorre todos los gastos. Si un usuario paga 100€ por 4 personas, suma +75€ a su balance y resta -25€ al balance de los otros tres. Al final, tendrás una lista de usuarios con balances positivos (los que deben recibir dinero) y negativos (los que tienen que pagar). *La suma de todos los balances siempre debe ser 0.*
2.  **Emparejar deudores y acreedores (Algoritmo Voraz / Greedy):**
    *   Toma al usuario con el mayor balance positivo (Acreedor máximo).
    *   Toma al usuario con el mayor balance negativo (Deudor máximo).
    *   Crea una transferencia entre ellos por el valor mínimo entre la deuda y el crédito.
    *   Actualiza sus balances y repite hasta que todos los balances sean 0.

---

## 🎨 Guía de Maquetación y Diseño (UI/UX)

La clave del éxito de esta app es que sea extremadamente intuitiva. Los usuarios suelen usarla en la calle, restaurantes o bares, por lo que debe ser rápida.

### 1. Enfoque de Diseño
*   **Mobile-First:** Maqueta pensando **únicamente en móviles** primero. El 95% del uso será en un smartphone.
*   **Framework CSS:** Usa Tailwind CSS, Bootstrap o un sistema de componentes como Material-UI / Shadcn UI para iterar rápidamente y mantener la consistencia.

### 2. Psicología del Color y Tipografía
*   **Tipografía:** Usa fuentes sin serifa, grandes y legibles (Inter, Roboto, San Francisco). Los números de los importes deben usar una fuente *monospaced* o tabular para que se alineen bien.
*   **Colores semánticos:** 
    *   **Verde (ej. `#10B981`):** Para balances a favor ("Te deben").
    *   **Rojo/Naranja (ej. `#EF4444`):** Para deudas ("Debes").
    *   **Gris claro:** Para fondos, separadores y textos secundarios para no saturar la vista.

### 3. Estructura de Pantallas (Maquetación)
1.  **Dashboard / Balance General:**
    *   **Cabecera:** Nombre del grupo.
    *   **Tarjeta Principal:** Un bloque grande central con el resumen neto del usuario conectado. Ej: Un gran texto verde que diga "Te deben 45€" o gris "Estás al día".
    *   **Desglose:** Una lista pequeña debajo indicando exactamente a quién pedir o pagar dinero (ej. "Págale 20€ a Carlos").
2.  **Historial de Gastos (Feed):**
    *   Lista vertical tipo chat o extracto bancario.
    *   Cada *Card* o fila debe tener: Un icono/emoji a la izquierda (🍔, 🚕), el concepto y quién lo pagó en el centro, y el importe a la derecha.
3.  **El Botón de Acción (FAB):**
    *   Coloca un *Floating Action Button* (+) grande y destacado en la parte inferior central o derecha.
    *   Debe abrir un modal o pantalla rápida donde el foco del teclado vaya directamente al campo numérico del "Importe".

---

## 🚀 Próximos Pasos para el Desarrollador
1.  Define tu Stack Tecnológico.
2.  Inicia el repositorio y configura el linter/formateador.
3.  Crea la interfaz de usuario básica con datos *mockeados* (estáticos) para probar la UX.
4.  Implementa la lógica matemática del cálculo de deudas.
5.  Conecta la base de datos para hacer los datos persistentes.