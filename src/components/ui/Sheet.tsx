"use client"
import { useState, useEffect, useRef, type ReactNode } from "react"
import { createPortal } from "react-dom"

// ── Types ─────────────────────────────────────────────────────────────────────

export type SheetAction = {
  label: string
  primary?: boolean
  onClick?: () => void
  dismiss?: boolean  // default true — set false to keep sheet open after click
}

export type SheetOptions = {
  title?: ReactNode
  content: ReactNode
  actions?: SheetAction[]
  onClose?: () => void
}

// ── Global imperative API ─────────────────────────────────────────────────────

type Dispatch = (opts: SheetOptions | null) => void
let _dispatch: Dispatch | null = null

export const sheet = {
  open(opts: SheetOptions) { _dispatch?.(opts) },
  close() { _dispatch?.(null) },
}

// ── Provider (mount once in layout) ──────────────────────────────────────────

export function SheetProvider() {
  const [opts, setOpts] = useState<SheetOptions | null>(null)
  const [visible, setVisible] = useState(false)
  const [mounted, setMounted] = useState(false)

  const sheetEl = useRef<HTMLDivElement>(null)
  const optsRef = useRef<SheetOptions | null>(null)
  const startY = useRef(0)
  const dragY = useRef(0)
  const dragging = useRef(false)

  // Keep optsRef in sync for use inside async closures
  useEffect(() => { optsRef.current = opts }, [opts])

  // Register with global sheet object
  useEffect(() => {
    setMounted(true)
    _dispatch = (nextOpts) => {
      if (nextOpts === null) {
        setVisible(false)
        setTimeout(() => {
          optsRef.current?.onClose?.()
          setOpts(null)
        }, 420)
      } else {
        setOpts(nextOpts)
        // double-rAF ensures the element is in DOM before adding .in
        requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
      }
    }
    return () => { _dispatch = null }
  }, [])

  // Escape key
  useEffect(() => {
    if (!visible) return
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") sheet.close() }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [visible])

  // Scroll lock
  useEffect(() => {
    if (!visible) return
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = "" }
  }, [visible])

  // Global drag tracking (touch + mouse)
  useEffect(() => {
    function move(e: MouseEvent | TouchEvent) {
      if (!dragging.current) return
      const y = "touches" in e ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY
      dragY.current = Math.max(0, y - startY.current)
      if (sheetEl.current) sheetEl.current.style.transform = `translateY(${dragY.current}px)`
    }
    function up() {
      if (!dragging.current) return
      dragging.current = false
      sheetEl.current?.classList.remove("bulle-dragging")
      if (dragY.current > 120) {
        sheet.close()
      } else if (sheetEl.current) {
        sheetEl.current.style.transform = ""
      }
      dragY.current = 0
    }
    document.addEventListener("mousemove", move)
    document.addEventListener("touchmove", move, { passive: true })
    document.addEventListener("mouseup", up)
    document.addEventListener("touchend", up)
    return () => {
      document.removeEventListener("mousemove", move)
      document.removeEventListener("touchmove", move)
      document.removeEventListener("mouseup", up)
      document.removeEventListener("touchend", up)
    }
  }, [])

  function onDragStart(e: React.MouseEvent | React.TouchEvent) {
    const y = "touches" in e ? e.touches[0].clientY : e.clientY
    startY.current = y
    dragging.current = true
    sheetEl.current?.classList.add("bulle-dragging")
  }

  function handleAction(action: SheetAction) {
    try { action.onClick?.() } catch { /* ignore */ }
    if (action.dismiss !== false) sheet.close()
  }

  if (!mounted || !opts) return null

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className={`bulle-sheet-bd${visible ? " in" : ""}`}
        onClick={() => sheet.close()}
        aria-hidden="true"
      />

      {/* Sheet panel */}
      <div
        ref={sheetEl}
        className={`bulle-sheet${visible ? " in" : ""}`}
        role="dialog"
        aria-modal="true"
      >
        {/* Drag handle */}
        <div
          className="bulle-sheet-handle"
          onMouseDown={onDragStart}
          onTouchStart={onDragStart}
        />

        {/* Header */}
        {opts.title && (
          <div className="bulle-sheet-head">
            <div className="bulle-sheet-title">{opts.title}</div>
            <button
              className="bulle-sheet-close"
              onClick={() => sheet.close()}
              aria-label="Fermer"
            >
              ×
            </button>
          </div>
        )}

        {/* Content */}
        <div className="bulle-sheet-body">{opts.content}</div>

        {/* Footer actions */}
        {opts.actions && opts.actions.length > 0 && (
          <div className="bulle-sheet-foot">
            {opts.actions.map((action, i) => (
              <button
                key={i}
                className={action.primary ? "primary" : ""}
                onClick={() => handleAction(action)}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </>,
    document.body
  )
}

// ── Content helpers ───────────────────────────────────────────────────────────

/** Chip selector row inside a sheet (filter categories, durations, etc.) */
export function SheetChips({
  label,
  options,
  value,
  onChange,
  multi = false,
}: {
  label?: string
  options: string[]
  value: string | string[]
  onChange: (v: string | string[]) => void
  multi?: boolean
}) {
  function toggle(opt: string) {
    if (!multi) {
      onChange(opt)
      return
    }
    const arr = Array.isArray(value) ? value : [value]
    onChange(arr.includes(opt) ? arr.filter(v => v !== opt) : [...arr, opt])
  }
  const active = Array.isArray(value) ? value : [value]
  return (
    <div className="sh-section">
      {label && <h4 className="sh-label">{label}</h4>}
      <div className="sh-chips">
        {options.map(opt => (
          <button
            key={opt}
            className={`sh-chip${active.includes(opt) ? " on" : ""}`}
            onClick={() => toggle(opt)}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}

/** Clickable list row inside a sheet (service picker, etc.) */
export function SheetListItem({
  label,
  sub,
  right,
  onClick,
}: {
  label: string
  sub?: string
  right?: ReactNode
  onClick?: () => void
}) {
  return (
    <div className="sh-row" onClick={onClick} role={onClick ? "button" : undefined} tabIndex={onClick ? 0 : undefined}>
      <div>
        <div className="sh-row-nm">{label}</div>
        {sub && <div className="sh-row-sub">{sub}</div>}
      </div>
      {right && <div className="sh-row-right">{right}</div>}
    </div>
  )
}
