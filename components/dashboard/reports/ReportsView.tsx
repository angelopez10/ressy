'use client';

import { useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { BarChart3, Download } from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useRouter } from '@/lib/i18n/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { StatCard } from '@/components/dashboard/StatCard';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { useToast } from '@/components/ui/Toast';
import { CalendarCheck, DollarSign, UserX, Wallet } from 'lucide-react';
import { formatMoney } from '@/lib/db/mappers';
import { exportBookingsCsv } from '@/lib/dashboard/reports.actions';
import type { ReportsData, ReportRange } from '@/lib/dashboard/reports';

const ACCENT = '#348D83';
const INK = '#222222';
const INK_TERTIARY = '#B0B0B0';
const SUCCESS = '#008A05';
const CATS = [ACCENT, INK, SUCCESS, INK_TERTIARY, '#7FB5AE'];

export function ReportsView({
  data,
  range,
  currency,
  locale,
  canExport,
}: {
  data: ReportsData;
  range: ReportRange;
  currency: string;
  locale: string;
  canExport: boolean;
}) {
  const t = useTranslations('dashboard.reports');
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  const money = (n: number) => formatMoney(n, currency, locale);

  function setRange(r: string) {
    startTransition(() => router.push(`/dashboard/reports?range=${r}`));
  }

  async function download() {
    const res = await exportBookingsCsv(range);
    if (!res.ok) {
      toast(t('exportBusinessOnly'), 'error');
      return;
    }
    const blob = new Blob([res.csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = res.filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  const rangeSelect = (
    <div className="flex items-center gap-2">
      <Select value={range} onChange={(e) => setRange(e.target.value)} className="h-11 w-auto" aria-label={t('title')}>
        <option value="last7">{t('range.last7')}</option>
        <option value="last30">{t('range.last30')}</option>
        <option value="thisMonth">{t('range.thisMonth')}</option>
        <option value="thisYear">{t('range.thisYear')}</option>
      </Select>
      <Button variant="secondary" size="sm" onClick={download} disabled={!canExport} title={canExport ? undefined : t('exportBusinessOnly')}>
        <Download aria-hidden="true" />
        <span className="hidden sm:inline">{t('exportCsv')}</span>
      </Button>
    </div>
  );

  if (data.isEmpty) {
    return (
      <div>
        <PageHeader title={t('title')} subtitle={t('subtitle')} action={rangeSelect} />
        <Card className="flex flex-col items-center gap-2 p-12 text-center">
          <BarChart3 className="text-ink-tertiary size-8" aria-hidden="true" />
          <h2 className="text-h3 text-ink">{t('empty.title')}</h2>
          <p className="text-ink-secondary max-w-sm text-sm">{t('empty.body')}</p>
        </Card>
      </div>
    );
  }

  const newVsReturning = [
    { label: t('charts.new'), value: data.newClients },
    { label: t('charts.returning'), value: data.returningClients },
  ];
  const sourceData = data.bySource.map((s) => ({ label: t(`source.${s.label}` as never), value: s.value }));

  return (
    <div className={pending ? 'opacity-60' : undefined}>
      <PageHeader title={t('title')} subtitle={t('subtitle')} action={rangeSelect} />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard Icon={CalendarCheck} label={t('stats.bookings')} value={String(data.totalBookings)} />
        <StatCard Icon={DollarSign} label={t('stats.revenue')} value={money(data.revenue)} />
        <StatCard Icon={UserX} label={t('stats.noShowRate')} value={`${data.noShowRate}%`} />
        <StatCard Icon={Wallet} label={t('stats.avgTicket')} value={money(data.avgTicket)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title={t('charts.revenueByDay')}>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data.revenueByDay} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={ACCENT} stopOpacity={0.2} />
                  <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: INK_TERTIARY }} tickLine={false} axisLine={false} minTickGap={24} />
              <YAxis tick={{ fontSize: 11, fill: INK_TERTIARY }} tickLine={false} axisLine={false} width={48} />
              <Tooltip formatter={(v) => money(Number(v))} />
              <Area type="monotone" dataKey="value" stroke={ACCENT} strokeWidth={2} fill="url(#rev)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title={t('charts.bookingsByDay')}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.bookingsByDay} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: INK_TERTIARY }} tickLine={false} axisLine={false} minTickGap={24} />
              <YAxis tick={{ fontSize: 11, fill: INK_TERTIARY }} tickLine={false} axisLine={false} width={32} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" fill={ACCENT} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title={t('charts.topServices')}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.topServices} layout="vertical" margin={{ top: 4, right: 12, bottom: 4, left: 8 }}>
              <XAxis type="number" hide allowDecimals={false} />
              <YAxis type="category" dataKey="label" tick={{ fontSize: 12, fill: INK }} tickLine={false} axisLine={false} width={110} />
              <Tooltip />
              <Bar dataKey="value" fill={ACCENT} radius={[0, 4, 4, 0]} barSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title={t('charts.byStaff')}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.byStaff} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: INK_TERTIARY }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: INK_TERTIARY }} tickLine={false} axisLine={false} width={32} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" fill={INK} radius={[4, 4, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title={t('charts.newVsReturning')}>
          <DonutChart data={newVsReturning} />
        </ChartCard>

        <ChartCard title={t('charts.bySource')}>
          <DonutChart data={sourceData} />
        </ChartCard>
      </div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-5">
      <h2 className="text-ink mb-4 text-base font-semibold">{title}</h2>
      {children}
    </Card>
  );
}

function DonutChart({ data }: { data: { label: string; value: number }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <p className="text-ink-secondary py-12 text-center text-sm">—</p>;
  return (
    <div className="flex items-center gap-4">
      <ResponsiveContainer width="50%" height={160}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="label" innerRadius={40} outerRadius={64} paddingAngle={2}>
            {data.map((_, i) => (
              <Cell key={i} fill={CATS[i % CATS.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
      <ul className="flex flex-1 flex-col gap-2">
        {data.map((d, i) => (
          <li key={d.label} className="flex items-center gap-2 text-sm">
            <span className="size-2.5 rounded-sm" style={{ background: CATS[i % CATS.length] }} />
            <span className="text-ink-secondary flex-1">{d.label}</span>
            <span className="text-ink font-semibold">{d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
