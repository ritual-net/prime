import type { BaseProvider } from "@ml/base";
import { ProviderType } from "@prisma/client";
import { PaperSpaceProvider } from "@ml/paperspace";

// Used to define a constructable interface
interface Constructable<T> {
  new (...args: any): T;
}

// ProviderType => implementation constructor
export const ProviderTypeToInterface: {
  [key in ProviderType]: Constructable<BaseProvider>;
} = {
  [ProviderType.PAPERSPACE]: PaperSpaceProvider,
};
