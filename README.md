# @aitesthq/agent-response-schema

A lightweight, Zod-like schema validation and repair library designed specifically for Agentic AI frameworks. 

LLMs frequently hallucinate JSON formatting, miss trailing commas, drop brackets, or output types as strings instead of numbers. This library acts as a robust middle-layer, coercing and repairing messy AI output back into strict TypeScript types.

## Features

- **Robust Type Coercion**: Automatically converts `"42"` to `42` and `"true"` to `true` when the schema demands it.
- **Syntax Repair**: Gracefully handles missing trailing commas, unclosed brackets, and stray conversational text.
- **Zod-Like API**: Familiar, chainable validation syntax (e.g., `z.string().min(2)`).

## Installation

```bash
npm install github:okeycj/agent-response-schema
```

## Basic Usage

```typescript
import { validateWithRepair, z } from "@aitesthq/agent-response-schema";

const schema = z.object({
  id: z.string().uuid(),
  age: z.number(),
  isActive: z.boolean()
});

// A messy LLM response with conversational text, bad JSON syntax, and stringified numbers/booleans
const rawAIResponse = `
Here is the extracted data:
\`\`\`json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "age": "28",
  "isActive": "TRUE"
\`\`\`
`;

const result = validateWithRepair(schema, rawAIResponse, {
  extractFromText: true,
  fixMissingBrackets: true,
  coerceTypes: true
});

if (result.success) {
  console.log(result.data); 
  // Output: { id: "123e...", age: 28, isActive: true }
}
```

## License
MIT
