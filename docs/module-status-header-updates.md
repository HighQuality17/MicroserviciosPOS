# Module Status Header Updates

## Scope

Short technical note for the visual refinement of the top status and summary bars used across the main authenticated modules in `Registry POS`.

## Affected modules

- POS
- Cash
- Products
- Ingredients
- Combos
- Sales
- Admin

## Main files involved

- `frontend/src/components/ModuleStatusHeader.tsx`
- `frontend/src/features/pos/PosPage.tsx`
- `frontend/src/features/cash/CashPage.tsx`
- `frontend/src/features/products/ProductsPage.tsx`
- `frontend/src/features/ingredients/IngredientsPage.tsx`
- `frontend/src/features/combos/CombosPage.tsx`
- `frontend/src/features/sales/SalesPage.tsx`
- `frontend/src/features/admin/AdminPage.tsx`
- `frontend/src/styles.css`

## Implemented changes

- A shared `ModuleStatusHeader` base now centralizes the title, status badge, short description and summary cards used at the top of each module.
- The content shown in those bars was simplified to remove repeated or low-value copy and keep only fast operational context.
- Visual hierarchy was standardized so title, state and metrics follow the same reading order across modules.
- Shared cards now use a more consistent layout, spacing and density for icons, labels, values and secondary metadata.
- A compact contextual help trigger was added only where it supports module understanding without overloading the interface.

## Visual criteria applied

- Keep the premium dark language intact.
- Reduce noise before adding decoration.
- Prefer short descriptions and compact metrics over explanatory paragraphs.
- Keep the status area readable on mobile without breaking wrapping or touch behavior.

## Responsive impact

- The summary grid keeps a cleaner single-column behavior on small screens.
- Header copy and metric density were adjusted to preserve legibility in mobile layouts.
- Contextual help remains accessible in both pointer and touch interactions.
