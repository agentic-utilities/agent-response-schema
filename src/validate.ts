import { Schema, infer as InferSchema } from './schema.js';
import { extractJSON } from './extract.js';
import { repairJSON } from './repair.js';

export type ValidationError = {
  path: string[];
  message: string;
  expected: string;
  received: string;
};

export type ValidationResult<T> =
  | { success: true; data: T; repairs?: string[] }
  | { success: false; errors: ValidationError[]; raw?: string };

export type ValidationOptions = {
  maxRepairAttempts?: number;
  fixMissingBrackets?: boolean;
  fixTrailingCommas?: boolean;
  extractFromText?: boolean;
  coerceTypes?: boolean;
};

function typeOf(value: any): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

type ValidateInternalResult = { errors: ValidationError[], value: any };

function validateInternal(schema: Schema, input: any, options: ValidationOptions = {}, path: string[] = []): ValidateInternalResult {
  const errors: ValidationError[] = [];
  let value = input;

  if (input === undefined) {
    if (schema.optional) return { errors, value };
    errors.push({ path, message: `Missing required field: ${path.join('.') || 'root'}`, expected: schema.type, received: 'undefined' });
    return { errors, value };
  }

  if (input === null) {
    if (schema.nullable) return { errors, value };
    errors.push({ path, message: `Expected ${schema.type}, got null`, expected: schema.type, received: 'null' });
    return { errors, value };
  }

  const inputType = typeOf(input);

  if (options.coerceTypes) {
    if (schema.type === 'number' && inputType === 'string') {
      const num = Number(input);
      if (!isNaN(num) && input.trim() !== '') {
        value = num;
      }
    } else if (schema.type === 'boolean' && inputType === 'string') {
      const lower = input.toLowerCase().trim();
      if (lower === 'true') value = true;
      else if (lower === 'false') value = false;
    } else if (schema.type === 'string' && inputType === 'number') {
      value = String(input);
    }
  }

  const coercedType = typeOf(value);

  if (schema.type === 'string' || schema.type === 'number' || schema.type === 'boolean') {
    if (coercedType !== schema.type) {
      errors.push({ path, message: `Expected ${schema.type}, got ${coercedType}`, expected: schema.type, received: coercedType });
      return { errors, value };
    }
  }

  if (schema.constraints) {
    if (schema.type === 'string') {
      const val = value as string;
      if (schema.constraints.min !== undefined && val.length < schema.constraints.min) {
        errors.push({ path, message: `String length must be at least ${schema.constraints.min}`, expected: `min length ${schema.constraints.min}`, received: `${val.length}` });
      }
      if (schema.constraints.max !== undefined && val.length > schema.constraints.max) {
        errors.push({ path, message: `String length must be at most ${schema.constraints.max}`, expected: `max length ${schema.constraints.max}`, received: `${val.length}` });
      }
      if (schema.constraints.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
        errors.push({ path, message: `Invalid email format`, expected: 'email', received: val });
      }
      if (schema.constraints.url && !/^https?:\/\/[^\s]+$/.test(val)) {
        errors.push({ path, message: `Invalid URL format`, expected: 'url', received: val });
      }
      if (schema.constraints.uuid && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)) {
        errors.push({ path, message: `Invalid UUID format`, expected: 'uuid', received: val });
      }
      if (schema.constraints.enum) {
        if (!schema.constraints.enum.includes(val)) {
          if (options.coerceTypes) {
            const matched = schema.constraints.enum.find(e => typeof e === 'string' && e.toLowerCase() === val.toLowerCase());
            if (matched !== undefined) {
              value = matched;
            } else {
              errors.push({ path, message: `Invalid enum value`, expected: `one of ${schema.constraints.enum.join(', ')}`, received: val });
            }
          } else {
            errors.push({ path, message: `Invalid enum value`, expected: `one of ${schema.constraints.enum.join(', ')}`, received: val });
          }
        }
      }
    } else if (schema.type === 'number') {
      const val = value as number;
      if (schema.constraints.min !== undefined && val < schema.constraints.min) {
        errors.push({ path, message: `Number must be at least ${schema.constraints.min}`, expected: `>= ${schema.constraints.min}`, received: `${val}` });
      }
      if (schema.constraints.max !== undefined && val > schema.constraints.max) {
        errors.push({ path, message: `Number must be at most ${schema.constraints.max}`, expected: `<= ${schema.constraints.max}`, received: `${val}` });
      }
    }
  }

  if (schema.type === 'object') {
    if (coercedType !== 'object') {
      errors.push({ path, message: `Expected object, got ${coercedType}`, expected: 'object', received: coercedType });
      return { errors, value };
    }
    
    if (schema.shape) {
      const newValue: any = {};
      for (const key of Object.keys(schema.shape)) {
        const fieldSchema = schema.shape[key]!;
        const { errors: fieldErrors, value: fieldValue } = validateInternal(fieldSchema, value[key], options, [...path, key]);
        errors.push(...fieldErrors);
        if (fieldValue !== undefined) {
          newValue[key] = fieldValue;
        }
      }
      value = newValue;
    }
  }

  if (schema.type === 'array') {
    if (coercedType !== 'array') {
      errors.push({ path, message: `Expected array, got ${coercedType}`, expected: 'array', received: coercedType });
      return { errors, value };
    }

    if (schema.item) {
      const arr = value as any[];
      const newArr: any[] = [];
      for (let i = 0; i < arr.length; i++) {
        const { errors: itemErrors, value: itemValue } = validateInternal(schema.item, arr[i], options, [...path, String(i)]);
        errors.push(...itemErrors);
        newArr.push(itemValue);
      }
      value = newArr;
    }
  }

  return { errors, value };
}

