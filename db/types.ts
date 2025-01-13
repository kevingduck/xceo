// Field types and values
export type FieldType = "number" | "date" | "text" | "currency" | "percentage" | "list";
export type FieldValue = string | number | string[] | Date;

export interface Field {
  value: FieldValue;
  type: FieldType;
  updatedAt: string;
  updatedBy: "user" | "ai" | "system";
  aiSuggestion?: string;
}

export interface BusinessInfoFields {
  [key: string]: Field;
}
