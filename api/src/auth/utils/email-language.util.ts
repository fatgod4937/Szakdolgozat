import { Request } from 'express';

export type EmailLanguage = 'en' | 'hu';

export function getEmailLanguage(request: Request): EmailLanguage {
  return request.acceptsLanguages('en', 'hu') === 'hu' ? 'hu' : 'en';
}
