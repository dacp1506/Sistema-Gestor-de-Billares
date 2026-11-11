import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { FileSpreadsheet, RefreshCw } from 'lucide-react-native';
import { OptionPicker } from '../components/OptionPicker';
import { ApiError } from '../services/api';
import type { AuthUser } from '../services/auth';
import { listBranches } from '../services/products';
import type { Branch } from '../services/products';
import { getFinancialReport, type FinancialReport, type ReportPeriod } from '../services/reports';
import { colors, shadows } from '../theme';

const periods: Array<{ key: ReportPeriod; label: string }> = [
  { key: 'diario', label: 'Diario (Hoy)' },
  { key: 'semanal', label: 'Semanal (7 días)' },
  { key: 'mensual', label: 'Mensual' },
  { key: 'anual', label: 'Anual' },
];

const periodLabel: Record<ReportPeriod, string> = {
  diario: 'Diario (Hoy)',
  semanal: 'Semanal (7 días)',
  mensual: 'Mensual',
  anual: 'Anual',
};

function money(value: number | string) {
  return `Bs. ${Number(value || 0).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function plural(count: number, singular: string, pluralForm: string) {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

function percent(value: number, total: number) {
  if (total <= 0) return '0%';
  const ratio = (value / total) * 100;
  if (ratio > 0 && ratio < 1) return '<1%';
  return `${Math.round(ratio)}%`;
}

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError || error instanceof Error) return error.message;
  return 'No se pudo cargar el reporte financiero.';
}

export default function ReportsScreen({ user }: { user: AuthUser }) {
  const { width } = useWindowDimensions();
  const compact = width < 900;
  const isGeneralAdmin = user.rol === 'admin_general';

  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchScope, setBranchScope] = useState(isGeneralAdmin ? 'all' : String(user.id_sucursal ?? ''));
  const [period, setPeriod] = useState<ReportPeriod>('diario');
  const [report, setReport] = useState<FinancialReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    void listBranches()
      .then((result) => {
        if (!active) return;
        setBranches(result);
        if (!isGeneralAdmin) setBranchScope(String(user.id_sucursal ?? result[0]?.id_sucursal ?? ''));
      })
      .catch((loadError: unknown) => {
        if (active) setError(getErrorMessage(loadError));
      });
    return () => { active = false; };
  }, [isGeneralAdmin, user.id_sucursal]);

  useEffect(() => {
    if (!branchScope && !isGeneralAdmin) {
      setLoading(false);
      setReport(null);
      return;
    }

    let active = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await getFinancialReport(period, branchScope === 'all' ? undefined : branchScope);
        if (active) setReport(result);
      } catch (loadError) {
        if (active) setError(getErrorMessage(loadError));
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => { active = false; };
  }, [branchScope, isGeneralAdmin, period, refreshKey]);

  const refresh = useCallback(() => setRefreshKey((current) => current + 1), []);
  const selectedBranch = branches.find((branch) => String(branch.id_sucursal) === branchScope);

  const metrics = useMemo(() => {
    const summary = report?.summary;
    const total = Number(summary?.ingresos_totales || 0);
    const rentals = Number(summary?.alquiler_mesas || 0);
    const pos = Number(summary?.ventas_directas || 0) + Number(summary?.consumos_mesa || 0);
    const sales = Number(summary?.ventas || 0);
    const sessions = Number(summary?.sesiones_finalizadas || 0);
    const operations = sales + sessions;
    return {
      total,
      rentals,
      pos,
      sales,
      sessions,
      operations,
      ticket: operations > 0 ? total / operations : 0,
    };
  }, [report]);

  const chain = useMemo(() => {
    const rows = report?.branches || [];
    const total = rows.reduce((sum, branch) => sum + Number(branch.total || 0), 0);
    return {
      rows: rows.map((branch) => ({
        ...branch,
        amount: Number(branch.total || 0),
        pct: total > 0 ? Math.round((Number(branch.total || 0) / total) * 100) : 0,
      })),
      total,
    };
  }, [report]);

  const chartMax = useMemo(() => {
    const values = (report?.series || []).flatMap((point) => [
      Number(point.alquiler_mesas) || 0,
      Number(point.ventas_productos) || 0,
    ]);
    return Math.max(1, ...values);
  }, [report]);

  const branchOptions = useMemo(
    () => [
      { value: 'all', label: 'Consolidado: Todas las Sucursales' },
      ...branches.map((branch) => ({
        value: String(branch.id_sucursal),
        label: branch.nombre,
      })),
    ],
    [branches],
  );

  const exportCsv = () => {
    if (!report || Platform.OS !== 'web' || typeof document === 'undefined') return;
    const currentPeriod = periodLabel[report.period] || report.period;
    const rows: string[][] = [
      ['Periodo', 'Sucursal', 'Ingresos mesas (BOB)', 'Ingresos POS (BOB)', 'Total bruto (BOB)'],
    ];
    for (const branch of report.branches) {
      rows.push([
        currentPeriod,
        branch.nombre,
        Number(branch.alquiler_mesas || 0).toFixed(2),
        Number(branch.ventas_productos || 0).toFixed(2),
        Number(branch.total || 0).toFixed(2),
      ]);
    }
    rows.push([
      'TOTAL',
      '',
      metrics.rentals.toFixed(2),
      metrics.pos.toFixed(2),
      metrics.total.toFixed(2),
    ]);

    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\r\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reporte-contable-${report.period}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={[styles.content, compact && styles.contentCompact]}>
        <View style={styles.toolbarCard}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.periodRow}>
            {periods.map((option) => {
              const active = period === option.key;
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  key={option.key}
                  onPress={() => setPeriod(option.key)}
                  style={({ pressed }) => [styles.periodChip, active && styles.periodChipActive, pressed && styles.pressed]}
                >
                  <Text style={[styles.periodText, active && styles.periodTextActive]}>{option.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={[styles.toolbarActions, compact && styles.toolbarActionsCompact]}>
            {isGeneralAdmin ? (
              <View style={styles.branchFilter}>
                <OptionPicker
                  label="Sucursal del reporte"
                  onSelect={setBranchScope}
                  options={branchOptions}
                  placeholder="Consolidado: Todas las Sucursales"
                  value={branchScope}
                />
              </View>
            ) : (
              <View style={styles.branchChip}>
                <Text style={styles.branchChipLabel}>SUCURSAL</Text>
                <Text style={styles.branchChipValue}>{selectedBranch?.nombre || 'Sucursal asignada'}</Text>
              </View>
            )}

            {Platform.OS === 'web' ? (
              <Pressable
                accessibilityRole="button"
                disabled={!report || loading}
                onPress={exportCsv}
                style={({ pressed }) => [
                  styles.exportButton,
                  pressed && styles.pressed,
                  (!report || loading) && styles.disabled,
                ]}
              >
                <FileSpreadsheet color="#04130d" size={16} />
                <Text style={styles.exportText}>Exportar Contabilidad (CSV)</Text>
              </Pressable>
            ) : null}

            <Pressable
              accessibilityLabel="Actualizar reporte financiero"
              accessibilityRole="button"
              disabled={loading}
              onPress={refresh}
              style={({ pressed }) => [styles.refreshButton, pressed && styles.pressed, loading && styles.disabled]}
            >
              {loading
                ? <ActivityIndicator color={colors.accent} size="small" />
                : <RefreshCw color={colors.accent} size={16} />}
            </Pressable>
          </View>
        </View>

        {error ? (
          <View accessibilityRole="alert" style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {loading && !report ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={colors.accent} />
            <Text style={styles.loadingText}>Consultando agregados financieros…</Text>
          </View>
        ) : null}

        {report ? (
          <>
            <View style={styles.kpiGrid}>
              <KpiCard
                detail={`${plural(metrics.sales, 'venta', 'ventas')} POS · ${plural(metrics.sessions, 'sesión', 'sesiones')}`}
                label="Ingresos Brutos"
                tone="accent"
                value={money(metrics.total)}
              />
              <KpiCard
                detail={`${percent(metrics.rentals, metrics.total)} del ingreso total`}
                label="Alquiler de Mesas"
                tone="warning"
                value={money(metrics.rentals)}
              />
              <KpiCard
                detail={`${percent(metrics.pos, metrics.total)} del ingreso total`}
                label="Ventas POS / Barra"
                tone="info"
                value={money(metrics.pos)}
              />
              <KpiCard
                detail="Por venta POS o sesión finalizada"
                label="Ticket Promedio"
                tone="default"
                value={money(metrics.ticket)}
              />
              <KpiCard
                detail={`${metrics.sales} POS · ${plural(metrics.sessions, 'sesión finalizada', 'sesiones finalizadas')}`}
                label="Operaciones Registradas"
                tone="default"
                value={String(metrics.operations)}
              />
            </View>

            <View style={[styles.chartsRow, compact && styles.chartsRowCompact]}>
              <View style={[styles.panel, styles.chartPanel]}>
                <View style={styles.panelHeader}>
                  <View style={styles.panelHeading}>
                    <Text style={styles.panelTitle}>Evolución de Ingresos: Mesas vs. POS</Text>
                    <Text style={styles.panelSubtitle}>Comparativa contable por tramo del período</Text>
                  </View>
                  <View style={styles.legend}>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, styles.legendDotTables]} />
                      <Text style={styles.legendText}>Mesas</Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, styles.legendDotPos]} />
                      <Text style={styles.legendText}>POS</Text>
                    </View>
                  </View>
                </View>

                {report.series.length ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chart}>
                    {report.series.map((point) => {
                      const rentalsHeight = (Number(point.alquiler_mesas) || 0) / chartMax * 150;
                      const posHeight = (Number(point.ventas_productos) || 0) / chartMax * 150;
                      return (
                        <View key={point.periodo} style={styles.barGroup}>
                          <View style={styles.plot}>
                            <View
                              style={[
                                styles.bar,
                                styles.barTables,
                                { height: Math.max(rentalsHeight, Number(point.alquiler_mesas) > 0 ? 3 : 0) },
                              ]}
                            />
                            <View
                              style={[
                                styles.bar,
                                styles.barPos,
                                { height: Math.max(posHeight, Number(point.ventas_productos) > 0 ? 3 : 0) },
                              ]}
                            />
                          </View>
                          <Text numberOfLines={1} style={styles.barLabel}>{point.etiqueta}</Text>
                        </View>
                      );
                    })}
                  </ScrollView>
                ) : (
                  <Text style={styles.emptyText}>No hay movimientos en el período seleccionado.</Text>
                )}
              </View>

              <View style={[styles.panel, styles.branchPanel]}>
                <View style={styles.panelHeading}>
                  <Text style={styles.panelTitle}>Rendimiento por Sucursal</Text>
                  <Text style={styles.panelSubtitle}>Participación porcentual en los ingresos del alcance</Text>
                </View>

                {chain.rows.length ? (
                  <View style={styles.branchList}>
                    {chain.rows.map((branch) => (
                      <View key={String(branch.id_sucursal)} style={styles.branchRow}>
                        <View style={styles.branchRowHead}>
                          <Text numberOfLines={1} style={styles.branchName}>{branch.nombre}</Text>
                          <Text style={styles.branchAmount}>{money(branch.amount)} ({branch.pct}%)</Text>
                        </View>
                        <View style={styles.progressTrack}>
                          <View style={[styles.progressFill, { width: `${branch.pct}%` }]} />
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.emptyText}>No hay ingresos registrados por sucursal.</Text>
                )}

                <View style={styles.branchFooter}>
                  <Text style={styles.footerLabel}>Alcance del reporte:</Text>
                  <Text style={styles.footerValue}>
                    {periodLabel[period]} · {report.branches.length} sucursal{report.branches.length === 1 ? '' : 'es'}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.panel}>
              <View style={styles.ledgerHeader}>
                <Text style={styles.panelTitle}>Libro Diario Contable (Auditoría)</Text>
                <Text style={styles.panelMeta}>Cifras en bolivianos · sin impuestos ni costos</Text>
              </View>

              {!compact ? (
                <View style={styles.ledgerHeadRow}>
                  <Text style={[styles.ledgerHeadCell, styles.colPeriod]}>Período / Fecha</Text>
                  <Text style={[styles.ledgerHeadCell, styles.colBranch]}>Sucursal</Text>
                  <Text style={[styles.ledgerHeadCell, styles.colMoney]}>Ingresos Mesas</Text>
                  <Text style={[styles.ledgerHeadCell, styles.colMoney]}>Ingresos POS</Text>
                  <Text style={[styles.ledgerHeadCell, styles.colMoney, styles.alignRight]}>Total Neto</Text>
                </View>
              ) : null}

              {report.branches.length ? report.branches.map((branch) => (
                <View key={String(branch.id_sucursal)} style={[styles.ledgerRow, compact && styles.ledgerRowCompact]}>
                  <View style={[styles.ledgerCellBlock, styles.colPeriod]}>
                    {compact ? <Text style={styles.cellLabel}>Período</Text> : null}
                    <Text style={styles.ledgerPeriod}>{periodLabel[report.period]}</Text>
                  </View>
                  <View style={[styles.ledgerCellBlock, styles.colBranch]}>
                    {compact ? <Text style={styles.cellLabel}>Sucursal</Text> : null}
                    <Text style={styles.ledgerBranch}>{branch.nombre}</Text>
                  </View>
                  <View style={[styles.ledgerCellBlock, styles.colMoney]}>
                    {compact ? <Text style={styles.cellLabel}>Ingresos mesas</Text> : null}
                    <Text style={styles.ledgerTables}>{money(branch.alquiler_mesas)}</Text>
                  </View>
                  <View style={[styles.ledgerCellBlock, styles.colMoney]}>
                    {compact ? <Text style={styles.cellLabel}>Ingresos POS</Text> : null}
                    <Text style={styles.ledgerPos}>{money(branch.ventas_productos)}</Text>
                  </View>
                  <View style={[styles.ledgerCellBlock, styles.colMoney]}>
                    {compact ? <Text style={styles.cellLabel}>Total</Text> : null}
                    <Text style={styles.ledgerTotal}>{money(branch.total)}</Text>
                  </View>
                </View>
              )) : (
                <Text style={styles.emptyText}>El período seleccionado no registra ingresos.</Text>
              )}

              {report.branches.length ? (
                <View style={[styles.ledgerRow, styles.ledgerTotalsRow, compact && styles.ledgerRowCompact]}>
                  <Text style={[styles.ledgerTotalsLabel, compact && styles.ledgerTotalsLabelCompact]}>
                    TOTAL {periodLabel[report.period].toUpperCase()}
                  </Text>
                  <Text style={[styles.ledgerTotalsTables, !compact && styles.colMoney]}>{money(metrics.rentals)}</Text>
                  <Text style={[styles.ledgerTotalsPos, !compact && styles.colMoney]}>{money(metrics.pos)}</Text>
                  <Text style={[styles.ledgerTotalsValue, !compact && styles.colMoney, !compact && styles.alignRight]}>
                    {money(metrics.total)}
                  </Text>
                </View>
              ) : null}
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function KpiCard({ label, value, detail, tone }: {
  label: string;
  value: string;
  detail: string;
  tone: 'accent' | 'warning' | 'info' | 'default';
}) {
  return (
    <View style={styles.kpiCard}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={[
        styles.kpiValue,
        tone === 'accent' && styles.kpiAccent,
        tone === 'warning' && styles.kpiWarning,
        tone === 'info' && styles.kpiInfo,
      ]}>
        {value}
      </Text>
      <Text style={styles.kpiDetail}>{detail}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, gap: 16, width: '100%', maxWidth: 1500, alignSelf: 'center' },
  contentCompact: { padding: 14, gap: 14 },
  pressed: { opacity: 0.82 },
  disabled: { opacity: 0.5 },

  toolbarCard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    ...shadows,
  },
  periodRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 4 },
  periodChip: {
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
  },
  periodChipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  periodText: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  periodTextActive: { color: '#04130d', fontWeight: '800' },

  toolbarActions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 },
  toolbarActionsCompact: { width: '100%' },
  branchFilter: { width: 260, maxWidth: '100%' },
  branchChip: {
    minHeight: 46,
    justifyContent: 'center',
    paddingHorizontal: 13,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
  },
  branchChipLabel: { color: colors.textMuted, fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  branchChipValue: { color: colors.text, fontSize: 12, fontWeight: '700', marginTop: 3 },

  exportButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 15,
    borderRadius: 11,
    backgroundColor: colors.info,
  },
  exportText: { color: '#04130d', fontSize: 12, fontWeight: '800' },
  refreshButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
  },

  errorBox: {
    borderWidth: 1,
    borderColor: 'rgba(251, 113, 133, 0.45)',
    borderRadius: 12,
    backgroundColor: colors.dangerSoft,
    padding: 13,
  },
  errorText: { color: colors.danger, fontSize: 12, lineHeight: 18 },
  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 40,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  loadingText: { color: colors.textMuted, fontSize: 12 },

  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 13 },
  kpiCard: {
    flexGrow: 1,
    flexBasis: '18%',
    minWidth: 190,
    padding: 16,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    ...shadows,
  },
  kpiLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
  kpiValue: { color: colors.text, fontSize: 22, fontWeight: '900', marginTop: 7 },
  kpiAccent: { color: colors.accent },
  kpiWarning: { color: colors.warning },
  kpiInfo: { color: colors.info },
  kpiDetail: { color: colors.textMuted, fontSize: 10, marginTop: 6 },

  chartsRow: { flexDirection: 'row', alignItems: 'stretch', gap: 14 },
  chartsRowCompact: { flexDirection: 'column' },
  panel: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    backgroundColor: colors.surface,
    padding: 18,
    ...shadows,
  },
  chartPanel: { flex: 7, minWidth: 0 },
  branchPanel: { flex: 5, minWidth: 0, justifyContent: 'space-between' },
  panelHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 14 },
  panelHeading: { flex: 1, minWidth: 200 },
  panelTitle: { color: colors.text, fontSize: 14, fontWeight: '800' },
  panelSubtitle: { color: colors.textMuted, fontSize: 11, marginTop: 3, lineHeight: 16 },
  panelMeta: { color: colors.textMuted, fontSize: 11 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 9, height: 9, borderRadius: 2 },
  legendDotTables: { backgroundColor: colors.warning },
  legendDotPos: { backgroundColor: colors.info },
  legendText: { color: colors.textMuted, fontSize: 10, fontWeight: '700' },

  chart: { minHeight: 200, alignItems: 'flex-end', gap: 14, paddingTop: 8, paddingBottom: 4, borderBottomWidth: 1, borderColor: colors.border },
  barGroup: { width: 46, alignItems: 'center', gap: 8 },
  plot: { width: 38, height: 160, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 3 },
  bar: { width: 15, borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  barTables: { backgroundColor: colors.warning },
  barPos: { backgroundColor: colors.info },
  barLabel: { width: 54, color: colors.textMuted, fontSize: 9, textAlign: 'center' },

  branchList: { gap: 14, marginTop: 4 },
  branchRow: { gap: 6 },
  branchRowHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  branchName: { flex: 1, color: colors.text, fontSize: 11, fontWeight: '700' },
  branchAmount: { color: colors.accent, fontSize: 11, fontWeight: '800' },
  progressTrack: { height: 9, borderRadius: 999, backgroundColor: colors.surfaceRaised, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 999, backgroundColor: colors.accent },
  branchFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 18,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  footerLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '700' },
  footerValue: { color: colors.text, fontSize: 10, fontWeight: '800' },

  ledgerHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  ledgerHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginTop: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(2, 6, 23, 0.45)',
  },
  ledgerHeadCell: { color: colors.textMuted, fontSize: 9, fontWeight: '800', letterSpacing: 0.9, textTransform: 'uppercase' },
  ledgerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderColor: 'rgba(37, 49, 73, 0.7)',
  },
  ledgerRowCompact: { flexDirection: 'column', alignItems: 'stretch', gap: 8 },
  ledgerCellBlock: { minWidth: 0 },
  colPeriod: { flexBasis: 130, flexGrow: 1 },
  colBranch: { flexBasis: 180, flexGrow: 1.4 },
  colMoney: { width: 130 },
  alignRight: { textAlign: 'right' },
  cellLabel: { color: colors.textMuted, fontSize: 9, fontWeight: '800', letterSpacing: 0.9, textTransform: 'uppercase', marginBottom: 4 },
  ledgerPeriod: { color: colors.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  ledgerBranch: { color: colors.text, fontSize: 12, fontWeight: '700' },
  ledgerTables: { color: colors.warning, fontSize: 12, fontWeight: '700' },
  ledgerPos: { color: colors.info, fontSize: 12, fontWeight: '700' },
  ledgerTotal: { color: colors.accent, fontSize: 13, fontWeight: '900' },

  ledgerTotalsRow: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderBottomWidth: 0,
    marginTop: 2,
    borderRadius: 10,
  },
  ledgerTotalsLabel: { flex: 1, color: colors.text, fontSize: 11, fontWeight: '900', letterSpacing: 0.6 },
  ledgerTotalsLabelCompact: { flex: 0 },
  ledgerTotalsTables: { color: colors.warning, fontSize: 12, fontWeight: '900' },
  ledgerTotalsPos: { color: colors.info, fontSize: 12, fontWeight: '900' },
  ledgerTotalsValue: { color: colors.accent, fontSize: 14, fontWeight: '900' },

  emptyText: { color: colors.textMuted, fontSize: 11, lineHeight: 18, textAlign: 'center', paddingVertical: 22 },
});
