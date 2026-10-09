import { Timer as TimerIcon, Wifi, WifiOff } from 'lucide-react';
import { formatClock } from '../lib/gameLogic';

export function Clock({ label, seconds, big }: { label: string; seconds: number; big?: boolean }) {
  const urgent = seconds <= 30;
  return (
    <div className={`timer ${big ? 'big' : ''}`} aria-live="polite" style={{ color: urgent ? '#ffd9d9' : undefined }}>
      <TimerIcon size={big ? 26 : 18} />
      <span>{label} {formatClock(seconds)}</span>
    </div>
  );
}

export function ConnectionBadge({ online }: { online: boolean }) {
  return (
    <span className={`badge ${online ? 'green' : ''}`}>
      {online ? <Wifi size={14} /> : <WifiOff size={14} />}
      {online ? 'Conectado' : 'Sin conexión'}
    </span>
  );
}
