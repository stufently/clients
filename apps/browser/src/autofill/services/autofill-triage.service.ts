import AutofillField from "../models/autofill-field";
import AutofillPageDetails from "../models/autofill-page-details";
import { AutofillTriageConditionResult, AutofillTriageFieldResult } from "../types/autofill-triage";

import { AutofillTriageService as AutofillTriageServiceInterface } from "./abstractions/autofill-triage.service";
import { InlineMenuFieldQualificationService } from "./abstractions/inline-menu-field-qualifications.service";

export class AutofillTriageService implements AutofillTriageServiceInterface {
  constructor(private qualificationService: InlineMenuFieldQualificationService) {}

  /**
   * Analyzes a field by calling all relevant qualification methods and wrapping
   * their results as flat condition entries. This PoC implementation does not
   * expose sub-conditions (that would require refactoring the qualification service).
   *
   * @param field - The field to analyze
   * @param pageDetails - The page context
   * @returns Complete triage result with all checks performed
   */
  triageField(field: AutofillField, pageDetails: AutofillPageDetails): AutofillTriageFieldResult {
    const conditions: AutofillTriageConditionResult[] = [];

    // Login-related checks
    conditions.push(
      this.checkCondition("Is username field", () =>
        this.qualificationService.isUsernameField(field),
      ),
    );
    conditions.push(
      this.checkCondition("Is email field", () => this.qualificationService.isEmailField(field)),
    );
    conditions.push(
      this.checkCondition("Is current password field", () =>
        this.qualificationService.isCurrentPasswordField(field),
      ),
    );
    conditions.push(
      this.checkCondition("Is new password field", () =>
        this.qualificationService.isNewPasswordField(field),
      ),
    );
    conditions.push(
      this.checkCondition("Is update current password field", () =>
        this.qualificationService.isUpdateCurrentPasswordField(field),
      ),
    );
    conditions.push(
      this.checkCondition("Is TOTP field", () => this.qualificationService.isTotpField(field)),
    );

    // Form-level checks
    conditions.push(
      this.checkCondition("Is for login form", () =>
        this.qualificationService.isFieldForLoginForm(field, pageDetails),
      ),
    );
    conditions.push(
      this.checkCondition("Is for account creation form", () =>
        this.qualificationService.isFieldForAccountCreationForm(field, pageDetails),
      ),
    );
    conditions.push(
      this.checkCondition("Is for credit card form", () =>
        this.qualificationService.isFieldForCreditCardForm(field, pageDetails),
      ),
    );
    conditions.push(
      this.checkCondition("Is for identity form", () =>
        this.qualificationService.isFieldForIdentityForm(field, pageDetails),
      ),
    );

    // Credit card-specific checks
    conditions.push(
      this.checkCondition("Is cardholder name field", () =>
        this.qualificationService.isFieldForCardholderName(field),
      ),
    );
    conditions.push(
      this.checkCondition("Is card number field", () =>
        this.qualificationService.isFieldForCardNumber(field),
      ),
    );
    conditions.push(
      this.checkCondition("Is card expiration date field", () =>
        this.qualificationService.isFieldForCardExpirationDate(field),
      ),
    );
    conditions.push(
      this.checkCondition("Is card expiration month field", () =>
        this.qualificationService.isFieldForCardExpirationMonth(field),
      ),
    );
    conditions.push(
      this.checkCondition("Is card expiration year field", () =>
        this.qualificationService.isFieldForCardExpirationYear(field),
      ),
    );
    conditions.push(
      this.checkCondition("Is card CVV field", () =>
        this.qualificationService.isFieldForCardCvv(field),
      ),
    );

    // Identity-specific checks
    conditions.push(
      this.checkCondition("Is identity title field", () =>
        this.qualificationService.isFieldForIdentityTitle(field),
      ),
    );
    conditions.push(
      this.checkCondition("Is identity first name field", () =>
        this.qualificationService.isFieldForIdentityFirstName(field),
      ),
    );
    conditions.push(
      this.checkCondition("Is identity middle name field", () =>
        this.qualificationService.isFieldForIdentityMiddleName(field),
      ),
    );
    conditions.push(
      this.checkCondition("Is identity last name field", () =>
        this.qualificationService.isFieldForIdentityLastName(field),
      ),
    );
    conditions.push(
      this.checkCondition("Is identity full name field", () =>
        this.qualificationService.isFieldForIdentityFullName(field),
      ),
    );
    conditions.push(
      this.checkCondition("Is identity address 1 field", () =>
        this.qualificationService.isFieldForIdentityAddress1(field),
      ),
    );
    conditions.push(
      this.checkCondition("Is identity address 2 field", () =>
        this.qualificationService.isFieldForIdentityAddress2(field),
      ),
    );
    conditions.push(
      this.checkCondition("Is identity address 3 field", () =>
        this.qualificationService.isFieldForIdentityAddress3(field),
      ),
    );
    conditions.push(
      this.checkCondition("Is identity city field", () =>
        this.qualificationService.isFieldForIdentityCity(field),
      ),
    );
    conditions.push(
      this.checkCondition("Is identity state field", () =>
        this.qualificationService.isFieldForIdentityState(field),
      ),
    );
    conditions.push(
      this.checkCondition("Is identity postal code field", () =>
        this.qualificationService.isFieldForIdentityPostalCode(field),
      ),
    );
    conditions.push(
      this.checkCondition("Is identity country field", () =>
        this.qualificationService.isFieldForIdentityCountry(field),
      ),
    );
    conditions.push(
      this.checkCondition("Is identity company field", () =>
        this.qualificationService.isFieldForIdentityCompany(field),
      ),
    );
    conditions.push(
      this.checkCondition("Is identity phone field", () =>
        this.qualificationService.isFieldForIdentityPhone(field),
      ),
    );
    conditions.push(
      this.checkCondition("Is identity email field", () =>
        this.qualificationService.isFieldForIdentityEmail(field),
      ),
    );
    conditions.push(
      this.checkCondition("Is identity username field", () =>
        this.qualificationService.isFieldForIdentityUsername(field),
      ),
    );

    // Determine if field is eligible (any check passed)
    const eligible = conditions.some((c) => c.passed);

    // Determine what the field qualified as
    const qualifiedAs = this.deriveQualifiedAs(conditions);

    return {
      htmlId: field.htmlID || undefined,
      htmlName: field.htmlName || undefined,
      htmlType: field.type || undefined,
      placeholder: field.placeholder || undefined,
      ariaLabel: field["label-aria"] || undefined,
      autocomplete: field.autoCompleteType || undefined,
      formIndex: field.form !== null && field.form !== undefined ? field.form : undefined,
      eligible,
      qualifiedAs,
      conditions,
    };
  }

