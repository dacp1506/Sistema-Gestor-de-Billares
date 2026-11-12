import { apiRequest } from './api';

export type SettingsTheme = 'dark' | 'light';
export type SettingsLanguage = 'es' | 'en';
export type SettingsCurrency = 'BOB' | 'USD' | 'EUR';
export type PrintFormat = '80mm' | 'A4';

export type UserSettings = {
  tema: SettingsTheme;
  idioma: SettingsLanguage;
  moneda: SettingsCurrency;
  nombre_comercial: string;
  iva_porcentaje: number | string;
  formato_impresion: PrintFormat;
};

export type UserSettingsInput = {
  tema?: SettingsTheme;
  idioma?: SettingsLanguage;
  moneda?: SettingsCurrency;
  nombre_comercial?: string;
  iva_porcentaje?: number;
  formato_impresion?: PrintFormat;
};

type ItemResponse<T> = { data: T; message?: string };

export const DEFAULT_SETTINGS: UserSettings = {
  tema: 'dark',
  idioma: 'es',
  moneda: 'BOB',
  nombre_comercial: 'SALÓN DE BILLAR BOLA8',
  iva_porcentaje: 13,
  formato_impresion: '80mm',
};

export async function getSettings(): Promise<UserSettings> {
  const response = await apiRequest<ItemResponse<UserSettings>>('/configuraciones');
  return { ...DEFAULT_SETTINGS, ...(response.data || {}) };
}

export async function updateSettings(input: UserSettingsInput): Promise<UserSettings> {
  const response = await apiRequest<ItemResponse<UserSettings>>('/configuraciones', {
    method: 'PUT',
    body: JSON.stringify(input),
  });
  return { ...DEFAULT_SETTINGS, ...(response.data || {}) };
}

export function settingsPill(settings: UserSettings | null) {
  const language = (settings?.idioma || 'es').toUpperCase();
  const currency = settings?.moneda === 'BOB' ? 'Bs.' : settings?.moneda || 'Bs.';
  return `${language} • ${currency}`;
}
