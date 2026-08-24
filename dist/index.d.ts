type Primitive = 'string' | 'number' | 'boolean' | 'null';
type Schema<T = any> = {
    type: Primitive | 'array' | 'object' | 'optional' | 'nullable';
    item?: Schema;
    shape?: Record<string, Schema>;
    optional?: boolean;
    nullable?: boolean;
    constraints?: {
        min?: number;
        max?: number;
        email?: boolean;
        url?: boolean;
        uuid?: boolean;
        enum?: any[];
    };
    _type?: T;
};
type StringSchema = Schema<string> & {
    min(min: number): StringSchema;
    max(max: number): StringSchema;
    email(): StringSchema;
    url(): StringSchema;
    uuid(): StringSchema;
};
type NumberSchema = Schema<number> & {
    min(min: number): NumberSchema;
    max(max: number): NumberSchema;
};
declare const z: {
    string: () => StringSchema;
    number: () => NumberSchema;
    boolean: () => Schema<boolean>;
    array: <T>(item: Schema<T>) => Schema<T[]>;
    object: <T extends Record<string, Schema>>(shape: T) => Schema<{ [K in keyof T]: T[K] extends Schema<infer U> ? U : never; }>;
    optional: <T>(schema: Schema<T>) => Schema<T | undefined>;
    nullable: <T>(schema: Schema<T>) => Schema<T | null>;
    enum: <U extends string, T extends Readonly<[U, ...U[]]>>(values: T) => Schema<T[number]>;
};
type infer<T extends Schema> = T extends Schema<infer U> ? U : never;

type ValidationError = {
    path: string[];
    message: string;
    expected: string;
    received: string;
};
type ValidationResult<T> = {
    success: true;
    data: T;
    repairs?: string[];
} | {
    success: false;
    errors: ValidationError[];
    raw?: string;
};
type ValidationOptions = {
    maxRepairAttempts?: number;
    fixMissingBrackets?: boolean;
    fixTrailingCommas?: boolean;
    extractFromText?: boolean;
    coerceTypes?: boolean;
};
declare function validate<T extends Schema>(schema: T, input: unknown, options?: ValidationOptions): ValidationResult<infer<T>>;
declare function validateWithRepair<T extends Schema>(schema: T, input: unknown, options?: ValidationOptions): ValidationResult<infer<T>>;

declare function repairJSON(input: string): {
    success: boolean;
    output: string;
    repairs: string[];
};

declare function extractJSON(input: string): {
    success: true;
    data: unknown;
} | {
    success: false;
    errors: string[];
};

export { type NumberSchema, type Primitive, type Schema, type StringSchema, type ValidationError, type ValidationOptions, type ValidationResult, extractJSON, type infer, repairJSON, validate, validateWithRepair, z };
