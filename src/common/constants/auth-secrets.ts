const accessSecret = process.env.JWT_ACCESS_SECRET;
const refreshSecret = process.env.JWT_REFRESH_SECRET;

if (process.env.NODE_ENV === 'production' && (!accessSecret || !refreshSecret)) {
  throw new Error('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be configured in production');
}

export const JWT_ACCESS_SECRET = accessSecret ?? 'development-access-secret-change-me';
export const JWT_REFRESH_SECRET = refreshSecret ?? 'development-refresh-secret-change-me';
