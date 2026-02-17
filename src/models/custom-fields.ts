/**
 * Utility type for Accredo custom fields.
 * All custom fields in Accredo start with "Z_".
 *
 * Usage:
 *   type MyCreditor = WithCustomFields<APCreditor, {
 *     Z_MyField: string;
 *     Z_AnotherField: number;
 *   }>;
 */
export type WithCustomFields<T, C extends Record<`Z_${string}`, unknown>> = T & C;

/**
 * Generic custom fields index signature.
 * Models generated with additionalProperties: true will accept
 * any Z_* field at runtime. Use WithCustomFields<T, C> for
 * compile-time safety on known custom fields.
 */
export type CustomFields = Record<`Z_${string}`, unknown>;
