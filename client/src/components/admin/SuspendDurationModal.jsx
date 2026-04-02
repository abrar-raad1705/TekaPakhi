import { useState, useEffect, useRef, Fragment } from "react";
import { Dialog, DialogPanel, DialogTitle, Menu, MenuButton, MenuItem, MenuItems, Transition } from "@headlessui/react";
import { EllipsisVerticalIcon, ChevronLeftIcon, AdjustmentsHorizontalIcon, ListBulletIcon } from "@heroicons/react/24/outline";

/* ───── Constants ───── */
const ITEM_H = 40; 

const PRESETS = [
  { label: "1 day", days: 1 },
  { label: "2 days", days: 2 },
  { label: "3 days", days: 3 },
  { label: "1 week", days: 7 },
  { label: "2 weeks", days: 14 },
  { label: "1 month", days: 30 },
  { label: "2 months", days: 60 },
  { label: "3 months", days: 90 },
];

/* ───── Helpers ───── */
function computeTimestamp(days) {
  return new Date(Date.now() + days * 86400000).toISOString();
}

function computeCustomTimestamp(d, h, m) {
  const ms = (Number(d) * 86400 + Number(h) * 3600 + Number(m) * 60) * 1000;
  if (ms <= 0) return null;
  return new Date(Date.now() + ms).toISOString();
}

/**
 * 100% Controlled Wheel. It explicitly prevents scrolling too fast.
 * It strictly changes exactly ONE item at a time with a cooldown.
 */
function PresetWheel({ selectedIndex, onChange }) {
  const containerRef = useRef(null);
  const isCooldown = useRef(false);
  const touchStartY = useRef(null);

  const move = (direction) => {
    if (isCooldown.current) return;
    const nextIdx = Math.max(0, Math.min(PRESETS.length - 1, selectedIndex + direction));
    
    if (nextIdx !== selectedIndex) {
      onChange(nextIdx);
      isCooldown.current = true;
      setTimeout(() => { isCooldown.current = false; }, 150); // cooldown speed limit
    }
  };

  const handleWheel = (e) => {
    e.preventDefault();
    if (Math.abs(e.deltaY) < 10) return; // ignore tiny scrolls
    move(e.deltaY > 0 ? 1 : -1);
  };

  const handleTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e) => {
    if (touchStartY.current === null) return;
    e.preventDefault(); // prevent native scroll
    const deltaY = e.touches[0].clientY - touchStartY.current;
    
    // threshold of 30px to trigger move
    if (Math.abs(deltaY) > 30) {
      move(deltaY < 0 ? 1 : -1); // dragging up means scrolling down the list
      touchStartY.current = e.touches[0].clientY; // reset baseline
    }
  };

  return (
    <div 
      className="relative w-full h-[160px] overflow-hidden select-none bg-gray-50/50 rounded-xl mx-auto"
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      ref={containerRef}
      style={{ touchAction: 'none' }} // Ensure no native scroll conflicts
    >
      {/* Selection lines */}
      <div 
        className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[40px] bg-white border-y border-blue-200 z-10 pointer-events-none transition-all duration-300 shadow-sm"
      />
      
      {/* Top/Bottom Fade Masks */}
      <div className="absolute inset-x-0 top-0 h-[60px] bg-gradient-to-b from-white via-white/80 to-transparent z-20 pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-[60px] bg-gradient-to-t from-white via-white/80 to-transparent z-20 pointer-events-none" />

      {/* Track */}
      <div
        className="flex flex-col w-full absolute pt-[60px] pb-[60px] transition-transform duration-200 ease-out z-30"
        style={{ transform: `translateY(-${selectedIndex * ITEM_H}px)` }}
      >
        {PRESETS.map((p, i) => (
          <div
            key={i}
            onClick={() => onChange(i)}
            className={`h-[40px] flex items-center justify-center cursor-pointer transition-all duration-200 ${
              selectedIndex === i ? "text-blue-600 font-bold text-[16px]" : "text-gray-400 font-medium text-[14px]"
            }`}
          >
            {p.label}
          </div>
        ))}
      </div>
    </div>
  );
}

const InputField = ({ label, value, onChange, max }) => {
  const handleChange = (e) => {
    let val = e.target.value;
    if (val === "") { onChange(""); return; }
    if (val.length > 1 && val.startsWith("0")) {
      val = val.replace(/^0+/, "");
      if (val === "") val = "0";
    }
    const numericVal = parseInt(val, 10);
    if (!isNaN(numericVal)) {
      onChange((max && numericVal > max) ? max.toString() : numericVal.toString());
    }
  };

  const handleBlur = () => {
    if (value === "") onChange("0");
  };

  return (
    <div className="flex-1 flex flex-col items-center gap-1 focus-within:text-blue-600 transition-colors">
      <input
        type="number"
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        className="w-full text-center text-3xl font-bold bg-transparent border-b-[2px] border-gray-200 focus:border-blue-600 transition-colors py-1 outline-none text-gray-900 tabular-nums"
      />
      <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">{label}</span>
    </div>
  );
};

