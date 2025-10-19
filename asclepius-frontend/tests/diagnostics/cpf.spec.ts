import { describe, it, expect } from 'vitest';
import { onlyDigits, formatCPFView, validateCPF } from '../../src/utils/cpf';

describe('utils/cpf (diagnóstico)', () => {
  it('onlyDigits', () => {
    expect(onlyDigits('123.456.789-09')).toBe('12345678909');
    expect(onlyDigits('***.***.***-**')).toBe('');
    expect(onlyDigits('52998224725')).toBe('52998224725');
  });

  it('formatCPFView idempotente', () => {
    expect(formatCPFView('12345678909')).toBe('123.456.789-09');
    expect(formatCPFView('123.456.789-09')).toBe('123.456.789-09');
  });

  it('validateCPF válidos conhecidos', () => {
    expect(validateCPF('52998224725')).toBe(true);
    expect(validateCPF('12345678909')).toBe(true);
  });

  it('validateCPF inválidos', () => {
    expect(validateCPF('11111111111')).toBe(false);
    expect(validateCPF('')).toBe(false);
    expect(validateCPF('123')).toBe(false);
  });
});
