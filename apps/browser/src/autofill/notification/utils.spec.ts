import { NotificationTypes } from "./abstractions/notification-bar";
import { isAtRiskPasswordNotification } from "./utils";

describe("isAtRiskPasswordNotification", () => {
  describe("type check", () => {
    it.each([
      ["Add", NotificationTypes.Add],
      ["Change", NotificationTypes.Change],
      ["Unlock", NotificationTypes.Unlock],
    ])("returns false when type is %s", (_, type) => {
      expect(isAtRiskPasswordNotification({ type, params: { organizationName: "Acme" } })).toBe(
        false,
      );
    });

    it("returns false when type is absent", () => {
      expect(isAtRiskPasswordNotification({ params: { organizationName: "Acme" } })).toBe(false);
    });
  });

  describe("params shape", () => {
    it("returns false when params is absent", () => {
      expect(isAtRiskPasswordNotification({ type: NotificationTypes.AtRiskPassword })).toBe(false);
    });

    it("returns false when params is null", () => {
      expect(
        isAtRiskPasswordNotification({ type: NotificationTypes.AtRiskPassword, params: null }),
      ).toBe(false);
    });

    it.each([
      ["a string", "bad"],
      ["a number", 42],
      ["a boolean", true],
    ])("returns false when params is %s", (_, params) => {
      expect(isAtRiskPasswordNotification({ type: NotificationTypes.AtRiskPassword, params })).toBe(
        false,
      );
    });

    it("returns false when params is an array (organizationName absent)", () => {
      expect(
        isAtRiskPasswordNotification({ type: NotificationTypes.AtRiskPassword, params: [] }),
      ).toBe(false);
    });

    it("returns false when organizationName is absent", () => {
      expect(
        isAtRiskPasswordNotification({ type: NotificationTypes.AtRiskPassword, params: {} }),
      ).toBe(false);
    });

    it("returns false when organizationName is not a string", () => {
      expect(
        isAtRiskPasswordNotification({
          type: NotificationTypes.AtRiskPassword,
          params: { organizationName: 42 },
        }),
      ).toBe(false);
    });

    it("returns true when organizationName is an empty string", () => {
      expect(
        isAtRiskPasswordNotification({
          type: NotificationTypes.AtRiskPassword,
          params: { organizationName: "" },
        }),
      ).toBe(true);
    });

    it("returns true when organizationName is present and passwordChangeUri is absent", () => {
      expect(
        isAtRiskPasswordNotification({
          type: NotificationTypes.AtRiskPassword,
          params: { organizationName: "Acme" },
        }),
      ).toBe(true);
    });

    it("returns true when both organizationName and passwordChangeUri are present strings", () => {
      expect(
        isAtRiskPasswordNotification({
          type: NotificationTypes.AtRiskPassword,
          params: {
            organizationName: "Acme",
            passwordChangeUri: "https://example.com/.well-known/change-password",
          },
        }),
      ).toBe(true);
    });

    it("returns true when passwordChangeUri is an empty string", () => {
      expect(
        isAtRiskPasswordNotification({
          type: NotificationTypes.AtRiskPassword,
          params: { organizationName: "Acme", passwordChangeUri: "" },
        }),
      ).toBe(true);
    });

    it("returns false when passwordChangeUri is present but not a string", () => {
      expect(
        isAtRiskPasswordNotification({
          type: NotificationTypes.AtRiskPassword,
          params: { organizationName: "Acme", passwordChangeUri: 123 },
        }),
      ).toBe(false);
    });

    it("returns false when passwordChangeUri is null", () => {
      expect(
        isAtRiskPasswordNotification({
          type: NotificationTypes.AtRiskPassword,
          params: { organizationName: "Acme", passwordChangeUri: null },
        }),
      ).toBe(false);
    });
  });
});
