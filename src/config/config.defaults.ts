import { BusinessType, Prisma } from '@prisma/client';

export interface BusinessModules {
  ingredients: boolean;
  recipes: boolean;
  combos: boolean;
  priceLists: boolean;
  fiscalFields: boolean;
  electronicInvoicing: boolean;
}

export const BUSINESS_CONFIG_SINGLETON_ID = 1;
export const DEFAULT_BUSINESS_NAME = 'Registry POS';
export const DEFAULT_BUSINESS_TYPE = BusinessType.DESSERT_SHOP;
export const DEFAULT_CURRENCY_CODE = 'COP';
export const DEFAULT_TIMEZONE = 'America/Bogota';
export const DEFAULT_COUNTRY_CODE = 'CO';

const PRESET_FOOD_SERVICE: BusinessModules = {
  ingredients: true,
  recipes: true,
  combos: true,
  priceLists: false,
  fiscalFields: false,
  electronicInvoicing: false,
};

const PRESET_COMMERCE: BusinessModules = {
  ingredients: false,
  recipes: false,
  combos: false,
  priceLists: true,
  fiscalFields: false,
  electronicInvoicing: false,
};

const BUSINESS_TYPE_PRESETS: Partial<Record<BusinessType, BusinessModules>> = {
  [BusinessType.DESSERT_SHOP]: PRESET_FOOD_SERVICE,
  [BusinessType.CAFE]: PRESET_FOOD_SERVICE,
  [BusinessType.RESTAURANT]: PRESET_FOOD_SERVICE,
  [BusinessType.RETAIL]: PRESET_COMMERCE,
  [BusinessType.MINIMARKET]: PRESET_COMMERCE,
  [BusinessType.SALON]: PRESET_COMMERCE,
};

export function getBusinessTypePreset(
  businessType: BusinessType,
): BusinessModules | null {
  const preset = BUSINESS_TYPE_PRESETS[businessType];
  return preset ? cloneModules(preset) : null;
}

export function getDefaultBusinessModules(): BusinessModules {
  return getBusinessTypePreset(DEFAULT_BUSINESS_TYPE)!;
}

export function getDefaultBusinessConfigCreateInput(): Prisma.BusinessConfigCreateInput {
  return {
    id: BUSINESS_CONFIG_SINGLETON_ID,
    businessName: DEFAULT_BUSINESS_NAME,
    businessType: DEFAULT_BUSINESS_TYPE,
    currencyCode: DEFAULT_CURRENCY_CODE,
    timezone: DEFAULT_TIMEZONE,
    countryCode: DEFAULT_COUNTRY_CODE,
    modules: toBusinessModulesJson(getDefaultBusinessModules()),
  };
}

export function readBusinessModules(
  value: Prisma.JsonValue | null | undefined,
): BusinessModules {
  const fallback = getDefaultBusinessModules();

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return fallback;
  }

  const source = value as Record<string, unknown>;

  return enforceBusinessModuleDependencies({
    ingredients:
      typeof source.ingredients === 'boolean'
        ? source.ingredients
        : fallback.ingredients,
    recipes:
      typeof source.recipes === 'boolean' ? source.recipes : fallback.recipes,
    combos: typeof source.combos === 'boolean' ? source.combos : fallback.combos,
    priceLists:
      typeof source.priceLists === 'boolean'
        ? source.priceLists
        : fallback.priceLists,
    fiscalFields:
      typeof source.fiscalFields === 'boolean'
        ? source.fiscalFields
        : fallback.fiscalFields,
    electronicInvoicing:
      typeof source.electronicInvoicing === 'boolean'
        ? source.electronicInvoicing
        : fallback.electronicInvoicing,
  });
}

export function mergeBusinessModules(
  current: BusinessModules,
  patch?: Partial<BusinessModules> | null,
): BusinessModules {
  if (!patch) {
    return enforceBusinessModuleDependencies(current);
  }

  return enforceBusinessModuleDependencies({
    ...current,
    ...(patch.ingredients !== undefined
      ? { ingredients: patch.ingredients }
      : {}),
    ...(patch.recipes !== undefined ? { recipes: patch.recipes } : {}),
    ...(patch.combos !== undefined ? { combos: patch.combos } : {}),
    ...(patch.priceLists !== undefined ? { priceLists: patch.priceLists } : {}),
    ...(patch.fiscalFields !== undefined
      ? { fiscalFields: patch.fiscalFields }
      : {}),
    ...(patch.electronicInvoicing !== undefined
      ? { electronicInvoicing: patch.electronicInvoicing }
      : {}),
  });
}

export function enforceBusinessModuleDependencies(
  modules: BusinessModules,
): BusinessModules {
  const normalized = cloneModules(modules);

  if (normalized.recipes) {
    normalized.ingredients = true;
  }

  if (!normalized.ingredients) {
    normalized.recipes = false;
  }

  if (normalized.electronicInvoicing) {
    normalized.fiscalFields = true;
  }

  if (!normalized.fiscalFields) {
    normalized.electronicInvoicing = false;
  }

  return normalized;
}

export function toBusinessModulesJson(
  modules: BusinessModules,
): Prisma.InputJsonObject {
  return {
    ingredients: modules.ingredients,
    recipes: modules.recipes,
    combos: modules.combos,
    priceLists: modules.priceLists,
    fiscalFields: modules.fiscalFields,
    electronicInvoicing: modules.electronicInvoicing,
  };
}

function cloneModules(modules: BusinessModules): BusinessModules {
  return {
    ingredients: modules.ingredients,
    recipes: modules.recipes,
    combos: modules.combos,
    priceLists: modules.priceLists,
    fiscalFields: modules.fiscalFields,
    electronicInvoicing: modules.electronicInvoicing,
  };
}
