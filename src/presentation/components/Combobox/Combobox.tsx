import { useEffect, useMemo, useRef, useState } from 'react';
import styles from './Combobox.module.css';

export interface ComboboxOption {
  value: string;
  label: string;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  allLabel?: string;
}

const MAX_VISIBLE_OPTIONS = 50;

export function Combobox({
  options,
  value,
  onChange,
  placeholder = '入力して検索',
  allLabel = 'すべて',
}: ComboboxProps) {
  const selectedLabel = useMemo(
    () => options.find((o) => o.value === value)?.label ?? '',
    [options, value]
  );

  const [inputText, setInputText] = useState(selectedLabel);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const listRef = useRef<HTMLUListElement>(null);

  // 外部からの値変更（URLパラメータ復元など）を表示に反映
  useEffect(() => {
    setInputText(selectedLabel);
  }, [selectedLabel]);

  const filtered = useMemo(() => {
    const q = inputText.trim().toLowerCase();
    if (!q || q === selectedLabel.toLowerCase()) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, inputText, selectedLabel]);

  const visible = filtered.slice(0, MAX_VISIBLE_OPTIONS);
  const truncatedCount = filtered.length - visible.length;

  const commit = (opt: ComboboxOption | null) => {
    onChange(opt ? opt.value : '');
    setInputText(opt ? opt.label : '');
    setIsOpen(false);
    setHighlightIndex(-1);
  };

  const handleBlurClose = () => {
    const q = inputText.trim();
    if (!q) {
      commit(null);
      return;
    }
    const exact = options.find((o) => o.label === q);
    if (exact) {
      commit(exact);
    } else {
      // 未確定の入力は破棄して現在の選択に戻す
      setInputText(selectedLabel);
      setIsOpen(false);
      setHighlightIndex(-1);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        setHighlightIndex((i) => Math.min(i + 1, visible.length - 1));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (isOpen && highlightIndex >= 0 && highlightIndex < visible.length) {
        commit(visible[highlightIndex]);
      } else {
        handleBlurClose();
      }
    } else if (e.key === 'Escape') {
      setInputText(selectedLabel);
      setIsOpen(false);
      setHighlightIndex(-1);
    }
  };

  return (
    <div className={styles.combobox}>
      <input
        className={styles.input}
        type="text"
        role="combobox"
        aria-expanded={isOpen}
        aria-autocomplete="list"
        placeholder={placeholder}
        value={inputText}
        onChange={(e) => {
          setInputText(e.target.value);
          setIsOpen(true);
          setHighlightIndex(-1);
        }}
        onFocus={() => setIsOpen(true)}
        onClick={() => setIsOpen(true)}
        onBlur={handleBlurClose}
        onKeyDown={handleKeyDown}
      />
      {isOpen && (
        <ul className={styles.dropdown} ref={listRef}>
          <li
            className={`${styles.option} ${value === '' ? styles.optionSelected : ''}`}
            onMouseDown={(e) => {
              e.preventDefault();
              commit(null);
            }}
          >
            {allLabel}
          </li>
          {visible.length === 0 && (
            <li className={styles.noMatch}>該当なし</li>
          )}
          {visible.map((opt, i) => (
            <li
              key={opt.value}
              className={[
                styles.option,
                i === highlightIndex ? styles.optionHighlight : '',
                opt.value === value ? styles.optionSelected : '',
              ].filter(Boolean).join(' ')}
              onMouseDown={(e) => {
                e.preventDefault();
                commit(opt);
              }}
            >
              {opt.label}
            </li>
          ))}
          {truncatedCount > 0 && (
            <li className={styles.noMatch}>他 {truncatedCount} 件（絞り込んでください）</li>
          )}
        </ul>
      )}
    </div>
  );
}
