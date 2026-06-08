import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

const MAX_HEIGHT = 120;
const MIN_HEIGHT = 44;

const AutoResizeTextarea = forwardRef(({
  value,
  onChange,
  onKeyDown,
  placeholder,
  disabled,
  className = '',
}, ref) => {
  const textareaRef = useRef(null);

  useImperativeHandle(ref, () => ({
    focus: () => {
      const el = textareaRef.current;
      if (!el || el.disabled) return;
      el.focus();
      const end = el.value.length;
      el.setSelectionRange(end, end);
    },
  }), []);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;

    el.style.height = 'auto';

    if (!value) {
      el.style.height = `${MIN_HEIGHT}px`;
      el.style.overflowY = 'hidden';
      return;
    }

    const nextHeight = Math.min(Math.max(el.scrollHeight, MIN_HEIGHT), MAX_HEIGHT);
    el.style.height = `${nextHeight}px`;
    el.style.overflowY = el.scrollHeight > MAX_HEIGHT ? 'auto' : 'hidden';
  }, [value]);

  const focusTextarea = () => {
    if (disabled) return;
    const el = textareaRef.current;
    if (!el) return;
    el.focus();
    const end = el.value.length;
    el.setSelectionRange(end, end);
  };

  const handleContainerMouseDown = (event) => {
    if (disabled) return;
    if (event.target === textareaRef.current) return;
    event.preventDefault();
    focusTextarea();
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      onKeyDown?.(event, { submit: true });
      return;
    }
    onKeyDown?.(event, { submit: false });
  };

  return (
    <div
      role="presentation"
      onMouseDown={handleContainerMouseDown}
      onClick={focusTextarea}
      className={`flex-1 flex items-stretch rounded-xl border bg-white cursor-text transition-colors ${
        disabled
          ? 'border-primary-mauve/10 bg-bg-rose-white/60 cursor-not-allowed'
          : 'border-primary-mauve/15 focus-within:border-primary-mauve'
      } ${className}`}
    >
      <textarea
        ref={textareaRef}
        rows={1}
        value={value}
        onChange={onChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        style={{ maxHeight: MAX_HEIGHT, minHeight: MIN_HEIGHT }}
        className="w-full px-4 py-3 bg-transparent outline-hidden text-xs font-semibold text-text-dark resize-none leading-relaxed border-0 disabled:cursor-not-allowed disabled:text-text-muted"
      />
    </div>
  );
});

AutoResizeTextarea.displayName = 'AutoResizeTextarea';

export default AutoResizeTextarea;
