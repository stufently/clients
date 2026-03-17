export const ApPermissionEnum = {
  CanRead: "canRead",
  CanReadWrite: "canReadWrite",
  CanManage: "canManage",
} as const;
export type ApPermissionEnum = (typeof ApPermissionEnum)[keyof typeof ApPermissionEnum];

export class ApPermissionEnumUtil {
  static toApPermissionEnum(read: boolean, write: boolean, manage: boolean): ApPermissionEnum {
    if (manage) {
      return ApPermissionEnum.CanManage;
    } else if (read && write) {
      return ApPermissionEnum.CanReadWrite;
    } else {
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
