import { blockContentType } from "./blockContentType";
import { categoryType } from "./categoryType";
import { postType } from "./postType";
import { authorType } from "./authorType";
import { dropPasswordType } from "./dropPasswordType";
import dropSettingsType from "./dropSettingsType";
import { productType } from "./productType";
import { collectionType } from "./collectionType";
import { promoCodeType } from "./promoCodeType";
import { promoUsageType } from "./promoUsageType";
import orderType from "./orderType";
import syncStateType from "./syncStateType";

export const schemaTypes = [
    // Content types
    blockContentType,
    postType,
    authorType,

    // Store types
    productType,
    categoryType,
    collectionType,
    promoCodeType,
    promoUsageType,
    orderType,

    // Utility types
    dropPasswordType,
    dropSettingsType,
    syncStateType,
]