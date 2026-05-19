"use client"
import { useState, useEffect, useRef } from "react"

interface BanFeature {
  properties: { label: string; city: string; postcode: string; score: number }
  geometry: { coordinates: [number, number] } // [lng, lat]
}

interface Props {
  value: string
  onSelect: (label: string, lat: number, lng: number) => void
  onChange: (raw: string) => void
  placeholder?: string
}

export default function AddressAutocomplete({ value, onSelect, onChange, placeholder }: Props) {
  const [suggestions, setSuggestions] = useState<BanFeature[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (value.trim().length < 5) {
      setSuggestions([])
      setOpen(false)
      return
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(value)}&limit=5&autocomplete=1`
        const res = await fetch(url)
        const data = await res.json()
        const features: BanFeature[] = data.features ?? []
        setSuggestions(features)
        setOpen(features.length > 0)
      } catch {
        setSuggestions([])
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [value])

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handle)
    return () => document.removeEventListener("mousedown", handle)
  }, [])

  function handlePick(f: BanFeature) {
    const [lng, lat] = f.geometry.coordinates
    onSelect(f.properties.label, lat, lng)
    setOpen(false)
    setSuggestions([])
  }

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <input
        type="text"
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(false) }}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        placeholder={placeholder ?? "12 rue des Lilas, 69007 Lyon"}
        autoComplete="off"
      />
      {loading && (
        <span style={{
          position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
          fontSize: 11, color: "var(--mute)", fontStyle: "italic",
        }}>
          Recherche…
        </span>
      )}
      {open && suggestions.length > 0 && (
        <ul style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
          background: "#fff", border: "1px solid var(--line)", borderRadius: 10,
          boxShadow: "0 8px 24px -8px rgba(0,0,0,.12)",
          listStyle: "none", margin: 0, padding: "6px 0",
          zIndex: 100, maxHeight: 240, overflowY: "auto",
        }}>
          {suggestions.map((f, i) => (
            <li
              key={i}
              onMouseDown={() => handlePick(f)}
              style={{
                padding: "9px 14px",
                cursor: "pointer",
                fontSize: 13.5,
                lineHeight: 1.4,
                borderBottom: i < suggestions.length - 1 ? "1px solid var(--line)" : "none",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--cream)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <span style={{ fontWeight: 500 }}>
                {f.properties.label.split(",")[0]}
              </span>
              <span style={{ color: "var(--mute)", marginLeft: 6 }}>
                {f.properties.postcode} {f.properties.city}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
