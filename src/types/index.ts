// Tipos centrales de Cálculo Race

export type GameStatus =
  | 'lobby' // minuto 0-1: ingreso y preparación
  | 'level_1' // minuto 1-3
  | 'level_2' // minuto 3-6
  | 'level_3' // minuto 6-9
  | 'level_4' // minuto 9-13
  | 'podium' // minuto 13-15
  | 'finished'
  | 'paused';

export type LevelNumber = 1 | 2 | 3 | 4;

export interface LevelConfig {
  level: LevelNumber;
  name: string;
  subtitle: string;
  startSec: number;
  endSec: number;
  basePoints: number;
}

export interface QuestionOption {
  id: string; // 'A' | 'B' | 'C' | 'D'
  text: string;
}

export interface Question {
  id: string;
  level: LevelNumber;
  topic: string;
  difficulty: 'facil' | 'media' | 'dificil';
  statement: string;
  options: QuestionOption[];
  correctOptionId: string;
  explanation: string;
  /** Si true, mostrar gráfica polar complementaria */
  polarPlot?: { r: string; label: string; kind: 'circle' | 'cardioid' | 'rose' | 'spiral' | 'line' };
  active: boolean;
}

export interface Team {
  id: string;
  gameId: string;
  name: string;
  shipColor: string;
  score: number;
  correctCount: number;
  totalResponseTimeMs: number;
  connected: boolean;
  lastSeenAt: string;
}

export interface Game {
  id: string;
  code: string;
  teacherId: string | null;
  status: GameStatus;
  maxTeams: number;
  /** segundos de competencia transcurridos (pausa descuenta) */
  elapsedSec: number;
  /** timestamp servidor cuando se (re)anudó; null si pausado/lobby */
  serverStartedAt: string | null;
  /** timestamp servidor de creación */
  createdAt: string;
  currentQuestionId: string | null;
  currentLevel: LevelNumber;
  pointsL1: number;
  pointsL2: number;
  pointsL3: number;
  pointsL4: number;
  showExplanations: boolean;
  questionOpenedAt: string | null;
  questionClosesAt: string | null;
  /** Avance automático cuando todos los equipos participantes respondieron. */
  autoAdvance: boolean;
  /** Segundos de pausa para mostrar el resultado antes de publicar la siguiente. */
  autoAdvanceDelaySec: number;
}

export interface Answer {
  id: string;
  gameId: string;
  teamId: string;
  questionId: string;
  selectedOptionId: string;
  isCorrect: boolean;
  pointsAwarded: number;
  responseTimeMs: number;
  createdAt: string;
}

export interface LeaderboardEntry {
  teamId: string;
  teamName: string;
  shipColor: string;
  score: number;
  correctCount: number;
  totalResponseTimeMs: number;
}

export const SHIP_COLORS = [
  '#E8B09F', // coral suave (referencia)
  '#38bdf8', // azul luminoso
  '#a78bfa', // violeta
  '#fb923c', // naranja
  '#22d3ee',
  '#f472b6',
  '#a3e635',
  '#facc15',
  '#34d399',
  '#f87171',
] as const;
