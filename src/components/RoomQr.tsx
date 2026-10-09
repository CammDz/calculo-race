import { QRCodeSVG } from 'qrcode.react';
import { joinUrlWithCode } from '../lib/utils';

export function RoomQr({ code, size = 160 }: { code: string; size?: number }) {
  const url = (() => {
    try {
      return joinUrlWithCode(code);
    } catch {
      return code;
    }
  })();
  return (
    <div className="center">
      <span className="qr-box">
        <QRCodeSVG value={url} size={size} level="M" />
      </span>
      <div className="hint mt">Escanea para unirte · código <strong>{code}</strong></div>
      <div className="hint" style={{ wordBreak: 'break-all' }}>{url}</div>
    </div>
  );
}
