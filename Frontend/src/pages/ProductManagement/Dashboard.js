// Dashboard.js
import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../../config/apiConfig';
import Header from '../../components/layout/Header';
import Sidebar from '../../components/layout/Sidebar';
import { fetchDashboardStats } from '../../integration/DashboardAPI';
import '../../styles/dashboard.css';

const getTodayDateValue = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const buildReportPdfElement = ({ report, startDate, endDate, businessName }) => {
  const element = document.createElement('div');
  element.style.cssText = 'font-family: Arial, sans-serif; color: #17212b; padding: 12px;';

  const title = document.createElement('h1');
  title.textContent = 'End of Day Report';
  title.style.cssText = 'font-size: 22px; margin: 0 0 6px;';
  element.appendChild(title);

  const range = document.createElement('p');
  range.textContent = `${businessName} | ${startDate} to ${endDate}`;
  range.style.cssText = 'font-size: 11px; color: #52616b; margin: 0 0 18px;';
  element.appendChild(range);

  const createTable = (headers, rows) => {
    const table = document.createElement('table');
    table.style.cssText = 'width: 100%; border-collapse: collapse; font-size: 10px; margin-bottom: 20px;';
    const head = document.createElement('thead');
    const headerRow = document.createElement('tr');
    headers.forEach((header) => {
      const cell = document.createElement('th');
      cell.textContent = header;
      cell.style.cssText = 'background: #eaf8ef; text-align: left; padding: 7px; border: 1px solid #d2ebd9;';
      headerRow.appendChild(cell);
    });
    head.appendChild(headerRow);
    table.appendChild(head);

    const body = document.createElement('tbody');
    rows.forEach((row) => {
      const tableRow = document.createElement('tr');
      row.forEach((value) => {
        const cell = document.createElement('td');
        cell.textContent = value == null ? '' : String(value);
        cell.style.cssText = 'padding: 6px 7px; border: 1px solid #dce3e8;';
        tableRow.appendChild(cell);
      });
      body.appendChild(tableRow);
    });
    table.appendChild(body);
    return table;
  };

  element.appendChild(createTable(['Summary', 'Value'], [
    ['Total Sales', report.totalSales ?? 0],
    ['Total Profit', report.totalProfit ?? 0],
    ['Total Orders', report.totalOrders ?? 0],
    ['New Customers', report.newCustomers ?? 0]
  ]));

  const transactions = Array.isArray(report.orderDetails) ? report.orderDetails : [];
  element.appendChild(createTable(
    ['Order No.', 'Date', 'Items', 'Sales', 'Cost', 'Profit'],
    transactions.map((order) => [
      order.order_no || order.full_order_no || '',
      order.order_date || order.created_at || order.date || '',
      order.total_quantity ?? order.ordered_quantity ?? 0,
      order.discounted_price ?? order.total_price ?? order.ordered_total_price ?? 0,
      order.total_cost ?? 0,
      order.profit ?? 0
    ])
  ));

  return element;
};

const parseChartAmount = (value) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const clean = value.replace(/[^0-9.-]/g, '');
    const numeric = Number(clean);
    return Number.isFinite(numeric) ? numeric : 0;
  }
  return 0;
};

