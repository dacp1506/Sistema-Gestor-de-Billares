import { apiRequest } from './api';

export type ReportPeriod = 'diario' | 'semanal' | 'mensual' | 'anual';

export type FinancialReport = {
  period: ReportPeriod;
  summary: {
    ventas: number;
    sesiones_finalizadas: number;
    ventas_directas: number | string;
    consumos_mesa: number | string;
    alquiler_mesas: number | string;
    ingresos_totales: number | string;
  };
  series: Array<{
    periodo: string;
    alquiler_mesas: number | string;
    ventas_productos: number | string;
    total: number | string;
    etiqueta: string;
  }>;
  branches: Array<{
    id_sucursal: number | string;
    nombre: string;
    total: number | string;
  }>;
};

type ItemResponse<T> = { data: T };

export async function getFinancialReport(period: ReportPeriod, branchId?: number | string): Promise<FinancialReport> {
  const query = new URLSearchParams({ periodo: period });
  if (branchId) query.set('id_sucursal', String(branchId));
  const response = await apiRequest<ItemResponse<FinancialReport>>(`/reportes?${query}`);
  return response.data;
}
