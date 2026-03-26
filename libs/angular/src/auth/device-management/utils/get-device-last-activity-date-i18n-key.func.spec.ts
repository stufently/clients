import { getDeviceLastActivityDateI18nKey } from "./get-device-last-activity-date-i18n-key.func";

describe("getDeviceLastActivityDateI18nKey", () => {
  // Fixed reference point: Thursday March 26, 2026 at 2:00 PM local time
  const now = new Date(2026, 2, 26, 14, 0, 0);

  it("returns null when lastActivityDate is null", () => {
    expect(getDeviceLastActivityDateI18nKey(null, now)).toBeNull();
  });

  describe("recentlyActiveToday", () => {
    it("returns 'recentlyActiveToday' when activity was earlier the same calendar day", () => {
      const date = new Date(2026, 2, 26, 8, 0, 0); // same day, 8 AM
      expect(getDeviceLastActivityDateI18nKey(date, now)).toBe("recentlyActiveToday");
    });

    it("returns 'recentlyActiveToday' when activity was early the same calendar day", () => {
      // 1 AM same day — elapsed time is 13 hours, but it's still the same calendar day
      const date = new Date(2026, 2, 26, 1, 0, 0);
      expect(getDeviceLastActivityDateI18nKey(date, now)).toBe("recentlyActiveToday");
    });

    it("returns 'recentlyActiveToday' when activity timestamp is later the same calendar day", () => {
      // 11 PM same day — daysAgo is still 0 regardless of the time ordering
      const date = new Date(2026, 2, 26, 23, 0, 0);
      expect(getDeviceLastActivityDateI18nKey(date, now)).toBe("recentlyActiveToday");
    });
  });

  describe("recentlyActiveThisWeek", () => {
    it("returns 'recentlyActiveThisWeek' when activity was 1 calendar day ago", () => {
      const date = new Date(2026, 2, 25, 23, 59, 0); // Wednesday at 11:59 PM — was 'Today' with elapsed-ms
      expect(getDeviceLastActivityDateI18nKey(date, now)).toBe("recentlyActiveThisWeek");
    });

    it("returns 'recentlyActiveThisWeek' when activity was 3 calendar days ago", () => {
      const date = new Date(2026, 2, 23, 14, 0, 0);
      expect(getDeviceLastActivityDateI18nKey(date, now)).toBe("recentlyActiveThisWeek");
    });

    it("returns 'recentlyActiveThisWeek' when activity was 6 calendar days ago", () => {
      const date = new Date(2026, 2, 20, 14, 0, 0);
      expect(getDeviceLastActivityDateI18nKey(date, now)).toBe("recentlyActiveThisWeek");
    });
  });

  describe("recentlyActiveLastWeek", () => {
    it("returns 'recentlyActiveLastWeek' when activity was 7 calendar days ago", () => {
      const date = new Date(2026, 2, 19, 14, 0, 0);
      expect(getDeviceLastActivityDateI18nKey(date, now)).toBe("recentlyActiveLastWeek");
    });

    it("returns 'recentlyActiveLastWeek' when activity was 13 calendar days ago", () => {
      const date = new Date(2026, 2, 13, 14, 0, 0);
      expect(getDeviceLastActivityDateI18nKey(date, now)).toBe("recentlyActiveLastWeek");
    });
  });

  describe("recentlyActiveThisMonth", () => {
    it("returns 'recentlyActiveThisMonth' when activity was 14 calendar days ago", () => {
      const date = new Date(2026, 2, 12, 14, 0, 0);
      expect(getDeviceLastActivityDateI18nKey(date, now)).toBe("recentlyActiveThisMonth");
    });

    it("returns 'recentlyActiveThisMonth' when activity was 29 calendar days ago", () => {
      const date = new Date(2026, 1, 25, 14, 0, 0);
      expect(getDeviceLastActivityDateI18nKey(date, now)).toBe("recentlyActiveThisMonth");
    });
  });

  describe("recentlyActiveOverThirtyDays", () => {
    it("returns 'recentlyActiveOverThirtyDays' when activity was 30 calendar days ago", () => {
      const date = new Date(2026, 1, 24, 14, 0, 0);
      expect(getDeviceLastActivityDateI18nKey(date, now)).toBe("recentlyActiveOverThirtyDays");
    });

    it("returns 'recentlyActiveOverThirtyDays' when activity was 60 calendar days ago", () => {
      const date = new Date(2026, 0, 25, 14, 0, 0);
      expect(getDeviceLastActivityDateI18nKey(date, now)).toBe("recentlyActiveOverThirtyDays");
    });
  });

  it("uses the current time by default (smoke test)", () => {
    const date = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago, same calendar day
    expect(getDeviceLastActivityDateI18nKey(date)).toBe("recentlyActiveToday");
  });
});
