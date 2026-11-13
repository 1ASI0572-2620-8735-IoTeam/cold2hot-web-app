/**
 * URL base del API Gateway. En desarrollo local apunta al gateway de docker-compose / `npm start` del backend;
 * en producción al servicio desplegado en Render.
 */
const isLocal =
  typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname);

export const API_BASE = isLocal
  ? 'http://localhost:8080/api/v1'
  : 'https://cold2hot-backend.onrender.com/api/v1';

export const API = {
  iam: `${API_BASE}/iam`,
  telemetry: `${API_BASE}/telemetry`,
  containers: `${API_BASE}/containers`,
  security: `${API_BASE}/security`,
  orders: `${API_BASE}/orders`
};
