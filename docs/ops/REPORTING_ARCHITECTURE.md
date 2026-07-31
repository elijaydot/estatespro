# Reporting Architecture

The three reporting surfaces remain deliberately separate:

- Core PM reports answer lease, rent, occupancy, collections, and maintenance questions.
- Marketplace CRM reports answer pipeline, activity, campaign, and conversion questions.
- Control Plane analytics answer cross-tenant platform risk, usage, billing, and governance questions.

Their row schemas, permissions, query scopes, and operator workflows are different enough that
one shared report component would create conditional-heavy coupling. UI consolidation is therefore
not planned. Shared extraction should stay limited to genuinely generic primitives such as CSV
escaping, date-range filtering, and chart/table presentation once at least two surfaces need the
same behavior.

Core PM aggregation lives in `src/lib/pmReports.ts`; Marketplace CRM aggregation lives in
`src/lib/marketplaceCrmReports.ts`; Control Plane export and analytics helpers remain under
`src/lib/controlPlane*.ts`. This boundary is intentional and should be revisited only when concrete
duplication appears across domains.