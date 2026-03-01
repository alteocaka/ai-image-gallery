import { useState, useRef, useEffect } from 'react';

// Fallback palette when no dynamic colors are available (after load)
const FALLBACK_COLORS = [
  '#E8A838',
  '#1E5F74',
  '#87CEEB',
  '#4A7C59',
  '#2C3E50',
  '#E74C3C',
  '#228B22',
  '#8B4513',
  '#6F4E37',
  '#FFB6C1',
  '#98FB98',
];

const SKELETON_COUNT = 12;

/** Normalize to #RRGGBB for API */
function toHex(value) {
  if (!value || typeof value !== 'string') return null;
  const s = value.replace(/^#/, '').trim();
  if (s.length === 6 && /^[0-9A-Fa-f]+$/.test(s)) return `#${s.toUpperCase()}`;
  if (s.length === 3 && /^[0-9A-Fa-f]+$/.test(s)) {
    return `#${(s[0] + s[0] + s[1] + s[1] + s[2] + s[2]).toUpperCase()}`;
  }
  return null;
}

/** Normalize to #rrggbb for native color input */
function toColorInputValue(hex) {
  const normalized = toHex(hex);
  if (normalized) return normalized;
  return '#808080';
}

export default function ColorFilter({ selectedColor, onSelectColor, colors, loading = false }) {
  const palette = Array.isArray(colors) && colors.length ? colors.slice(0, 12) : FALLBACK_COLORS;
  const [customOpen, setCustomOpen] = useState(false);
  const [hexInput, setHexInput] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setCustomOpen(false);
    }
    if (customOpen) document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [customOpen]);

  useEffect(() => {
    if (customOpen && selectedColor && toHex(selectedColor)) {
      setHexInput(toHex(selectedColor));
    }
  }, [customOpen, selectedColor]);

  const handlePickerChange = (e) => {
    const hex = e.target.value;
    if (hex) {
      onSelectColor(hex);
      setHexInput(hex);
    }
  };

  const handleHexSubmit = (e) => {
    e.preventDefault();
    const hex = toHex(hexInput);
    if (hex) {
      onSelectColor(hex);
      setHexInput(hex);
    }
  };

  const isCustomSelected = selectedColor && !palette.includes(selectedColor);

  return (
    <div className="color-filter">
      <span className="color-filter-label">Filter by color</span>
      <div className="color-filter-swatches">
        {loading
          ? Array.from({ length: SKELETON_COUNT }).map((_, i) => (
              <span
                key={i}
                className="color-filter-swatch color-filter-swatch--skeleton"
                aria-hidden
              />
            ))
          : palette.map((hex) => (
              <button
                key={hex}
                type="button"
                className={`color-filter-swatch ${selectedColor === hex ? 'color-filter-swatch--active' : ''}`}
                style={{ backgroundColor: hex }}
                onClick={() => onSelectColor(selectedColor === hex ? null : hex)}
                title={hex}
                aria-label={
                  selectedColor === hex ? `Remove color filter (${hex})` : `Filter by ${hex}`
                }
                aria-pressed={selectedColor === hex}
              />
            ))}
      </div>
      <div className="color-filter-custom-wrap" ref={dropdownRef}>
        <button
          type="button"
          className={`color-filter-custom-trigger ${customOpen ? 'color-filter-custom-trigger--open' : ''} ${isCustomSelected ? 'color-filter-custom-trigger--active' : ''}`}
          onClick={() => setCustomOpen((o) => !o)}
          aria-expanded={customOpen}
          aria-haspopup="true"
          title="Pick a custom color"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
          </svg>
          <span>Custom</span>
        </button>
        {customOpen && (
          <div className="color-filter-custom-dropdown">
            <div className="color-filter-custom-row">
              <input
                type="color"
                className="color-filter-picker"
                value={toColorInputValue(selectedColor || hexInput)}
                onChange={handlePickerChange}
                title="Pick a color"
                aria-label="Pick a custom color"
              />
              <form className="color-filter-hex-form" onSubmit={handleHexSubmit}>
                <input
                  type="text"
                  className="color-filter-hex-input"
                  placeholder="#hex"
                  value={hexInput}
                  onChange={(e) => setHexInput(e.target.value)}
                  aria-label="Hex code"
                />
                <button type="submit" className="color-filter-hex-btn">
                  Apply
                </button>
              </form>
            </div>
            {isCustomSelected && (
              <button
                type="button"
                className="color-filter-clear-btn"
                onClick={() => {
                  onSelectColor(null);
                  setHexInput('');
                }}
              >
                Clear filter
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
