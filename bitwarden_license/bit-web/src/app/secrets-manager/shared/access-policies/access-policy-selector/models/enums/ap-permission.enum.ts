export const ApPermissionEnum = Object.freeze({
  CanRead: "canRead",
  CanReadWrite: "canReadWrite",
  CanManage: "canManage",
} as const);
export type ApPermissionEnum = (typeof ApPermissionEnum)[keyof typeof ApPermissionEnum];

export class ApPermissionEnumUtil {
  static toApPermissionEnum(read: boolean, write: boolean, manage: boolean): ApPermissionEnum {
    if (manage) {
      return ApPermissionEnum.CanManage;
    } else if (read && write) {
      return ApPermissionEnum.CanReadWrite;
    } else if (read) {
      return ApPermissionEnum.CanRead;
    } else {
      // write=true/read=false or all-false is not a valid state
      // eslint-disable-next-line no-console
      console.warn("toApPermissionEnum: unexpected permission state", { read, write, manage });
      return ApPermissionEnum.CanRead;
    }
  }

  static toRead(permission: ApPermissionEnum): boolean {
    return (
      permission === ApPermissionEnum.CanRead ||
      permission === ApPermissionEnum.CanReadWrite ||
      permission === ApPermissionEnum.CanManage
    );
  }

  static toWrite(permission: ApPermissionEnum): boolean {
    return (
      permission === ApPermissionEnum.CanReadWrite || permission === ApPermissionEnum.CanManage
    );
  }

  static toManage(permission: ApPermissionEnum): boolean {
    return permission === ApPermissionEnum.CanManage;
  }
}
