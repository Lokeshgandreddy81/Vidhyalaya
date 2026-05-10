import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn function', () => {
  it('should merge basic class names correctly', () => {
    expect(cn('class1', 'class2')).toBe('class1 class2');
  });

  it('should handle conditional classes using objects', () => {
    expect(cn('class1', { 'class2': true, 'class3': false })).toBe('class1 class2');
  });

  it('should handle arrays of classes', () => {
    expect(cn(['class1', 'class2'], 'class3')).toBe('class1 class2 class3');
  });

  it('should ignore falsy values (null, undefined, false, 0, empty string)', () => {
    expect(cn('class1', null, undefined, false, 0, '', 'class2')).toBe('class1 class2');
  });

  it('should properly merge and resolve tailwind class conflicts', () => {
    // twMerge should prioritize the latter class for conflicting Tailwind properties
    expect(cn('p-4 m-2', 'p-8')).toBe('m-2 p-8');
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
    expect(cn('bg-white opacity-50', 'bg-black')).toBe('opacity-50 bg-black');
  });

  it('should combine clsx conditional logic and twMerge conflict resolution', () => {
    expect(
      cn('p-4 text-black', { 'p-8 text-white': true }, ['m-2', null, 'm-4'])
    ).toBe('p-8 text-white m-4');
  });

  it('should handle deeply nested arrays', () => {
    expect(cn(['class1', ['class2', ['class3', 'class4']]])).toBe('class1 class2 class3 class4');
  });

  it('should handle empty inputs gracefully', () => {
    expect(cn()).toBe('');
    expect(cn('')).toBe('');
    expect(cn([])).toBe('');
    expect(cn({})).toBe('');
  });

  it('should handle extra whitespace gracefully', () => {
    expect(cn('  class1   ', '   class2 ')).toBe('class1 class2');
  });

  it('should handle complex conditional combinations with undefined/null', () => {
    const isTrue = true;
    const isFalse = false;
    expect(
      cn(
        'base-class',
        isTrue && 'true-class',
        isFalse && 'false-class',
        undefined,
        null,
        ['array-class', isTrue ? 'ternary-true' : 'ternary-false']
      )
    ).toBe('base-class true-class array-class ternary-true');
  });
});
