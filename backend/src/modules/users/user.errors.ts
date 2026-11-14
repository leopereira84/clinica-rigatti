import { AppError } from '../../shared/errors/AppError.js';

export function emailInUseError(): AppError {
  return new AppError(409, 'EMAIL_ALREADY_IN_USE', 'Email is already in use');
}
