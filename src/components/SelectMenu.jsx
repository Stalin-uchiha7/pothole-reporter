import { useState, useRef, useEffect } from 'react'

export default function SelectMenu({ value, onChange, options, className = '' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    function handleEscape(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  const selected = options.find(o => o.value === value) ?? options[0]

  return (
    <div
      className={`select-menu ${open ? 'select-menu--open' : ''} ${className}`.trim()}
      ref={ref}
    >
      <button
        type="button"
        className="select-menu__trigger"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen(o => !o)}
      >
        <span className="select-menu__value">{selected.label}</span>
        <span className="select-menu__caret" aria-hidden />
      </button>
      {open && (
        <ul className="select-menu__list" role="listbox">
          {options.map(opt => (
            <li key={String(opt.value)} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={opt.value === value}
                className={`select-menu__option ${opt.value === value ? 'is-selected' : ''}`}
                onClick={() => {
                  onChange(opt.value)
                  setOpen(false)
                }}
              >
                {opt.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
