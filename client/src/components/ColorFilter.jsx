// Fallback palette when no dynamic colors are available
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
]

export default function ColorFilter({ selectedColor, onSelectColor, colors }) {
  const palette =
    Array.isArray(colors) && colors.length
      ? colors.slice(0, 12)
      : FALLBACK_COLORS

  return (
    <div className="color-filter">
      <span className="color-filter-label">Filter by color</span>
      <div className="color-filter-swatches">
        {palette.map((hex) => (
          <button
            key={hex}
            type="button"
            className={`color-filter-swatch ${selectedColor === hex ? 'color-filter-swatch--active' : ''}`}
            style={{ backgroundColor: hex }}
            onClick={() => onSelectColor(selectedColor === hex ? null : hex)}
            title={hex}
            aria-label={selectedColor === hex ? `Remove color filter (${hex})` : `Filter by ${hex}`}
            aria-pressed={selectedColor === hex}
          />
        ))}
      </div>
    </div>
  )
}
