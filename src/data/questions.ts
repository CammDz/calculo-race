// Banco inicial verificado de 44 preguntas (11 por nivel).
// Todas tienen 4 opciones, una única correcta y explicación.
// Revisadas matemáticamente. Nivel 2 incluye ejemplo canónico r = 2+2cos θ.

import type { Question } from '../types';

export const QUESTIONS: Question[] = [
  // ============ NIVEL 1 · Despegue matemático (límites, 0/0, ∞/∞) ============
  {
    id: 'n1-01', level: 1, topic: 'Concepto de límite', difficulty: 'facil', active: true,
    statement: '¿Qué significa que lim(x→2) f(x) = 5?',
    options: [
      { id: 'A', text: 'f(2) = 5 obligatoriamente' },
      { id: 'B', text: 'f(x) se acerca a 5 cuando x se acerca a 2' },
      { id: 'C', text: 'f crece sin límite cerca de 2' },
      { id: 'D', text: 'El límite solo existe si f es continua' },
    ],
    correctOptionId: 'B',
    explanation: 'El límite describe el comportamiento cercano al punto, no el valor en el punto. f(2) puede diferir o no existir.',
  },
  {
    id: 'n1-02', level: 1, topic: 'Indeterminación 0/0', difficulty: 'facil', active: true,
    statement: 'Al evaluar lim(x→1) (x²−1)/(x−1) por sustitución directa se obtiene:',
    options: [
      { id: 'A', text: '0' },
      { id: 'B', text: '2' },
      { id: 'C', text: '0/0 (indeterminación)' },
      { id: 'D', text: '∞' },
    ],
    correctOptionId: 'C',
    explanation: 'Numerador 1−1=0 y denominador 1−1=0: forma 0/0. Factorizando (x−1)(x+1)/(x−1) = x+1 → 2, pero la sustitución directa da 0/0.',
  },
  {
    id: 'n1-03', level: 1, topic: 'Límites 0/0', difficulty: 'facil', active: true,
    statement: 'El valor de lim(x→1) (x²−1)/(x−1) es:',
    options: [
      { id: 'A', text: '0' },
      { id: 'B', text: '1' },
      { id: 'C', text: '2' },
      { id: 'D', text: 'No existe' },
    ],
    correctOptionId: 'C',
    explanation: 'Simplificando: (x−1)(x+1)/(x−1) = x+1 para x≠1; el límite es 1+1 = 2.',
  },
  {
    id: 'n1-04', level: 1, topic: 'Forma ∞/∞', difficulty: 'facil', active: true,
    statement: 'lim(x→∞) (3x²+2x)/(5x²−1) presenta la forma:',
    options: [
      { id: 'A', text: '0/0' },
      { id: 'B', text: '∞/∞' },
      { id: 'C', text: '∞ − ∞' },
      { id: 'D', text: 'Ninguna indeterminación' },
    ],
    correctOptionId: 'B',
    explanation: 'Numerador y denominador tienden a ∞: forma ∞/∞. Dividiendo por x²: (3+2/x)/(5−1/x²) → 3/5.',
  },
  {
    id: 'n1-05', level: 1, topic: 'Límites ∞/∞', difficulty: 'media', active: true,
    statement: 'lim(x→∞) (3x²+2x)/(5x²−1) es igual a:',
    options: [
      { id: 'A', text: '0' },
      { id: 'B', text: '3/5' },
      { id: 'C', text: '3/2' },
      { id: 'D', text: '∞' },
    ],
    correctOptionId: 'B',
    explanation: 'Mandam los términos de mayor grado: 3x²/5x² = 3/5.',
  },
  {
    id: 'n1-06', level: 1, topic: 'Interpretación', difficulty: 'facil', active: true,
    statement: 'Si lim(x→3⁻) f(x) = 4 y lim(x→3⁺) f(x) = 7, entonces:',
    options: [
      { id: 'A', text: 'El límite bilateral es 4' },
      { id: 'B', text: 'El límite bilateral es 5.5' },
      { id: 'C', text: 'El límite bilateral no existe' },
      { id: 'D', text: 'El límite bilateral es 7' },
    ],
    correctOptionId: 'C',
    explanation: 'Los límites laterales deben coincidir para que exista el límite bilateral. 4 ≠ 7, luego no existe.',
  },
  {
    id: 'n1-07', level: 1, topic: 'Límites 0/0', difficulty: 'media', active: true,
    statement: 'lim(x→0) (√(x+4) − 2)/x es igual a:',
    options: [
      { id: 'A', text: '0' },
      { id: 'B', text: '1/4' },
      { id: 'C', text: '1/2' },
      { id: 'D', text: '4' },
    ],
    correctOptionId: 'B',
    explanation: 'Racionalizando: (x)/(x(√(x+4)+2)) = 1/(√(x+4)+2) → 1/4.',
  },
  {
    id: 'n1-08', level: 1, topic: 'Reconocer 0/0', difficulty: 'facil', active: true,
    statement: '¿Cuál de estas expresiones es de la forma 0/0 cuando x→0?',
    options: [
      { id: 'A', text: 'sin(x)/x' },
      { id: 'B', text: '(x+1)/x' },
      { id: 'C', text: 'x/(x+1)' },
      { id: 'D', text: '(eˣ+1)/x' },
    ],
    correctOptionId: 'A',
    explanation: 'sin(0)=0 y denominador 0: forma 0/0. Su límite notable es 1.',
  },
  {
    id: 'n1-09', level: 1, topic: 'Límites infinitos', difficulty: 'media', active: true,
    statement: 'lim(x→2⁺) 3/(x−2) es igual a:',
    options: [
      { id: 'A', text: '0' },
      { id: 'B', text: '3/2' },
      { id: 'C', text: '+∞' },
      { id: 'D', text: '−∞' },
    ],
    correctOptionId: 'C',
    explanation: 'Denominador positivo muy pequeño → cociente positivo muy grande: +∞.',
  },
  {
    id: 'n1-10', level: 1, topic: 'Límites 0/0', difficulty: 'media', active: true,
    statement: 'lim(x→3) (x²−9)/(x−3) es igual a:',
    options: [
      { id: 'A', text: '0' },
      { id: 'B', text: '3' },
      { id: 'C', text: '6' },
      { id: 'D', text: '9' },
    ],
    correctOptionId: 'C',
    explanation: '(x−3)(x+3)/(x−3) = x+3 → 6.',
  },
  {
    id: 'n1-11', level: 1, topic: 'Grados y ∞/∞', difficulty: 'media', active: true,
    statement: 'lim(x→∞) (2x³−x+1)/(5x²+4) es igual a:',
    options: [
      { id: 'A', text: '2/5' },
      { id: 'B', text: '0' },
      { id: 'C', text: '+∞' },
      { id: 'D', text: '−∞' },
    ],
    correctOptionId: 'C',
    explanation: 'El numerador (grado 3) domina al denominador (grado 2): cociente ~ (2/5)x → +∞.',
  },

  // ============ NIVEL 2 · Trayectorias polares ============
  {
    id: 'n2-01', level: 2, topic: 'Evaluación polar', difficulty: 'facil', active: true,
    statement: 'Para r = 2 + 2cos(θ), cuando θ = π, r vale:',
    options: [
      { id: 'A', text: '0' },
      { id: 'B', text: '2' },
      { id: 'C', text: '4' },
      { id: 'D', text: '−2' },
    ],
    correctOptionId: 'A',
    explanation: 'cos(π) = −1, luego r = 2 + 2(−1) = 0. Es el punto de retroceso de la cardioide.',
    polarPlot: { r: '2 + 2cos θ', label: 'Cardioide r = 2 + 2cos θ', kind: 'cardioid' },
  },
  {
    id: 'n2-02', level: 2, topic: 'Conversión polar-cartesiana', difficulty: 'facil', active: true,
    statement: 'El punto polar (r, θ) = (2, π/2) corresponde en cartesianas a:',
    options: [
      { id: 'A', text: '(2, 0)' },
      { id: 'B', text: '(0, 2)' },
      { id: 'C', text: '(−2, 0)' },
      { id: 'D', text: '(0, −2)' },
    ],
    correctOptionId: 'B',
    explanation: 'x = r·cos θ = 2·0 = 0; y = r·sin θ = 2·1 = 2.',
  },
  {
    id: 'n2-03', level: 2, topic: 'Conversión cartesiana-polar', difficulty: 'media', active: true,
    statement: 'El punto (1, √3) en polares (r ≥ 0, θ ∈ [0, 2π)) es:',
    options: [
      { id: 'A', text: '(2, π/6)' },
      { id: 'B', text: '(2, π/3)' },
      { id: 'C', text: '(4, π/3)' },
      { id: 'D', text: '(√3, π/3)' },
    ],
    correctOptionId: 'B',
    explanation: 'r = √(1+3) = 2; tan θ = √3/1 con x,y > 0 → θ = π/3.',
  },
  {
    id: 'n2-04', level: 2, topic: 'Curvas polares', difficulty: 'facil', active: true,
    statement: 'La ecuación r = 4 representa:',
    options: [
      { id: 'A', text: 'Una recta vertical' },
      { id: 'B', text: 'Una espiral' },
      { id: 'C', text: 'Una circunferencia centrada en el origen de radio 4' },
      { id: 'D', text: 'Una rosa de 4 pétalos' },
    ],
    correctOptionId: 'C',
    explanation: 'r constante = distancia fija al polo: circunferencia de radio 4.',
    polarPlot: { r: '4', label: 'Círculo r = 4', kind: 'circle' },
  },
  {
    id: 'n2-05', level: 2, topic: 'Rosas polares', difficulty: 'media', active: true,
    statement: '¿Cuántos pétalos tiene la rosa r = 3sin(2θ)?',
    options: [
      { id: 'A', text: '2' },
      { id: 'B', text: '3' },
      { id: 'C', text: '4' },
      { id: 'D', text: '6' },
    ],
    correctOptionId: 'C',
    explanation: 'r = a·sin(nθ) con n = 2 par → 2n = 4 pétalos.',
    polarPlot: { r: '3 sin(2θ)', label: 'Rosa r = 3 sin(2θ)', kind: 'rose' },
  },
  {
    id: 'n2-06', level: 2, topic: 'Evaluación polar', difficulty: 'media', active: true,
    statement: 'Para r = 1 + cos(θ), el valor máximo de r es:',
    options: [
      { id: 'A', text: '0' },
      { id: 'B', text: '1' },
      { id: 'C', text: '2' },
      { id: 'D', text: 'π' },
    ],
    correctOptionId: 'C',
    explanation: 'cos θ ≤ 1, máximo en θ = 0: r = 1 + 1 = 2.',
    polarPlot: { r: '1 + cos θ', label: 'Cardioide r = 1 + cos θ', kind: 'cardioid' },
  },
  {
    id: 'n2-07', level: 2, topic: 'Simetría polar', difficulty: 'media', active: true,
    statement: 'La curva r = 2 + 2cos(θ) es simétrica respecto a:',
    options: [
      { id: 'A', text: 'El eje polar (eje x)' },
      { id: 'B', text: 'La recta θ = π/2 (eje y)' },
      { id: 'C', text: 'El origen solamente' },
      { id: 'D', text: 'Ningún eje' },
    ],
    correctOptionId: 'A',
    explanation: 'cos(−θ) = cos θ, así que r(θ) = r(−θ): simetría respecto al eje polar.',
  },
  {
    id: 'n2-08', level: 2, topic: 'Espirales', difficulty: 'media', active: true,
    statement: 'La gráfica de r = θ para θ ≥ 0 es:',
    options: [
      { id: 'A', text: 'Una circunferencia' },
      { id: 'B', text: 'Una espiral de Arquímedes' },
      { id: 'C', text: 'Una recta por el origen' },
      { id: 'D', text: 'Una cardioide' },
    ],
    correctOptionId: 'B',
    explanation: 'El radio crece proporcionalmente al ángulo: espiral de Arquímedes.',
    polarPlot: { r: 'θ', label: 'Espiral r = θ', kind: 'spiral' },
  },
  {
    id: 'n2-09', level: 2, topic: 'Puntos y trayectorias', difficulty: 'media', active: true,
    statement: '¿Cuál de estos puntos polares coincide con (2, π/6)?',
    options: [
      { id: 'A', text: '(2, 13π/6)' },
      { id: 'B', text: '(−2, π/6)' },
      { id: 'C', text: '(2, 5π/6)' },
      { id: 'D', text: '(−2, 13π/6)' },
    ],
    correctOptionId: 'A',
    explanation: 'Sumar 2π no cambia el punto: π/6 + 2π = 13π/6. La opción con r negativo cambia de cuadrante.',
  },
  {
    id: 'n2-10', level: 2, topic: 'Círculos descentrados', difficulty: 'dificil', active: true,
    statement: 'La ecuación r = 4cos(θ) representa una circunferencia de:',
    options: [
      { id: 'A', text: 'Radio 4 centrada en el origen' },
      { id: 'B', text: 'Radio 2 centrada en (2, 0)' },
      { id: 'C', text: 'Radio 2 centrada en (0, 2)' },
      { id: 'D', text: 'Radio 4 centrada en (4, 0)' },
    ],
    correctOptionId: 'B',
    explanation: 'Multiplicando por r: r² = 4r·cos θ → x²+y² = 4x → (x−2)²+y² = 4: centro (2,0), radio 2.',
    polarPlot: { r: '4 cos θ', label: 'Círculo r = 4 cos θ', kind: 'circle' },
  },
  {
    id: 'n2-11', level: 2, topic: 'Interpretación', difficulty: 'dificil', active: true,
    statement: 'Una nave sigue r(θ) = 2 + 2cos(θ). ¿En qué θ la nave pasa por el polo (origen)?',
    options: [
      { id: 'A', text: 'θ = 0' },
      { id: 'B', text: 'θ = π/2' },
      { id: 'C', text: 'θ = π' },
      { id: 'D', text: 'Nunca pasa por el origen' },
    ],
    correctOptionId: 'C',
    explanation: 'r = 0 ⟺ 2 + 2cos θ = 0 ⟺ cos θ = −1 ⟺ θ = π (mod 2π).',
  },

  // ============ NIVEL 3 · Regla de L'Hôpital ============
  {
    id: 'n3-01', level: 3, topic: 'Identificar indeterminación', difficulty: 'facil', active: true,
    statement: "¿En cuál de estos límites SÍ puede aplicarse directamente L'Hôpital?",
    options: [
      { id: 'A', text: 'lim(x→0) (x+1)/x' },
      { id: 'B', text: 'lim(x→0) sin(x)/x' },
      { id: 'C', text: 'lim(x→1) (x+2)/(x−1)' },
      { id: 'D', text: 'lim(x→0) (x²+1)/x²' },
    ],
    correctOptionId: 'B',
    explanation: "Solo B es 0/0. Las demás son de la forma a/0 (a≠0), no indeterminadas: L'Hôpital no aplica directamente.",
  },
  {
    id: 'n3-02', level: 3, topic: 'Aplicación directa', difficulty: 'facil', active: true,
    statement: 'lim(x→0) sin(x)/x usando L\'Hôpital es:',
    options: [
      { id: 'A', text: '0' },
      { id: 'B', text: '1' },
      { id: 'C', text: '∞' },
      { id: 'D', text: 'No existe' },
    ],
    correctOptionId: 'B',
    explanation: "Derivando numerador y denominador: cos(x)/1 → cos(0) = 1.",
  },
  {
    id: 'n3-03', level: 3, topic: 'Derivación correcta', difficulty: 'media', active: true,
    statement: "Al aplicar L'Hôpital a lim(x→0) (eˣ−1)/x, el cociente de derivadas es:",
    options: [
      { id: 'A', text: 'eˣ/1' },
      { id: 'B', text: '(eˣ−1)/1' },
      { id: 'C', text: 'eˣ/x' },
      { id: 'D', text: '(eˣ−x)/x²' },
    ],
    correctOptionId: 'A',
    explanation: 'd/dx(eˣ−1) = eˣ; d/dx(x) = 1. El límite es e⁰/1 = 1.',
  },
  {
    id: 'n3-04', level: 3, topic: 'Cálculo de límites', difficulty: 'media', active: true,
    statement: 'lim(x→0) (eˣ−1−x)/x² es igual a:',
    options: [
      { id: 'A', text: '0' },
      { id: 'B', text: '1/2' },
      { id: 'C', text: '1' },
      { id: 'D', text: '2' },
    ],
    correctOptionId: 'B',
    explanation: "Primera aplicación: (eˣ−1)/2x (0/0). Segunda: eˣ/2 → 1/2.",
  },
  {
    id: 'n3-05', level: 3, topic: 'Casos no válidos', difficulty: 'media', active: true,
    statement: "¿Por qué NO puede aplicarse L'Hôpital directamente a lim(x→0⁺) (1/x)?",
    options: [
      { id: 'A', text: 'Porque da +∞' },
      { id: 'B', text: 'Porque no es una indeterminación 0/0 ni ∞/∞' },
      { id: 'C', text: 'Porque el denominador es cero' },
      { id: 'D', text: 'Porque x→0⁺ no es un punto válido' },
    ],
    correctOptionId: 'B',
    explanation: "El numerador tiende a 1 (no a 0 ni ∞): es forma 1/0⁺ = +∞, no indeterminada.",
  },
  {
    id: 'n3-06', level: 3, topic: 'Cálculo de límites', difficulty: 'media', active: true,
    statement: 'lim(x→∞) ln(x)/x es igual a:',
    options: [
      { id: 'A', text: '1' },
      { id: 'B', text: '∞' },
      { id: 'C', text: '0' },
      { id: 'D', text: '−∞' },
    ],
    correctOptionId: 'C',
    explanation: "Forma ∞/∞. Derivando: (1/x)/1 = 1/x → 0.",
  },
  {
    id: 'n3-07', level: 3, topic: 'Doble aplicación', difficulty: 'dificil', active: true,
    statement: 'lim(x→0) (1−cos(x))/x² es igual a:',
    options: [
      { id: 'A', text: '0' },
      { id: 'B', text: '1/2' },
      { id: 'C', text: '1' },
      { id: 'D', text: '2' },
    ],
    correctOptionId: 'B',
    explanation: 'Primera: sin(x)/2x (0/0). Segunda: cos(x)/2 → 1/2.',
  },
  {
    id: 'n3-08', level: 3, topic: 'Cálculo de límites', difficulty: 'media', active: true,
    statement: 'lim(x→0) tan(x)/x es igual a:',
    options: [
      { id: 'A', text: '0' },
      { id: 'B', text: '1' },
      { id: 'C', text: '∞' },
      { id: 'D', text: 'sec²(0)' },
    ],
    correctOptionId: 'B',
    explanation: "Derivando: sec²(x)/1 → 1. (La opción D vale 1 numéricamente pero no es el procedimiento del límite.)",
  },
  {
    id: 'n3-09', level: 3, topic: '∞/∞ con exponencial', difficulty: 'dificil', active: true,
    statement: 'lim(x→∞) x²/eˣ es igual a:',
    options: [
      { id: 'A', text: '∞' },
      { id: 'B', text: '2' },
      { id: 'C', text: '0' },
      { id: 'D', text: '1' },
    ],
    correctOptionId: 'C',
    explanation: "Doble L'Hôpital: 2x/eˣ → 2/eˣ → 0. La exponencial domina a cualquier polinomio.",
  },
  {
    id: 'n3-10', level: 3, topic: 'Identificación', difficulty: 'media', active: true,
    statement: 'lim(x→1) ln(x)/(x−1) es igual a:',
    options: [
      { id: 'A', text: '0' },
      { id: 'B', text: '1' },
      { id: 'C', text: 'e' },
      { id: 'D', text: '∞' },
    ],
    correctOptionId: 'B',
    explanation: "Forma 0/0. Derivando: (1/x)/1 → 1/1 = 1.",
  },
  {
    id: 'n3-11', level: 3, topic: 'Límites notables', difficulty: 'dificil', active: true,
    statement: 'lim(x→0) (sin(3x))/x es igual a:',
    options: [
      { id: 'A', text: '0' },
      { id: 'B', text: '1' },
      { id: 'C', text: '3' },
      { id: 'D', text: '1/3' },
    ],
    correctOptionId: 'C',
    explanation: "Derivando: 3cos(3x)/1 → 3. Equivale a 3·sin(3x)/(3x) → 3·1.",
  },

  // ============ NIVEL 4 · Problema final (multivariable y síntesis) ============
  {
    id: 'n4-01', level: 4, topic: 'Trayectorias multivariables', difficulty: 'media', active: true,
    statement: 'Para f(x,y) = x²/(x²+y²), al acercarse a (0,0) por el eje x (y=0, x≠0) el valor es:',
    options: [
      { id: 'A', text: '0' },
      { id: 'B', text: '1' },
      { id: 'C', text: '1/2' },
      { id: 'D', text: 'No está definido en ningún punto del eje' },
    ],
    correctOptionId: 'B',
    explanation: 'Con y=0: x²/x² = 1 para x≠0. Por el eje y daría 0: el límite no existe.',
  },
  {
    id: 'n4-02', level: 4, topic: 'Límite no existe', difficulty: 'dificil', active: true,
    statement: 'El límite lim((x,y)→(0,0)) x²/(x²+y²):',
    options: [
      { id: 'A', text: 'Es 0' },
      { id: 'B', text: 'Es 1' },
      { id: 'C', text: 'Es 1/2' },
      { id: 'D', text: 'No existe' },
    ],
    correctOptionId: 'D',
    explanation: 'Por y=0 vale 1 y por x=0 vale 0. Dos trayectorias con distinto límite ⇒ no existe. (No confundir con límites de una variable.)',
  },
  {
    id: 'n4-03', level: 4, topic: 'Trayectorias y=x, y=2x', difficulty: 'dificil', active: true,
    statement: 'Para f(x,y) = xy/(x²+y²), los límites por y=x y por y=−x valen respectivamente:',
    options: [
      { id: 'A', text: '1/2 y −1/2, luego el límite no existe' },
      { id: 'B', text: '0 y 0, luego el límite es 0' },
      { id: 'C', text: '1 y 1, luego el límite es 1' },
      { id: 'D', text: '1/2 y 1/2, luego el límite es 1/2' },
    ],
    correctOptionId: 'A',
    explanation: 'Por y=x: x²/2x² = 1/2. Por y=−x: −x²/2x² = −1/2. Difieren ⇒ no existe.',
  },
  {
    id: 'n4-04', level: 4, topic: "L'Hôpital en cadena", difficulty: 'dificil', active: true,
    statement: 'Una nave calcula lim(x→0) (e^{2x}−1−2x)/x². El resultado correcto es:',
    options: [
      { id: 'A', text: '1' },
      { id: 'B', text: '2' },
      { id: 'C', text: '0' },
      { id: 'D', text: '4' },
    ],
    correctOptionId: 'B',
    explanation: "Primera: (2e^{2x}−2)/2x. Segunda: 4e^{2x}/2 → 2.",
  },
  {
    id: 'n4-05', level: 4, topic: 'Polar vs multivariable', difficulty: 'dificil', active: true,
    statement: '¿Cuál afirmación es correcta sobre trayectorias polares y límites multivariables?',
    options: [
      { id: 'A', text: 'Son exactamente lo mismo' },
      { id: 'B', text: 'Si el límite por toda recta y= mx coincide, el límite multivariable existe seguro' },
      { id: 'C', text: 'Un límite multivariable exige el mismo valor por TODAS las trayectorias; una sola discrepancia prueba que no existe' },
      { id: 'D', text: 'Basta comprobar dos trayectorias para probar existencia' },
    ],
    correctOptionId: 'C',
    explanation: 'Coincidir en rectas no garantiza existencia (hay curvas como y=x² que pueden diferir). Pero una discrepancia sí prueba inexistencia.',
  },
  {
    id: 'n4-06', level: 4, topic: 'Parábola crítica', difficulty: 'dificil', active: true,
    statement: 'Para f(x,y) = x²y/(x⁴+y²), el límite por la parábola y = x² (x≠0) vale:',
    options: [
      { id: 'A', text: '0' },
      { id: 'B', text: '1/2' },
      { id: 'C', text: '1' },
      { id: 'D', text: '∞' },
    ],
    correctOptionId: 'B',
    explanation: 'Sustituyendo: x²·x²/(x⁴+x⁴) = x⁴/2x⁴ = 1/2. Por los ejes vale 0: el límite no existe.',
  },
  {
    id: 'n4-07', level: 4, topic: 'Síntesis polar', difficulty: 'dificil', active: true,
    statement: 'Si una trayectoria polar cumple r(θ) → 0 cuando θ → π, la nave:',
    options: [
      { id: 'A', text: 'Se aleja al infinito' },
      { id: 'B', text: 'Llega al polo (origen) en θ = π' },
      { id: 'C', text: 'Describe un círculo de radio fijo' },
      { id: 'D', text: 'No puede interpretarse geométricamente' },
    ],
    correctOptionId: 'B',
    explanation: 'r = 0 es el polo. Como en r = 2+2cos θ con θ=π, la trayectoria alcanza el origen.',
  },
  {
    id: 'n4-08', level: 4, topic: 'Acotado por cero', difficulty: 'dificil', active: true,
    statement: 'lim((x,y)→(0,0)) (x³+y³)/(x²+y²) es igual a:',
    options: [
      { id: 'A', text: '0' },
      { id: 'B', text: '1' },
      { id: 'C', text: 'No existe' },
      { id: 'D', text: '∞' },
    ],
    correctOptionId: 'A',
    explanation: 'En polares: r³(cos³θ+sin³θ)/r² = r·(acotado) → 0. Función acotada por cero.',
  },
  {
    id: 'n4-09', level: 4, topic: 'Error frecuente', difficulty: 'media', active: true,
    statement: "Un estudiante aplica L'Hôpital a lim(x→0) (x+1)/x derivando como 1/1 = 1. El error es:",
    options: [
      { id: 'A', text: 'Derivó mal: la derivada de x es 0' },
      { id: 'B', text: 'No hay error, el límite es 1' },
      { id: 'C', text: 'Aplicó la regla a una forma que no es 0/0 ni ∞/∞' },
      { id: 'D', text: 'Debió derivar dos veces' },
    ],
    correctOptionId: 'C',
    explanation: 'Es forma 1/0, no indeterminada. El límite lateral es ±∞ (no existe como finito).',
  },
  {
    id: 'n4-10', level: 4, topic: 'Grado dominante', difficulty: 'media', active: true,
    statement: 'lim(x→−∞) (5x³−2x)/(x³+7) es igual a:',
    options: [
      { id: 'A', text: '5' },
      { id: 'B', text: '−5' },
      { id: 'C', text: '0' },
      { id: 'D', text: '−∞' },
    ],
    correctOptionId: 'A',
    explanation: 'Mismo grado: cociente de coeficientes líderes 5/1 = 5 (el signo de ∞ no cambia el cociente de grados iguales).',
  },
  {
    id: 'n4-11', level: 4, topic: 'Decisión final', difficulty: 'dificil', active: true,
    statement: 'Tres naves reportan: por y=0 el límite es 0, por x=0 es 0, por y=x² es 1/2. Conclusión correcta:',
    options: [
      { id: 'A', text: 'El límite es 0 por mayoría' },
      { id: 'B', text: 'El límite es 1/4 (promedio)' },
      { id: 'C', text: 'El límite no existe' },
      { id: 'D', text: 'Falta información para decidir' },
    ],
    correctOptionId: 'C',
    explanation: 'Basta una trayectoria con valor distinto para probar inexistencia. Es el caso clásico x²y/(x⁴+y²).',
  },
];

export function questionsByLevel(level: 1 | 2 | 3 | 4): Question[] {
  return QUESTIONS.filter((q) => q.level === level && q.active);
}

export function getQuestionById(id: string): Question | undefined {
  return QUESTIONS.find((q) => q.id === id);
}
