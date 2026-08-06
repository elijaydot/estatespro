import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AiMarkdownResult } from '../../src/components/ai/AiMarkdownResult';

describe('AI search result markdown', () => {
  it('renders pipe-delimited search records as a semantic table', () => {
    const content = `## Tenant financial summary

| Tenant | Email | Rent amount | Current balance | Status |
| --- | --- | ---: | ---: | --- |
| Lanre | lanre@example.com | RWF 1,500,000 | RWF 0 | Active |`;

    const markup = renderToStaticMarkup(createElement(AiMarkdownResult, { content }));

    expect(markup).toContain('<table');
    expect(markup).toContain('<thead');
    expect(markup).toContain('<tbody');
    expect(markup).toContain('<th');
    expect(markup).toContain('<td');
    expect(markup).not.toContain('| Tenant |');
  });

  it('renders trend and report structure as headings and lists', () => {
    const content = `## Key findings

- Occupancy remained stable.
- Collections improved.

## Recommended actions

1. Review overdue invoices.
2. Contact linked tenants.`;

    const markup = renderToStaticMarkup(createElement(AiMarkdownResult, { content }));

    expect(markup).toContain('<h3');
    expect(markup).toContain('<ul');
    expect(markup).toContain('<ol');
  });
});