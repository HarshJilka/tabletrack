import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { CheckCircle2, XCircle, Users, X, Camera } from 'lucide-react'
import { recordBulkSupervisorCheckIn, recordBulkSupervisorCheckInDemo, currentMealType } from '../../services/attendanceService'
import { useAuth } from '../../context/AuthContext'
import type { MealType } from '../../types'

const SCANNER_ELEMENT_ID = 'sup-qr-scanner-region'

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
}

type UIState = 'scanning' | 'modal' | 'success' | 'error'

export default function SupervisorScanner() {
  const { user: _user } = useAuth()

  const qrRef       = useRef<Html5Qrcode | null>(null)
  const modalOpenRef = useRef(false)   // gates the scan callback while modal is up

  // null = demo path (no real QR scan); string = scanned QR token to send server
  const [scannedToken, setScannedToken] = useState<string | null>(null)

  const [uiState,      setUiState]      = useState<UIState>('scanning')
  const [cameraError,  setCameraError]  = useState<string | null>(null)
  const [submitBusy,   setSubmitBusy]   = useState(false)
  const [successMsg,   setSuccessMsg]   = useState('')
  const [errorMsg,     setErrorMsg]     = useState('')

  // Modal form fields
  const [selectedMeal, setSelectedMeal] = useState<MealType>(currentMealType() ?? 'lunch')
  const [quantity,     setQuantity]     = useState(1)

  // Start the back-camera directly — no file-picker UI
  useEffect(() => {
    const qr = new Html5Qrcode(SCANNER_ELEMENT_ID)
    qrRef.current = qr

    qr.start(
      { facingMode: 'environment' },           // back camera on mobile
      { fps: 10, qrbox: { width: 240, height: 240 } },
      (decodedText) => {
        if (!modalOpenRef.current) handleScanSuccess(decodedText)
      },
      () => { /* ignore per-frame decode failures */ },
    ).catch(() => {
      // Fallback: try any available camera
      qr.start(
        { facingMode: 'user' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decodedText) => {
          if (!modalOpenRef.current) handleScanSuccess(decodedText)
        },
        () => {},
      ).catch(() => {
        setCameraError('Camera access denied. Please allow camera permission in your browser/app settings and reload.')
      })
    })

    return () => { qr.stop().catch(() => {}) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleScanSuccess(decodedText: string) {
    if (modalOpenRef.current) return
    modalOpenRef.current = true
    setScannedToken(decodedText.trim())
    setSelectedMeal(currentMealType() ?? 'lunch')
    setQuantity(1)
    setUiState('modal')
  }

  function handleModalCancel() {
    modalOpenRef.current = false
    setUiState('scanning')
  }

  async function handleClaim() {
    setSubmitBusy(true)
    try {
      await (scannedToken !== null
        ? recordBulkSupervisorCheckIn(selectedMeal, quantity, scannedToken)
        : recordBulkSupervisorCheckInDemo(selectedMeal, quantity))

      setSuccessMsg(
        `Logged ${quantity} ${MEAL_LABELS[selectedMeal].toLowerCase()} tiffin${quantity > 1 ? 's' : ''} for your team ✓`,
      )
      setUiState('success')
    } catch (err) {
      setErrorMsg((err as Error).message)
      setUiState('error')
    } finally {
      setSubmitBusy(false)
      modalOpenRef.current = false
    }
  }

  function handleReset() {
    setSuccessMsg('')
    setErrorMsg('')
    setUiState('scanning')
    // Camera is still running — no need to restart it
  }

  return (
    <>
      {/* ── Claim Modal ── */}
      {uiState === 'modal' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="card w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="font-semibold text-slate-800 text-lg">Claim Tiffins</p>
                <p className="text-xs text-slate-500 mt-0.5">QR verified — fill in the details below</p>
              </div>
              <button
                type="button"
                onClick={handleModalCancel}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Meal shift */}
            <div className="mb-4">
              <label className="label" htmlFor="sup-meal-select">Meal Shift</label>
              <select
                id="sup-meal-select"
                className="input-field"
                value={selectedMeal}
                onChange={(e) => setSelectedMeal(e.target.value as MealType)}
              >
                <option value="breakfast">Breakfast &nbsp;(07:00 – 10:30)</option>
                <option value="lunch">Lunch &nbsp;(12:00 – 15:30)</option>
                <option value="dinner">Dinner &nbsp;(19:00 – 22:30)</option>
              </select>
            </div>

            {/* Quantity stepper */}
            <div className="mb-5">
              <label className="label" htmlFor="sup-qty-input">Quantity</label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="w-10 h-10 rounded-lg border border-slate-300 text-slate-700 font-bold text-lg hover:bg-slate-100 transition-colors"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                >
                  −
                </button>
                <input
                  id="sup-qty-input"
                  type="number"
                  min={1}
                  max={200}
                  className="input-field text-center flex-1"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.min(200, Math.max(1, Number(e.target.value))))}
                />
                <button
                  type="button"
                  className="w-10 h-10 rounded-lg border border-slate-300 text-slate-700 font-bold text-lg hover:bg-slate-100 transition-colors"
                  onClick={() => setQuantity((q) => Math.min(200, q + 1))}
                >
                  +
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-1">Max 200 per claim</p>
            </div>

            {/* Summary pill */}
            <div className="flex items-center gap-2 px-3 py-2.5 bg-brand-50 rounded-lg mb-5">
              <Users size={15} className="text-brand-600 shrink-0" />
              <p className="text-sm text-brand-700 font-medium">
                {quantity} × {MEAL_LABELS[selectedMeal]} for team
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                className="flex-1 py-2.5 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
                onClick={handleModalCancel}
                disabled={submitBusy}
              >
                Cancel
              </button>
              <button
                type="button"
                className="flex-1 btn-primary"
                onClick={handleClaim}
                disabled={submitBusy}
              >
                {submitBusy ? 'Claiming…' : 'Claim Meal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Demo FAB — always visible while scanning ── */}
      {uiState === 'scanning' && (
        <button
          type="button"
          onClick={() => {
            setScannedToken(null)   // demo = no QR token
            modalOpenRef.current = true
            setSelectedMeal(currentMealType() ?? 'lunch')
            setQuantity(1)
            setUiState('modal')
          }}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 rounded-full shadow-lg bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold transition-colors"
        >
          <Users size={16} />
          Claim Tiffins (demo)
        </button>
      )}

      {/* ── Main page ── */}
      <div className="max-w-lg space-y-4">
        {/* Scanner card — camera div stays mounted for entire page lifetime */}
        <div className={`card ${uiState !== 'scanning' && uiState !== 'modal' ? 'opacity-50 pointer-events-none' : ''}`}>
          <div className="flex items-center gap-2 mb-1">
            <Camera size={18} className="text-brand-600" />
            <h3 className="font-semibold text-slate-800">Scan the Restaurant's QR Code</h3>
          </div>
          <p className="text-sm text-slate-500 mb-4">
            Point your back camera at the QR code to open the bulk tiffin form.
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
        </div>

        {/* Success */}
        {uiState === 'success' && (
          <div className="card flex flex-col items-center gap-4 text-center border-emerald-200">
            <CheckCircle2 size={40} className="text-emerald-500" />
            <p className="text-sm font-medium text-emerald-700">{successMsg}</p>
            <button type="button" className="btn-primary w-full" onClick={handleReset}>
              Claim another shift
            </button>
          </div>
        )}

        {/* Error */}
        {uiState === 'error' && (
          <div className="card flex flex-col items-center gap-4 text-center border-red-200">
            <XCircle size={40} className="text-red-500" />
            <p className="text-sm font-medium text-red-600">{errorMsg}</p>
            <button type="button" className="btn-primary w-full" onClick={handleReset}>
              Try again
            </button>
          </div>
        )}
      </div>
    </>
  )
}
