# design-reference

Aquí van los mockups exportados de **Claude Design** (HTML y/o screenshots).

## Para qué sirve

Es la referencia visual de cada pantalla. Antes de construir una pantalla nueva,
mira el mockup correspondiente y **replica estructura y tokens; no inventes
estilos** (CLAUDE.md §7).

## Cómo organizarlo

Una carpeta por pantalla, con el nombre de la ruta que implementa:

```
design-reference/
  booking-page/        → app/[locale]/(booking)/[slug]
  onboarding-wizard/
  dashboard-agenda/
```

Dentro de cada una, el export tal cual sale de Claude Design (`index.html`,
assets, screenshots). No hace falta que sea código bonito: esto no se compila
ni se importa desde la app, es material de consulta.

## Ojo con los tokens

Los mockups son la referencia de **estructura, jerarquía y espaciado**. La
fuente de verdad de los valores (colores, radios, tipografía) es
[`app/globals.css`](../app/globals.css), no el HTML exportado. Si un mockup trae
un hex que no está en el theme, es el mockup el que está desactualizado —
levántalo antes de hardcodearlo.
