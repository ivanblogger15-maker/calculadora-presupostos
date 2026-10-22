# 💸 FemComptes

Calculadora de **despeses compartides** per a pisos, viatges, sopars i qualsevol pla en grup. Similar a Splitwise, però sense registre: les dades es queden al navegador i els grups es comparteixen amb un enllaç.

> **Demo:** https://ivanblogger15-maker.github.io/calculadora-presupostos/

![React](https://img.shields.io/badge/React-19-149eca?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-7-3178c6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646cff?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38bdf8?logo=tailwindcss&logoColor=white)

---

## ✨ Funcionalitats

### Ja implementat (MVP)

- **Grups il·limitats** amb nom, moneda (EUR / USD / GBP) i membres.
- **Despeses ràpides** amb concepte, import, pagador, data i categoria (emoji).
- **Quatre formes de repartir**:
  - a parts iguals,
  - imports exactes,
  - percentatges,
  - per parts (weights).
- **Càlcul de balances** per persona: quant ha pagat, quant li toca i quant li deuen.
- **Algoritme de liquidació** que minimitza les transferències (vegeu [lògica](#-lògica-de-càlcul)).
- **Registre de pagaments**: el botó *Fet* crea una liquidació i deixa els comptes a zero.
- **Historial de despeses** agrupat per dia, amb detall del repartiment i opció d'eliminar.
- **Enllaç per compartir** el grup sense registre: enllaç viu (`#join=...`) amb sincronització, o foto comprimida (`#g=...`) si no hi ha núvol configurat.
- **Tres idiomes**: català, castellà i anglès (es recorda la tria).
- **Persistència local** a `localStorage` i **sincronització en temps real** opcional amb Supabase (Realtime + RPC).
- **Disseny mobile-first** amb Tailwind CSS, tipografia Inter, xifres tabulars i colors semàntics (verd = et deuen, vermell = deus).
- **Tests unitaris** de repartiment, balances, arrodoniment i liquidació.

### Properes passes (roadmap)

- [ ] Resolució de conflictes més fina (ara és *last write wins* per grup).
- [ ] Comptes d'usuari opcionals i historial compartit.
- [ ] Despeses recurrents (lloguer, internet, subscripcions).
- [ ] Escàner de tiquets amb OCR/IA.
- [ ] Conversió de divises amb el tipus de canvi del dia.
- [ ] Edició de despeses (ara mateix es poden eliminar i tornar a crear).
- [ ] Exportar a CSV/PDF.

---

## 🧠 Lògica de càlcul

Tots els imports es guarden en **unitats majors** (p. ex. `60.5` €) però es calculen en **cèntims enters** per evitar errors de coma flotant.

### Repartiment

`distributeCents(totalCents, weights)` reparteix proporcionalment i reparteix el residu amb el **mètode del major residu**. Així la suma de les parts sempre és exactament el total, sense perdre ni un cèntim:

```text
10,00 € entre 3 → 3,34 € · 3,33 € · 3,33 €
```

### Balances

Per a cada despesa:

1. El pagador suma `+import`.
2. Cada participant resta la seva part.

La suma de tots els balances és sempre **0**.

### Liquidació (algoritme voraz)

1. Separa creditors (balanç positiu) i deutors (balanç negatiu).
2. Emparella el creditor més gran amb el deutor més gran.
3. Transfereix el mínim entre tots dos imports.
4. Repeteix fins que tothom queda a zero.

Genera com a màxim `n − 1` transferències. Exemple: si A deu 10 € a B i B deu 10 € a C, el resultat és directament **A paga 10 € a C**.

---

## 🛠️ Stack

| Capa | Tecnologia |
| --- | --- |
| UI | React 19 + TypeScript |
| Build | Vite 8 |
| Estils | Tailwind CSS 4 |
| Tests | Vitest |
| Sincronització | Supabase (Postgres + Realtime) |
| Enllaços snapshot | lz-string |
| Desplegament | GitHub Actions → GitHub Pages |

L'estat viu a `localStorage` i, si hi ha claus de Supabase, es sincronitza amb el núvol. Sense configuració de Supabase l'app continua funcionant en mode local i els enllaços porten una **foto comprimida** del grup.

---

## 🚀 Desenvolupament local

Requisits: **Node.js 22+** i npm.

```bash
npm install
npm run dev      # http://localhost:5173
```

Altres comandes:

```bash
npm test         # tests unitaris
npm run build    # typecheck + build a dist/
npm run preview  # serveix la build de producció
```

---

## ☁️ Sincronització amb Supabase

La sincronització és **opcional**: si no hi ha variables d'entorn, l'app funciona només amb `localStorage` i enllaços snapshot.

### 1. Crea el projecte

1. Entra a [supabase.com/dashboard](https://supabase.com/dashboard) i crea un projecte gratuït (regió `eu-west-1` o `eu-central-1`).
2. Obre **SQL Editor**, enganxa-hi el contingut de [`supabase/schema.sql`](supabase/schema.sql) i executa'l.
3. Ves a **Project Settings → API** i copia:
   - `Project URL`
   - `anon public` key

> La clau `anon` és pública per disseny: s'envia dins del bundle. **No facis servir mai la clau `service_role` al frontend.**

### 2. Configura l'entorn local

```bash
cp .env.example .env.local
# edita .env.local amb la URL i la clau anon
npm run dev
```

`.env.local` està ignorat per git.

### 3. Configura el desplegament

Al repositori de GitHub: **Settings → Secrets and variables → Actions → New repository secret**

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

El workflow falla si falta algun dels dos secrets, per no publicar una versió sense sincronització per accident.

### Com funciona

- Cada grup té un **id aleatori** que fa de capacitat: qui té l'enllaç pot llegir i escriure aquell grup.
- La taula `groups` té RLS activat i **cap política**: el client només hi pot accedir a través de les funcions `get_group`, `save_group` i `delete_group`.
- Els canvis es desen amb un *debounce* de 400 ms i es propaguen per **Supabase Realtime Broadcast**; cada client baixa la versió bona per RPC.
- Hi ha *polling* de seguretat: cada 6 s amb el grup obert i cada 30 s per a la resta.
- `currentMemberId` (qui ets tu) **no** se sincronitza: és local de cada dispositiu.
- Els conflictes es resolen amb *last write wins* per grup.

---

## 🌐 Desplegament

El repositori inclou `.github/workflows/deploy.yml`. A cada `push` a `main`:

1. Instal·la dependències (`npm ci`).
2. Comprova que els secrets de Supabase hi siguin.
3. Executa els tests.
4. Compila el projecte.
5. Publica `dist/` a **GitHub Pages**.

Si és la primera vegada, cal activar Pages al repositori:

> **Settings → Pages → Build and deployment → Source: GitHub Actions**

El `base` de Vite és relatiu (`./`), així que la mateixa build funciona a `usuari.github.io/repo/`, a un domini propi o a Netlify/Vercel sense canvis.

---

## 📁 Estructura

```text
src/
├── components/          # UI (Home, GroupView, modals, feed...)
├── i18n/                # proveïdor i textos CA/ES/EN
├── lib/
│   ├── balances.ts      # balances + liquidació de deutes
│   ├── money.ts         # cèntims, format, parseig i repartiment
│   ├── storage.ts       # persistència i validació de dades
│   ├── share.ts         # enllaços snapshot (#g=...)
│   ├── sync.ts          # payload del núvol i enllaços vius (#join=...)
│   ├── cloud.ts         # client Supabase i RPC
│   ├── useCloudSync.ts  # push/pull, polling i Realtime
│   ├── dates.ts
│   ├── categories.ts
│   └── avatar.ts
├── types.ts
├── App.tsx
└── index.css

supabase/
└── schema.sql           # taula, RLS i funcions RPC
```

### Model de dades

```ts
Group   { id, name, currency, members[], expenses[], currentMemberId }
Member  { id, name }
Expense { id, concept, amount, paidBy, date, category,
          splitMethod, participants[], weights?, settlement? }
```

`currentMemberId` és l'única dada **local**: indica qui ets tu en aquest dispositiu i s'exclou del payload que es puja a Supabase. Així cada persona pot triar el seu nom sense canviar el dels altres.

`weights` s'interpreta segons `splitMethod`:

- `exact` → imports per persona,
- `percent` → percentatges (sumen 100),
- `shares` → parts arbitràries.

---

## 🔒 Privacitat i limitacions

- **Amb Supabase configurat**, les dades del grup es desen al núvol (en text pla a Postgres). L'id aleatori de l'enllaç és la capacitat d'accés: qui el té pot veure i modificar el grup.
- **Sense Supabase**, tot es queda al `localStorage` i els enllaços són una foto comprimida del grup.
- Esborrar les dades del navegador esborra la còpia local; amb núvol, el grup es pot recuperar obrint de nou l'enllaç.
- Els conflictes es resolen amb *last write wins* per grup: si dues persones editen exactament al mateix temps, una de les dues versions pot prevaldre.
- No hi ha comptes ni control d'accés per persona: l'enllaç és l'única credencial. No el publiquis en llocs públics.
- Un enllaç snapshot molt gran (moltes despeses) pot superar el límit d'alguns missatgers. Amb enllaços vius (`#join=`) aquest problema desapareix.

Per a més seguretat, el següent pas seria xifrar el contingut al client abans de pujar-lo o afegir autenticació per grup.

---

## 📄 Llicència

MIT © [ivanblogger15-maker](https://github.com/ivanblogger15-maker)
