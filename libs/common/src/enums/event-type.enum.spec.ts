import { EventType, eventTypeNames } from "./event-type.enum";

describe("EventType", () => {
  describe("value preservation", () => {
    it("preserves values for the User group", () => {
      expect(EventType.User_LoggedIn).toBe(1000);
      expect(EventType.User_TdeOffboardingPasswordSet).toBe(1011);
    });

    it("preserves values for the Cipher group", () => {
      expect(EventType.Cipher_Created).toBe(1100);
      expect(EventType.Cipher_ClientToggledTOTPSeedVisible).toBe(1118);
    });

    it("preserves values for the Collection group", () => {
      expect(EventType.Collection_Created).toBe(1300);
    });

    it("preserves values for the Group group", () => {
      expect(EventType.Group_Created).toBe(1400);
    });

    it("preserves values for the OrganizationUser group", () => {
      expect(EventType.OrganizationUser_Invited).toBe(1500);
      expect(EventType.OrganizationUser_Left).toBe(1516);
    });

    it("preserves values for the Organization group", () => {
      expect(EventType.Organization_Updated).toBe(1600);
      expect(EventType.Organization_ItemOrganization_Declined).toBe(1619);
    });

    it("preserves values for the Policy group", () => {
      expect(EventType.Policy_Updated).toBe(1700);
    });

    it("preserves values for the ProviderUser group", () => {
      expect(EventType.ProviderUser_Invited).toBe(1800);
    });

    it("preserves values for the ProviderOrganization group", () => {
      expect(EventType.ProviderOrganization_Created).toBe(1900);
    });

    it("preserves values for the OrganizationDomain group", () => {
      expect(EventType.OrganizationDomain_Added).toBe(2000);
    });

    it("preserves values for the Secret group", () => {
      expect(EventType.Secret_Retrieved).toBe(2100);
      expect(EventType.Secret_ServiceAccountAccessUpdated).toBe(2114);
    });

    it("preserves values for the Project group", () => {
      expect(EventType.Project_Retrieved).toBe(2200);
      expect(EventType.Project_ServiceAccountAccessUpdated).toBe(2212);
    });

    it("preserves values for the ServiceAccount group", () => {
      expect(EventType.ServiceAccount_UserAdded).toBe(2300);
      expect(EventType.ServiceAccount_GroupPermissionUpdated).toBe(2307);
    });
  });

  describe("eventTypeNames", () => {
    it("maps numeric values back to key names", () => {
      expect(eventTypeNames[1000]).toBe("User_LoggedIn");
      expect(eventTypeNames[1100]).toBe("Cipher_Created");
      expect(eventTypeNames[1300]).toBe("Collection_Created");
      expect(eventTypeNames[1400]).toBe("Group_Created");
      expect(eventTypeNames[1500]).toBe("OrganizationUser_Invited");
      expect(eventTypeNames[1600]).toBe("Organization_Updated");
      expect(eventTypeNames[1700]).toBe("Policy_Updated");
      expect(eventTypeNames[1800]).toBe("ProviderUser_Invited");
      expect(eventTypeNames[1900]).toBe("ProviderOrganization_Created");
      expect(eventTypeNames[2000]).toBe("OrganizationDomain_Added");
      expect(eventTypeNames[2100]).toBe("Secret_Retrieved");
      expect(eventTypeNames[2200]).toBe("Project_Retrieved");
      expect(eventTypeNames[2300]).toBe("ServiceAccount_UserAdded");
    });

    it("returns undefined for an unknown value", () => {
      expect(eventTypeNames[9999 as EventType]).toBeUndefined();
    });
  });
});
