import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { RefreshCw } from 'lucide-react-native';
import type { AuthUser } from '../services/auth';
import { ApiError } from '../services/api';
import { listBranches, type Branch } from '../services/products';
import { getFinancialReport, type FinancialReport, type ReportPeriod } from '../services/reports';
import { colors, shadows } from '../theme';

const periods: Array<{ key: ReportPeriod; label: string }> = [
  { key: 'diario', label: 'Hoy' },
  { key: 'semanal', label: '7 días' },
  { key: 'mensual', label: 'Este mes' },
  { key: 'anual', label: 'Este año' },
];

function money(value: number | string) {
  return `Bs. ${Number(value || 0).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function ReportsScreen({ user }: { user: AuthUser }) {
  const { width } = useWindowDimensions();
  const compact = width < 720;
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
  const maxValue = useMemo(() => Math.max(1, ...(report?.series.map((point) => Number(point.total) || 0) || [])), [report]);
  const cards = report ? [
    { title: 'Ingresos registrados', amount: report.summary.ingresos_totales, detail: 'Ventas de productos y sesiones finalizadas', tone: 'green' as const },
    { title: 'Ventas de productos', amount: Number(report.summary.ventas_directas) + Number(report.summary.consumos_mesa), detail: `${report.summary.ventas} operaciones POS`, tone: 'blue' as const },
    { title: 'Alquiler finalizado', amount: report.summary.alquiler_mesas, detail: `${report.summary.sesiones_finalizadas} sesiones`, tone: 'amber' as const },
  ] : [];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={[styles.content, compact && styles.contentCompact]}>
        <View style={styles.header}>
          <View style={styles.heading}>
            <Text style={styles.eyebrow}>ADMINISTRACIÓN · FINANZAS</Text>
            <Text style={styles.title}>Reportes financieros</Text>
            <Text style={styles.subtitle}>Ingresos registrados agrupados por período y sucursal.</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Actualizar reporte financiero"
            disabled={loading}
            onPress={refresh}
            style={({ pressed }) => [styles.refreshButton, pressed && styles.pressed, loading && styles.disabled]}
          >
            <RefreshCw color={colors.accent} size={17} />
            <Text style={styles.refreshText}>{loading ? 'Cargando…' : 'Actualizar'}</Text>
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {periods.map((option) => (
            <FilterChip key={option.key} label={option.label} active={period === option.key} onPress={() => setPeriod(option.key)} />
          ))}
        </ScrollView>

        {isGeneralAdmin ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            <FilterChip label="Todas las sucursales" active={branchScope === 'all'} onPress={() => setBranchScope('all')} />
            {branches.map((branch) => (
              <FilterChip
                key={String(branch.id_sucursal)}
                label={branch.nombre}
                active={branchScope === String(branch.id_sucursal)}
                onPress={() => setBranchScope(String(branch.id_sucursal))}
              />
            ))}
          </ScrollView>
        ) : (
          <View style={styles.branchLabel}>
            <Text style={styles.branchCaption}>SUCURSAL</Text>
            <Text style={styles.branchName}>{selectedBranch?.nombre || 'Sucursal asignada'}</Text>
          </View>
        )}

        {error ? <StatusBox text={error} /> : null}
        {loading && !report ? <StatusBox text="Consultando agregados financieros…" /> : null}
        {report ? (
          <>
            <View style={[styles.metricsGrid, compact && styles.metricsGridCompact]}>
              {cards.map((card) => <MetricCard key={card.title} {...card} />)}
            </View>

            <View style={[styles.panel, styles.warningPanel]}>
              <Text style={styles.warningTitle}>Alcance de los importes</Text>
              <Text style={styles.warningText}>
                Son ingresos registrados, no utilidad neta ni conciliación de caja. El alquiler refleja sesiones finalizadas; no se registran costos, impuestos calculados, devoluciones ni métodos de pago.
              </Text>
            </View>

            <View style={[styles.columns, compact && styles.columnsCompact]}>
              <View style={styles.panel}>
                <View style={styles.panelHeader}>
                  <Text style={styles.panelTitle}>Ingresos por período</Text>
                  <Text style={styles.legend}><Text style={styles.legendBlue}>●</Text> POS  <Text style={styles.legendAmber}>●</Text> Alquiler</Text>
                </View>
                {report.series.length ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={styles.chart}>
                    {report.series.map((point) => {
                      const salesHeight = (Number(point.ventas_productos) || 0) / maxValue * 150;
                      const rentalHeight = (Number(point.alquiler_mesas) || 0) / maxValue * 150;
                      return (
                        <View key={point.periodo} style={styles.barGroup}>
                          <View style={styles.plot}>
                            <View style={[styles.bar, styles.barSales, { height: Math.max(salesHeight, point.ventas_productos ? 3 : 0) }]} />
                            <View style={[styles.bar, styles.barRentals, { height: Math.max(rentalHeight, point.alquiler_mesas ? 3 : 0) }]} />
                          </View>
                          <Text numberOfLines={1} style={styles.barLabel}>{point.etiqueta}</Text>
                        </View>
                      );
                    })}
                  </ScrollView>
                ) : <Text style={styles.emptyText}>No hay movimientos en el período seleccionado.</Text>}
              </View>

              {isGeneralAdmin && branchScope === 'all' ? (
                <View style={styles.panel}>
                  <View style={styles.panelHeader}>
                    <Text style={styles.panelTitle}>Ingresos por sucursal</Text>
                    <Text style={styles.panelMeta}>{report.branches.length} locales</Text>
                  </View>
                  {report.branches.length ? report.branches.map((branch) => (
                    <View key={String(branch.id_sucursal)} style={styles.branchRow}>
                      <Text style={styles.branchRowName}>{branch.nombre}</Text>
                      <Text style={styles.branchRowTotal}>{money(branch.total)}</Text>
                    </View>
                  )) : <Text style={styles.emptyText}>No hay ingresos registrados por sucursal.</Text>}
                </View>
              ) : null}
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError || error instanceof Error) return error.message;
  return 'No se pudo cargar el reporte financiero.';
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && styles.pressed]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function MetricCard({ title, amount, detail, tone }: {
  title: string;
  amount: number | string;
  detail: string;
  tone: 'green' | 'blue' | 'amber';
}) {
  return (
    <View style={styles.metricCard}>
      <View style={styles.metricHeading}>
        <View style={[styles.metricDot, tone === 'green' ? styles.dotGreen : tone === 'blue' ? styles.dotBlue : styles.dotAmber]} />
        <Text style={styles.metricTitle}>{title}</Text>
      </View>
      <Text style={styles.metricAmount}>{money(amount)}</Text>
      <Text style={styles.metricDetail}>{detail}</Text>
    </View>
  );
}

function StatusBox({ text }: { text: string }) {
  return (
    <View accessibilityRole="alert" style={styles.errorBox}>
      <Text style={styles.errorText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { width: '100%', maxWidth: 1500, alignSelf: 'center', padding: 28, gap: 16 },
  contentCompact: { padding: 16, gap: 13 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 },
  heading: { flex: 1, minWidth: 0 },
  eyebrow: { color: colors.accent, fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  title: { color: colors.text, fontSize: 25, fontWeight: '900', marginTop: 5 },
  subtitle: { color: colors.textMuted, fontSize: 13, lineHeight: 19, marginTop: 5 },
  refreshButton: { minHeight: 42, borderWidth: 1, borderColor: colors.border, borderRadius: 11, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.surface },
  refreshText: { color: colors.text, fontSize: 12, fontWeight: '800' },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.55 },
  chipRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 4 },
  chip: { minHeight: 36, justifyContent: 'center', borderRadius: 99, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: 13 },
  chipActive: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  chipText: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  chipTextActive: { color: colors.accent },
  branchLabel: { minHeight: 50, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceRaised },
  branchCaption: { color: colors.textMuted, fontSize: 9, fontWeight: '800', letterSpacing: 1.1 },
  branchName: { color: colors.text, fontSize: 13, fontWeight: '700', marginTop: 3 },
  errorBox: { borderWidth: 1, borderColor: 'rgba(251, 113, 133, 0.45)', borderRadius: 12, backgroundColor: colors.dangerSoft, padding: 13 },
  errorText: { color: colors.danger, fontSize: 12, lineHeight: 18 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 13 },
  metricsGridCompact: { gap: 9 },
  metricCard: { flex: 1, minWidth: 210, minHeight: 130, borderWidth: 1, borderColor: colors.border, borderRadius: 15, backgroundColor: colors.surface, padding: 17, ...shadows },
  metricHeading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metricDot: { width: 7, height: 7, borderRadius: 4 },
  dotGreen: { backgroundColor: colors.accent },
  dotBlue: { backgroundColor: colors.info },
  dotAmber: { backgroundColor: colors.warning },
  metricTitle: { color: colors.textMuted, fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  metricAmount: { color: colors.text, fontSize: 23, fontWeight: '900', marginTop: 14 },
  metricDetail: { color: colors.textMuted, fontSize: 10, marginTop: 5 },
  panel: { flex: 1, minWidth: 0, borderWidth: 1, borderColor: colors.border, borderRadius: 15, backgroundColor: colors.surface, padding: 17, ...shadows },
  warningPanel: { flex: 0, backgroundColor: colors.warningSoft, borderColor: 'rgba(245, 158, 11, 0.3)' },
  warningTitle: { color: colors.warning, fontSize: 12, fontWeight: '800' },
  warningText: { color: colors.textMuted, fontSize: 11, lineHeight: 17, marginTop: 4 },
  columns: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  columnsCompact: { flexDirection: 'column' },
  panelHeader: { minHeight: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 7, marginBottom: 8 },
  panelTitle: { color: colors.text, fontSize: 14, fontWeight: '800' },
  panelMeta: { color: colors.textMuted, fontSize: 10 },
  legend: { color: colors.textMuted, fontSize: 10 },
  legendBlue: { color: colors.info },
  legendAmber: { color: colors.warning },
  chart: { minHeight: 200, alignItems: 'flex-end', gap: 12, paddingVertical: 8 },
  barGroup: { width: 48, alignItems: 'center', gap: 8 },
  plot: { width: 34, height: 160, justifyContent: 'flex-end', alignItems: 'center' },
  bar: { width: 21, minHeight: 0 },
  barSales: { backgroundColor: colors.info, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  barRentals: { backgroundColor: colors.warning },
  barLabel: { width: 52, color: colors.textMuted, fontSize: 9, textAlign: 'center' },
  branchRow: { minHeight: 47, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  branchRowName: { flex: 1, color: colors.textMuted, fontSize: 11 },
  branchRowTotal: { color: colors.text, fontSize: 11, fontWeight: '800' },
  emptyText: { color: colors.textMuted, fontSize: 11, lineHeight: 18, textAlign: 'center', paddingVertical: 24 },
});
