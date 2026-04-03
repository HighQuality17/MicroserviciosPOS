import type { ReactNode } from 'react';
import { ModuleDisabledPage } from '@/features/access/ModuleDisabledPage';
import { useBusinessModules, type BusinessModuleKey } from '@/hooks/useBusinessModules';

const moduleLabels: Record<BusinessModuleKey, string> = {
  ingredients: 'Ingredientes',
  recipes: 'Recetas',
  combos: 'Combos',
  priceLists: 'Listas de precio',
  fiscalFields: 'Campos fiscales',
  electronicInvoicing: 'Facturacion electronica',
};

interface ModuleAccessRouteProps {
  children: ReactNode;
  moduleKey: BusinessModuleKey;
  description?: string;
}

export function ModuleAccessRoute({
  children,
  moduleKey,
  description,
}: ModuleAccessRouteProps) {
  const { config, isModuleEnabled } = useBusinessModules();

  if (!config) {
    return <>{children}</>;
  }

  if (isModuleEnabled(moduleKey)) {
    return <>{children}</>;
  }

  return (
    <ModuleDisabledPage
      moduleName={moduleLabels[moduleKey]}
      description={description}
    />
  );
}
