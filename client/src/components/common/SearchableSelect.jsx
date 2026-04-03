import { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDownIcon, ExclamationCircleIcon } from "@heroicons/react/24/outline";

export default function SearchableSelect({
  value, // String if single, Array if multiple
  onChange,
  options, // Array of strings or { label, value }
  placeholder = "Select an option",
  searchPlaceholder = "Type to search...",
  disabled = false,
  error = false,
  className = "",
  size = "large", // "large" | "small"
  multiple = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    } else {
      setSearch("");
    }
  }, [isOpen]);

  const normalizedOptions = useMemo(() => {
    return options.map((opt) =>
      typeof opt === "string" ? { label: opt, value: opt } : opt
    );
  }, [options]);

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return normalizedOptions;
    return normalizedOptions.filter((opt) =>
      opt.label.toLowerCase().includes(search.toLowerCase().trim())
    );
  }, [normalizedOptions, search]);

  // Handle array/string selection text
  let displayText;
  if (multiple) {
    const selectedLabels = normalizedOptions
      .filter((opt) => (value || []).includes(opt.value))
      .map((opt) => opt.label);
    displayText = selectedLabels.length ? selectedLabels.join(", ") : placeholder;
  } else {
    const selectedOption = normalizedOptions.find((opt) => opt.value === value);
    displayText = selectedOption ? selectedOption.label : placeholder;
  }

  const handleOptionClick = (optValue) => {
    if (multiple) {
      const current = Array.isArray(value) ? value : [];
      if (current.includes(optValue)) {
        onChange(current.filter((v) => v !== optValue));
      } else {
        onChange([...current, optValue]);
      }
    } else {
      onChange(optValue);
      setIsOpen(false);
    }
  };

  const baseSizeClasses = size === "large" 
    ? "rounded-xl border-2 py-4 pl-4 pr-11 text-[15px]" 
    : "rounded-lg border py-2 pl-3 pr-9 text-sm";

  return (
    <div className={`relative w-full ${className}`} ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((v) => !v)}
        className={`relative w-full text-left font-medium transition-all focus:outline-none ${baseSizeClasses} ${
          disabled ? "opacity-50 cursor-not-allowed bg-gray-50 text-gray-400" : "cursor-pointer bg-white"
        } ${
          error
            ? "border-[#CD1C1C] text-gray-900"
            : isOpen
            ? "border-primary-500 text-gray-900 ring-2 ring-primary-500/10"
            : "border-gray-200 text-gray-900 hover:border-gray-300"
        }`}
      >
        <span className={(!multiple && !value) || (multiple && (!value || value.length === 0)) ? "text-gray-400 block truncate" : "block truncate"}>
          {displayText}
        </span>
        
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {error && <ExclamationCircleIcon className="h-5 w-5 text-[#CD1C1C]" />}
          <ChevronDownIcon
            className={`h-5 w-5 transition-transform duration-200 ${
              error ? "text-[#CD1C1C]" : "text-gray-500"
            } ${isOpen ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {isOpen && !disabled && (
        <div className="absolute z-20 mt-2 w-full rounded-xl border border-gray-200 bg-white shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-2 border-b border-gray-100">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/10"
            />
          </div>
          <div className="max-h-60 overflow-y-auto p-1.5 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-4 text-center text-sm text-gray-500">
                No options found
              </div>
            ) : (
              filteredOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  disabled={opt.disabled}
                  onClick={() => handleOptionClick(opt.value)}
                  className={`w-full flex items-center gap-2 text-left rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    opt.disabled
                      ? "text-gray-300 bg-gray-50 cursor-not-allowed"
                      : (!multiple && value === opt.value)
                      ? "bg-primary-600 text-white"
                      : "text-gray-700 hover:bg-primary-50 hover:text-primary-700"
                  }`}
                >
                  {multiple && (
                    <input
                      type="checkbox"
                      disabled={opt.disabled}
                      checked={(value || []).includes(opt.value)}
                      readOnly
                      className={`rounded pointer-events-none ${
                        opt.disabled ? "border-gray-200 text-gray-300" : "border-gray-300 text-primary-600"
                      }`}
                    />
                  )}
                  <span className="truncate">
                    {opt.label} {opt.disabled ? "(Assigned)" : ""}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
