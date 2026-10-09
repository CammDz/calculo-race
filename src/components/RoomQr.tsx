import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Check, Copy } from 'lucide-react';
import { joinUrlWithCode } from '../lib/utils';

export function RoomQr({ code, size = 200 }: { code: string; size?: number }) {
  const [copied, setCopied] = useState(false);
  const url = (() => {
    try {
      return joinUrlWithCode(code);
    } catch {
      return code;
    }
  })();

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="center">
      <span className="qr-box">
        <QRCodeSVG value={url} size={size} level="M" includeMargin />
      </span>
      <div className="mt" style={{ fontSize: '1.4rem', letterSpacing: 4, fontWeight: 800 }}>{code}</div>
      <div className="hint">Escanea el QR o escribe el código al ingresar</div>
      <button className="btn secondary small mt" onClick={copyLink} type="button">
        {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? '¡Enlace copiado!' : 'Copiar enlace de ingreso'}
      </button>
      <div className="hint" style={{ wordBreak: 'break-all' }}>{url}</div>
    </div>
  );
}
