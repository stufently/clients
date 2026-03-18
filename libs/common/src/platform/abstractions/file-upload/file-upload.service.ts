import { EncString } from "../../../key-management/crypto/models/enc-string";
import { FileUploadType } from "../../enums";
import { EncArrayBuffer } from "../../models/domain/enc-array-buffer";

export abstract class FileUploadService {
  abstract upload(
    uploadData: { url: string; fileUploadType: FileUploadType },
    fileName: EncString,
    encryptedFileData: EncArrayBuffer,
    fileUploadMethods: FileUploadApiMethods,
    /** Options specific to Azure file uploads */
    azureOptions?: {
      /**
       * Block size in bytes for Azure uploads.
       * @default 33554432 (32 MiB)
       */
      blockSize?: number;
      /** Callback function to receive upload progress updates as a percentage (0-100) for Azure uploads. */
      onProgress?: (percent: number) => void;
    },
  ): Promise<void>;
}

export type FileUploadApiMethods = {
  postDirect: (fileData: FormData) => Promise<void>;
  renewFileUploadUrl: () => Promise<string>;
  rollback: () => Promise<void>;
};
