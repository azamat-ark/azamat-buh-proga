/**
 * Centralized database error sanitization utility.
 * Prevents leaking internal database structure through error messages.
 */

interface DatabaseError {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
}

/**
 * Maps database error codes to user-friendly messages in Russian.
 * Prevents exposure of constraint names, table names, and internal details.
 */
export function sanitizeDbError(error: unknown): string {
  if (!error || typeof error !== 'object') {
    return 'Произошла ошибка. Попробуйте позже.';
  }

  const dbError = error as DatabaseError;
  const code = dbError.code;

  // Map known PostgreSQL error codes to user-friendly messages
  switch (code) {
    // Unique violation
    case '23505':
      return 'Запись с такими данными уже существует';
    
    // Foreign key violation
    case '23503':
      return 'Невозможно удалить связанную запись';
    
    // Check constraint violation
    case '23514':
      return 'Неверный формат данных';
    
    // Not null violation
    case '23502':
      return 'Обязательное поле не заполнено';
    
    // Insufficient privilege
    case '42501':
      return 'Недостаточно прав доступа';
    
    // RLS policy violation
    case '42P01':
      return 'Недостаточно прав доступа';
    
    // Numeric value out of range
    case '22003':
      return 'Число вне допустимого диапазона';
    
    // Invalid text representation
    case '22P02':
      return 'Неверный формат данных';
    
    // String data right truncation
    case '22001':
      return 'Текст слишком длинный';
    
    default:
      // For unknown errors, return generic message without exposing details
      return 'Ошибка базы данных. Попробуйте позже.';
  }
}

/**
 * Logs error to console in development mode only.
 * In production, errors should be sent to a proper logging service.
 */
export function logError(context: string, error: unknown): void {
  if (import.meta.env.DEV) {
    console.error(`[${context}]`, error);
  }
  // In production, you could send to a logging service here
}
