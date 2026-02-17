# @rapidonz/accredo-types

TypeScript type definitions for all Accredo ERP entities. Zero runtime dependencies.

Generated from the Accredo OpenAPI spec (v7.0.13.109) — 1,084 model files covering every module: AP, AR, GL, CB, IC, OE, PO, JC, FA, FX.

## Install

```bash
npm install @rapidonz/accredo-types
```

## Usage

```typescript
import { APCreditor, ARDebtor, ICProduct, OData4Params } from "@rapidonz/accredo-types";

const params: OData4Params = {
  $filter: "Name eq 'Acme'",
  $top: 10,
  $select: "CreditorCode,Name,Balance",
};

function processCreditor(creditor: APCreditor) {
  console.log(creditor.CreditorCode, creditor.Name);
}
```

### Paged responses

Every list endpoint returns a paged wrapper:

```typescript
import { PagedAPCreditor } from "@rapidonz/accredo-types";

const response: PagedAPCreditor = {
  "@odata.context": "...",
  value: [{ CreditorCode: "ACME", Name: "Acme Corp" }],
};
```

### Custom fields (Z\_\*)

Accredo custom fields always start with `Z_`. All generated interfaces accept arbitrary properties at runtime. For compile-time safety on known custom fields, use `WithCustomFields`:

```typescript
import { APCreditor, WithCustomFields } from "@rapidonz/accredo-types";

type MyCreditor = WithCustomFields<APCreditor, {
  Z_LoyaltyTier: string;
  Z_CreditScore: number;
}>;

const creditor: MyCreditor = {
  CreditorCode: "ACME",
  Name: "Acme Corp",
  Z_LoyaltyTier: "Gold",
  Z_CreditScore: 850,
};
```

### Generic list response

```typescript
import { ListResponse } from "@rapidonz/accredo-types";

const products: ListResponse<{ ProductCode: string; Description: string }> = {
  value: [{ ProductCode: "WIDGET", Description: "Blue Widget" }],
};
```

## Modules covered

| Module | Prefix | Description |
|--------|--------|-------------|
| Accounts Payable | `AP` | Creditors, invoices, payments, shipments |
| Accounts Receivable | `AR` | Debtors, invoices, receipts, allocations |
| General Ledger | `GL` | Chart of accounts, journals, budgets |
| Cash Book | `CB` | Bank accounts, deposits, reconciliation |
| Inventory Control | `IC` | Products, stock, warehouses, bin locations |
| Order Entry | `OE` | Sales orders, quotes, dispatch |
| Purchase Orders | `PO` | Purchase orders, requisitions, receiving |
| Job Costing | `JC` | Jobs, cost transactions, WIP |
| Fixed Assets | `FA` | Asset register, depreciation |
| Foreign Exchange | `FX` | Currencies, exchange rates |

## Regenerating types

To regenerate from a newer Accredo OpenAPI spec:

1. Replace `openapi.json` in the project root with the updated spec
2. Run the generator:
   ```bash
   cd generate
   npm install
   node run.js
   ```
3. Build:
   ```bash
   cd ..
   npm run build
   ```

## License

See [LICENSE.md](LICENSE.md) — Sustainable Use License. Distribution requires written consent from Rapido.
