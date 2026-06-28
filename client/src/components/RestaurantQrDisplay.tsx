import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import QRCodeDisplay from './QRCodeDisplay'
import { getCurrentToken, ROTATION_SECONDS } from '../services/restaurantQrService'

/**
 * The restaurant's own QR code, shown at the front desk / on an admin
 * tablet. Customers scan THIS code (not their own) to claim a meal. The
 * token rotates every ROTATION_SECONDS so a photo of the screen goes stale
 * almost immediately — see restaurantQrService.ts for the rotation logic
 * this stands in for.
 */
export default function RestaurantQrDisplay() {
  const [token, setToken] = useState<string>('')
  const [secondsLeft, setSecondsLeft] = useState(ROTATION_SECONDS)

  useEffect(() => {
    let cancelled = false

    async function refresh() {
      const next = await getCurrentToken()
      if (!cancelled) setToken(next)
    }

    refresh()
    const refreshInterval = setInterval(refresh, ROTATION_SECONDS * 1000)
    const tickInterval = setInterval(() => {
      setSecondsLeft((s) => (s <= 1 ? ROTATION_SECONDS : s - 1))
    }, 1000)

    return () => {
      cancelled = true
      clearInterval(refreshInterval)
      clearInterval(tickInterval)
    }
  }, [])

  if (!token) return <p className="text-sm text-slate-400">Generating code…</p>

  return (
    <div className="flex flex-col items-center gap-3">
      <QRCodeDisplay value={token} size={200} />
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <RefreshCw size={12} />
        Refreshes in {secondsLeft}s
      </div>
      <p className="text-xs text-slate-400 text-center max-w-[240px]">
        Customers scan this code from the Scanner tab in their app to claim a meal.
      </p>
    </div>
  )
}