  /**
   * Wraps a qualification check function call and returns a flat condition result.
   * For this PoC, subConditions are always empty (no deep instrumentation).
   *
   * @param description - Human-readable description of the check
   * @param fn - The qualification check function to execute
   * @returns Flat condition result with pass/fail status
   */
  private checkCondition(description: string, fn: () => boolean): AutofillTriageConditionResult {
    const passed = fn();
    return {
      description,
      passed,
      subConditions: [], // PoC limitation: no sub-condition visibility
    };
  }

  /**
   * Derives a human-readable qualification category based on which checks passed.
   * Priority: login > creditCard > identity > accountCreation > ineligible
   *
   * @param conditions - Array of all condition results
   * @returns Qualification category string
   */
  private deriveQualifiedAs(conditions: AutofillTriageConditionResult[]): string {
    // Check form-level qualifications first (more specific)
    if (conditions.find((c) => c.description === "Is for login form" && c.passed)) {
      return "login";
    }
    if (conditions.find((c) => c.description === "Is for credit card form" && c.passed)) {
      return "creditCard";
    }
    if (conditions.find((c) => c.description === "Is for identity form" && c.passed)) {
      return "identity";
    }
    if (conditions.find((c) => c.description === "Is for account creation form" && c.passed)) {
      return "accountCreation";
    }

    // Check field-level qualifications (fallback)
    if (
      conditions.find((c) => c.description === "Is username field" && c.passed) ||
      conditions.find((c) => c.description === "Is current password field" && c.passed) ||
      conditions.find((c) => c.description === "Is TOTP field" && c.passed)
    ) {
      return "login";
    }

    if (
      conditions.find((c) => c.description === "Is card number field" && c.passed) ||
      conditions.find((c) => c.description === "Is card CVV field" && c.passed)
    ) {
      return "creditCard";
    }

    if (
      conditions.find((c) => c.description === "Is identity address 1 field" && c.passed) ||
      conditions.find((c) => c.description === "Is identity phone field" && c.passed)
    ) {
      return "identity";
    }

    if (conditions.find((c) => c.description === "Is new password field" && c.passed)) {
      return "accountCreation";
    }

    return "ineligible";
  }
}
