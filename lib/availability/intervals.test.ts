import { describe, expect, it } from 'vitest';
import { intersect, normalize, subtract, union } from './intervals';

// Intervalos legibles: cada unidad es 1 (no ms reales). El álgebra es agnóstica
// de la escala.
const iv = (start: number, end: number) => ({ start, end });

describe('normalize', () => {
  it('ordena, fusiona solapados y descarta vacíos', () => {
    expect(normalize([iv(5, 8), iv(0, 3), iv(2, 6), iv(10, 10)])).toEqual([iv(0, 8)]);
  });

  it('fusiona intervalos que apenas se tocan (borde [) contiguo)', () => {
    expect(normalize([iv(0, 3), iv(3, 6)])).toEqual([iv(0, 6)]);
  });

  it('mantiene separados los que no se tocan', () => {
    expect(normalize([iv(0, 3), iv(4, 6)])).toEqual([iv(0, 3), iv(4, 6)]);
  });
});

describe('intersect', () => {
  it('devuelve solo lo cubierto por ambos', () => {
    expect(intersect([iv(0, 10)], [iv(3, 6)])).toEqual([iv(3, 6)]);
  });

  it('maneja varios tramos a cada lado', () => {
    expect(intersect([iv(0, 5), iv(8, 12)], [iv(3, 10)])).toEqual([iv(3, 5), iv(8, 10)]);
  });

  it('vacío cuando no hay solape', () => {
    expect(intersect([iv(0, 3)], [iv(5, 8)])).toEqual([]);
  });
});

describe('subtract', () => {
  it('un hueco en medio parte el intervalo en dos', () => {
    expect(subtract([iv(0, 10)], [iv(4, 6)])).toEqual([iv(0, 4), iv(6, 10)]);
  });

  it('sin huecos devuelve la base normalizada', () => {
    expect(subtract([iv(0, 3), iv(2, 5)], [])).toEqual([iv(0, 5)]);
  });

  it('un hueco que cubre todo deja vacío', () => {
    expect(subtract([iv(2, 5)], [iv(0, 10)])).toEqual([]);
  });
});

describe('union', () => {
  it('combina y normaliza varios grupos', () => {
    expect(union([iv(0, 3)], [iv(2, 5)], [iv(9, 11)])).toEqual([iv(0, 5), iv(9, 11)]);
  });
});
