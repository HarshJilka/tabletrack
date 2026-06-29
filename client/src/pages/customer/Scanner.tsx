import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { CheckCircle2, XCircle, AlertCircle, Utensils, Camera } from 'lucide-react'
import { recordSelfCheckIn, recordSelfCheckInDemo, currentMealType } from '../../services/attendanceService'
import { useAuth } from '../../context/AuthContext'
import type { CustomerUser, MealType } from '../../types'

const SCANNER_ELEMENT_ID = 'qr-scanner-region'

const MEAL_OPTIONS: { value: MealType; label: string; time: string }[] = [
  { value: 'breakfast', label: 'Breakfast', time: '07:00 – 10:30' },
  { value: 'lunch',     label: 'Lunch',     time: '12:00 – 15:30' },
  { value: 'dinner',   label: 'Dinner',    time: '19:00 – 22:30' },
]

interface ScanResult {
  type: 'success' | 'error'
  message: string
}

export default function Scanner() {
  const { user } = useAuth()
  const customer = user as CustomerUser

  const qrRef   = useRef<Html5Qrcode | null>(null)
  const busyRef  = useRef(false)   // gate to prevent double-processing

  const [result,             setResult]             = useState<ScanResult | null>(null)
  const [busy,               setBusy]               = useState(false)
  const [cameraError,        setCameraError]        = useState<string | null>(null)
  const [showDuplicateModal, setShowDuplicateModal] = useState(false)
  const [showClaimModal,     setShowClaimModal]     = useState(false)

  const activeMeal = currentMealType()
  const [demoMeal, setDemoMeal] = useState<MealType>(activeMeal ?? 'lunch')

  // Start back-camera directly — no file-picker UI
  useEffect(() => {
    const qr = new Html5Qrcode(SCANNER_ELEMENT_ID)
    qrRef.current = qr

    qr.start(
      { facingMode: 'environment' },          // back camera on mobile
      { fps: 10, qrbox: { width: 240, height: 240 } },
      (decodedText) => {
        if (!busyRef.current) handleScanSuccess(decodedText)
      },
      () => { /* ignore per-frame decode failures */ },
    ).catch(() => {
      // Fallback: try any available camera
      qr.start(
        { facingMode: 'user' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decodedText) => {
          if (!busyRef.current) handleScanSuccess(decodedText)
        },
        () => {},
      ).catch(() => {
        setCameraError('Camera access denied. Please allow camera permission in your browser/app settings and reload.')
      })
    })

    return () => { qr.stop().catch(() => {}) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function setProcessing(val: boolean) {
    busyRef.current = val
    setBusy(val)
  }

  function openDemoModal() {
    setDemoMeal(currentMealType() ?? 'lunch')
    setShowClaimModal(true)
  }

  async function handleDemoClaim() {
    if (busyRef.current) return
    setShowClaimModal(false)
    setProcessing(true)
    try {
      const record = await recordSelfCheckInDemo(demoMeal)
      setResult({ type: 'success', message: `Checked in for ${record.mealType} ✓` })
    } catch (err) {
      const msg = (err as Error).message
      if (msg.includes('Already checked in') || msg.includes('already')) {
        setShowDuplicateModal(true)
      } else {
        setResult({ type: 'error', message: msg })
      }
    } finally {
      setProcessing(false)
    }
  }

  async function handleScanSuccess(decodedText: string) {
    setProcessing(true)
    try {
      const record = await recordSelfCheckIn(decodedText.trim())
      setResult({ type: 'success', message: `Checked in for ${record.mealType} ✓` })
    } catch (err) {
      const msg = (err as Error).message
      if (msg.includes('Already checked in') || msg.includes('already')) {
        setShowDuplicateModal(true)
      } else {
        setResult({ type: 'error', message: msg })
      }
    } finally {
      setProcessing(false)
    }
  }

  return (
    <>
      {/* ── Demo: Claim Meal modal ── */}
      {showClaimModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="card w-full max-w-sm shadow-2xl">
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 rounded-full bg-brand-100 flex items-center justify-center">
                <Utensils size={26} className="text-brand-600" />
              </div>
            </div>
            <h3 className="font-semibold text-slate-800 text-lg text-center mb-0.5">Claim Your Meal</h3>
            <p className="text-xs text-center text-slate-400 mb-5">Demo — bypasses QR scan</p>

            <p className="label mb-2">Select Meal Shift</p>
            <div className="space-y-2 mb-6">
              {MEAL_OPTIONS.map((opt) => {
                const isActive   = opt.value === activeMeal
                const isSelected = opt.value === demoMeal
                return (
                  <label
                    key={opt.value}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors
                      ${isSelected
                        ? 'border-brand-400 bg-brand-50'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}
                  >
                    <input
                      type="radio"
                      name="demo-meal"
                      value={opt.value}
                      checked={isSelected}
                      onChange={() => setDemoMeal(opt.value)}
                      className="accent-brand-500"
                    />
                    <div className="flex-1">
                      <span className={`font-medium text-sm ${isSelected ? 'text-brand-700' : 'text-slate-700'}`}>
                        {opt.label}
                      </span>
                      <span className="text-xs text-slate-400 ml-2">{opt.time}</span>
                    </div>
                    {isActive && (
                      <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
                        Active now
                      </span>
                    )}
                  </label>
                )
              })}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                className="flex-1 py-2.5 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
                onClick={() => setShowClaimModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="flex-1 btn-primary"
                onClick={handleDemoClaim}
                disabled={busy}
              >
                {busy ? 'Claiming…' : 'Claim Meal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Duplicate-scan modal ── */}
      {showDuplicateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="card w-full max-w-sm text-center shadow-xl">
            <div className="flex justify-center mb-3">
              <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center">
                <AlertCircle size={28} className="text-amber-500" />
              </div>
            </div>
            <h3 className="font-semibold text-slate-800 text-lg mb-1">Already Claimed</h3>
            <p className="text-slate-500 text-sm mb-5">
              You already grabbed a tiffin for this time.
            </p>
            <button type="button" className="btn-primary w-full" onClick={() => setShowDuplicateModal(false)}>
              OK
            </button>
          </div>
        </div>
      )}

      {/* ── Demo FAB ── */}
      <button
        type="button"
        onClick={openDemoModal}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 rounded-full shadow-lg bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold transition-colors"
      >
        <Utensils size={16} />
        Claim Meal (demo)
      </button>

      {/* ── Page ── */}
      <div className="max-w-lg space-y-4">
        <div className="card">
          <div className="flex items-center gap-2 mb-1">
            <Camera size={18} className="text-brand-600" />
            <h3 className="font-semibold text-slate-800">Scan the Restaurant's QR Code</h3>
          </div>
          <p className="text-sm text-slate-500 mb-4">
            Point your back camera at the QR code at the front desk to claim your meal.
          </p>

          {cameraError ? (
            <div className="flex items-start gap-2 text-red-600 text-sm p-3 bg-red-50 rounded-lg">
              <XCircle size={16} className="mt-0.5 shrink-0" />
              {cameraError}
            </div>
          ) : (
            <div
              id={SCANNER_ELEMENT_ID}
              className="w-full overflow-hidden rounded-lg bg-black"
            />
          )}

          {busy && (
            <p className="text-xs text-slate-400 mt-2 text-center">Processing…</p>
          )}
        </div>

        {result && (
          <div className={`card flex items-start gap-3 ${result.type === 'success' ? 'border-emerald-200' : 'border-red-200'}`}>
            {result.type === 'success'
              ? <CheckCircle2 className="text-emerald-600 mt-0.5" size={20} />
              : <XCircle className="text-red-500 mt-0.5" size={20} />}
            <p className={`text-sm ${result.type === 'success' ? 'text-emerald-700' : 'text-red-600'}`}>
              {result.message}
            </p>
          </div>
        )}
      </div>
    </>
  )
}
