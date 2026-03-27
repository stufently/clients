// Full routes that auth owns in the extension
export const AuthExtensionRoute = Object.freeze({
  AccountSecurity: "account-security",
  /**
   * `AuthExtensionRoute.SettingsChangePassword` uses `ChangePasswordPageComponent` and is used when the user intentionally navigates
   * to Settings > Account Security to change their password.
   *
   * This is distinct from `AuthRoute.ChangePassword`, which uses `ExtensionAnonLayoutWrapperComponent`, and is used when
   * `ForceSetPasswordReason` forces the user to change their password due to either `AdminForcePasswordReset` or `WeakMasterPassword`
   *
   * TODO: PM-34240 - move auth settings to a nested routing structure, e.g. `/settings/account-security/change-password`
   */
  SettingsChangePassword: "settings-change-password",
  DeviceManagement: "device-management",
  AccountSwitcher: "account-switcher",
} as const);

export type AuthExtensionRoute = (typeof AuthExtensionRoute)[keyof typeof AuthExtensionRoute];
