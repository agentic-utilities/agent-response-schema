import { repairJSON } from './repair.js';

export function extractJSON(input: string): { success: true; data: unknown } | { success: false; errors: string[] } {
  // Try 1: Direct parse
  try {
    return { success: true, data: JSON.parse(input) };
  } catch (_) {}

  // Try 2: Extract JSON from markdown blocks
  const mdMatch = input.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (mdMatch && mdMatch[1]) {
    try {
      return { success: true, data: JSON.parse(mdMatch[1]) };
    } catch (_) {}
    
    // Try repairing the extracted block
    const blockRepaired = repairJSON(mdMatch[1]);
    if (blockRepaired.success) {
      try {
        return { success: true, data: JSON.parse(blockRepaired.output) };
      } catch (_) {}
    }
  }

  // Try 3: Find JSON-like structure
  const jsonMatch = input.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (jsonMatch) {
    try {
      return { success: true, data: JSON.parse(jsonMatch[0]) };
    } catch (_) {}
    
    // Try repairing the extracted structure
    const structRepaired = repairJSON(jsonMatch[0]);
    if (structRepaired.success) {
      try {
        return { success: true, data: JSON.parse(structRepaired.output) };
      } catch (_) {}
    }
  }

  // Try 4: Repair and parse
  const repaired = repairJSON(input);
  if (repaired.success) {
    try {
      return { success: true, data: JSON.parse(repaired.output) };
    } catch (_) {}
    
    // Also try finding JSON-like structure within the repaired output just in case
    const repairedJsonMatch = repaired.output.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (repairedJsonMatch) {
      try {
        return { success: true, data: JSON.parse(repairedJsonMatch[0]) };
      } catch (_) {}
    }
  }

  return { success: false, errors: ['No valid JSON found in response'] };
}