export const buildChartDataPoints = (chartPoints = []) => {
  const basePoints = Array.isArray(chartPoints) && chartPoints.length ? chartPoints : [];

  if (!basePoints.length) {
    return [];
  }

  const rawValues = basePoints.flatMap((point) => [
    parseChartAmount(point.revenueRaw),
    parseChartAmount(point.profitRaw)
  ]);

  const peakValue = Math.max(...rawValues, 1);
  const chartMax = peakValue * 1.25;
  const chartMinY = 20;
  const chartMaxY = 210;
  const yRange = chartMaxY - chartMinY;

  const xPositions = [35, 130, 225, 320, 415, 510, 590];

  return basePoints.map((point, index) => {
    const revenueRaw = parseChartAmount(point.revenueRaw);
    const profitRaw = parseChartAmount(point.profitRaw);
    const revenueValue = parseChartAmount(point.revenue);
    const profitValue = parseChartAmount(point.profit);

    const revY = chartMaxY - ((revenueRaw / chartMax) * yRange);
    const profY = chartMaxY - ((profitRaw / chartMax) * yRange);

    return {
      ...point,
      time: point.time || `Point ${index + 1}`,
      revenue: point.revenue || (revenueValue > 0 ? revenueValue.toLocaleString() : '0'),
      profit: point.profit || (profitValue > 0 ? profitValue.toLocaleString() : '0'),
      revenueRaw,
      profitRaw,
      cx: xPositions[index] ?? 35 + index * 95,
      revY: Math.max(chartMinY, Math.min(chartMaxY, revY)),
      profY: Math.max(chartMinY, Math.min(chartMaxY, profY))
    };
  });
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [selectedPeriod, setSelectedPeriod] = useState('Today');
  const [startDate, setStartDate] = useState(getTodayDateValue);
  const [endDate, setEndDate] = useState(getTodayDateValue);
  const [isReportDownloading, setIsReportDownloading] = useState(false);
  const [reportError, setReportError] = useState('');
  const startDateInputRef = useRef(null);
  const endDateInputRef = useRef(null);
  const [hoveredChartPoint, setHoveredChartPoint] = useState(2); // Default 12.00 PM active
  const [isLoading, setIsLoading] = useState(true);

  // Real backend data state
  const [apiData, setApiData] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const result = await fetchDashboardStats();
      if (result.success && result.data) {
        setApiData(result.data);
      }
    } catch (error) {
      console.error("Error loading dashboard data from backend:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadReport = async (format) => {
    if (!startDate || !endDate || startDate > endDate) {
      setReportError('Choose a valid date range.');
      return;
    }

    setIsReportDownloading(true);
    setReportError('');

    try {
      const businessName = localStorage.getItem('business_name') || 'PAI';
      const query = new URLSearchParams({ startDate, endDate, business_name: businessName });
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/sales/stats?${query.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const report = await response.json();

      if (!response.ok) {
        throw new Error(report.error || report.message || 'Unable to generate the report.');
      }

      const transactions = Array.isArray(report.orderDetails) ? report.orderDetails : [];
      const filename = `end-of-day-report_${startDate}_to_${endDate}`;

      if (format === 'csv') {
        const rows = [
          ['End of Day Report'],
          ['Start Date', startDate],
          ['End Date', endDate],
          ['Total Sales', report.totalSales ?? 0],
          ['Total Profit', report.totalProfit ?? 0],
          ['Total Orders', report.totalOrders ?? 0],
          ['New Customers', report.newCustomers ?? 0],
          [],
          ['Order No.', 'Date', 'Items', 'Sales', 'Cost', 'Profit'],
          ...transactions.map((order) => [
            order.order_no || order.full_order_no || '',
            order.order_date || order.created_at || order.date || '',
            order.total_quantity ?? order.ordered_quantity ?? 0,
            order.discounted_price ?? order.total_price ?? order.ordered_total_price ?? 0,
            order.total_cost ?? 0,
            order.profit ?? 0
          ])
        ];
        const csv = rows.map((row) => row.map((value) =>
          `"${String(value ?? '').replace(/"/g, '""')}"`
        ).join(',')).join('\r\n');
        const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${filename}.csv`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        return;
      }

      const { default: html2pdf } = await import('html2pdf.js');
      const pdfElement = buildReportPdfElement({ report, startDate, endDate, businessName });
      document.body.appendChild(pdfElement);
      try {
        await html2pdf()
          .set({
            margin: 10,
            filename: `${filename}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
          })
          .from(pdfElement)
          .save();
      } finally {
        pdfElement.remove();
      }
    } catch (error) {
      setReportError(error.message || 'Unable to download the report.');
    } finally {
      setIsReportDownloading(false);
    }
  };

  const openDatePicker = (inputRef) => {
    const input = inputRef.current;
    if (!input) return;

    if (typeof input.showPicker === 'function') {
      input.showPicker();
    } else {
      input.focus();
      input.click();
    }
  };

  // Dynamic Card Values with real backend fallbacks matching reference image
  const stats = [
    {
      id: 'sales',
      label: 'Total Sales(Today)',
      value: apiData?.totalSales || 'RS 1,245,680',
      change: apiData?.totalSalesChange || '↑ 18.6%',
      isPositive: apiData?.isSalesPositive !== false,
      tone: 'green',
      iconBg: '#DCF6E7',
      iconColor: '#20A866',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 3v18h18"></path>
          <path d="M18 9l-5 5-4-4-5 5"></path>
        </svg>
      ),
      sparkline: (
        <svg viewBox="0 0 160 30" className="sparkline-svg">
          <path d="M 0,26 Q 20,20 40,22 T 80,18 T 120,12 T 160,5" fill="none" stroke="#20A866" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="20" cy="22" r="3.5" fill="#20A866" />
          <circle cx="48" cy="20" r="3.5" fill="#20A866" />
          <circle cx="75" cy="22" r="3.5" fill="#20A866" />
          <circle cx="102" cy="16" r="3.5" fill="#20A866" />
          <circle cx="128" cy="11" r="3.5" fill="#20A866" />
          <circle cx="152" cy="6" r="3.5" fill="#20A866" />
        </svg>
      )
    },
    {
      id: 'profit',
      label: 'Total Profit (Today)',
      value: apiData?.totalProfit || 'Rs. 256,450',
      change: apiData?.totalProfitChange || '↑ 21.7%',
      isPositive: apiData?.isProfitPositive !== false,
      tone: 'blue',
      iconBg: '#E8E6FF',
      iconColor: '#7168F5',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="9" cy="21" r="1"></circle>
          <circle cx="20" cy="21" r="1"></circle>
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
        </svg>
      ),
      sparkline: (
        <svg viewBox="0 0 160 30" className="sparkline-svg">
          <path d="M 0,26 Q 25,22 50,18 T 100,12 T 160,5" fill="none" stroke="#7168F5" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="25" cy="23" r="3.5" fill="#7168F5" />
          <circle cx="55" cy="18" r="3.5" fill="#7168F5" />
          <circle cx="85" cy="15" r="3.5" fill="#7168F5" />
          <circle cx="115" cy="11" r="3.5" fill="#7168F5" />
          <circle cx="145" cy="7" r="3.5" fill="#7168F5" />
        </svg>
      )
    },
    {
      id: 'low-stock',
      label: 'Low Stock Items',
      value: apiData?.lowStockItems ? apiData.lowStockItems.toString() : '28',
      change: apiData?.lowStockChange || '↓ 8.6%',
      isPositive: false,
      tone: 'yellow',
      iconBg: '#FFF3C7',
      iconColor: '#E3AA00',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
          <line x1="12" y1="9" x2="12" y2="13"></line>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
      ),
      sparkline: (
        <svg viewBox="0 0 160 30" className="sparkline-svg">
          <path d="M 0,6 Q 25,10 50,14 T 100,20 T 160,26" fill="none" stroke="#FFC21C" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="25" cy="9" r="3.5" fill="#FFC21C" />
          <circle cx="55" cy="14" r="3.5" fill="#FFC21C" />
          <circle cx="85" cy="18" r="3.5" fill="#FFC21C" />
          <circle cx="115" cy="22" r="3.5" fill="#FFC21C" />
          <circle cx="145" cy="25" r="3.5" fill="#FFC21C" />
        </svg>
      )
    },
    {
      id: 'customers',
      label: 'New Customers (Today)',
      value: apiData?.newCustomers ? apiData.newCustomers.toString() : '32',
      change: apiData?.newCustomersChange || '↑ 14.3%',
      isPositive: true,
      tone: 'orange',
      iconBg: '#FFE4DC',
      iconColor: '#FF8162',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>
      ),
      sparkline: (
        <svg viewBox="0 0 160 30" className="sparkline-svg">
          <path d="M 0,24 Q 25,18 50,22 T 100,12 T 160,5" fill="none" stroke="#FF8162" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="25" cy="21" r="3.5" fill="#FF8162" />
          <circle cx="55" cy="20" r="3.5" fill="#FF8162" />
          <circle cx="85" cy="15" r="3.5" fill="#FF8162" />
          <circle cx="115" cy="10" r="3.5" fill="#FF8162" />
          <circle cx="145" cy="6" r="3.5" fill="#FF8162" />
        </svg>
      )
    }
  ];

  // Live Shop Status Data
  const branches = [
    { name: 'Colombo', cashiers: 'Cashier: 2', orders: 'Orders: 3', status: 'Active' },
    { name: 'Kandy', cashiers: 'Cashier: 1', orders: 'Orders: 1', status: 'Active' },
    { name: 'Negombo', cashiers: 'Cashier: 1', orders: 'Orders: 2', status: 'Active' },
    { name: 'Galle', cashiers: 'Cashier: 0', orders: 'Orders: 0', status: 'Idle' },
    { name: 'Jaffna', cashiers: 'Cashier: 1', orders: 'Orders: 1', status: 'Active' }
  ];

  // Fast moving products
  const products = apiData?.fastMovingProducts || [
    { name: 'Milk 1L', category: 'Dairy', sold: '5,420', revenue: 'Rs 175,000', status: 'Low Stock', statusType: 'low-stock', color: 'linear-gradient(135deg, #FF7E5F, #FEB47B)' },
    { name: 'Coca cola', category: 'Beverage', sold: '3,660', revenue: 'Rs 98,600', status: 'Low Stock', statusType: 'low-stock', color: 'linear-gradient(135deg, #E52D27, #B31217)' },
    { name: 'Surfexcel', category: 'Household', sold: '2,990', revenue: 'Rs 89,500', status: 'Low Stock', statusType: 'low-stock', color: 'linear-gradient(135deg, #00C6FF, #0072FF)' },
    { name: 'Pepsi', category: 'Beverage', sold: '2,400', revenue: 'Rs 76,960', status: 'Reorder soon', statusType: 'reorder', color: 'linear-gradient(135deg, #1D2671, #C33764)' },
    { name: 'Bread', category: 'Food', sold: '1,800', revenue: 'Rs 75,900', status: 'Reorder soon', statusType: 'reorder', color: 'linear-gradient(135deg, #F7971E, #FFD200)' }
  ];

  // Recent POS Activity Data
  const activities = apiData?.recentActivities || [
    { title: 'Cashier Sarah logged in', subtitle: 'Colombo branch . 10.25 AM', type: 'user', iconBg: '#DCF6E7', iconColor: '#20A866' },
    { title: 'Added 2 X Milk 1L to cart', subtitle: 'Colombo branch . 10.18 AM', type: 'cart', iconBg: '#E8E6FF', iconColor: '#7168F5' },
    { title: 'Order #1025 completed', subtitle: 'Kandy branch . 10.12 AM', type: 'check', iconBg: '#DCF6E7', iconColor: '#20A866' },
    { title: 'Added 1 X Bread 400g to cart', subtitle: 'Negombo branch . 10.05 AM', type: 'cart', iconBg: '#E8E6FF', iconColor: '#7168F5' },
    { title: 'Cashier Nimal logged in', subtitle: 'Jaffna branch . 09.50 AM', type: 'user', iconBg: '#DCF6E7', iconColor: '#20A866' }
  ];

  // Line Chart points data for tooltip interaction. Use real API values when available.
  const defaultChartPoints = [
    { time: '6 AM', revenue: '450,000', profit: '150,000', revenueRaw: 450000, profitRaw: 150000, revY: 155, profY: 190, cx: 35 },
    { time: '9 AM', revenue: '650,000', profit: '250,000', revenueRaw: 650000, profitRaw: 250000, revY: 120, profY: 170, cx: 130 },
    { time: '12.00 PM', revenue: '820,000', profit: '300,000', revenueRaw: 820000, profitRaw: 300000, revY: 76, profY: 142, cx: 225 },
    { time: '3 PM', revenue: '620,000', profit: '220,000', revenueRaw: 620000, profitRaw: 220000, revY: 101, profY: 160, cx: 320 },
    { time: '6 PM', revenue: '750,000', profit: '380,000', revenueRaw: 750000, profitRaw: 380000, revY: 77, profY: 126, cx: 415 },
    { time: '9 PM', revenue: '1,020,000', profit: '450,000', revenueRaw: 1020000, profitRaw: 450000, revY: 45, profY: 105, cx: 510 },
    { time: '12 AM', revenue: '1,245,680', profit: '640,000', revenueRaw: 1245680, profitRaw: 640000, revY: 20, profY: 65, cx: 590 }
  ];

  const rawChartData = apiData?.hourlyBreakdown && apiData.hourlyBreakdown.length === 7
    ? apiData.hourlyBreakdown
    : [];

  const hasChartData = rawChartData.some((pt) => {
    const revenue = parseChartAmount(pt.revenueRaw);
    const profit = parseChartAmount(pt.profitRaw);
    return revenue > 0 || profit > 0;
  });

  const chartDataPoints = buildChartDataPoints(hasChartData ? rawChartData : defaultChartPoints);

  const activePoint = chartDataPoints[hoveredChartPoint] || chartDataPoints[2];

  // Weekly bar values
  const weeklyData = apiData?.weeklyBreakdown || [
    { week: 'Week 1', revPercent: '48%', profPercent: '24%', revenueVal: 480000, profitVal: 240000 },
    { week: 'Week 2', revPercent: '64%', profPercent: '36%', revenueVal: 640000, profitVal: 360000 },
    { week: 'Week 3', revPercent: '76%', profPercent: '42%', revenueVal: 760000, profitVal: 420000 },
    { week: 'Week 4', revPercent: '86%', profPercent: '52%', revenueVal: 860000, profitVal: 520000 }
  ];

  const [hoveredCategory, setHoveredCategory] = useState(null);

  // Top Selling Categories
  const topCategories = apiData?.topCategories || [
    { name: 'Groceries', percent: '36.2', color: '#20A866' },
    { name: 'Beverages', percent: '21.4', color: '#4C47E8' },
    { name: 'Dairy', percent: '15.8', color: '#8174F5' },
    { name: 'Snacks', percent: '12.6', color: '#FFBB36' },
    { name: 'Household', percent: '8.3', color: '#C2E5CF' },
    { name: 'Others', percent: '5.7', color: '#FF8360' }
  ];

  // Dynamic Donut SVG Stroke Math
  const CIRCUMFERENCE = 2 * Math.PI * 60; // ~376.99
  let accumulatedStroke = 0;

  const donutSegments = topCategories.map((cat, i) => {
    const pct = parseFloat(cat.percent || 0);
    const strokeLen = (pct / 100) * CIRCUMFERENCE;
    const strokeGap = CIRCUMFERENCE - strokeLen;
    const offset = -accumulatedStroke;
    accumulatedStroke += strokeLen;

    return {
      ...cat,
      strokeDasharray: `${strokeLen.toFixed(2)} ${strokeGap.toFixed(2)}`,
      strokeDashoffset: offset.toFixed(2),
      color: cat.color || ['#20A866', '#4C47E8', '#8174F5', '#FFBB36', '#C2E5CF', '#FF8360'][i % 6]
    };
  });

  const activeCategoryObj = donutSegments.find(c => c.name === hoveredCategory);

  return (
    <div className="dashboard-container">
      <Sidebar 
        activeItem="dashboard"
        onDashboardClick={() => navigate('/dashboard')}
        onProductClick={() => navigate('/product-management')}
        onSalesClick={() => navigate('/sales-management')}
        onLogoClick={() => navigate('/dashboard')}
      />
      
      <Header 
        title="Dashboard"
        subtitle="Quick insights into your business performance."
        shiftInfo={{ cashier: 'Ravindu', status: 'Shift Open', loginTime: '08:30' }}
        notificationsCount={3}
        showShiftInfo={true}
      />
      
      <main className="page-content">
        {/* Welcome Section */}
        <section className="dashboard-welcome">
          <div className="welcome-text-wrap">
            <div className="sun-icon-box">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5"></circle>
                <line x1="12" y1="1" x2="12" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="23"></line>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                <line x1="1" y1="12" x2="3" y2="12"></line>
                <line x1="21" y1="12" x2="23" y2="12"></line>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
              </svg>
            </div>
            <div>
              <h2>Good Morning, Admin!</h2>
              <p>Here's what's happening at your stores today.</p>
            </div>
          </div>
          {isLoading && <div style={{ fontSize: '12px', color: '#16A34A', fontWeight: '600' }}>● Fetching live data...</div>}
        </section>

        {/* 4 Stat Cards matching reference image */}
        <section className="stats-grid">
          {stats.map((stat) => (
            <article className={`stat-card ${stat.tone}`} key={stat.id}>
              <div className="stat-left-bar" />
              <div className="stat-icon-box" style={{ backgroundColor: stat.iconBg, color: stat.iconColor }}>
                {stat.icon}
              </div>
              <div className="stat-content-block">
                <p className="stat-label">{stat.label}</p>
                <h3 className="stat-value">{stat.value}</h3>
                <div className="stat-trend-sub">
                  <span className={`trend-badge ${stat.isPositive ? 'positive' : 'negative'}`}>
                    {stat.change}
                  </span>
                  <span className="trend-divider">|</span>
                  <span className="trend-vs">VS Yesterday</span>
                </div>
                <div className="stat-sparkline-wrap">
                  {stat.sparkline}
                </div>
              </div>
            </article>
          ))}
        </section>

        {/* Middle Grid */}
        <section className="dashboard-grid dashboard-grid-top">
          {/* Profit & Loss Overview */}
          <article className="panel line-panel">
            <div className="panel-heading">
              <div>
                <h3>Profit &amp; Loss Overview</h3>
                <div className="legend-row">
                  <span className="legend-item"><i className="dot green-dot" /> Revenue (Rs.)</span>
                  <span className="legend-item"><i className="dot blue-dot" /> Profit (Rs.)</span>
                </div>
              </div>
              <div className="period-tabs">
                {['Today', 'Week', 'Month'].map((period) => (
                  <button 
                    key={period} 
                    className={selectedPeriod === period ? 'selected' : ''}
                    onClick={() => setSelectedPeriod(period)}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>

            <div className="line-chart-container">
              {/* Tooltip Overlay matching reference screenshot */}
              <div className="chart-tooltip-box" style={{ left: `${Math.min(Math.max(activePoint.cx - 45, 10), 460)}px`, top: '15px' }}>
                <div className="tooltip-time">{activePoint.time}</div>
                <div className="tooltip-row green">
                  <span className="dot green-dot"></span> Revenue: Rs. {activePoint.revenue}
                </div>
                <div className="tooltip-row blue">
                  <span className="dot blue-dot"></span> Profit: Rs. {activePoint.profit}
                </div>
              </div>

              <div className="line-chart">
                <div className="chart-y-labels">
                  <span>1.25M</span>
                  <span>1M</span>
                  <span>750k</span>
                  <span>500k</span>
                  <span>250k</span>
                  <span>0</span>
                </div>
                <svg viewBox="0 0 600 230" role="img" aria-label="Revenue and profit line chart">
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#20A866" stopOpacity="0.12"/>
                      <stop offset="100%" stopColor="#20A866" stopOpacity="0.0"/>
                    </linearGradient>
                    <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#357DF0" stopOpacity="0.12"/>
                      <stop offset="100%" stopColor="#357DF0" stopOpacity="0.0"/>
                    </linearGradient>
                  </defs>
                  {/* Grid Lines */}
                  <path className="grid-lines" d="M35 20H590M35 58H590M35 96H590M35 134H590M35 172H590M35 210H590" />
                  
                  {/* Area Fills */}
                  <path d="M35,155 L130,120 L225,76 L320,101 L415,77 L510,45 L590,20 L590,210 L35,210 Z" fill="url(#revenueGrad)" />
                  <path d="M35,190 L130,170 L225,142 L320,160 L415,126 L510,105 L590,65 L590,210 L35,210 Z" fill="url(#profitGrad)" />

                  {/* Lines */}
                  <polyline className="revenue-line" points="35,155 130,120 225,76 320,101 415,77 510,45 590,20" />
                  <polyline className="profit-line" points="35,190 130,170 225,142 320,160 L415,126 L510,105 L590,65" />
                  
                  {/* Active Vertical Guideline */}
                  <line x1={activePoint.cx} y1="20" x2={activePoint.cx} y2="210" stroke="#CBD5E1" strokeDasharray="3 3" strokeWidth="1.5" />

                  {/* Points */}
                  <g className="chart-points revenue-points">
                    {chartDataPoints.map((pt, idx) => (
                      <circle 
                        key={`rev-${idx}`} 
                        cx={pt.cx} 
                        cy={pt.revY} 
                        r={hoveredChartPoint === idx ? 6 : 4} 
                        className={hoveredChartPoint === idx ? 'active-node' : ''}
                        onMouseEnter={() => setHoveredChartPoint(idx)}
                      />
                    ))}
                  </g>
                  <g className="chart-points profit-points">
                    {chartDataPoints.map((pt, idx) => (
                      <circle 
                        key={`prof-${idx}`} 
                        cx={pt.cx} 
                        cy={pt.profY} 
                        r={hoveredChartPoint === idx ? 6 : 4} 
                        className={hoveredChartPoint === idx ? 'active-node' : ''}
                        onMouseEnter={() => setHoveredChartPoint(idx)}
                      />
                    ))}
                  </g>
                </svg>
              </div>
              <div className="chart-x-labels">
                {chartDataPoints.map((pt, idx) => (
                  <span 
                    key={pt.time} 
                    className={hoveredChartPoint === idx ? 'selected-x' : ''}
                    onClick={() => setHoveredChartPoint(idx)}
                  >
                    {pt.time}
                  </span>
                ))}
              </div>
            </div>
          </article>

          {/* Revenue vs Profit (This month) */}
          <article className="panel bar-panel">
            <div className="panel-heading">
              <div>
                <h3>Revenue vs Profit <em className="sub-title">(This month)</em></h3>
                <div className="legend-row">
                  <span className="legend-item"><i className="dot green-dot" /> Revenue</span>
                  <span className="legend-item"><i className="dot purple-dot" /> Profit</span>
                </div>
              </div>
              <div className="bar-panel-stat">
                <span className="amount">
                  {apiData?.monthlyTotalSalesFormatted || 'Rs. 845,210'}
                </span>
                <span className={apiData?.isMonthlyPositive === false ? "negative-tag" : "positive-tag"}>
                  {apiData?.monthlySalesChange || '↑ 14.2% vs last month'}
                </span>
              </div>
            </div>

            <div className="bar-chart-container">
              <div className="bar-chart">
                <div className="bars">
                  {weeklyData.map((item) => (
                    <div className="bar-group" key={item.week}>
                      <div className="bar-values">
                        <div 
                          className="bar rev-bar" 
                          style={{ height: item.revPercent }} 
                          title={`Revenue: ${item.revenueVal !== undefined ? 'Rs. ' + item.revenueVal.toLocaleString() : item.revPercent}`} 
                        />
                        <div 
                          className="bar prof-bar" 
                          style={{ height: item.profPercent }} 
                          title={`Profit: ${item.profitVal !== undefined ? 'Rs. ' + item.profitVal.toLocaleString() : item.profPercent}`} 
                        />
                      </div>
                      <span className="bar-label">{item.week}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </article>

          {/* Live Shop Status */}
          <article className="panel branches-panel">
            <div className="panel-heading">
              <h3>Live Shop Status</h3>
              <button className="view-all-btn">View All →</button>
            </div>
            <div className="online-count-badge">
              <span className="green-pulse-dot">●</span> 5 Branches Online
            </div>
            <div className="branches-list">
              {branches.map((b) => (
                <div className="branch-row" key={b.name}>
                  <div className={`branch-icon-box ${b.status === 'Idle' ? 'idle-box' : 'active-box'}`}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                      <polyline points="9 22 9 12 15 12 15 22"></polyline>
                    </svg>
                  </div>
                  <div className="branch-meta">
                    <strong>{b.name}</strong>
                    <small>{b.cashiers} | {b.orders}</small>
                  </div>
                  <span className={`status-pill ${b.status.toLowerCase()}`}>{b.status}</span>
                  <span className="chevron-arrow">›</span>
                </div>
              ))}
            </div>
          </article>
        </section>

        {/* Bottom Grid */}
        <section className="dashboard-grid dashboard-grid-bottom">
          {/* Fast moving products */}
          <article className="panel products-panel">
            <div className="panel-heading">
              <h3>Fast moving Products <em className="sub-title">(This month)</em></h3>
              <button className="view-all-btn">View All →</button>
            </div>
            <div className="product-table">
              <div className="table-head">
                <span>Product</span>
                <span>Category</span>
                <span>Sold</span>
                <span>Revenue</span>
                <span>Restock</span>
              </div>
              <div className="table-body">
                {products.map((p) => (
                  <div className="product-row" key={p.name}>
                    <div className="product-name-col">
                      <span className="product-thumb" style={{ background: p.color }} />
                      <strong>{p.name}</strong>
                    </div>
                    <span>{p.category}</span>
                    <span className="bold-num">{p.sold}</span>
                    <span className="bold-num">{p.revenue}</span>
                    <div>
                      <span className={`restock-badge ${p.statusType}`}>{p.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </article>

          {/* Top Selling categories */}
          <article className="panel category-panel">
            <div className="panel-heading">
              <h3>Top Selling categories <em className="sub-title">(This month)</em></h3>
            </div>
            <div className="donut-wrap">
              <div className="donut-chart-box">
                <svg viewBox="0 0 160 160" className="donut-svg">
                  {donutSegments.map((seg) => (
                    <circle 
                      key={seg.name}
                      cx="80" 
                      cy="80" 
                      r="60" 
                      fill="transparent" 
                      stroke={seg.color} 
                      strokeWidth={hoveredCategory === seg.name ? "25" : "22"} 
                      strokeDasharray={seg.strokeDasharray} 
                      strokeDashoffset={seg.strokeDashoffset} 
                      style={{
                        transition: 'stroke-width 0.2s ease, opacity 0.2s ease',
                        cursor: 'pointer',
                        opacity: hoveredCategory && hoveredCategory !== seg.name ? 0.55 : 1
                      }}
                      onMouseEnter={() => setHoveredCategory(seg.name)}
                      onMouseLeave={() => setHoveredCategory(null)}
                    />
                  ))}
                </svg>
                <div className="donut-center-text">
                  <span className="donut-label">
                    {activeCategoryObj ? activeCategoryObj.name : 'Total Sales'}
                  </span>
                  <strong className="donut-val">
                    {activeCategoryObj 
                      ? `${activeCategoryObj.percent}%` 
                      : (apiData?.monthlyTotalSalesFormatted || 'Rs. 845,210')
                    }
                  </strong>
                </div>
              </div>
              <ul className="category-legend">
                {donutSegments.map((cat, i) => (
                  <li 
                    key={cat.name}
                    className={hoveredCategory === cat.name ? 'legend-hovered' : ''}
                    onMouseEnter={() => setHoveredCategory(cat.name)}
                    onMouseLeave={() => setHoveredCategory(null)}
                    style={{ 
                      cursor: 'pointer',
                      opacity: hoveredCategory && hoveredCategory !== cat.name ? 0.55 : 1, 
                      transition: 'opacity 0.2s ease, transform 0.15s ease' 
                    }}
                  >
                    <i style={{ backgroundColor: cat.color }} /> 
                    <span>{cat.name}</span>
                    <b>{cat.percent}%</b>
                  </li>
                ))}
              </ul>
            </div>
          </article>

          {/* Recent POS Activity */}
          <article className="panel activity-panel">
            <div className="panel-heading">
              <h3>Recent POS Activity</h3>
              <button className="view-all-btn">View All →</button>
            </div>
            <div className="activity-list">
              {activities.map((act, index) => (
                <div className="activity-row" key={index}>
                  <div className="activity-icon-box" style={{ backgroundColor: act.iconBg, color: act.iconColor }}>
                    {act.type === 'user' && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                      </svg>
                    )}
                    {act.type === 'cart' && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="9" cy="21" r="1"></circle>
                        <circle cx="20" cy="21" r="1"></circle>
                        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                      </svg>
                    )}
                    {act.type === 'check' && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                      </svg>
                    )}
                  </div>
                  <div className="activity-info">
                    <strong>{act.title}</strong>
                    <small>{act.subtitle}</small>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>

        {/* End of Day Report Banner */}
        <section className="report-bar-card">
          <div className="report-text">
            <h3>End of Day Report</h3>
            <p>Download sales, profit &amp; loss, and transaction report for a specific date or date range.</p>
            {reportError && <p className="report-error" role="alert">{reportError}</p>}
          </div>
          <div className="report-controls">
            <div className="date-picker-box">
              <span className="picker-label">Start Date</span>
              <div className="picker-input-wrap">
                <button type="button" className="picker-calendar-btn" aria-label="Open start date calendar" onClick={() => openDatePicker(startDateInputRef)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                </button>
                <input
                  ref={startDateInputRef}
                  type="date"
                  aria-label="Start date"
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)} 
                />
              </div>
            </div>

            <div className="date-picker-box">
              <span className="picker-label">End Date</span>
              <div className="picker-input-wrap">
                <button type="button" className="picker-calendar-btn" aria-label="Open end date calendar" onClick={() => openDatePicker(endDateInputRef)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                </button>
                <input
                  ref={endDateInputRef}
                  type="date"
                  aria-label="End date"
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)} 
                />
              </div>
            </div>

            <details className="report-download-menu">
              <summary className="download-report-btn" aria-label="Choose report download format">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                <span>{isReportDownloading ? 'Preparing Report…' : 'Download Report'}</span>
                <span className="arrow-down" aria-hidden="true">⌄</span>
              </summary>
              <div className="report-format-options">
                <button type="button" disabled={isReportDownloading} onClick={(event) => {
                  event.currentTarget.closest('details').open = false;
                  handleDownloadReport('pdf');
                }}>PDF (.pdf)</button>
                <button type="button" disabled={isReportDownloading} onClick={(event) => {
                  event.currentTarget.closest('details').open = false;
                  handleDownloadReport('csv');
                }}>CSV (.csv)</button>
              </div>
            </details>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Dashboard;