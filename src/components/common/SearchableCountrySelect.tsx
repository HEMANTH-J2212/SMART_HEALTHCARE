import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, Globe, X } from 'lucide-react';
import { ALL_COUNTRIES, CountryInfo } from '../../utils/countryData';

interface SearchableCountrySelectProps {
  value: string;
  onChange: (countryName: string, countryInfo?: CountryInfo) => void;
  className?: string;
  disabled?: boolean;
}

export const SearchableCountrySelect: React.FC<SearchableCountrySelectProps> = ({
  value,
  onChange,
  className = '',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Find currently selected country
  const selectedCountry =
    ALL_COUNTRIES.find((c) => c.name.toLowerCase() === (value || '').toLowerCase()) ||
    ALL_COUNTRIES.find((c) => c.name === 'India') ||
    ALL_COUNTRIES[0];

  const filteredCountries = ALL_COUNTRIES.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q);
  });

  // Focus search input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery('');
    }
  }, [isOpen]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 flex items-center justify-between gap-2 shadow-2xs hover:border-amber-400 focus:ring-2 focus:ring-amber-500/20 focus:outline-none transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div className="flex items-center gap-2 truncate">
          <span className="text-base shrink-0">{selectedCountry?.flag || '🌐'}</span>
          <span className="truncate">{selectedCountry?.name || value || 'Select Country'}</span>
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Searchable Dropdown Overlay */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 text-xs">
          
          {/* Search Header */}
          <div className="p-2.5 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search all 195+ countries..."
              className="w-full bg-transparent text-xs font-semibold text-slate-800 placeholder-slate-400 outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Select Popular Badge */}
          <div className="px-2 py-1.5 bg-amber-50/60 border-b border-amber-100 flex items-center gap-1.5 overflow-x-auto text-[10px]">
            <span className="text-amber-800 font-bold shrink-0">Popular:</span>
            {['India', 'United States', 'United Kingdom', 'United Arab Emirates', 'Singapore', 'Canada', 'Australia'].map((cName) => {
              const c = ALL_COUNTRIES.find((x) => x.name === cName);
              if (!c) return null;
              return (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => {
                    onChange(c.name, c);
                    setIsOpen(false);
                  }}
                  className="px-2 py-0.5 bg-white hover:bg-amber-100 text-slate-700 hover:text-amber-900 border border-amber-200 rounded-md font-medium shrink-0 cursor-pointer flex items-center gap-1 transition-colors"
                >
                  <span>{c.flag}</span>
                  <span>{c.name.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>

          {/* Countries List */}
          <div className="max-h-56 overflow-y-auto divide-y divide-slate-50">
            {filteredCountries.length === 0 ? (
              <div className="p-4 text-center text-slate-400">
                <Globe className="w-6 h-6 mx-auto mb-1 opacity-50" />
                <p>No countries found matching "{searchQuery}"</p>
              </div>
            ) : (
              filteredCountries.map((country) => {
                const isSelected = selectedCountry?.code === country.code;
                return (
                  <button
                    key={country.code}
                    type="button"
                    onClick={() => {
                      onChange(country.name, country);
                      setIsOpen(false);
                    }}
                    className={`w-full px-3 py-2 flex items-center justify-between text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-amber-50 text-amber-950 font-bold'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span className="text-base shrink-0">{country.flag}</span>
                      <span className="truncate">{country.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">({country.code})</span>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-amber-600 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer note */}
          <div className="p-2 border-t border-slate-100 bg-slate-50/50 text-[10px] text-slate-400 flex items-center justify-between">
            <span>Showing {filteredCountries.length} countries</span>
            <span>Worldwide Coverage</span>
          </div>
        </div>
      )}
    </div>
  );
};
