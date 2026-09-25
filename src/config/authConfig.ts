/**
 * Master Authorization Configuration
 * 
 * DESIGNATED_CONTROLLER_EMAILS:
 * Anyone whose email is in this list is recognized as a Root Controller / Administrator.
 * They can directly register with their own password (bypassing the approval queue),
 * and automatically receive full administrative privileges (Employees, Settings, Audit Logs, Invoices).
 */

export const DESIGNATED_CONTROLLER_EMAILS: string[] = [
  'jeshwarmurali@gmail.com',
  'info@ironvalleyagro.in',
  'admin@ironvalleyagro.in',
  'controller@agrobill.com',
];

/**
 * Check if an email belongs to the designated Controller whitelist (case-insensitive)
 */
export function isDesignatedControllerEmail(email: string): boolean {
  if (!email) return false;
  const clean = email.toLowerCase().trim();
  return DESIGNATED_CONTROLLER_EMAILS.some((adminEmail) => adminEmail.toLowerCase().trim() === clean);
}
