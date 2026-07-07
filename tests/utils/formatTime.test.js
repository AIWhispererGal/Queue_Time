import { describe, it, expect } from 'vitest';
import { formatTime } from '../../src/utils/formatTime';

describe('formatTime', () => {
  it('formats zero seconds', () => {
    expect(formatTime(0)).toBe('0:00');
  });

  it('formats seconds under a minute', () => {
    expect(formatTime(45)).toBe('00:45');
  });

  it('formats exactly one minute', () => {
    expect(formatTime(60)).toBe('01:00');
  });

  it('formats minutes and seconds', () => {
    expect(formatTime(125)).toBe('02:05');
  });

  it('pads single digit seconds', () => {
    expect(formatTime(65)).toBe('01:05');
  });

  it('handles large values', () => {
    expect(formatTime(600)).toBe('10:00');
  });
});
