import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend
} from 'recharts';

/**
 * Recharts Pie Chart (Present vs Absent)
 */
export function AttendancePieChart({ present = 0, absent = 0 }) {
  const data = [
    { name: 'Present', value: present, color: 'var(--success)' },
    { name: 'Absent', value: absent, color: 'var(--danger)' }
  ];

  const total = present + absent;

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full py-8 text-center text-gray-400">
        <p className="text-sm">No Attendance Logged Yet</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 w-full h-[280px]">
      <ResponsiveContainer width="100%" height="90%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ 
              background: 'var(--bg-secondary)', 
              borderColor: 'var(--border-glass)',
              borderRadius: '8px',
              color: 'var(--text-primary)'
            }} 
          />
          <Legend formatter={(value) => <span className="text-sm text-secondary">{value}</span>} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Recharts Bar Chart (Monthly Attendance Trends)
 */
export function AttendanceBarChart({ attendanceRecords = [], students = [] }) {
  // 1. Group records by month (format: YYYY-MM)
  const monthlyData = {};
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Initialize last 6 months (including current month) to ensure structure
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthlyData[key] = { 
      present: 0, 
      total: 0, 
      label: `${monthNames[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}` 
    };
  }

  // Populate data
  attendanceRecords.forEach((record) => {
    if (!record.date) return;
    const dateObj = new Date(record.date);
    if (isNaN(dateObj.getTime())) return;
    const key = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
    
    // Only compile if the month is in our last 6 months window
    if (monthlyData[key]) {
      monthlyData[key].total += 1;
      if (record.status === 'Present') {
        monthlyData[key].present += 1;
      }
    }
  });

  // Convert to array
  const chartData = Object.keys(monthlyData)
    .sort()
    .map((key) => {
      const item = monthlyData[key];
      const percentage = item.total > 0 ? (item.present / item.total) * 100 : 0;
      return {
        month: item.label.split(' ')[0], // just the month name e.g. "Jan"
        'Attendance %': parseFloat(percentage.toFixed(1)),
        present: item.present,
        total: item.total
      };
    });

  return (
    <div className="w-full h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 10, left: -20, bottom: 5 }}
        >
          <XAxis 
            dataKey="month" 
            stroke="var(--text-secondary)" 
            fontSize={12} 
            tickLine={false} 
          />
          <YAxis 
            stroke="var(--text-secondary)" 
            fontSize={12} 
            tickFormatter={(v) => `${v}%`} 
            domain={[0, 100]}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{ 
              background: 'var(--bg-secondary)', 
              borderColor: 'var(--border-glass)',
              borderRadius: '8px',
              color: 'var(--text-primary)'
            }}
            formatter={(value) => [`${value}%`, 'Attendance Rate']}
          />
          <Bar 
            dataKey="Attendance %" 
            fill="var(--accent-primary)" 
            radius={[4, 4, 0, 0]}
            barSize={32}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill="var(--accent-primary)" />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
