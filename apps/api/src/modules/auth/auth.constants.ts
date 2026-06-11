export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
export const AUDIT_LOG_REPOSITORY = Symbol('AUDIT_LOG_REPOSITORY');
export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

export const REFRESH_TOKEN_COOKIE = 'refreshToken';
export const ACCESS_TOKEN_TTL = '15m';
export const REFRESH_TOKEN_TTL = '7d';
export const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;
export const LOGIN_RATE_LIMIT_WINDOW_SECONDS = 15 * 60;
export const LOGIN_RATE_LIMIT_MAX_ATTEMPTS = 5;
