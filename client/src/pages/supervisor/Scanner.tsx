import { useEffect, useRef, useState } from 'react'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { CheckCircle2, XCircle, Users, X } from 'lucide-react'
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

  const scannerRef = useRef<Html5QrcodeScanner | null>(null)
  const modalOpenRef = useRef(false)  // prevents double-trigger while modal is open

  // null = demo mode (no real scan); string = the scanned QR token to send to server
  const [scannedToken, setScannedToken] = useState<string | null>(null)

  const [uiState, setUiState] = useState<UIState>('scanning')
  const [scanError, setScanError] = useState<string | null>(null)
  const [submitBusy, setSubmitBusy] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  // Modal form fields — seed with current meal if detectable
  const [selectedMeal, setSelectedMeal] = useState<MealType>(currentMealType() ?? 'lunch')
  const [quantity, setQuantity] = useState(1)

  // Mount scanner once; keep it running the whole time the page is open
  useEffect(() => {
    const scanner = new Html5QrcodeScanner(SCANNER_ELEMENT_ID, { fps: 10, qrbox: 250 }, false)
    scannerRef.current = scanner
    scanner.render(handleScanSuccess, () => { /* ignore per-frame failures */ })
    return () => { scanner.clear().catch(() => { }) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleScanSuccess(decodedText: string) {
    // Gate: ignore while modal is open or a submit is in flight
    if (modalOpenRef.current) return
    setScanError(null)

    // Store the raw token — server will validate it on submission
    setScannedToken(decodedText.trim())
    modalOpenRef.current = true
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
      // scannedToken === null means demo path (no real QR scan)
      await (scannedToken !== null
        ? await recordBulkSupervisorCheckIn(selectedMeal, quantity, scannedToken)
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
    setScanError(null)
    setSuccessMsg('')
    setErrorMsg('')
    setUiState('scanning')
    // Re-render the scanner in case it was cleared
    scannerRef.current?.render(handleScanSuccess, () => { })
  }

  return (
    <>
      {/* ── Claim Modal ── */}
      {uiState === 'modal' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="card w-full max-w-sm shadow-2xl">
            {/* Header */}
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

            {/* Quantity */}
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

            {/* Actions */}
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

      {/* ── Floating demo button — always visible, remove before go-live ── */}
      {uiState === 'scanning' && (
        <button
          type="button"
          onClick={() => {
            setScannedToken(null)   // demo path — no QR token
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
        {/* Scanner card — always rendered so the camera mounts once */}
        <div className={`card ${uiState !== 'scanning' && uiState !== 'modal' ? 'opacity-50 pointer-events-none' : ''}`}>
          <h3 className="font-semibold text-slate-800 mb-1">Scan the Restaurant's QR Code</h3>
          <p className="text-sm text-slate-500 mb-4">
            Point your camera at the QR code to open the bulk tiffin form.
          </p>
          <div id={SCANNER_ELEMENT_ID} />
          {scanError && (
            <div className="mt-3 flex items-start gap-2 text-red-600 text-sm">
              <XCircle size={16} className="mt-0.5 shrink-0" />
              {scanError}
            </div>
          )}
        </div>

        {/* Success result */}
        {uiState === 'success' && (
          <div className="card flex flex-col items-center gap-4 text-center border-emerald-200">
            <CheckCircle2 size={40} className="text-emerald-500" />
            <p className="text-sm font-medium text-emerald-700">{successMsg}</p>
            <button type="button" className="btn-primary w-full" onClick={handleReset}>
              Claim another shift
            </button>
          </div>
        )}

        {/* Error result */}
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
