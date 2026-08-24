import { describe, it, expect } from 'vitest';
import { extractJSON } from '../src/extract.js';

describe('extractJSON', () => {
  it('extracts JSON from markdown blocks', () => {
    const response = '```json\n{"name": "John"}\n```';
    const result = extractJSON(response);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ name: 'John' });
    }
  });

  it('extracts JSON from surrounding text', () => {
    const response = 'Here is the data: {"name": "John"} Hope this helps!';
    const result = extractJSON(response);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ name: 'John' });
    }
  });

  it('extracts and repairs if necessary', () => {
    const response = 'Here is the data: { name: "John", } Hope this helps!';
    const result = extractJSON(response);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ name: 'John' });
    }
  });

  it('fails gracefully when no JSON is found', () => {
    const response = 'I am sorry, I cannot fulfill your request.';
    const result = extractJSON(response);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors).toContain('No valid JSON found in response');
    }
  });
  
  it('extracts arrays', () => {
    const response = 'List of ids: [1, 2, 3] enjoy!';
    const result = extractJSON(response);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual([1, 2, 3]);
    }
  });

  it('fails gracefully on invalid JSON matching structures', () => {
    const response = 'Here is the data: { "name": "John", unquoted } Hope this helps!';
    const result = extractJSON(response);
    expect(result.success).toBe(false);
  });
  
  it('fails gracefully on invalid markdown block', () => {
    const response = '```json\n{ invalid }\n```';
    const result = extractJSON(response);
    expect(result.success).toBe(false);
  });
});
