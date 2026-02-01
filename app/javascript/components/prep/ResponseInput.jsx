import React, { useRef, useEffect } from 'react';

const ResponseInput = ({ question, value, onChange, onBlur }) => {
  const trixRef = useRef(null);
  const trixInitialized = useRef(false);

  // Initialize Trix for long_answer
  useEffect(() => {
    if (question.question_type === 'long_answer' && trixRef.current && !trixInitialized.current) {
      trixInitialized.current = true;

      // Set initial content
      if (value && trixRef.current.editor) {
        trixRef.current.editor.loadHTML(value);
      }

      // Listen for changes
      const handleChange = () => {
        const html = trixRef.current.innerHTML;
        onChange(html);
      };

      const handleBlur = () => {
        const html = trixRef.current.innerHTML;
        onBlur(html);
      };

      trixRef.current.addEventListener('trix-change', handleChange);
      trixRef.current.addEventListener('trix-blur', handleBlur);

      return () => {
        if (trixRef.current) {
          trixRef.current.removeEventListener('trix-change', handleChange);
          trixRef.current.removeEventListener('trix-blur', handleBlur);
        }
      };
    }
  }, [question.question_type]);

  // Update Trix content when value changes externally
  useEffect(() => {
    if (question.question_type === 'long_answer' && trixRef.current?.editor && value !== trixRef.current.innerHTML) {
      // Only update if the value is different to avoid cursor jump
      const currentContent = trixRef.current.innerHTML;
      if (value !== currentContent && !trixRef.current.contains(document.activeElement)) {
        trixRef.current.editor.loadHTML(value || '');
      }
    }
  }, [value, question.question_type]);

  // Short answer - text input
  if (question.question_type === 'short_answer') {
    return (
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => onBlur(e.target.value)}
        placeholder="Type your answer..."
        className="w-full px-4 py-3 rounded-lg text-sm focus:outline-none transition"
        style={{
          border: '1px solid rgba(199, 199, 204, 0.4)',
          fontFamily: "'Inter', sans-serif",
          fontWeight: 400,
          background: '#F9F9FB',
        }}
      />
    );
  }

  // Long answer - Trix editor
  if (question.question_type === 'long_answer') {
    const inputId = `trix-input-${question.id}`;
    return (
      <div className="trix-wrapper">
        <input id={inputId} type="hidden" value={value} />
        <trix-editor
          ref={trixRef}
          input={inputId}
          className="trix-content min-h-[150px] rounded-lg"
          style={{
            border: '1px solid rgba(199, 199, 204, 0.4)',
            background: '#F9F9FB',
          }}
        ></trix-editor>
      </div>
    );
  }

  // Checkbox - toggle
  if (question.question_type === 'checkbox') {
    return (
      <div
        onClick={() => onChange({ checked: !value })}
        className="flex items-center gap-3 cursor-pointer select-none"
      >
        <div
          className="relative w-12 h-7 rounded-full transition-colors duration-200"
          style={{ backgroundColor: value ? '#34C759' : '#E5E5E7' }}
        >
          <div
            className="absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200"
            style={{ transform: value ? 'translateX(22px)' : 'translateX(4px)' }}
          />
        </div>
        <span style={{ color: '#1D1D1F', fontWeight: 400 }}>
          {value ? 'Yes' : 'No'}
        </span>
      </div>
    );
  }

  // Multiple choice
  if (question.question_type === 'multiple_choice') {
    const options = question.options || [];
    const selectedIndices = Array.isArray(value) ? value : [];

    const handleOptionClick = (index) => {
      if (question.allow_multiple) {
        // Multi-select
        const newSelected = selectedIndices.includes(index)
          ? selectedIndices.filter(i => i !== index)
          : [...selectedIndices, index];
        onChange({ selected: newSelected });
      } else {
        // Single select
        onChange({ selected: [index] });
      }
    };

    return (
      <div className="space-y-2">
        {options.map((option, index) => {
          const isSelected = selectedIndices.includes(index);
          return (
            <button
              key={index}
              type="button"
              onClick={() => handleOptionClick(index)}
              className="w-full text-left px-4 py-3 rounded-lg transition flex items-center gap-3"
              style={{
                background: isSelected ? '#E8F5E9' : '#F9F9FB',
                border: isSelected ? '2px solid #34C759' : '1px solid rgba(199, 199, 204, 0.4)',
              }}
            >
              <div
                className={`w-5 h-5 rounded-${question.allow_multiple ? 'md' : 'full'} border-2 flex items-center justify-center transition`}
                style={{
                  borderColor: isSelected ? '#34C759' : '#C7C7CC',
                  backgroundColor: isSelected ? '#34C759' : 'transparent',
                }}
              >
                {isSelected && (
                  <i className="fa-solid fa-check text-white text-xs"></i>
                )}
              </div>
              <span style={{ color: '#1D1D1F', fontWeight: 400 }}>{option}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return null;
};

export default ResponseInput;
