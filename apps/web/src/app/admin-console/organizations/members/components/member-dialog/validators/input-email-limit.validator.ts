import { AbstractControl, ValidationErrors, ValidatorFn } from "@angular/forms";

import { Organization } from "@bitwarden/common/admin-console/models/domain/organization";
import { ProductTierType } from "@bitwarden/common/billing/enums";

function getUniqueEmails(control: AbstractControl): string[] {
  const value = control.value;

  if (!value) {
    return [];
  }

  const emails: string[] = Array.isArray(value)
    ? value
    : (value as string).split(",").filter((email: string) => email && email.trim() !== "");

  return Array.from(new Set(emails.map((e) => e.trim()).filter(Boolean)));
}

/**
 * Ensure the number of unique emails does not exceed the allowed maximum.
 * @param organization An object representing the organization
 * @param getErrorMessage A callback function that generates the error message. It takes the `maxEmailsCount` as a parameter.
 * @returns A function that validates an `AbstractControl` and returns `ValidationErrors` or `null`
 */
export function inputEmailLimitValidator(
  organization: Organization,
  getErrorMessage: (maxEmailsCount: number) => string,
): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    const isEmpty = Array.isArray(value) ? value.length === 0 : !value?.trim();
    if (isEmpty) {
      return null;
    }

    const maxEmailsCount = organization.productTierType === ProductTierType.TeamsStarter ? 10 : 20;

    const uniqueEmails = getUniqueEmails(control);

    if (uniqueEmails.length <= maxEmailsCount) {
      return null;
    }

    return { tooManyEmails: { message: getErrorMessage(maxEmailsCount) } };
  };
}
