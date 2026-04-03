import { useBusinessConfigStore } from '@/store/businessConfigStore';
import type { BusinessModules } from '@/types/api';

export type BusinessModuleKey = keyof BusinessModules;

const safeFallbackModules: BusinessModules = {
  ingredients: true,
  recipes: true,
  combos: true,
  priceLists: true,
  fiscalFields: true,
  electronicInvoicing: true,
};

export function useBusinessModules() {
  const config = useBusinessConfigStore((state) => state.config);
  const isLoadingConfig = useBusinessConfigStore((state) => state.isLoadingConfig);
  const configError = useBusinessConfigStore((state) => state.configError);

  const modules = config?.modules ?? safeFallbackModules;

  return {
    config,
    modules,
    isLoadingConfig,
    configError,
    isModuleEnabled: (moduleKey: BusinessModuleKey) => modules[moduleKey],
  };
}
