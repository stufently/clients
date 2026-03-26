import { DeviceDisplayData } from "../device-management.component";

import {
  clearAuthRequestAndSortDevices,
  sortDevices,
  sortDevicesWithActivity,
} from "./device-sort.utils";

function makeDevice(overrides: Partial<DeviceDisplayData> = {}): DeviceDisplayData {
  return {
    creationDate: "2026-01-01T00:00:00Z",
    displayName: "Test Device",
    firstLogin: new Date("2026-01-01T00:00:00Z"),
    icon: "bwi bwi-desktop",
    id: "device-id",
    identifier: "device-identifier",
    isCurrentDevice: false,
    isTrusted: false,
    lastActivityDate: null,
    loginStatus: "",
    pendingAuthRequest: null,
    recentlyActiveText: "",
    ...overrides,
  };
}

// TODO: PM-34091 - Delete this entire describe block; sortDevices is being removed.
describe("sortDevices", () => {
  it("sorts pending auth request device before non-pending device", () => {
    const pending = makeDevice({ pendingAuthRequest: { id: "req-1", creationDate: "" } });
    const normal = makeDevice();

    const result = [normal, pending].sort(sortDevices);

    expect(result[0]).toBe(pending);
    expect(result[1]).toBe(normal);
  });

  it("sorts current device before non-current device when neither has a pending request", () => {
    const current = makeDevice({ isCurrentDevice: true });
    const other = makeDevice();

    const result = [other, current].sort(sortDevices);

    expect(result[0]).toBe(current);
    expect(result[1]).toBe(other);
  });

  it("sorts pending auth request device before current device", () => {
    const pending = makeDevice({ pendingAuthRequest: { id: "req-1", creationDate: "" } });
    const current = makeDevice({ isCurrentDevice: true });

    const result = [current, pending].sort(sortDevices);

    expect(result[0]).toBe(pending);
    expect(result[1]).toBe(current);
  });

  it("sorts devices by creation date descending when no special flags apply", () => {
    const older = makeDevice({ creationDate: "2026-01-01T00:00:00Z" });
    const newer = makeDevice({ creationDate: "2026-03-01T00:00:00Z" });

    const result = [older, newer].sort(sortDevices);

    expect(result[0]).toBe(newer);
    expect(result[1]).toBe(older);
  });

  it("returns 0 for two devices with identical creation dates and no special flags", () => {
    const a = makeDevice({ creationDate: "2026-01-01T00:00:00Z" });
    const b = makeDevice({ creationDate: "2026-01-01T00:00:00Z" });

    expect(sortDevices(a, b)).toBe(0);
  });
});

// TODO: PM-34091 - Rename this describe block to "sortDevices" once sortDevicesWithActivity is renamed.
describe("sortDevicesWithActivity", () => {
  it("sorts current device first, before pending auth request", () => {
    const current = makeDevice({ isCurrentDevice: true });
    const pending = makeDevice({ pendingAuthRequest: { id: "req-1", creationDate: "" } });

    const result = [pending, current].sort(sortDevicesWithActivity);

    expect(result[0]).toBe(current);
    expect(result[1]).toBe(pending);
  });

  it("sorts pending auth request device before recently active device", () => {
    const pending = makeDevice({ pendingAuthRequest: { id: "req-1", creationDate: "" } });
    const active = makeDevice({ lastActivityDate: new Date("2026-03-25T00:00:00Z") });

    const result = [active, pending].sort(sortDevicesWithActivity);

    expect(result[0]).toBe(pending);
    expect(result[1]).toBe(active);
  });

  it("sorts more recently active device before less recently active device", () => {
    const recentlyActive = makeDevice({ lastActivityDate: new Date("2026-03-25T00:00:00Z") });
    const lessRecentlyActive = makeDevice({ lastActivityDate: new Date("2026-01-01T00:00:00Z") });

    const result = [lessRecentlyActive, recentlyActive].sort(sortDevicesWithActivity);

    expect(result[0]).toBe(recentlyActive);
    expect(result[1]).toBe(lessRecentlyActive);
  });

  it("sorts device with lastActivityDate before device without one", () => {
    const withActivity = makeDevice({ lastActivityDate: new Date("2026-01-01T00:00:00Z") });
    const withoutActivity = makeDevice({ lastActivityDate: null });

    const result = [withoutActivity, withActivity].sort(sortDevicesWithActivity);

    expect(result[0]).toBe(withActivity);
    expect(result[1]).toBe(withoutActivity);
  });

  it("falls back to firstLogin date when both devices have no lastActivityDate", () => {
    const olderFirstLogin = makeDevice({ firstLogin: new Date("2026-01-01T00:00:00Z") });
    const newerFirstLogin = makeDevice({ firstLogin: new Date("2026-03-01T00:00:00Z") });

    const result = [olderFirstLogin, newerFirstLogin].sort(sortDevicesWithActivity);

    expect(result[0]).toBe(newerFirstLogin);
    expect(result[1]).toBe(olderFirstLogin);
  });
});

describe("clearAuthRequestAndSortDevices", () => {
  it("clears pendingAuthRequest and loginStatus on the matching device", () => {
    const target = makeDevice({
      pendingAuthRequest: { id: "req-1", creationDate: "" },
      loginStatus: "requestPending",
    });
    const other = makeDevice();

    const result = clearAuthRequestAndSortDevices([target, other], {
      id: "req-1",
      creationDate: "",
    });

    const clearedDevice = result.find((d) => d.id === target.id);
    expect(clearedDevice?.pendingAuthRequest).toBeNull();
    expect(clearedDevice?.loginStatus).toBe("");
  });

  it("does not modify devices that do not match the pending auth request", () => {
    const target = makeDevice({
      pendingAuthRequest: { id: "req-1", creationDate: "" },
      loginStatus: "requestPending",
    });
    const other = makeDevice({ loginStatus: "currentSession" });

    clearAuthRequestAndSortDevices([target, other], { id: "req-1", creationDate: "" });

    expect(other.loginStatus).toBe("currentSession");
    expect(other.pendingAuthRequest).toBeNull();
  });

  // TODO: PM-34091 - Remove this test; the sortFn parameter is being removed.
  it("re-sorts using the provided sortFn after clearing", () => {
    const wasPending = makeDevice({
      id: "was-pending",
      pendingAuthRequest: { id: "req-1", creationDate: "" },
      firstLogin: new Date("2026-01-01T00:00:00Z"),
    });
    const current = makeDevice({
      id: "current",
      isCurrentDevice: true,
      firstLogin: new Date("2026-02-01T00:00:00Z"),
    });

    const result = clearAuthRequestAndSortDevices(
      [wasPending, current],
      { id: "req-1", creationDate: "" },
      sortDevicesWithActivity,
    );

    // After clearing the pending request, current device should sort first
    expect(result[0].id).toBe("current");
    expect(result[1].id).toBe("was-pending");
  });

  // TODO: PM-34091 - Remove this test; the sortFn parameter default is being removed.
  it("defaults to sortDevices sort when no sortFn is provided", () => {
    const wasPending = makeDevice({
      id: "was-pending",
      pendingAuthRequest: { id: "req-1", creationDate: "" },
      creationDate: "2026-01-01T00:00:00Z",
    });
    const current = makeDevice({
      id: "current",
      isCurrentDevice: true,
      creationDate: "2026-02-01T00:00:00Z",
    });

    const result = clearAuthRequestAndSortDevices([wasPending, current], {
      id: "req-1",
      creationDate: "",
    });

    // sortDevices puts current device before others when no pending request
    expect(result[0].id).toBe("current");
  });
});
