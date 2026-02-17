export interface ListResponse<T = any> {
    [key: `Z_${string}`]: any;
  value: T[];
}
