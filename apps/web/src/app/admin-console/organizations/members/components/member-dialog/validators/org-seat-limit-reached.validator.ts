import { AbstractControl, ValidationErrors, ValidatorFn } from "@angular/forms";

import { Organization } from "@bitwarden/common/admin-console/models/domain/organization";
import { ProductTierType } from "@bitwarden/common/billing/enums";

/**
 * If the organization doesn't allow additional seat options, this checks if the seat limit has been reached when adding
 * new users
 * @param organization An object representing the organization
 * @param allOrganizationUserEmails An array of strings with existing user email addresses
 * @param errorMessage A localized string to display if validation fails
 * @param occupiedSeatCount The current count of active users occupying the organization's seats.
 * @returns A function that validates an `AbstractControl` and returns `ValidationErrors` or `null`
 */
export function orgSeatLimitReachedValidator(
  organization: Organization,
  allOrganizationUserEmails: string[],
  errorMessage: string,
  occupiedSeatCount: number,
): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    const isEmpty = Array.isArray(value) ? value.length === 0 : !value?.trim();
    if (isEmpty) {
      return null;
    }

    if (isDynamicSeatPlan(organization.productTierType)) {
      return null;
    }

    const newTotalUserCount =
      occupiedSeatCount + getUniqueNewEmailCount(allOrganizationUserEmails, control);

    if (newTotalUserCount > organization.seats) {
      return { seatLimitReached: { message: errorMessage } };
    }

    return null;
  };
}

export function isDynamicSeatPlan(productTierType: ProductTierType): boolean {
  return !isFixedSeatPlan(productTierType);
}

export function isFixedSeatPlan(productTierType: ProductTierType): boolean {
  switch (productTierType) {
    case ProductTierType.Free:
    case ProductTierType.Families:
    case ProductTierType.TeamsStarter:
      return true;
    default:
      return false;
  }
}

function getUniqueNewEmailCount(
  allOrganizationUserEmails: string[],
  control: AbstractControl,
): number {
  const value = control.value;

  const inputEmails: string[] = Array.isArray(value)
    ? value
    : (value as string)
        .split(",")
        .map((e: string) => e.trim())
        .filter(Boolean);

  const newEmailsToAdd = Array.from(
    new Set(
      inputEmails.filter(
        (email) => !allOrganizationUserEmails.some((existing) => existing === email),
      ),
    ),
  );

  return newEmailsToAdd.length;
}
