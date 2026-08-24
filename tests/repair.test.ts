import { describe, it, expect } from 'vitest';
import { repairJSON } from '../src/repair.js';

describe('repairJSON', () => {
  it('fixes missing quotes', () => {
    const result = repairJSON('{ name: "John" }');
    expect(result.success).toBe(true);
    expect(result.output).toBe('{ "name": "John" }');
    expect(result.repairs).toContain('Added quotes around key: name');
  });

  it('fixes single quotes', () => {
    const result = repairJSON("{ 'name': 'John' }");
    expect(result.success).toBe(true);
    expect(result.output).toBe('{ "name": "John" }');
  });

  it('removes trailing commas', () => {
    const result = repairJSON('{ "name": "John", }');
    expect(result.success).toBe(true);
    expect(result.output).toBe('{ "name": "John" }');
    expect(result.repairs).toContain('Removed trailing comma before }');
  });
  
  it('adds missing braces', () => {
    const result = repairJSON('{ "name": "John"');
    expect(result.success).toBe(true);
    expect(result.output).toBe('{ "name": "John"}');
    expect(result.repairs).toContain('Added missing closing brace');
  });
  
  it('adds missing brackets', () => {
    const result = repairJSON('[1, 2, 3');
    expect(result.success).toBe(true);
    expect(result.output).toBe('[1, 2, 3]');
    expect(result.repairs).toContain('Added missing closing bracket');
  });

  it('adds missing opening brace', () => {
    const result = repairJSON('"name": "John" }');
    expect(result.output).toBe('{"name": "John" }');
    expect(result.repairs).toContain('Added missing opening brace');
  });

  it('adds missing opening bracket', () => {
    const result = repairJSON('1, 2, 3]');
    expect(result.output).toBe('[1, 2, 3]');
    expect(result.repairs).toContain('Added missing opening bracket');
  });
});
