import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DashboardAIInsightsPanel } from '../../src/components/dashboard/DashboardAIInsightsPanel';
import { formatPredictiveCurrency, parseMetricNumber } from '../../src/lib/dashboardPresentation';

describe('dashboard presentation', () => {
  it('normalizes predictive API currency through the dashboard formatter', () => {
    const formatRwf = (amount: number) => `RWF ${amount.toLocaleString('en-US')}`;

    expect(parseMetricNumber('$1,250')).toBe(1250);
    expect(formatPredictiveCurrency('$1,250', formatRwf)).toBe('RWF 1,250');
    expect(formatPredictiveCurrency('RWF 925000', formatRwf)).toBe('RWF 925,000');
  });

  it.each(['light', 'dark'])('matches the %s AI panel structure', (theme) => {
    const panel = createElement(DashboardAIInsightsPanel, {
      smartSearch: createElement('div', null, 'Search surface'),
      financial: createElement('div', null, 'Financial visuals'),
      predictive: createElement('div', null, 'Predictive visuals'),
    });
    const markup = renderToStaticMarkup(createElement('div', { className: theme === 'dark' ? 'dark' : undefined }, panel));

    expect(markup).toMatchSnapshot();
  });
});