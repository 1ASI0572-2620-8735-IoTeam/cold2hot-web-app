import { Injectable, signal } from '@angular/core';

export interface ThermalDefaults {
  hotMin: number;
  hotMax: number;
  coldMin: number;
  coldMax: number;
}

export const FACTORY_THERMAL_DEFAULTS: ThermalDefaults = { hotMin: 65, hotMax: 80, coldMin: 2, coldMax: 8 };

/** Preferencias del administrador guardadas en el navegador (rangos térmicos por defecto para nuevos despachos). */
@Injectable({ providedIn: 'root' })
export class PreferencesService {
  private readonly KEY = 'c2h_thermal_defaults';
  private state = signal<ThermalDefaults>(this.read());
  readonly thermalDefaults = this.state.asReadonly();

  private read(): ThermalDefaults {
    try {
      const raw = localStorage.getItem(this.KEY);
      return raw ? { ...FACTORY_THERMAL_DEFAULTS, ...JSON.parse(raw) } : { ...FACTORY_THERMAL_DEFAULTS };
    } catch {
      return { ...FACTORY_THERMAL_DEFAULTS };
    }
  }

  saveThermalDefaults(value: ThermalDefaults) {
    this.state.set(value);
    try {
      localStorage.setItem(this.KEY, JSON.stringify(value));
    } catch {
      /* almacenamiento no disponible: se mantiene en memoria */
    }
  }

  resetThermalDefaults() {
    this.saveThermalDefaults({ ...FACTORY_THERMAL_DEFAULTS });
  }
}
