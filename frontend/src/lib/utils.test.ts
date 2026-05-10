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

  it('should handle complex nested arrays and objects', () => {
    expect(
      cn(
        ['class1', ['class2', { class3: true, class4: false }]],
        { class5: true }
      )
    ).toBe('class1 class2 class3 class5');
  });

  it('should properly merge complex tailwind responsive and state modifiers', () => {
    // hover, focus, md, lg etc.
    expect(cn('hover:bg-red-500 hover:text-white', 'hover:bg-blue-500')).toBe('hover:text-white hover:bg-blue-500');
    expect(cn('md:p-4 lg:p-8', 'md:p-6')).toBe('lg:p-8 md:p-6');
    expect(cn('focus:ring-2 focus:ring-red-500', 'focus:ring-blue-500')).toBe('focus:ring-2 focus:ring-blue-500');
  });

  it('should handle custom values and arbitrary tailwind properties', () => {
    expect(cn('w-[10px]', 'w-[20px]')).toBe('w-[20px]');
    expect(cn('bg-[#fff]', 'bg-[#000]')).toBe('bg-[#000]');
    expect(cn('grid-cols-[1fr_auto]', 'grid-cols-[auto_1fr]')).toBe('grid-cols-[auto_1fr]');
  });

  it('should gracefully handle empty or entirely falsy inputs without throwing', () => {
    expect(cn()).toBe('');
    expect(cn('')).toBe('');
    expect(cn(null, undefined, false)).toBe('');
    expect(cn({}, [], [null], { class1: false })).toBe('');
  });

  it('should handle undefined and null inputs gracefully without crashing', () => {
    expect(cn(undefined, null)).toBe('');
  });
});
