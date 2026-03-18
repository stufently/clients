/** Commonly used block sizes for Azure uploads */
export const AzureUploadBlockSize = {
  32: 33_554_432, // 32 MiB
  128: 134_217_728, // 128 MiB
  4000: 4_194_304_000, // 4000 MiB, the maximum block size allowed by Azure
} as const;

export type AzureUploadBlockSize = (typeof AzureUploadBlockSize)[keyof typeof AzureUploadBlockSize];
