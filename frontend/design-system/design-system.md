# Fitness Tracker Design System

## Colors (Tailwind Classes)

### Primary Palette

- **Primary:** `indigo-500` / `indigo-600` (buttons, active states, chart lines)
- **Primary Light:** `indigo-400` (text accents, active nav items)
- **Secondary/Success:** `emerald-400` / `emerald-500` (completed states, positive trends)
- **Tertiary/Warning:** `amber-400` / `amber-500` (PRs, highlights, best streak)
- **Error/Danger:** `red-500` (delete actions, danger zones)

### Background Colors

- **Page:** `slate-950`
- **Cards:** `slate-900/50` with `border-slate-800`
- **Elevated cards:** `slate-900` with `border-indigo-500/30` (active/expanded state)
- **Nested elements:** `slate-950/50` or `slate-800/50`
- **Navigation:** `slate-900/80` with `backdrop-blur-md`

### Text Colors

- **Primary text:** `slate-100` / `slate-50`
- **Secondary text:** `slate-400` / `slate-500`
- **Muted text:** `slate-600`

### Color Variant

- **System:** Tonal Spot (Material 3 dynamic color)
- **Mode:** Dark (default), Light supported

## Typography

| Role       | Font  | Weight                    | Tracking |
| ---------- | ----- | ------------------------- | -------- |
| Page Title | Inter | extrabold (800)           | tight    |
| Headline   | Inter | bold (700)                | tight    |
| Body       | Inter | regular (400)             | normal   |
| Label      | Inter | bold (700), uppercase     | widest   |
| Numbers    | Inter | black (900), tabular-nums | normal   |

## Shape

- **Cards:** `rounded-xl` (12px)
- **Buttons:** `rounded-xl` (12px)
- **Pills/Badges:** `rounded-full`
- **Inputs:** `rounded-md` (inside cards), `rounded-xl` (standalone)
- **Navigation:** `rounded-t-2xl` (bottom nav)

## Key Patterns

### Stat Cards (Bento Grid)

```
bg-slate-900/50 p-4 rounded-xl border border-slate-800 h-32
- Label: text-xs font-semibold uppercase tracking-wider text-slate-400
- Value: text-3xl font-black stats-number
- Icon: top-right, colored per metric
```

### Section Headers

```
text-sm font-bold text-slate-400 uppercase tracking-widest
```

### Exercise Accordion (WorkoutChat)

- Collapsed: `bg-slate-900/50 border border-slate-800/50 rounded-xl`
- Expanded: `bg-slate-900 border border-indigo-500/30 shadow-2xl`
- Set inputs: Weight (KG) + Reps side-by-side, confirm button
- Prefilled from last workout data

### Tables

```
bg-slate-900 border border-slate-800 rounded-xl overflow-hidden
- Header: bg-slate-800/50 text-[10px] uppercase tracking-[0.2em] font-bold text-slate-500
- Body: divide-y divide-slate-800 text-sm font-mono
- Alternating: bg-slate-800/20 every other row
- PR rows: bg-amber-500/5 with star icon
```

### Buttons

- Primary: `bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-500/20`
- Ghost: `text-slate-500 hover:text-slate-300`
- Danger: `bg-red-500/10 text-red-500 border border-red-500/30`
- Active feedback: `active:scale-95` or `active:scale-[0.98]`

### Navigation

- Bottom (mobile): `bg-slate-900/80 backdrop-blur-md rounded-t-2xl h-20`
- Sidebar (desktop): `bg-slate-950 border-r border-slate-800 w-64`
- Active item: `text-indigo-400` with filled icon
- Branding: "Pulse Fitness" in `text-2xl font-black text-indigo-400`

## Stitch References

- **Project ID:** `4842248257207126990`
- **Design System Asset:** `assets/13185332570551314292`
