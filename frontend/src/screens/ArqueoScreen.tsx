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
import { Banknote, Calculator, ReceiptText, X } from 'lucide-react-native';
import { useAccessibleModal } from '../hooks/useAccessibleModal';
import { ApiError } from '../services/api';
import type { AuthUser } from '../services/auth';
import { listBranches } from '../services/products';
import type { Branch } from '../services/products';
import { colors, shadows } from '../theme';

type ArqueoData = {
  initialCash: number;
  totalSales: number;
  expectedCash: number;
  declaredCash: number;
  difference: number;
  overShort: 'superplus' | 'plus' | 'zero' | 'minus' | 'superminus';
};

function getOverShortLabel(difference: number): 'superplus' | 'plus' | 'zero' | 'minus' | 'superminus' {
  if (difference > 100) return 'superplus';
  if (difference > 0) return 'plus';
  if (difference === 0) return 'zero';
  if (difference > -100) return 'minus';
  return 'superminus';
}

export default function ArqueoScreen({ user }: { user: AuthUser }) {
  const { width } = useWindowDimensions();
  const compact = width < 760;
  const isGlobalAdmin = user.rol === 'admin_general';
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchScope, setBranchScope] = useState(isGlobalAdmin ? 'all' : String(user.id_sucursal ?? ''));
  const [period, setPeriod] = useState<'diario' | 'semanal' | 'mensual' | 'anual'>('diario');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [arqueo, setArqueo] = useState<ArqueoData | null>(null);
  useAccessibleModal(Boolean(arqueo), () => setArqueo(null));

  const loadBranches = useCallback(async () => {
    setBranchLoading(true);
    setBranchError(null);
    try {
      const result = await listBranches();
      setBranches(result);
      setBranchScope((current) => (
        result.some((branch) => String(branch.id_sucursal) === current) ? current : String(result[0]?.id_sucursal || '')
      ));
    } catch (error) {
      setBranchError(getErrorMessage(error));
      setBranches([]);
      setBranchScope('');
    } finally {
      setBranchLoading(false);
    }
  }, []);

  useEffect(() => { void loadBranches(); }, [loadBranches]);

  const calculateArqueo = useCallback((branchId: string | undefined, period: 'diario' | 'semanal' | 'mensual' | 'anual'): ArqueoData => {
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case 'diario':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'semanal':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'mensual':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'anual':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.setHours(0, 0, 0, 0));
    }

    // This would normally call the backend API, but for now we calculate from sales
    // The backend already has the logic in dashboardModel.js to calculate income
    
    // Placeholder calculation using current data
    let totalSales = 0;
    let declaredCash = 0;
    
    // In a full implementation, this would query ventas and caja_turnos for the period
    // For now, we'll use a simplified calculation
    
    const initialCash = 50.00; // This would come from caja_turnos opening
    const expectedCash = initialCash + totalSales;
    const difference = expectedCash - declaredCash;
    const overShort = getOverShortLabel(difference);

    return {
      initialCash,
      totalSales,
      expectedCash,
      declaredCash,
      difference,
      overShort,
    };
  }, []);

  const handlePrint = () => {
    if (!arqueo || Platform.OS !== 'web' || typeof window === 'undefined') return;
    const printWindow = window.open('', '_blank', 'width=420,height=700');
    if (!printWindow) return;
    
    const overShortLabel = {
      superplus: 'Sobresaliente (>$100)',
      plus: 'Sobrante ($0-$100)',
      zero: 'Exacto ($0)',
      minus: 'Falta ($0-$100)',
      superminus: 'Falta mayor (>$100)',
    }[arqueo.overShort];

    printWindow.document.open();
    printWindow.document.write(`<!doctype html>
      <html lang="es"><head><meta charset="utf-8"><title>Arqueo de Caja - Bola8</title>
      <style>
        @media print {
          body { margin: 0; padding: 20px; font-family: Arial, sans-serif; color: #0f172a; }
          .no-print { display: none; }
          .page { margin-bottom: 40px; border-bottom: 1px solid #cbd5e1; padding-bottom: 20px; }
          h1, p { text-align: center; }
          table { width: 100%; border-collapse: collapse; margin: 16px 0; }
          th, td { text-align: left; padding: 8px 4px; border-bottom: 1px solid #e2e8f0; }
          .total { text-align: right; font-size: 18px; font-weight: bold; color: #0f172a; }
          .muted { color: #64748b; font-size: 11px; }
          .logo { text-align: center; margin-bottom: 20px; }
          .brand { color: #10b981; font-weight: 900; font-size: 18px; }
          .receipt-footer { margin-top: 30px; border-top: 1px solid #cbd5e1; padding-top: 20px; }
        }
        body { font: 14px Arial, sans-serif; max-width: 360px; margin: 24px auto; color: #111; }
        h1, p { text-align: center; margin: 6px 0; }
        h1 { font-size: 20px; }
        .muted { color: #555; font-size: 12px; }
        .rule { border-top: 1px dashed #555; margin: 14px 0; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th, td { text-align: left; padding: 6px 3px; border-bottom: 1px solid #ddd; }
        th:last-child, td:last-child { text-align: right; }
        .total { text-align: right; font-size: 18px; font-weight: bold; }
        .label { font-weight: 600; color: #334155; }
        .value { text-align: right; color: #0f172a; }
        .brand { color: #0f172a; font-size: 15; font-weight: 900; letter-spacing: 2; margin-top: 6; }
        .concept { color: #64748b; font-size: 11; margin-top: 2; }
      </style></head><body>
        <div class="logo"><div class="brand">BOLA8</div><div class="concept">Arqueo de Caja ‒ Bola8</div></div>
        <div class="rule"></div>
        <h1>Reporte de Arqueo de Caja</h1>
        <p class="muted">Período: ${period}</p>
        <div class="rule"></div>
        <table style="width:100%; border-collapse:collapse; margin:20px 0;">
          <thead>
            <tr>
              <th style="text-align:left; padding:6px 3px;">Concepto</th>
              <th style="text-align:right; padding:6px 3px;">Bs.</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="text-align:left; font-weight:bold; padding:6px 3px;">Caja inicial</td>
              <td style="text-align:right; padding:6px 3px;">Bs. ${Number(arqueo?.initialCash || 0).toFixed(2)}</td>
            </tr>
            <tr>
              <td style="text-align:left; font-weight:bold; padding:6px 3px;">Ventas totales</td>
              <td style="text-align:right; padding:6px 3px;">Bs. ${Number(arqueo?.totalSales || 0).toFixed(2)}</td>
            </tr>
            <tr>
              <td style="text-align:left; font-weight:bold; padding:6px 3px;">Total esperado</td>
              <td style="text-align:right; padding:6px 3px;">Bs. ${Number(arqueo?.expectedCash || 0).toFixed(2)}</td>
            </tr>
            <tr>
              <td style="text-align:left; font-weight:bold; padding:6px 3px;">Efectivo declarado</td>
              <td style="text-align:right; padding:6px 3px;">Bs. ${Number(arqueo?.declaredCash || 0).toFixed(2)}</td>
            </tr>
            <tr style="font-weight:bold; ${arqueo?.difference >= 0 ? 'background-color: #d1e7dd;' : 'background-color: #f8d7da;'}>
              <td style="text-align:left; padding:6px 3px;">Diferencia ${arqueo?.difference >= 0 ? '($+' : '($'}
              ${Math.abs(arqueo?.difference || 0).toFixed(2)}
              </td>
              <td style="text-align:right; padding:6px 3px;">${arqueo?.difference >= 0 ? '+' : ''}${arqueo?.difference?.toFixed(2) || '0,00'}</td>
            </tr>
          </tbody>
        </table>
        <div class="rule"></div>
        <p style="text-align:center; font-size:12px; color:#64748b;">
          ${overShortLabel}: ${Math.abs(arqueo?.difference || 0) > 0 ? 'Se recomienda revisar las transacciones' : 'Arqueo completo'}
        </p>
        <div class="receipt-footer" style="margin-top:30px; border-top:1px solid #cbd5e1; padding-top:20px;">
          <p class="muted" style="font-size:11px; color:#64748b;">¡Gracias por operar en Bola8!</p>
        </div>
      </body></html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const refresh = () => setArqueo(null); // Force recalculation

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={[styles.content, compact && styles.contentCompact]}>
        <View style={styles.header}>
          <View style={styles.heading}>
            <Text style={styles.eyebrow}>ADMINISTRACIÓN · ARQUEO</Text>
            <Text style={styles.title}>Reporte de Caja</Text>
            <Text style={styles.subtitle}>Conciliación de efectivo inicial, ventas y declarado</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Actualizar arqueo"
            disabled={loading}
            onPress={() => setArqueo(null)}
            style={({ pressed }) => [styles.refreshButton, pressed && styles.pressed, loading && styles.disabled]}
          >
            <X color={colors.accent} size={17} /> Actualizar
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.status}>
            <ActivityIndicator color={colors.accent} />
            <Text style={styles.statusText}>Cargando arqueo…</Text>
          </View>
        ) : error ? (
          <View style={styles.status}>
            <Text style={styles.errorTitle}>No se pudo cargar el arqueo</Text>
            <Text style={styles.statusText}>{error}</Text>
            <Pressable accessibilityRole="button" onPress={() => setArqueo(null)} style={styles.retryButton}>
              <Text style={styles.retryText}>Reintentar</Text>
            </Pressable>
          </View>
        ) : !arqueo ? (
          <View style={styles.status}>
            <Text style={styles.statusText}>Selecciona una sucursal y período para calcular el arqueo.</Text>
          </View>
        ) : (
          <View style={styles.listCard}>
            <View style={styles.listHeader}>
              <View>
                <Text style={styles.listTitle}>Arqueo de Caja</Text>
                <Text style={styles.listSubtitle}>Período: {period}</Text>
              </View>
              <Text style={styles.count}>Sucursal: {branchScope === 'all' ? 'Todas' : branchScope}</Text>
            </View>

            <View style={styles.arqueoCard}>
              <View style={styles.arqueoRow}>
                <Text style={styles.arqueoLabel}>Caja Inicial</Text>
                <Text style={styles.arqueoValue}>Bs. {Number(arqueo?.initialCash || 0).toFixed(2)}</Text>
              </View>
              <View style={styles.arqueoRow}>
                <Text style={styles.arqueoLabel}>Ventas del Período</Text>
                <Text style={styles.arqueoValue}>Bs. {Number(arqueo?.totalSales || 0).toFixed(2)}</Text>
              </View>
              <View style={styles.arqueoRow}>
                <Text style={styles.arqueoLabel}>Total Esperado</Text>
                <Text style={styles.arqueoValue}>Bs. {Number(arqueo?.expectedCash || 0).toFixed(2)}</Text>
              </View>
              <View style={styles.arqueoRow}>
                <Text style={styles.arqueoLabel}>Efectivo Declarado</Text>
                <Text style={styles.arqueoValue}>Bs. {Number(arqueo?.declaredCash || 0).toFixed(2)}</Text>
              </View>
              <View style={styles.arqueoRowDifference}>
                <Text style={styles.arqueoLabelDifference}>Diferencia</Text>
                <Text style={styles.arqueoValueDifference}>Bs. {arqueo?.difference >= 0 ? '+' : ''}${arqueo?.difference?.toFixed(2) || '0,00'}</Text>
              </View>
            </View>

            <View style={styles.arqueoSummary}>
              <Text style={styles.arqueoSummaryTitle}>Resultado</Text>
              <Text style={[styles.arqueoSummaryValue, arqueo?.overShort === 'zero' && styles.arqueoSummarySuccess], arqueo?.overShort}>
                {arqueo?.overShort === 'zero' ? 'Arqueo exacto - No hay diferencias' : 
                 arqueo?.overShort === 'plus' ? 'Sobrante menor' : 
                 arqueo?.overShort === 'minus' ? 'Falta menor' : 
                 arqueo?.overShort === 'superplus' ? 'Sobresaliente' : 'Falta mayor'}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.actions}>
          {arqueo && (
            <Pressable accessibilityRole="button" onPress={handlePrint} style={styles.printButton}>
              <ReceiptText color="#04130d" size={16} /> Imprimir reporte
            </Pressable>
          )}
          <Pressable accessibilityRole="button" onPress={() => setArqueo(null)} style={styles.secondaryButton}>
            <Text style={styles.secondaryText}>Cerrar</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError || error instanceof Error) return error.message;
  return 'Ocurrió un error inesperado.';
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { padding: 24, gap: 18, width: '100%', maxWidth: 1400, alignSelf: 'center' },
  contentCompact: { padding: 14, gap: 14 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  heading: { flex: 1, minWidth: 0 },
  eyebrow: { color: colors.accent, fontSize: 10, fontWeight: '900', letterSpacing: 0.8, marginBottom: 5 },
  title: { color: colors.text, fontSize: 24, fontWeight: '900' },
  subtitle: { color: colors.textMuted, fontSize: 12, marginTop: 5, lineHeight: 18 },
  refreshButton: {
    minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingHorizontal: 13, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
  },
  refreshText: { color: colors.text, fontSize: 12, fontWeight: '700' },
  pressed: { opacity: 0.78 },
  status: { alignItems: 'center', justifyContent: 'center', minHeight: 150, padding: 18, gap: 10, borderTopWidth: 1, borderColor: colors.border },
  errorTitle: { color: colors.danger, fontSize: 14, fontWeight: '800' },
  statusText: { color: colors.textMuted, fontSize: 12, textAlign: 'center', lineHeight: 18 },
  listCard: { padding: 18, borderRadius: 15, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 },
  listTitle: { color: colors.text, fontSize: 16, fontWeight: '900' },
  listSubtitle: { color: colors.textMuted, fontSize: 11, marginTop: 4 },
  count: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  arqueoCard: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 20, ...shadows },
  arqueoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderColor: colors.border },
 arqueoLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '700' },
 arqueoValue: { color: colors.text, fontSize: 20, fontWeight: '800' },
 arqueoRowDifference: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderColor: colors.border },
 arqueoLabelDifference: { color: colors.textMuted, fontSize: 10, fontWeight: '700' },
 arqueoValueDifference: { color: colors.warning, fontSize: 20, fontWeight: '800' },  // This has a typo - should be colors.warning
 arqueoSummary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderRadius: 12, backgroundColor: colors.surfaceRaised, marginTop: 12 },
 arqueoSummaryTitle: { color: colors.textMuted, fontSize: 10, fontWeight: '800' },
 arqueoSummaryValue: { color: colors.text, fontSize: 14, fontWeight: '700' },
 arqueoSummarySuccess: { color: colors.accent, fontSize: 12, fontWeight: '600' },
  printButton: { minHeight: 40, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingHorizontal: 14, borderRadius: 9, backgroundColor: colors.accent },
  secondaryButton: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 9, borderWidth: 1, borderColor: colors.border },
  secondaryText: { color: colors.textMuted, fontSize: 12, fontWeight: '800' },
});