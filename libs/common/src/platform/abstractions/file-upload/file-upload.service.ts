import { EncString } from "../../../key-management/crypto/models/enc-string";
import { FileUploadType } from "../../enums";
import { AzureUploadBlockSize } from "../../enums/azure-block-size.enum";
import { EncArrayBuffer } from "../../models/domain/enc-array-buffer";

export abstract class FileUploadService {
  abstract upload(
    uploadData: { url: string; fileUploadType: FileUploadType },
    fileName: EncString,
    encryptedFileData: EncArrayBuffer,
    fileUploadMethods: FileUploadApiMethods,
    azureOptions?: AzureUploadOptions,
  ): Promise<void>;
}

export type FileUploadApiMethods = {
  postDirect: (fileData: FormData) => Promise<void>;
  renewFileUploadUrl: () => Promise<string>;
  rollback: () => Promise<void>;
};

/** Options specific to Azure file uploads */
export type AzureUploadOptions = {
  /**
   * Block size in bytes for Azure uploads.
   * @default AzureUploadBlockSize.4000
   */
  blockSize?: AzureUploadBlockSize;
  /** Callback function to receive upload progress updates as a percentage (0-100) for Azure uploads. */
  onProgress?: (percent: number) => void;
};