export default function SuspendDurationModal({ isOpen, userName, onConfirm, onCancel }) {
  const [mode, setMode] = useState("preset");
  const [selectedIdx, setSelectedIdx] = useState(2); // default 3 days
  
  const [customDays, setCustomDays] = useState("0");
  const [customHours, setCustomHours] = useState("8");
  const [customMinutes, setCustomMinutes] = useState("0");

  useEffect(() => {
    if (isOpen) {
      setMode("preset");
      setSelectedIdx(2);
      setCustomDays("0");
      setCustomHours("8");
      setCustomMinutes("0");
    }
  }, [isOpen]);

  const handleConfirm = () => {
    let ts;
    if (mode === "preset") {
      ts = computeTimestamp(PRESETS[selectedIdx].days);
    } else {
      const d = customDays === "" ? 0 : customDays;
      const h = customHours === "" ? 0 : customHours;
      const m = customMinutes === "" ? 0 : customMinutes;
      ts = computeCustomTimestamp(d, h, m);
    }
    if (ts) onConfirm(ts);
  };

  const isInvalid = mode === "custom" && (!customDays || customDays === "0") && (!customHours || customHours === "0") && (!customMinutes || customMinutes === "0");

  return (
    <Dialog open={isOpen} onClose={onCancel} className="relative z-50">
      <Transition
        show={isOpen}
        as={Fragment}
        enter="ease-out duration-200"
        enterFrom="opacity-0"
        enterTo="opacity-100"
        leave="ease-in duration-150"
        leaveFrom="opacity-100"
        leaveTo="opacity-0"
      >
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm" aria-hidden="true" />
      </Transition>

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Transition
          show={isOpen}
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0 scale-95"
          enterTo="opacity-100 scale-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100 scale-100"
          leaveTo="opacity-0 scale-95"
        >
          <DialogPanel className="w-full max-w-[320px] overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-gray-200">
            {/* Header */}
            <div className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {mode === "custom" && (
                  <button 
                    onClick={() => setMode("preset")}
                    className="p-1 -ml-1 rounded-full hover:bg-gray-100 text-gray-400 transition-colors"
                  >
                    <ChevronLeftIcon className="h-5 w-5" strokeWidth={2.5} />
                  </button>
                )}
                <DialogTitle className="text-[17px] font-bold text-gray-900 leading-none">
                  {mode === "custom" ? "Custom Duration" : `Suspend ${userName ? userName : "User"}`}
                </DialogTitle>
              </div>

              <Menu as="div" className="relative">
                <MenuButton className="p-1 -mr-1 rounded-full hover:bg-gray-100 text-gray-500 transition-colors focus:outline-none">
                  <EllipsisVerticalIcon className="h-5 w-5" strokeWidth={2.5} />
                </MenuButton>
                <Transition
                  as={Fragment}
                  enter="transition ease-out duration-100"
                  enterFrom="transform opacity-0 scale-95"
                  enterTo="transform opacity-100 scale-100"
                  leave="transition ease-in duration-75"
                  leaveFrom="transform opacity-100 scale-100"
                  leaveTo="transform opacity-0 scale-95"
                >
                  <MenuItems className="absolute right-0 mt-1 w-32 origin-top-right rounded-lg bg-white p-1 shadow-lg ring-1 ring-black/5 focus:outline-none z-50">
                    <MenuItem>
                      {({ active }) => (
                        <button
                          onClick={() => setMode(mode === "preset" ? "custom" : "preset")}
                          className={`${
                            active ? "bg-gray-50 text-blue-600" : "text-gray-700"
                          } group flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] font-bold transition-all`}
                        >
                          {mode === "preset" ? (
                            <AdjustmentsHorizontalIcon className="h-3.5 w-3.5" strokeWidth={2.5} />
                          ) : (
                            <ListBulletIcon className="h-3.5 w-3.5" strokeWidth={2.5} />
                          )}
                          {mode === "preset" ? "Custom" : "Presets"}
                        </button>
                      )}
                    </MenuItem>
                  </MenuItems>
                </Transition>
              </Menu>
            </div>

            {/* Content Area */}
            <div className="px-5 pt-1 pb-4">
              {mode === "preset" ? (
                <PresetWheel selectedIndex={selectedIdx} onChange={setSelectedIdx} />
              ) : (
                <div className="flex gap-3 px-3 py-6 bg-gray-50/70 rounded-xl border border-gray-100">
                  <InputField label="Days" value={customDays} onChange={setCustomDays} max={365} />
                  <InputField label="Hours" value={customHours} onChange={setCustomHours} max={23} />
                  <InputField label="Mins" value={customMinutes} onChange={setCustomMinutes} max={59} />
                </div>
              )}
            </div>

            {/* Minimal Right-Aligned Footer */}
            <div className="px-5 pb-4 flex justify-end gap-2 pointer-events-auto">
              <button
                onClick={onCancel}
                className="px-4 py-2 text-[14px] font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={isInvalid}
                className="px-4 py-2 text-[14px] font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-all disabled:text-gray-300 disabled:pointer-events-none"
              >
                Confirm
              </button>
            </div>
          </DialogPanel>
        </Transition>
      </div>
    </Dialog>
  );
}