export function validate<T extends Schema>(schema: T, input: unknown, options: ValidationOptions = {}): ValidationResult<InferSchema<T>> {
  let parsedInput = input;
  
  if (typeof input === 'string') {
    if (input.trim() === '') {
      return { success: false, errors: [{ path: [], message: 'Empty response', expected: 'json', received: 'empty' }], raw: input };
    }
    try {
      parsedInput = JSON.parse(input);
    } catch (_) {
      return { success: false, errors: [{ path: [], message: 'Invalid JSON structure', expected: 'json', received: 'string' }], raw: input };
    }
  }

  const { errors, value } = validateInternal(schema, parsedInput, options);
  
  if (errors.length > 0) {
    return { success: false, errors, raw: typeof input === 'string' ? input : JSON.stringify(input) };
  }
  
  const result: any = { success: true, data: value as InferSchema<T> }; if (options.coerceTypes && JSON.stringify(value) !== JSON.stringify(parsedInput)) result.repairs = ['Coerced types to match schema']; return result;
}

export function validateWithRepair<T extends Schema>(
  schema: T, 
  input: unknown, 
  options: ValidationOptions = {}
): ValidationResult<InferSchema<T>> {
  if (typeof input !== 'string') {
    return validate(schema, input, options);
  }

  let repairs: string[] = [];
  let parsedInput: any;

  if (options.extractFromText) {
    const extractResult = extractJSON(input);
    if (extractResult.success) {
      parsedInput = extractResult.data;
      if (input !== JSON.stringify(parsedInput)) {
        repairs.push('Extracted JSON from text');
      }
    }
  }

  if (parsedInput === undefined && (options.fixMissingBrackets || options.fixTrailingCommas)) {
    const repairResult = repairJSON(input);
    if (repairResult.success) {
      try {
        parsedInput = JSON.parse(repairResult.output);
        repairs.push(...repairResult.repairs);
      } catch (_) {}
    }
  }

  if (parsedInput === undefined) {
    return validate(schema, input, options);
  }

  const { errors, value } = validateInternal(schema, parsedInput, options);
  
  if (errors.length > 0) {
    return { success: false, errors, raw: input as string };
  }
  
  const result: ValidationResult<InferSchema<T>> = { success: true, data: value as InferSchema<T> };
  if (repairs.length > 0 || (options.coerceTypes && JSON.stringify(value) !== JSON.stringify(parsedInput))) {
    result.repairs = repairs;
    if (options.coerceTypes && JSON.stringify(value) !== JSON.stringify(parsedInput)) {
      result.repairs.push('Coerced types to match schema');
    }
  }
  return result;
}
