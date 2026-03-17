export const ApItemEnum = Object.freeze({
  User: 0,
  Group: 1,
  ServiceAccount: 2,
  Project: 3,
} as const);
export type ApItemEnum = (typeof ApItemEnum)[keyof typeof ApItemEnum];

export class ApItemEnumUtil {
  static itemIcon(type: ApItemEnum): string {
    switch (type) {
      case ApItemEnum.User:
        return "bwi-user";
      case ApItemEnum.Group:
        return "bwi-family";
      case ApItemEnum.ServiceAccount:
        return "bwi-wrench";
      case ApItemEnum.Project:
        return "bwi-collection";
    }
  }
}
