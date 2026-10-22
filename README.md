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
- **Enllaç per compartir** el grup sense registre (`#g=...`), amb importació al navegador de l'altra persona.
- **Tres idiomes**: català, castellà i anglès (es recorda la tria).
- **Persistència local** a `localStorage` (sense backend, sense compte).
- **Disseny mobile-first** amb Tailwind CSS, tipografia Inter, xifres tabulars i colors semàntics (verd = et deuen, vermell = deus).
- **Tests unitaris** de repartiment, balances, arrodoniment i liquidació.

### Properes passes (roadmap)

- [ ] Backend amb Supabase/Postgres per sincronitzar el mateix grup entre dispositius.
- [ ] Enllaços de grup persistents i en temps real (WebSockets / Supabase Realtime).
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
| Compressió d'enllaços | lz-string |
| Desplegament | GitHub Actions → GitHub Pages |

No hi ha backend. L'estat viu a `localStorage` i els enllaços porten una **foto comprimida** del grup.

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

## 🌐 Desplegament

El repositori inclou `.github/workflows/deploy.yml`. A cada `push` a `main`:

1. Instal·la dependències (`npm ci`).
2. Executa els tests.
3. Compila el projecte.
4. Publica `dist/` a **GitHub Pages**.

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
│   ├── share.ts         # enllaços comprimits (#g=...)
│   ├── dates.ts
│   ├── categories.ts
│   └── avatar.ts
├── types.ts
├── App.tsx
└── index.css
```

### Model de dades

```ts
Group   { id, name, currency, members[], expenses[], currentMemberId }
Member  { id, name }
Expense { id, concept, amount, paidBy, date, category,
          splitMethod, participants[], weights?, settlement? }
```

`weights` s'interpreta segons `splitMethod`:

- `exact` → imports per persona,
- `percent` → percentatges (sumen 100),
- `shares` → parts arbitràries.

---

## 🔒 Privacitat i limitacions

- **No hi ha servidor**: ningú no rep les dades. Viatgen només al `localStorage` del dispositiu.
- **L'enllaç és una foto**: cada persona importa una còpia del grup. Els canvis posteriors no se sincronitzen; per veure'ls cal tornar a compartir l'enllaç.
- Esborrar les dades del navegador esborra els grups.
- Un enllaç molt gran (moltes despeses) pot superar el límit d'alguns missatgers. La compressió redueix molt la mida, però no és infinita.

Per a sincronització real i enllaços permanents, el següent pas natural és **Supabase** (Postgres + Realtime + RLS).

---

## 📄 Llicència

MIT © [ivanblogger15-maker](https://github.com/ivanblogger15-maker)
