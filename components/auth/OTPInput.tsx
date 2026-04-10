'use client';

import { useEffect, useRef, type ClipboardEvent, type KeyboardEvent } from 'react';

type OTPInputProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

const OTP_LENGTH = 6;

export function OTPInput({ value, onChange, disabled = false }: OTPInputProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length: OTP_LENGTH }, (_, index) => value[index] ?? '');

  useEffect(() => {
    if (!disabled) {
      refs.current[0]?.focus();
    }
  }, [disabled]);

  const setDigit = (index: number, rawValue: string) => {
    const digit = rawValue.replace(/\D/g, '').slice(-1);
    const nextDigits = [...digits];
    nextDigits[index] = digit;
    const nextValue = nextDigits.join('');
    onChange(nextValue);

    if (digit && index < OTP_LENGTH - 1) {
      refs.current[index + 1]?.focus();
    }
  };

  const onKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }

    if (event.key === 'ArrowLeft' && index > 0) {
      refs.current[index - 1]?.focus();
    }

    if (event.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      refs.current[index + 1]?.focus();
    }
  };

  const onPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);

    if (!pasted) return;

    onChange(pasted);
    const focusIndex = Math.min(pasted.length, OTP_LENGTH - 1);
    refs.current[focusIndex]?.focus();
  };

  return (
    <div className="flex items-center justify-between gap-2">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(element) => {
            refs.current[index] = element;
          }}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          value={digit}
          disabled={disabled}
          onChange={(event) => setDigit(index, event.target.value)}
          onKeyDown={(event) => onKeyDown(index, event)}
          onPaste={onPaste}
          className="h-12 w-10 rounded-lg border border-white/10 bg-white/10 text-center text-lg font-semibold text-white outline-none transition-all duration-300 focus:border-red-400 focus:ring-2 focus:ring-red-500/60 disabled:opacity-60"
          aria-label={`OTP digit ${index + 1}`}
        />
      ))}
    </div>
  );
}
