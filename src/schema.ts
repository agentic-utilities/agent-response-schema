export type Primitive = 'string' | 'number' | 'boolean' | 'null';

export type Schema<T = any> = {
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

export type StringSchema = Schema<string> & {
  min(min: number): StringSchema;
  max(max: number): StringSchema;
  email(): StringSchema;
  url(): StringSchema;
  uuid(): StringSchema;
};

export type NumberSchema = Schema<number> & {
  min(min: number): NumberSchema;
  max(max: number): NumberSchema;
};

function createStringSchema(base: Partial<Schema<string>> = {}): StringSchema {
  const schema: any = { type: 'string', ...base };
  schema.min = (min: number) => createStringSchema({ ...schema, constraints: { ...schema.constraints, min } });
  schema.max = (max: number) => createStringSchema({ ...schema, constraints: { ...schema.constraints, max } });
  schema.email = () => createStringSchema({ ...schema, constraints: { ...schema.constraints, email: true } });
  schema.url = () => createStringSchema({ ...schema, constraints: { ...schema.constraints, url: true } });
  schema.uuid = () => createStringSchema({ ...schema, constraints: { ...schema.constraints, uuid: true } });
  return schema;
}

function createNumberSchema(base: Partial<Schema<number>> = {}): NumberSchema {
  const schema: any = { type: 'number', ...base };
  schema.min = (min: number) => createNumberSchema({ ...schema, constraints: { ...schema.constraints, min } });
  schema.max = (max: number) => createNumberSchema({ ...schema, constraints: { ...schema.constraints, max } });
  return schema;
}

export const z = {
  string: () => createStringSchema(),
  number: () => createNumberSchema(),
  boolean: () => ({ type: 'boolean' } as Schema<boolean>),
  array: <T>(item: Schema<T>) => ({ type: 'array', item } as Schema<T[]>),
  object: <T extends Record<string, Schema>>(shape: T) => 
    ({ type: 'object', shape } as Schema<{ [K in keyof T]: T[K] extends Schema<infer U> ? U : never }>),
  optional: <T>(schema: Schema<T>) => ({ ...schema, optional: true } as Schema<T | undefined>),
  nullable: <T>(schema: Schema<T>) => ({ ...schema, nullable: true } as Schema<T | null>),
  enum: <U extends string, T extends Readonly<[U, ...U[]]>>(values: T) => ({ type: 'string', constraints: { enum: values as unknown as any[] } } as Schema<T[number]>),
};

export type infer<T extends Schema> = T extends Schema<infer U> ? U : never;
