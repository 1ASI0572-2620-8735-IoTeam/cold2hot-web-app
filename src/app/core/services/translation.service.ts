import { Injectable, signal, computed } from '@angular/core';

export type Language = 'es' | 'en';

export interface Translations {
  [key: string]: {
    es: string;
    en: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class TranslationService {
  private readonly STORAGE_KEY = 'c2h_lang';
  
  private currentLangSignal = signal<Language>(
    (localStorage.getItem(this.STORAGE_KEY) as Language) || 'es'
  );

  readonly currentLang = this.currentLangSignal.asReadonly();

  private translations: Translations = {
    // Topbar & General
    app_name: { es: 'Cold2Hot', en: 'Cold2Hot' },
    app_subtitle: { es: 'Custodia Térmica Inteligente', en: 'Smart Thermal Custody' },
    restaurant_name: { es: 'Mi Restaurante', en: 'My Restaurant' },
    role_admin: { es: 'Administrador', en: 'Administrator' },
    logout: { es: 'Cerrar sesión', en: 'Log out' },

    // Sidebar - Secciones
    nav_operation: { es: 'OPERACIÓN', en: 'OPERATION' },
    nav_monitoring: { es: 'Monitoreo', en: 'Monitoring' },
    nav_new_shipment: { es: 'Nuevo envío', en: 'New shipment' },
    nav_alerts: { es: 'Alertas', en: 'Alerts' },
    nav_audit: { es: 'AUDITORÍA', en: 'AUDIT' },
    nav_history: { es: 'Historial', en: 'History' },
    nav_analytics: { es: 'Analítica', en: 'Analytics' },
    nav_admin: { es: 'ADMINISTRACIÓN', en: 'MANAGEMENT' },
    nav_operators: { es: 'Operadores', en: 'Couriers' },
    nav_smartboxes: { es: 'Cajas SmartBox', en: 'SmartBoxes' },
    nav_billing: { es: 'Plan y facturación', en: 'Plan & Billing' },
    nav_settings: { es: 'Configuración', en: 'Settings' },

    // KPIs Dashboard
    kpi_total_active: { es: 'Total Envíos Activos', en: 'Total Active Shipments' },
    kpi_in_transit: { es: 'En Ruta', en: 'In Transit' },
    kpi_critical_alerts: { es: 'Alertas Críticas', en: 'Critical Alerts' },
    kpi_boxes_available: { es: 'Cajas Disponibles', en: 'Available SmartBoxes' },

    // Filtros
    filter_all: { es: 'Todos', en: 'All' },
    filter_hot: { es: 'Caliente', en: 'Hot' },
    filter_cold: { es: 'Frío', en: 'Cold' },
    filter_alerts_only: { es: 'Con Alertas', en: 'With Alerts' },
    btn_new_shipment: { es: '+ Nuevo envío', en: '+ New shipment' },

    // Columnas de Tabla
    col_order_id: { es: 'ID del Pedido', en: 'Order ID' },
    col_mode: { es: 'Modo', en: 'Mode' },
    col_temperature: { es: 'Temperatura Actual', en: 'Current Temp' },
    col_operator: { es: 'Operador', en: 'Courier' },
    col_smartbox: { es: 'Caja SmartBox', en: 'SmartBox' },
    col_lock: { es: 'Cerrojo', en: 'Lock' },
    col_battery: { es: 'Batería', en: 'Battery' },
    col_status: { es: 'Estado', en: 'Status' },
    col_actions: { es: 'Acciones', en: 'Actions' },

    // Estados
    status_in_range: { es: 'En rango', en: 'In range' },
    status_out_of_range: { es: 'Fuera de rango', en: 'Out of range' },
    status_locked: { es: 'Bloqueado', en: 'Locked' },
    status_unlocked: { es: 'Abierto', en: 'Unlocked' },
    status_in_transit: { es: 'En ruta', en: 'In transit' },
    status_breach: { es: 'Desvío térmico', en: 'Thermal breach' },
    status_critical: { es: 'Crítica', en: 'Critical' },

    // Acciones de tabla
    btn_view_track: { es: 'Ver trayecto', en: 'View track' },
    btn_close: { es: 'Cerrar', en: 'Close' },

    // Detalle de Trayecto W05
    track_title: { es: 'Temperatura del trayecto', en: 'Journey Temperature' },
    track_lid_alert: { es: 'Aviso: Tapa mal cerrada detectada', en: 'Notice: Lid improperly closed' },
    track_tamper_alert: { es: 'Alerta: Intento de apertura no autorizada', en: 'Alert: Unauthorized opening attempt' },

    // Modal Nuevo Envío W06
    modal_title: { es: 'Registra el pedido y elige su perfil térmico', en: 'Register shipment and select thermal profile' },
    modal_order_id: { es: 'ID del pedido', en: 'Order ID' },
    modal_address: { es: 'Dirección de entrega', en: 'Delivery address' },
    modal_select_box: { es: 'Caja disponible', en: 'Available SmartBox' },
    modal_thermal_profile: { es: 'Perfil térmico', en: 'Thermal profile' },
    modal_cold_desc: { es: '2°C - 8°C (Postres, bebidas, ensaladas)', en: '2°C - 8°C (Desserts, drinks, salads)' },
    modal_hot_desc: { es: '60°C - 85°C (Pizzas, sopas, carnes)', en: '60°C - 85°C (Pizzas, soups, meats)' },
    modal_min_temp: { es: 'Mínimo (°C)', en: 'Minimum (°C)' },
    modal_max_temp: { es: 'Máximo (°C)', en: 'Maximum (°C)' },
    modal_cancel: { es: 'Cancelar', en: 'Cancel' },
    modal_create: { es: 'Crear envío', en: 'Create shipment' },

    // OTP Generado W07
    otp_dialog_title: { es: '¡Envío Creado con Éxito!', en: 'Shipment Successfully Created!' },
    otp_subtitle: { es: 'Comparte este código OTP con el repartidor para desbloquear la caja en destino:', en: 'Share this OTP code with the courier to unlock the box at destination:' },
    otp_copy: { es: 'Copiar código', en: 'Copy code' },
    otp_copied: { es: '¡Código copiado!', en: 'Code copied!' },
    otp_done: { es: 'Ir al seguimiento', en: 'Go to tracking' },

    // Centro de Alertas W08
    alerts_title: { es: 'Centro de Alertas de Seguridad y Térmicas', en: 'Security and Thermal Alerts Center' },
    alerts_empty: { es: 'No hay alertas activas en este momento.', en: 'No active alerts at this moment.' },
    alert_resolve: { es: 'Marcar como atendida', en: 'Mark as resolved' },
    alert_resolved_badge: { es: 'Atendida', en: 'Resolved' },

    // Inventario SmartBoxes W12
    boxes_title: { es: 'Inventario de Cajas SmartBox', en: 'SmartBox Inventory' },
    boxes_register_btn: { es: '+ Registrar caja', en: '+ Register box' },
    box_mac: { es: 'Dirección MAC ESP32', en: 'ESP32 MAC Address' },
    box_last_heartbeat: { es: 'Último latido', en: 'Last heartbeat' },
    box_status_avail: { es: 'Disponible', en: 'Available' },
    box_status_transit: { es: 'En ruta', en: 'In transit' },
    box_status_maint: { es: 'Mantenimiento', en: 'Maintenance' },

    // Login W01
    login_title: { es: 'Inicio de sesión', en: 'Sign In' },
    login_tagline: { es: 'Monitoreo IoT y custodia térmica en tiempo real para tu servicio de delivery.', en: 'Real-time IoT monitoring and thermal custody for your delivery fleet.' },
    login_feature_1: { es: 'Control de temperatura One-Wire (sensor DS18B20)', en: 'One-Wire thermal tracking (DS18B20 sensor)' },
    login_feature_2: { es: 'Desbloqueo seguro por código OTP de un solo uso', en: 'Secure single-use OTP passcode unlocking' },
    login_feature_3: { es: 'Detección inmediata de intrusión y apertura no autorizada', en: 'Instant tamper and intrusion alert detection' },
    login_email: { es: 'Correo electrónico', en: 'Email address' },
    login_password: { es: 'Contraseña', en: 'Password' },
    login_submit: { es: 'Ingresar al sistema', en: 'Sign in to platform' },
    login_demo: { es: 'Ingresar con cuenta Demo', en: 'Sign in with Demo account' },
    login_forgot: { es: '¿Olvidaste tu contraseña?', en: 'Forgot your password?' }
  };

  translate(key: string): string {
    const lang = this.currentLangSignal();
    const item = this.translations[key];
    if (!item) return key;
    return item[lang] || item.es || key;
  }

  setLanguage(lang: Language) {
    this.currentLangSignal.set(lang);
    localStorage.setItem(this.STORAGE_KEY, lang);
  }
}
