// Full routes that auth owns in the extension
export const AuthExtensionRoute = Object.freeze({
  AccountSecurity: "account-security",
  /**
   * `SettingsChangePassword` is used when the user intentionally navigates to Settings > Account Security
   * to change their password.
   *
   * This is distinct from `AuthRoute.ChangePassword` (nested under `ExtensionAnonLayoutWrapperComponent`), which is used when
   * `ForceSetPasswordReason` forces the user to change their password due to either `AdminForcePasswordReset` or `WeakMasterPassword`
   *
   * TODO: eventually we should move to a parent/child routing structure, e.g. `/settings/change-password`
   */
  SettingsChangePassword: "settings-change-password",
  DeviceManagement: "device-management",
  AccountSwitcher: "account-switcher",
} as const);

export type AuthExtensionRoute = (typeof AuthExtensionRoute)[keyof typeof AuthExtensionRoute];
