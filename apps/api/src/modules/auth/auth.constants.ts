export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
export const AUDIT_LOG_REPOSITORY = Symbol('AUDIT_LOG_REPOSITORY');
export const REDIS_CLIENT = Symbol('REDIS_CLIENT');
export const PASSWORD_RECOVERY_TOKEN_REPOSITORY = Symbol('PASSWORD_RECOVERY_TOKEN_REPOSITORY');

export const REFRESH_TOKEN_COOKIE = 'refreshToken';
export const ACCESS_TOKEN_TTL = '15m';
export const REFRESH_TOKEN_TTL = '7d';
export const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;
export const LOGIN_RATE_LIMIT_WINDOW_SECONDS = 15 * 60;
export const LOGIN_RATE_LIMIT_MAX_ATTEMPTS = 5;

// Recuperação de conta (esqueci minha senha / esqueci meu login)
export const RESET_TOKEN_TTL_SECONDS = 60 * 60;
export const LOGIN_OTP_TTL_SECONDS = 10 * 60;
export const LOGIN_OTP_MAX_ATTEMPTS = 5;
export const RECOVERY_RATE_LIMIT_WINDOW_SECONDS = 15 * 60;
export const RECOVERY_RATE_LIMIT_MAX_PER_IP = 5;
export const RECOVERY_RATE_LIMIT_MAX_PER_IDENTIFIER = 3;
