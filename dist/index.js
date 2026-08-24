// src/schema.ts
function createStringSchema(base = {}) {
  const schema = { type: "string", ...base };
  schema.min = (min) => createStringSchema({ ...schema, constraints: { ...schema.constraints, min } });
  schema.max = (max) => createStringSchema({ ...schema, constraints: { ...schema.constraints, max } });
  schema.email = () => createStringSchema({ ...schema, constraints: { ...schema.constraints, email: true } });
  schema.url = () => createStringSchema({ ...schema, constraints: { ...schema.constraints, url: true } });
  schema.uuid = () => createStringSchema({ ...schema, constraints: { ...schema.constraints, uuid: true } });
  return schema;
}
function createNumberSchema(base = {}) {
  const schema = { type: "number", ...base };
  schema.min = (min) => createNumberSchema({ ...schema, constraints: { ...schema.constraints, min } });
  schema.max = (max) => createNumberSchema({ ...schema, constraints: { ...schema.constraints, max } });
  return schema;
}
var z = {
  string: () => createStringSchema(),
  number: () => createNumberSchema(),
  boolean: () => ({ type: "boolean" }),
  array: (item) => ({ type: "array", item }),
  object: (shape) => ({ type: "object", shape }),
  optional: (schema) => ({ ...schema, optional: true }),
  nullable: (schema) => ({ ...schema, nullable: true }),
  enum: (values) => ({ type: "string", constraints: { enum: values } })
};

// src/repair.ts
function repairJSON(input) {
  const repairs = [];
  let output = input.trim();
  output = output.replace(/(\{|\,)\s*([a-zA-Z0-9_]+)\s*\:/g, (match, prefix, key) => {
    repairs.push(`Added quotes around key: ${key}`);
    return `${prefix} "${key}":`;
  });
  output = output.replace(/'/g, '"');
  let openBrackets = (output.match(/\[/g) || []).length;
  let closeBrackets = (output.match(/\]/g) || []).length;
  while (openBrackets > closeBrackets) {
    output += "]";
    closeBrackets++;
    repairs.push("Added missing closing bracket");
  }
  while (closeBrackets > openBrackets) {
    output = "[" + output;
    openBrackets++;
    repairs.push("Added missing opening bracket");
  }
  let openBraces = (output.match(/\{/g) || []).length;
  let closeBraces = (output.match(/\}/g) || []).length;
  while (openBraces > closeBraces) {
    output += "}";
    closeBraces++;
    repairs.push("Added missing closing brace");
  }
  while (closeBraces > openBraces) {
    output = "{" + output;
    openBraces++;
    repairs.push("Added missing opening brace");
  }
  output = output.replace(/,(\s*[\]\}])/g, (match, spaceAndClose) => {
    repairs.push(`Removed trailing comma before ${spaceAndClose.trim()}`);
    return spaceAndClose;
  });
  return { success: true, output, repairs };
}

// src/extract.ts
function extractJSON(input) {
  try {
    return { success: true, data: JSON.parse(input) };
  } catch (_) {
  }
  const mdMatch = input.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (mdMatch && mdMatch[1]) {
    try {
      return { success: true, data: JSON.parse(mdMatch[1]) };
    } catch (_) {
    }
    const blockRepaired = repairJSON(mdMatch[1]);
    if (blockRepaired.success) {
      try {
        return { success: true, data: JSON.parse(blockRepaired.output) };
      } catch (_) {
      }
    }
  }
  const jsonMatch = input.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (jsonMatch) {
    try {
      return { success: true, data: JSON.parse(jsonMatch[0]) };
    } catch (_) {
    }
    const structRepaired = repairJSON(jsonMatch[0]);
    if (structRepaired.success) {
      try {
        return { success: true, data: JSON.parse(structRepaired.output) };
      } catch (_) {
      }
    }
  }
  const repaired = repairJSON(input);
  if (repaired.success) {
    try {
      return { success: true, data: JSON.parse(repaired.output) };
    } catch (_) {
    }
    const repairedJsonMatch = repaired.output.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (repairedJsonMatch) {
      try {
        return { success: true, data: JSON.parse(repairedJsonMatch[0]) };
      } catch (_) {
      }
    }
  }
  return { success: false, errors: ["No valid JSON found in response"] };
}

