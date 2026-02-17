/**
 *
 * @export
 * @interface OData4Params
 */
export interface OData4Params {
    [key: `Z_${string}`]: any;
  $filter?: string;
  $select?: string;
  $orderby?: string;
  $top?: number;
  $skip?: number;
  $expand?: string;
  $count?: boolean;
  $Deltatoken?: string;
}
