import { QRCodeSVG } from 'qrcode.react'

interface QRCodeDisplayProps {
  value: string
  size?: number
  caption?: string
}

export default function QRCodeDisplay({ value, size = 200, caption }: QRCodeDisplayProps) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="p-4 bg-white rounded-xl border border-slate-200">
        <QRCodeSVG value={value} size={size} level="M" />
      </div>
      {caption && <p className="text-xs text-slate-500 font-mono break-all text-center max-w-[220px]">{caption}</p>}
    </div>
  )
}
