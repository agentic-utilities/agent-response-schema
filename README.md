# @agentic-utilities/agent-response-schema

[![npm version](https://img.shields.io/npm/v/@agentic-utilities/agent-response-schema.svg)](https://www.npmjs.com/package/@agentic-utilities/agent-response-schema)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A lightweight, Zod-like schema validation and repair library designed specifically for Agentic AI frameworks. 

LLMs frequently hallucinate JSON formatting, miss trailing commas, drop brackets, or output types as strings instead of numbers. While standard validation libraries like Zod will outright reject these responses, this library acts as a robust middle-layer—coercing and repairing messy AI output back into strict TypeScript types so your agents can keep running.

## Features

- **Robust Type Coercion**: Automatically converts `"42"` to `42` and `"true"` to `true` when the schema demands it.
- **Syntax Repair**: Gracefully handles missing trailing commas, unclosed brackets, and stray conversational text.
- **Zod-Like API**: Familiar, chainable validation syntax (e.g., `z.string().min(2)`).

## Installation

```bash
npm install @agentic-utilities/agent-response-schema
```

## Basic Usage

```typescript
import { validateWithRepair, z } from "@agentic-utilities/agent-response-schema";

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
} else {
  console.error("Failed to parse and repair AI response:", result.errors);
}
```

## Repair Options

The `validateWithRepair` function takes an optional configuration object to tailor the repair strategies to your LLM's behavior:

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `extractFromText` | `boolean` | `true` | Attempts to extract JSON blocks (like ` ```json ... ``` `) from conversational LLM output. |
| `fixMissingBrackets` | `boolean` | `true` | Automatically balances and injects missing `[` or `{` brackets at the start or end of the string. |
| `coerceTypes` | `boolean` | `true` | Safely casts primitive strings (e.g. `"10"`, `"false"`) into their proper types if the schema requires a `number` or `boolean`. |

## License

[MIT](LICENSE)
