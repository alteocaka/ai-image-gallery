import { useState, useEffect } from 'react';

export default function SearchBar({ value: valueProp, onChange }) {
  const [internalValue, setInternalValue] = useState('');
  const [searching, setSearching] = useState(false);

  const isControlled = valueProp !== undefined && typeof onChange === 'function';
  const value = (isControlled ? valueProp : internalValue) ?? '';
  const query = value.trim();

  useEffect(() => {
    if (!query) {
      setSearching(false);
      return;
    }
    setSearching(true);
    const t = setTimeout(() => setSearching(false), 400);
    return () => clearTimeout(t);
  }, [query]);

  const handleChange = (e) => {
    const next = e.target.value;
    if (isControlled) onChange(next);
    else setInternalValue(next);
  };

  const handleClear = () => {
    if (isControlled) onChange('');
    else setInternalValue('');
  };

  return (
    <div className="search-bar">
      <div className="search-bar-wrap" aria-busy={searching}>
        {searching ? (
          <span className="search-bar-spinner" aria-hidden />
        ) : (
          <span className="search-bar-icon" aria-hidden>
            🔍
          </span>
        )}
        <input
          type="search"
          value={value}
          onChange={handleChange}
          placeholder="Search by tags or description…"
          className="search-bar-input"
          aria-label="Search images"
          autoComplete="off"
        />
        {value && !searching && (
          <button
            type="button"
            className="search-bar-clear"
            onClick={handleClear}
            aria-label="Clear search"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
