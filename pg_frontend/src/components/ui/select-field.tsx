"use client";

import { useEffect, useRef, useState } from "react";

type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type SelectFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
};

export function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  required = false,
  searchable = false,
  searchPlaceholder = "Search...",
}: SelectFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedOption = options.find((option) => option.value === value);

  const filteredOptions = searchable
    ? options.filter((option) => {
        const query = searchQuery.toLowerCase();
        return option.label.toLowerCase().includes(query) || option.value.toLowerCase().includes(query);
      })
    : options;

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchQuery("");
    setHighlightedIndex(-1);
  };

  const openAndHighlightCurrent = () => {
    setIsOpen(true);
    const selectedIndex = filteredOptions.findIndex((option) => option.value === value && !option.disabled);
    setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);
  };

  const handleArrowNavigation = (direction: 1 | -1) => {
    if (!filteredOptions.length) {
      return;
    }

    if (!isOpen) {
      openAndHighlightCurrent();
      return;
    }

    const nextIndex = Math.min(
      Math.max((highlightedIndex < 0 ? 0 : highlightedIndex) + direction, 0),
      filteredOptions.length - 1
    );
    setHighlightedIndex(nextIndex);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      handleArrowNavigation(1);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      handleArrowNavigation(-1);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();

      if (!isOpen) {
        openAndHighlightCurrent();
        return;
      }

      if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
        const target = filteredOptions[highlightedIndex];
        if (!target.disabled) {
          handleSelect(target.value);
        }
      }
      return;
    }

    if (event.key === "Escape") {
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  useEffect(() => {
    if (!isOpen || highlightedIndex < 0) {
      return;
    }

    const target = optionRefs.current[highlightedIndex];
    target?.scrollIntoView({ block: "nearest" });
  }, [isOpen, highlightedIndex, filteredOptions, value]);

  return (
    <div className="grid gap-2 relative">
      <span className="text-sm font-semibold text-[var(--color-text-secondary)]">{label}</span>

      <input
        value={value}
        onChange={() => undefined}
        required={required}
        tabIndex={-1}
        className="pointer-events-none absolute h-0 w-0 opacity-0"
        aria-hidden="true"
      />

      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            if (isOpen) {
              setIsOpen(false);
              setHighlightedIndex(-1);
              setSearchQuery("");
            } else {
              openAndHighlightCurrent();
            }
          }}
          onKeyDown={handleKeyDown}
          className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-sky)] focus:ring-2 focus:ring-[var(--color-sky-soft)] flex items-center justify-between cursor-pointer hover:border-[var(--color-sky)] disabled:cursor-not-allowed disabled:opacity-70"
        >
          <span className={selectedOption ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-muted)]"}>
            {selectedOption?.label || placeholder || "Select an option"}
          </span>
          <svg
            className={`h-4 w-4 transition ${isOpen ? "rotate-180" : ""}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>

        {isOpen ? (
          <div className="absolute top-full left-0 right-0 mt-2 z-50 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg overflow-hidden">
            {searchable ? (
              <div className="border-b border-[var(--color-border)] p-2">
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-sky)] focus:ring-2 focus:ring-[var(--color-sky-soft)]"
                  autoFocus
                />
              </div>
            ) : null}

            <div className="max-h-64 overflow-y-auto">
              {filteredOptions.length === 0 ? (
                <div className="px-4 py-3 text-sm text-[var(--color-text-muted)] text-center">No options found</div>
              ) : (
                filteredOptions.map((option) => (
                  <button
                    key={option.value}
                    ref={(element) => {
                      optionRefs.current[filteredOptions.indexOf(option)] = element;
                    }}
                    type="button"
                    disabled={option.disabled}
                    onClick={() => {
                      if (!option.disabled) {
                        handleSelect(option.value);
                      }
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition ${
                      option.value === value || filteredOptions[highlightedIndex]?.value === option.value
                        ? "bg-[var(--color-sky-soft)] text-[var(--color-sky-strong)] font-semibold"
                        : "text-[var(--color-text-primary)] hover:bg-[var(--color-surface-muted)]"
                    } ${option.disabled ? "cursor-not-allowed opacity-60" : ""}`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{option.label}</span>
                      {option.value === value ? (
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                        </svg>
                      ) : null}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        ) : null}
      </div>

      {isOpen ? <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} /> : null}
    </div>
  );
}
