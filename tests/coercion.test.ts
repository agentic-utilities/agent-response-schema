import { describe, it, expect } from 'vitest';
import { validateWithRepair, z } from '../src/index.js';

describe('Type Coercion', () => {
  const schema = z.object({
    num: z.number(),
    bool: z.boolean(),
    str: z.string(),
    action: z.enum(['replace_lines', 'search_file'])
  });

  it('should not coerce by default', () => {
    const input = { num: "42", bool: "true", str: 100, action: "REPLACE_LINES", extra: true };
    const result = validateWithRepair(schema, JSON.stringify(input));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.length).toBeGreaterThan(0);
    }
  });

  it('should coerce types when coerceTypes is true', () => {
    const input = { num: "42", bool: "TRUE", str: 100, action: "REPLACE_LINES", extra: true };
    const result = validateWithRepair(schema, JSON.stringify(input), { coerceTypes: true });
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.num).toBe(42);
      expect(result.data.bool).toBe(true);
      expect(result.data.str).toBe("100");
      expect(result.data.action).toBe("replace_lines");
      expect((result.data as any).extra).toBeUndefined(); // Should be stripped
      expect(result.repairs).toContain('Coerced types to match schema');
    }
  });

  it('should strip extraneous fields during rebuild', () => {
    const input = { num: 42, bool: true, str: "100", action: "replace_lines", malicious: "code" };
    // Even if types match, coerceTypes will trigger a rebuild and strip fields
    const result = validateWithRepair(schema, JSON.stringify(input), { coerceTypes: true });
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as any).malicious).toBeUndefined();
    }
  });
  
  it('should gracefully fail if coercion is impossible', () => {
    const input = { num: "not a number", bool: "not a bool", str: {}, action: "unknown" };
    const result = validateWithRepair(schema, JSON.stringify(input), { coerceTypes: true });
    
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.some((e: any) => e.path[0] === 'num')).toBe(true);
      expect(result.errors.some((e: any) => e.path[0] === 'bool')).toBe(true);
      expect(result.errors.some((e: any) => e.path[0] === 'str')).toBe(true);
      expect(result.errors.some((e: any) => e.path[0] === 'action')).toBe(true);
    }
  });
});
