import { AbstractControl, ValidationErrors, Validators } from "@angular/forms";

function isValidEmail(email: string): boolean {
  return Validators.email({ value: email.trim() } as AbstractControl) === null;
}

export function commaSeparatedEmails(control: AbstractControl): ValidationErrors | null {
  const value = control.value;

  if (!value) {
    return null;
  }

  const emails: string[] = Array.isArray(value)
    ? value
    : (value as string)
        .split(",")
        .map((e: string) => e.trim())
        .filter(Boolean);

  if (emails.length === 0) {
    return null;
  }

  const hasInvalidEmail = emails.some((email) => !isValidEmail(email));

  return hasInvalidEmail ? { multipleEmails: { message: "multipleInputEmails" } } : null;
}
