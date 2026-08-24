import { describe, it, expect } from 'vitest';
import { validate, validateWithRepair, z } from '../src/index.js';

describe('validate', () => {
  it('validates a simple object', () => {
    const schema = z.object({ name: z.string() });
    const result = validate(schema, { name: 'John' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ name: 'John' });
    }
  });

  it('returns errors for invalid types', () => {
    const schema = z.object({ age: z.number() });
    const result = validate(schema, { age: 'thirty' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors[0].message).toContain('Expected number, got string');
    }
  });

  it('validates nested objects', () => {
    const schema = z.object({
      user: z.object({
        profile: z.object({
          bio: z.string().max(500)
        })
      })
    });
    
    const validResult = validate(schema, { user: { profile: { bio: 'Hello' } } });
    expect(validResult.success).toBe(true);
    
    const invalidResult = validate(schema, { user: { profile: { bio: 'A'.repeat(501) } } });
    expect(invalidResult.success).toBe(false);
  });

  it('validates arrays', () => {
    const schema = z.array(z.number());
    const valid = validate(schema, [1, 2, 3]);
    expect(valid.success).toBe(true);
    
    const invalid = validate(schema, [1, '2', 3]);
    expect(invalid.success).toBe(false);
  });

  it('validates optional and nullable fields', () => {
    const schema = z.object({
      notes: z.optional(z.string()),
      id: z.nullable(z.number())
    });
    
    const valid1 = validate(schema, { id: null });
    expect(valid1.success).toBe(true);
    
    const valid2 = validate(schema, { notes: 'hello', id: 1 });
    expect(valid2.success).toBe(true);
    
    const invalid1 = validate(schema, { notes: 123, id: null });
    expect(invalid1.success).toBe(false);
  });

  it('validates string constraints (email, url, uuid)', () => {
    const schema = z.object({
      email: z.string().email(),
      url: z.string().url(),
      id: z.string().uuid()
    });
    
    const valid = validate(schema, {
      email: 'test@example.com',
      url: 'https://example.com',
      id: '123e4567-e89b-12d3-a456-426614174000'
    });
    expect(valid.success).toBe(true);
    
    const invalid = validate(schema, {
      email: 'test',
      url: 'example',
      id: '123'
    });
    expect(invalid.success).toBe(false);
  });

  it('validates min and max constraints', () => {
    const schema = z.object({ s: z.string().min(2).max(5), n: z.number().min(5).max(10) });
    expect(validate(schema, { s: 'a', n: 7 }).success).toBe(false);
    expect(validate(schema, { s: 'abc', n: 7 }).success).toBe(true);
    expect(validate(schema, { s: 'abcdef', n: 7 }).success).toBe(false);
    expect(validate(schema, { s: 'abc', n: 4 }).success).toBe(false);
    expect(validate(schema, { s: 'abc', n: 11 }).success).toBe(false);
  });

  it('validates enums', () => {
    const schema = z.object({ val: z.enum(['a', 'b']) });
    const valid = validate(schema, { val: 'a' });
    expect(valid.success).toBe(true);
    
    const invalid = validate(schema, { val: 'c' });
    expect(invalid.success).toBe(false);
  });
  
  it('handles completely invalid json strings', () => {
    const schema = z.object({ name: z.string() });
    const result = validate(schema, 'not a json');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors[0].message).toContain('Invalid JSON structure');
    }
  });
  
  it('handles empty response strings', () => {
    const schema = z.object({ name: z.string() });
    const result = validate(schema, '');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors[0].message).toContain('Empty response');
    }
  });

  it('validates undefined input against optional', () => {
    const schema = z.optional(z.string());
    const valid = validate(schema, undefined);
    expect(valid.success).toBe(true);
    
    const requiredSchema = z.string();
    const invalid = validate(requiredSchema, undefined);
    expect(invalid.success).toBe(false);
  });

  it('validates primitive types', () => {
    const schema = z.object({ b: z.boolean(), n: z.number() });
    expect(validate(schema, { b: true, n: 1 }).success).toBe(true);
    expect(validate(schema, { b: 1, n: 1 }).success).toBe(false);
    expect(validate(schema, { b: true, n: '1' }).success).toBe(false);
  });

  it('validates object types strictly', () => {
    const schema = z.object({ a: z.string() });
    expect(validate(schema, 123).success).toBe(false);
    expect(validate(schema, []).success).toBe(false);
  });

  it('validates array types strictly', () => {
    const schema = z.array(z.string());
    expect(validate(schema, 123).success).toBe(false);
    expect(validate(schema, {}).success).toBe(false);
  });
});

describe('validateWithRepair', () => {
  it('repairs and validates', () => {
    const userSchema = z.object({ name: z.string(), age: z.number() });
    const response = 'Here is the user: { name: "John", age: 30, }';
    const result = validateWithRepair(userSchema, response, {
      extractFromText: true,
      fixTrailingCommas: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.repairs).toContain('Extracted JSON from text');
      expect(result.data).toEqual({ name: 'John', age: 30 });
    }
  });
  
  it('returns valid even without repair needed', () => {
    const schema = z.object({ name: z.string() });
    const result = validateWithRepair(schema, '{"name": "John"}', {});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ name: 'John' });
      expect(result.repairs).toBeUndefined();
    }
  });

  it('handles invalid json that fails repair', () => {
    const schema = z.object({ name: z.string() });
    const result = validateWithRepair(schema, 'not valid text', { fixMissingBrackets: true });
    expect(result.success).toBe(false);
  });

  it('fixes missing brackets when option is passed', () => {
    const schema = z.array(z.number());
    const result = validateWithRepair(schema, '1, 2, 3]', { fixMissingBrackets: true });
    expect(result.success).toBe(true);
  });
  
  it('does not repair when input is not string', () => {
    const schema = z.object({ name: z.string() });
    const result = validateWithRepair(schema, { name: 'John' }, { fixMissingBrackets: true });
    expect(result.success).toBe(true);
  });
});