// src/validate.ts
function typeOf(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}
function validateInternal(schema, input, options = {}, path = []) {
  const errors = [];
  let value = input;
  if (input === void 0) {
    if (schema.optional) return { errors, value };
    errors.push({ path, message: `Missing required field: ${path.join(".") || "root"}`, expected: schema.type, received: "undefined" });
    return { errors, value };
  }
  if (input === null) {
    if (schema.nullable) return { errors, value };
    errors.push({ path, message: `Expected ${schema.type}, got null`, expected: schema.type, received: "null" });
    return { errors, value };
  }
  const inputType = typeOf(input);
  if (options.coerceTypes) {
    if (schema.type === "number" && inputType === "string") {
      const num = Number(input);
      if (!isNaN(num) && input.trim() !== "") {
        value = num;
      }
    } else if (schema.type === "boolean" && inputType === "string") {
      const lower = input.toLowerCase().trim();
      if (lower === "true") value = true;
      else if (lower === "false") value = false;
    } else if (schema.type === "string" && inputType === "number") {
      value = String(input);
    }
  }
  const coercedType = typeOf(value);
  if (schema.type === "string" || schema.type === "number" || schema.type === "boolean") {
    if (coercedType !== schema.type) {
      errors.push({ path, message: `Expected ${schema.type}, got ${coercedType}`, expected: schema.type, received: coercedType });
      return { errors, value };
    }
  }
  if (schema.constraints) {
    if (schema.type === "string") {
      const val = value;
      if (schema.constraints.min !== void 0 && val.length < schema.constraints.min) {
        errors.push({ path, message: `String length must be at least ${schema.constraints.min}`, expected: `min length ${schema.constraints.min}`, received: `${val.length}` });
      }
      if (schema.constraints.max !== void 0 && val.length > schema.constraints.max) {
        errors.push({ path, message: `String length must be at most ${schema.constraints.max}`, expected: `max length ${schema.constraints.max}`, received: `${val.length}` });
      }
      if (schema.constraints.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
        errors.push({ path, message: `Invalid email format`, expected: "email", received: val });
      }
      if (schema.constraints.url && !/^https?:\/\/[^\s]+$/.test(val)) {
        errors.push({ path, message: `Invalid URL format`, expected: "url", received: val });
      }
      if (schema.constraints.uuid && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)) {
        errors.push({ path, message: `Invalid UUID format`, expected: "uuid", received: val });
      }
      if (schema.constraints.enum) {
        if (!schema.constraints.enum.includes(val)) {
          if (options.coerceTypes) {
            const matched = schema.constraints.enum.find((e) => typeof e === "string" && e.toLowerCase() === val.toLowerCase());
            if (matched !== void 0) {
              value = matched;
            } else {
              errors.push({ path, message: `Invalid enum value`, expected: `one of ${schema.constraints.enum.join(", ")}`, received: val });
            }
          } else {
            errors.push({ path, message: `Invalid enum value`, expected: `one of ${schema.constraints.enum.join(", ")}`, received: val });
          }
        }
      }
    } else if (schema.type === "number") {
      const val = value;
      if (schema.constraints.min !== void 0 && val < schema.constraints.min) {
        errors.push({ path, message: `Number must be at least ${schema.constraints.min}`, expected: `>= ${schema.constraints.min}`, received: `${val}` });
      }
      if (schema.constraints.max !== void 0 && val > schema.constraints.max) {
        errors.push({ path, message: `Number must be at most ${schema.constraints.max}`, expected: `<= ${schema.constraints.max}`, received: `${val}` });
      }
    }
  }
  if (schema.type === "object") {
    if (coercedType !== "object") {
      errors.push({ path, message: `Expected object, got ${coercedType}`, expected: "object", received: coercedType });
      return { errors, value };
    }
    if (schema.shape) {
      const newValue = {};
      for (const key of Object.keys(schema.shape)) {
        const fieldSchema = schema.shape[key];
        const { errors: fieldErrors, value: fieldValue } = validateInternal(fieldSchema, value[key], options, [...path, key]);
        errors.push(...fieldErrors);
        if (fieldValue !== void 0) {
          newValue[key] = fieldValue;
        }
      }
      value = newValue;
    }
  }
  if (schema.type === "array") {
    if (coercedType !== "array") {
      errors.push({ path, message: `Expected array, got ${coercedType}`, expected: "array", received: coercedType });
      return { errors, value };
    }
    if (schema.item) {
      const arr = value;
      const newArr = [];
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
function validate(schema, input, options = {}) {
  let parsedInput = input;
  if (typeof input === "string") {
    if (input.trim() === "") {
      return { success: false, errors: [{ path: [], message: "Empty response", expected: "json", received: "empty" }], raw: input };
    }
    try {
      parsedInput = JSON.parse(input);
    } catch (_) {
      return { success: false, errors: [{ path: [], message: "Invalid JSON structure", expected: "json", received: "string" }], raw: input };
    }
  }
  const { errors, value } = validateInternal(schema, parsedInput, options);
  if (errors.length > 0) {
    return { success: false, errors, raw: typeof input === "string" ? input : JSON.stringify(input) };
  }
  const result = { success: true, data: value };
  if (options.coerceTypes && JSON.stringify(value) !== JSON.stringify(parsedInput)) result.repairs = ["Coerced types to match schema"];
  return result;
}
function validateWithRepair(schema, input, options = {}) {
  if (typeof input !== "string") {
    return validate(schema, input, options);
  }
  let repairs = [];
  let parsedInput;
  if (options.extractFromText) {
    const extractResult = extractJSON(input);
    if (extractResult.success) {
      parsedInput = extractResult.data;
      if (input !== JSON.stringify(parsedInput)) {
        repairs.push("Extracted JSON from text");
      }
    }
  }
  if (parsedInput === void 0 && (options.fixMissingBrackets || options.fixTrailingCommas)) {
    const repairResult = repairJSON(input);
    if (repairResult.success) {
      try {
        parsedInput = JSON.parse(repairResult.output);
        repairs.push(...repairResult.repairs);
      } catch (_) {
      }
    }
  }
  if (parsedInput === void 0) {
    return validate(schema, input, options);
  }
  const { errors, value } = validateInternal(schema, parsedInput, options);
  if (errors.length > 0) {
    return { success: false, errors, raw: input };
  }
  const result = { success: true, data: value };
  if (repairs.length > 0 || options.coerceTypes && JSON.stringify(value) !== JSON.stringify(parsedInput)) {
    result.repairs = repairs;
    if (options.coerceTypes && JSON.stringify(value) !== JSON.stringify(parsedInput)) {
      result.repairs.push("Coerced types to match schema");
    }
  }
  return result;
}
export {
  extractJSON,
  repairJSON,
  validate,
  validateWithRepair,
  z
};
