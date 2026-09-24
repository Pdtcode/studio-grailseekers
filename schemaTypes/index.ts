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
import pickupLocationType from "./pickupLocationType";
import bundleDealType from "./bundleDealType";
import syncStateType from "./syncStateType";
import inventoryAdjustmentType from "./inventoryAdjustmentType";

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
    pickupLocationType,
    bundleDealType,
    inventoryAdjustmentType,

    // Utility types
    dropPasswordType,
    dropSettingsType,
    syncStateType,
]