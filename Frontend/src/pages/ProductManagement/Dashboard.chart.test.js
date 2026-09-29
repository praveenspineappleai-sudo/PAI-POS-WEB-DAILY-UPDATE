import { buildChartDataPoints } from './Dashboard';

describe('buildChartDataPoints', () => {
  it('uses real revenue and profit values to calculate chart coordinates', () => {
    const points = buildChartDataPoints([
      { time: '6 AM', revenue: '12,000', profit: '8,000', revenueRaw: 12000, profitRaw: 8000 },
      { time: '9 AM', revenue: '24,000', profit: '16,000', revenueRaw: 24000, profitRaw: 16000 },
      { time: '12.00 PM', revenue: '36,000', profit: '20,000', revenueRaw: 36000, profitRaw: 20000 },
      { time: '3 PM', revenue: '30,000', profit: '18,000', revenueRaw: 30000, profitRaw: 18000 },
      { time: '6 PM', revenue: '42,000', profit: '24,000', revenueRaw: 42000, profitRaw: 24000 },
      { time: '9 PM', revenue: '48,000', profit: '26,000', revenueRaw: 48000, profitRaw: 26000 },
      { time: '12 AM', revenue: '60,000', profit: '30,000', revenueRaw: 60000, profitRaw: 30000 }
    ]);

    expect(points[0].time).toBe('6 AM');
    expect(points[0].revenueRaw).toBe(12000);
    expect(points[0].revY).toBeLessThan(210);
    expect(points[0].profY).toBeLessThan(210);
    expect(points[6].revenueRaw).toBe(60000);
    expect(points[6].cx).toBe(590);
  });
});
