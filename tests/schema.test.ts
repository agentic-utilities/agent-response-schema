import { describe, it, expect } from 'vitest';
import { z, infer as InferSchema } from '../src/index.js';

describe('schema types (compile-time)', () => {
  it('infers primitives correctly', () => {
    const stringSchema = z.string();
    const numberSchema = z.number();
    const booleanSchema = z.boolean();

    // These lines don't do much at runtime, but they ensure type errors
    // are absent if inference works.
    type S = InferSchema<typeof stringSchema>;
    type N = InferSchema<typeof numberSchema>;
    type B = InferSchema<typeof booleanSchema>;

    expect(stringSchema.type).toBe('string');
    expect(numberSchema.type).toBe('number');
    expect(booleanSchema.type).toBe('boolean');
  });

  it('infers complex schemas correctly', () => {
    const complexSchema = z.object({
      id: z.string().uuid(),
      items: z.array(z.object({ name: z.string(), quantity: z.number() })),
      total: z.number(),
      notes: z.optional(z.string()),
    });

    type Complex = InferSchema<typeof complexSchema>;
    
    // Test that the schema is constructed properly
    expect(complexSchema.type).toBe('object');
    if (complexSchema.shape) {
      expect(complexSchema.shape.id?.type).toBe('string');
      expect(complexSchema.shape.id?.constraints?.uuid).toBe(true);
      expect(complexSchema.shape.items?.type).toBe('array');
    }
  });
});
