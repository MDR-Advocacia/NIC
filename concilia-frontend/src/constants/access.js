export const USER_ROLES = {
  ADMINISTRADOR: 'administrador',
  SUPERVISOR: 'supervisor',
  OPERADOR: 'operador',
  INDICADOR: 'indicador',
};

export const INDICATION_ALLOWED_ROLES = [
  USER_ROLES.INDICADOR,
  USER_ROLES.ADMINISTRADOR,
  USER_ROLES.SUPERVISOR,
];

export const normalizeUserRole = (role) => String(role ?? '').trim().toLowerCase();

export const isManagerRole = (role) =>
  [USER_ROLES.ADMINISTRADOR, USER_ROLES.SUPERVISOR].includes(normalizeUserRole(role));

export const isIndicatorRole = (role) =>
  normalizeUserRole(role) === USER_ROLES.INDICADOR;

export const canAccessDashboard = (role) => !isIndicatorRole(role);
export const canAccessInbox = (role) => !isIndicatorRole(role);
export const canAccessImport = (role) => !isIndicatorRole(role);
export const canAccessCaseCreation = (role) => !isIndicatorRole(role);
export const canAccessGeneralBase = (role) => isManagerRole(role);
export const canManageUsers = (role) => isManagerRole(role);
export const canAccessLogs = (role) =>
  normalizeUserRole(role) === USER_ROLES.ADMINISTRADOR;

export const getDefaultRouteForRole = (role) =>
  isIndicatorRole(role) ? '/pipeline' : '/dashboard';
