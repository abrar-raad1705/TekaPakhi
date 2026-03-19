import { useState, useRef } from "react";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";

export default function PinInput({
  length = 5,
  onComplete,
  onChange,
  label = "Enter PIN",
  error = false,
}) {
  const [value, setValue] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef(null);

  const handleChange = (e) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, length);
    setValue(val);
    onChange?.(val);

    if (val.length === length) {
      onComplete?.(val);
    }
  };

  const handleClick = () => {
    inputRef.current?.focus();
  };

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-bold text-[#1F2937] px-0.5">
          {label}
        </label>
      )}

      <div
        className={`relative flex items-center h-14 w-full rounded-xl border-2 transition-all cursor-text
          ${
            error
              ? "border-[#CD1C1C] bg-white"
              : isFocused
                ? "border-primary-500 "
                : "border-gray-200 bg-white hover:border-gray-300"
          }`}
        onClick={handleClick}
      >
        {/* Hidden Input - No placeholder here */}
        <input
          ref={inputRef}
          type="tel"
          inputMode="numeric"
          maxLength={length}
          value={value}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className="absolute inset-0 opacity-0 cursor-text z-20"
        />

        {/* Visual Layer */}
        <div className="flex items-center gap-3.5 px-5 pointer-events-none w-full relative z-10">
          {!value && !isFocused ? (
            <span className="text-[15px] font-medium text-gray-400 tracking-wide">
              Enter {length}-digit PIN
            </span>
          ) : (
            Array.from({ length }).map((_, i) => {
              const itemIsFocused = i === value.length && isFocused;
              const hasValue = i < value.length;

              return (
                <div
                  key={i}
                  className="relative flex items-center justify-center w-3 h-3"
                >
                  {/* Cursor */}
                  {itemIsFocused && (
                    <div className="absolute h-6 w-[1.5px] bg-[#1F2937] animate-pulse -left-[2px]" />
                  )}

                  {/* Digit or Dot */}
                  {hasValue ? (
                    showPin ? (
                      <span className="text-base font-black text-[#111827] absolute -top-[1px]">
                        {value[i]}
                      </span>
                    ) : (
                      <div className="h-2 w-2 rounded-full bg-[#111827] transition-all duration-200" />
                    )
                  ) : (
                    <div className="h-2 w-2 rounded-full bg-gray-200" />
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Eye Toggle */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowPin(!showPin);
          }}
          className="relative z-30 mr-3 ml-auto rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 focus:outline-none"
          title={showPin ? "Hide PIN" : "Show PIN"}
        >
          {showPin ? (
            <EyeSlashIcon className="h-5 w-5" />
          ) : (
            <EyeIcon className="h-5 w-5" />
          )}
        </button>
      </div>
    </div>
  );
}
