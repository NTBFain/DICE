'use client';

import { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X, Clock, Check } from 'lucide-react';

interface StudioDatePickerProps {
  value: string; // YYYY-MM-DD or YYYY-MM-DDTHH:mm or ISO string
  onChange: (dateStr: string) => void;
  label?: string;
  placeholder?: string;
  minDate?: string;
  includeTime?: boolean; // If true, allows picking exact Hour:Minute
}

export default function StudioDatePicker({
  value,
  onChange,
  label,
  placeholder = 'Select Date',
  minDate,
  includeTime = false,
}: StudioDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const initialDate = value ? new Date(value) : new Date();
  const [currentMonth, setCurrentMonth] = useState<Date>(initialDate);
  const [selectedHour, setSelectedHour] = useState<number>(() => {
    return value ? new Date(value).getHours() : 12;
  });
  const [selectedMinute, setSelectedMinute] = useState<number>(() => {
    return value ? new Date(value).getMinutes() : 0;
  });

  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedDate = value ? new Date(value) : null;

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const prevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1));
  };

  const formatOutput = (targetYear: number, targetMonth: number, targetDay: number, h: number, m: number) => {
    const formattedMonth = (targetMonth + 1).toString().padStart(2, '0');
    const formattedDay = targetDay.toString().padStart(2, '0');
    const formattedHour = h.toString().padStart(2, '0');
    const formattedMin = m.toString().padStart(2, '0');

    if (includeTime) {
      return `${targetYear}-${formattedMonth}-${formattedDay}T${formattedHour}:${formattedMin}`;
    }
    return `${targetYear}-${formattedMonth}-${formattedDay}`;
  };

  const handleSelectDay = (day: number) => {
    const output = formatOutput(year, month, day, selectedHour, selectedMinute);
    onChange(output);
    if (!includeTime) {
      setIsOpen(false);
    }
  };

  const handleTimeChange = (h: number, m: number) => {
    setSelectedHour(h);
    setSelectedMinute(m);
    if (selectedDate) {
      const output = formatOutput(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
        h,
        m
      );
      onChange(output);
    }
  };

  const handleSetNow = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const d = now.getDate();
    const h = now.getHours();
    const min = now.getMinutes();
    setCurrentMonth(now);
    setSelectedHour(h);
    setSelectedMinute(min);
    const output = formatOutput(y, m, d, h, min);
    onChange(output);
    setIsOpen(false);
  };

  const handleQuickAddDays = (daysToAdd: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysToAdd);
    const y = d.getFullYear();
    const m = d.getMonth();
    const day = d.getDate();
    setCurrentMonth(d);
    const output = formatOutput(y, m, day, selectedHour, selectedMinute);
    onChange(output);
    if (!includeTime) {
      setIsOpen(false);
    }
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      today.getDate() === day &&
      today.getMonth() === month &&
      today.getFullYear() === year
    );
  };

  const isSelected = (day: number) => {
    if (!selectedDate) return false;
    return (
      selectedDate.getDate() === day &&
      selectedDate.getMonth() === month &&
      selectedDate.getFullYear() === year
    );
  };

  const formattedDisplayValue = value
    ? includeTime
      ? `${new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} ${selectedHour.toString().padStart(2, '0')}:${selectedMinute.toString().padStart(2, '0')}`
      : new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '';

  return (
    <div className="relative w-full" ref={popoverRef}>
      {label && (
        <label className="block text-xs font-bold text-neutral-400 mb-1.5 uppercase tracking-wider">
          {label}
        </label>
      )}

      {/* Input Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-neutral-950 border border-neutral-800 hover:border-neutral-700 text-white rounded-xl p-3 text-xs flex items-center justify-between transition-all cursor-pointer shadow-sm min-h-[44px]"
      >
        <div className="flex items-center gap-2.5">
          <CalendarIcon className="w-4 h-4 text-blue-400 shrink-0" />
          <span className={formattedDisplayValue ? 'font-bold text-white font-mono text-xs' : 'text-neutral-500 text-xs'}>
            {formattedDisplayValue || placeholder}
          </span>
        </div>
        {value && (
          <span className="text-[10px] font-bold bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded border border-blue-500/30 font-mono">
            {includeTime ? `${selectedHour.toString().padStart(2, '0')}:${selectedMinute.toString().padStart(2, '0')}` : 'Selected'}
          </span>
        )}
      </button>

      {/* Centered Studio Date & Time Picker Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-3xl p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <span className="text-xs font-bold text-neutral-300 flex items-center gap-1.5 uppercase tracking-wider">
                <CalendarIcon className="w-4 h-4 text-blue-400" /> {label || (includeTime ? 'Select Date & Time' : 'Select Date')}
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 text-neutral-500 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Month Navigation */}
            <div className="flex items-center justify-between bg-neutral-950 p-2 rounded-2xl border border-neutral-800">
              <button
                type="button"
                onClick={prevMonth}
                className="p-2 text-neutral-400 hover:text-white bg-neutral-900 hover:bg-neutral-800 rounded-xl border border-neutral-800 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="text-sm font-extrabold text-white font-mono">
                {MONTH_NAMES[month]} {year}
              </span>

              <button
                type="button"
                onClick={nextMonth}
                className="p-2 text-neutral-400 hover:text-white bg-neutral-900 hover:bg-neutral-800 rounded-xl border border-neutral-800 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              <button
                type="button"
                onClick={handleSetNow}
                className="px-2.5 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 font-extrabold rounded-lg text-[10px] border border-blue-500/40 transition-all cursor-pointer flex items-center gap-1"
              >
                ⚡ Start Now
              </button>
              <button
                type="button"
                onClick={() => handleQuickAddDays(0)}
                className="px-2.5 py-1 bg-neutral-950 hover:bg-neutral-800 text-neutral-300 rounded-lg text-[10px] font-bold border border-neutral-800 transition-all cursor-pointer"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => handleQuickAddDays(1)}
                className="px-2.5 py-1 bg-neutral-950 hover:bg-neutral-800 text-neutral-300 rounded-lg text-[10px] font-bold border border-neutral-800 transition-all cursor-pointer"
              >
                Tomorrow
              </button>
              <button
                type="button"
                onClick={() => handleQuickAddDays(3)}
                className="px-2.5 py-1 bg-neutral-950 hover:bg-neutral-800 text-neutral-300 rounded-lg text-[10px] font-bold border border-neutral-800 transition-all cursor-pointer"
              >
                +3 Days
              </button>
              <button
                type="button"
                onClick={() => handleQuickAddDays(7)}
                className="px-2.5 py-1 bg-neutral-950 hover:bg-neutral-800 text-neutral-300 rounded-lg text-[10px] font-bold border border-neutral-800 transition-all cursor-pointer"
              >
                +1 Wk
              </button>
            </div>

            {/* Weekday Headers */}
            <div className="grid grid-cols-7 text-center text-[11px] font-bold text-neutral-400 py-1">
              {DAYS_OF_WEEK.map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}

              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const active = isSelected(day);
                const today = isToday(day);

                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => handleSelectDay(day)}
                    className={`h-10 w-full rounded-xl flex items-center justify-center text-xs font-bold font-mono transition-all cursor-pointer ${
                      active
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 border border-blue-400'
                        : today
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-neutral-950 hover:bg-neutral-800 text-neutral-200 border border-neutral-800/60'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>

            {/* Exact Time Selector (HH:MM) when includeTime = true */}
            {includeTime && (
              <div className="bg-neutral-950 p-3 rounded-2xl border border-neutral-800 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-400 uppercase tracking-wider">
                  <Clock className="w-3.5 h-3.5 text-blue-400" /> Exact Time (HH : MM)
                </div>
                <div className="flex items-center justify-center gap-3">
                  {/* Hours Selector */}
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-neutral-500 font-bold uppercase">Hour:</span>
                    <select
                      value={selectedHour}
                      onChange={(e) => handleTimeChange(parseInt(e.target.value), selectedMinute)}
                      className="bg-neutral-900 border border-neutral-700 text-white font-mono text-sm rounded-xl px-3 py-1.5 font-bold focus:outline-none cursor-pointer"
                    >
                      {Array.from({ length: 24 }).map((_, h) => (
                        <option key={h} value={h}>
                          {h.toString().padStart(2, '0')} : 00
                        </option>
                      ))}
                    </select>
                  </div>

                  <span className="text-white font-mono font-bold text-base">:</span>

                  {/* Minutes Selector */}
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-neutral-500 font-bold uppercase">Min:</span>
                    <select
                      value={selectedMinute}
                      onChange={(e) => handleTimeChange(selectedHour, parseInt(e.target.value))}
                      className="bg-neutral-900 border border-neutral-700 text-white font-mono text-sm rounded-xl px-3 py-1.5 font-bold focus:outline-none cursor-pointer"
                    >
                      {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => (
                        <option key={m} value={m}>
                          {m.toString().padStart(2, '0')}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Actions */}
            <div className="flex justify-between items-center pt-2 border-t border-neutral-800 text-xs">
              <button
                type="button"
                onClick={() => {
                  onChange('');
                  setIsOpen(false);
                }}
                className="text-neutral-500 hover:text-red-400 font-bold transition-colors cursor-pointer"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-md"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
