import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Building2,
  Save,
  Settings2,
  ShieldCheck,
  Sparkles,
  Store,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { CheckboxField } from '@/components/CheckboxField';
import { FeedbackMessage } from '@/components/FeedbackMessage';
import { Input } from '@/components/Input';
import { LoadingState } from '@/components/LoadingState';
import { ModuleStatusCard, ModuleStatusHeader } from '@/components/ModuleStatusHeader';
import { SectionHeader } from '@/components/SectionHeader';
import { Select } from '@/components/Select';
import { StatusBadge } from '@/components/StatusBadge';
import { Textarea } from '@/components/Textarea';
import { posApi } from '@/services/api/posApi';
import { useBusinessConfigStore } from '@/store/businessConfigStore';
import type {
  BusinessConfig,
  BusinessModules,
  BusinessType,
  UpdateBusinessConfigPayload,
} from '@/types/api';
import { formatDate } from '@/utils/format';
import { translateProtectedError } from '@/utils/apiError';

interface BusinessConfigFormState {
  businessName: string;
  legalName: string;
  businessType: BusinessType;
  currencyCode: string;
  timezone: string;
  countryCode: string;
  email: string;
  phone: string;
  address: string;
  applyPreset: boolean;
  modules: BusinessModules;
}

type FormErrors = Partial<Record<'businessName' | 'currencyCode' | 'countryCode' | 'timezone' | 'email', string>>;

const businessTypeOptions: Array<{ value: BusinessType; label: string; description: string }> = [
  { value: 'DESSERT_SHOP', label: 'Postres', description: 'Recetas, ingredientes y combos listos para operar.' },
  { value: 'CAFE', label: 'Cafe', description: 'Configuracion ligera para bebidas y preparaciones.' },
  { value: 'RESTAURANT', label: 'Restaurante', description: 'Preset orientado a produccion y combos.' },
  { value: 'RETAIL', label: 'Retail', description: 'Enfoque comercial con listas de precio activas.' },
  { value: 'MINIMARKET', label: 'Minimarket', description: 'Catalogo retail con operacion rapida.' },
  { value: 'SALON', label: 'Peluqueria', description: 'Servicios y listas de precio sin recetas.' },
  { value: 'CUSTOM', label: 'Personalizado', description: 'Conserva control manual sin preset forzado.' },
];

const moduleDefinitions: Array<{
  key: keyof BusinessModules;
  label: string;
  description: string;
}> = [
  {
    key: 'ingredients',
    label: 'Ingredientes',
    description: 'Controla inventario base, consumos y disponibilidad de insumos.',
  },
  {
    key: 'recipes',
    label: 'Recetas',
    description: 'Permite definir composiciones y descuentos automáticos por consumo.',
  },
  {
    key: 'combos',
    label: 'Combos',
    description: 'Habilita venta agrupada con combinaciones comerciales.',
  },
  {
    key: 'priceLists',
    label: 'Listas de precio',
    description: 'Prepara escenarios comerciales por canal o tipo de cliente.',
  },
  {
    key: 'fiscalFields',
    label: 'Campos fiscales',
    description: 'Guarda datos tributarios y campos extendidos para cumplimiento.',
  },
  {
    key: 'electronicInvoicing',
    label: 'Facturacion electronica',
    description: 'Activa la preparacion funcional para flujos fiscales posteriores.',
  },
];

const presetByBusinessType: Partial<Record<BusinessType, BusinessModules>> = {
  DESSERT_SHOP: {
    ingredients: true,
    recipes: true,
    combos: true,
    priceLists: false,
    fiscalFields: false,
    electronicInvoicing: false,
  },
  CAFE: {
    ingredients: true,
    recipes: true,
    combos: true,
    priceLists: false,
    fiscalFields: false,
    electronicInvoicing: false,
  },
  RESTAURANT: {
    ingredients: true,
    recipes: true,
    combos: true,
    priceLists: false,
    fiscalFields: false,
    electronicInvoicing: false,
  },
  RETAIL: {
    ingredients: false,
    recipes: false,
    combos: false,
    priceLists: true,
    fiscalFields: false,
    electronicInvoicing: false,
  },
  MINIMARKET: {
    ingredients: false,
    recipes: false,
    combos: false,
    priceLists: true,
    fiscalFields: false,
    electronicInvoicing: false,
  },
  SALON: {
    ingredients: false,
    recipes: false,
    combos: false,
    priceLists: true,
    fiscalFields: false,
    electronicInvoicing: false,
  },
};

export function AdminConfigPage() {
  const navigate = useNavigate();
  const config = useBusinessConfigStore((state) => state.config);
  const isLoadingConfig = useBusinessConfigStore((state) => state.isLoadingConfig);
  const configError = useBusinessConfigStore((state) => state.configError);
  const refreshConfig = useBusinessConfigStore((state) => state.refreshConfig);
  const setConfig = useBusinessConfigStore((state) => state.setConfig);
  const [form, setForm] = useState<BusinessConfigFormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (config) {
      setForm(createFormState(config));
    }
  }, [config]);

  useEffect(() => {
    if (!config && !isLoadingConfig && !configError) {
      setSubmitError(null);
      void refreshConfig();
    }
  }, [config, configError, isLoadingConfig, refreshConfig]);

  async function handleRefresh() {
    setSubmitError(null);
    setSubmitSuccess(null);
    await refreshConfig();
  }

  function setField<K extends keyof BusinessConfigFormState>(
    field: K,
    value: BusinessConfigFormState[K],
  ) {
    setForm((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        [field]: value,
      };
    });
    setSubmitError(null);
    setSubmitSuccess(null);
  }

  function handleBusinessTypeChange(value: BusinessType) {
    setForm((current) => {
      if (!current) {
        return current;
      }

      const preset = getPresetModules(value);

      return {
        ...current,
        businessType: value,
        modules:
          current.applyPreset && preset
            ? normalizeModules(preset)
            : current.modules,
      };
    });
    setSubmitError(null);
    setSubmitSuccess(null);
  }

  function handleApplyPresetChange(checked: boolean) {
    setForm((current) => {
      if (!current) {
        return current;
      }

      const preset = checked ? getPresetModules(current.businessType) : null;

      return {
        ...current,
        applyPreset: checked,
        modules: preset ? normalizeModules(preset) : current.modules,
      };
    });
    setSubmitError(null);
    setSubmitSuccess(null);
  }

  function handleModuleChange(key: keyof BusinessModules, checked: boolean) {
    setForm((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        modules: normalizeModules({
          ...current.modules,
          [key]: checked,
        }),
      };
    });
    setSubmitError(null);
    setSubmitSuccess(null);
  }

  async function handleSubmit(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault();

    if (!form) {
      return;
    }

    const nextErrors = validateForm(form);
    setFieldErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setSubmitError('Revisa los campos marcados antes de guardar.');
      setSubmitSuccess(null);
      return;
    }

    const payload: UpdateBusinessConfigPayload = {
      businessName: form.businessName.trim(),
      legalName: normalizeOptionalText(form.legalName),
      businessType: form.businessType,
      currencyCode: form.currencyCode.trim().toUpperCase(),
      timezone: form.timezone.trim(),
      countryCode: form.countryCode.trim().toUpperCase(),
      email: normalizeOptionalText(form.email),
      phone: normalizeOptionalText(form.phone),
      address: normalizeOptionalText(form.address),
      modules: normalizeModules(form.modules),
      applyPreset: form.applyPreset,
    };

    try {
      setSaving(true);
      setSubmitError(null);
      setSubmitSuccess(null);
      const updatedConfig = await posApi.updateBusinessConfig(payload);
      setConfig(updatedConfig);
      setForm(createFormState(updatedConfig));
      setSubmitSuccess('Configuracion guardada correctamente.');
      setFieldErrors({});
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : 'No fue posible guardar la configuracion del negocio.',
      );
    } finally {
      setSaving(false);
    }
  }

  if (isLoadingConfig && !form) {
    return (
      <LoadingState
        title="Cargando configuracion"
        description="Estamos preparando la configuracion administrativa del negocio."
        rows={4}
      />
    );
  }

  if (!form) {
    return (
      <Card>
        <SectionHeader
          eyebrow="BusinessConfig"
          title="Configuracion del negocio"
          description="No fue posible preparar esta vista administrativa."
        />
        {configError ? (
          <FeedbackMessage tone="error" className="mt-6">
            {translateProtectedError(
              new Error(configError),
              'No fue posible cargar la configuracion del negocio.',
            )}
          </FeedbackMessage>
        ) : null}
        <div className="mt-6 flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => navigate('/admin')}>
            <ArrowLeft size={16} />
            Volver a admin
          </Button>
          <Button onClick={() => void handleRefresh()}>
            Reintentar
          </Button>
        </div>
      </Card>
    );
  }

  const updatedAt = config?.updatedAt ?? null;

  const selectedBusinessType = businessTypeOptions.find(
    (option) => option.value === form.businessType,
  );
  const enabledModules = countEnabledModules(form.modules);
  const presetModules = getPresetModules(form.businessType);

  return (
    <div className="grid min-w-0 gap-5 sm:gap-6">
      <ModuleStatusHeader
        ariaLabel="Estado de la configuracion del negocio"
        eyebrow="BusinessConfig"
        title="Configuracion del negocio"
        statusLabel={saving ? 'Guardando' : isLoadingConfig ? 'Sincronizando' : 'Editable'}
        statusTone={saving ? 'info' : isLoadingConfig ? 'info' : 'success'}
        description="Define datos base, tipo de negocio y modulos activos desde una vista administrativa limpia y aislada."
        helpText="Esta pantalla solo administra BusinessConfig. Todavia no oculta modulos, no bloquea rutas y no cambia la navegacion global."
        icon={<Sparkles size={18} />}
      >
        <ModuleStatusCard
          label="Negocio"
          value={form.businessName || 'Sin nombre'}
          icon={<Building2 size={16} />}
          iconTone="info"
          badgeLabel="Base editable"
          badgeTone="info"
          meta={form.legalName || 'Sin razon social registrada'}
        />
        <ModuleStatusCard
          label="Tipo actual"
          value={selectedBusinessType?.label ?? form.businessType}
          icon={<Store size={16} />}
          iconTone="success"
          badgeLabel={form.applyPreset ? 'Preset listo' : 'Manual'}
          badgeTone={form.applyPreset ? 'success' : 'default'}
          meta={selectedBusinessType?.description ?? 'Configuracion personalizada'}
        />
        <ModuleStatusCard
          label="Modulos activos"
          value={`${enabledModules}/6`}
          icon={<ShieldCheck size={16} />}
          iconTone={enabledModules >= 4 ? 'success' : 'default'}
          badgeLabel={updatedAt ? 'Sincronizado' : 'Pendiente'}
          badgeTone={updatedAt ? 'success' : 'warning'}
          meta={updatedAt ? `Ultima actualizacion ${formatDate(updatedAt)}` : 'Sin fecha registrada'}
        />
      </ModuleStatusHeader>

      {configError && form ? (
        <FeedbackMessage tone="warning">
          {translateProtectedError(
            new Error(configError),
            'No fue posible actualizar la configuracion del negocio.',
          )}
        </FeedbackMessage>
      ) : null}

      {submitSuccess ? (
        <FeedbackMessage tone="success">
          {submitSuccess}
        </FeedbackMessage>
      ) : null}

      {submitError ? (
        <FeedbackMessage tone="error">
          {submitError}
        </FeedbackMessage>
      ) : null}

      <form className="grid min-w-0 gap-5 sm:gap-6" onSubmit={handleSubmit}>
        <Card className="overflow-hidden">
          <div className="panel-top-glow absolute inset-x-0 top-0 h-24" />
          <SectionHeader
            eyebrow="Datos del negocio"
            title="Identidad operativa"
            description="Estos datos preparan la configuracion base sin afectar aun otras pantallas ni modulos del sistema."
            actions={<StatusBadge label="Datos base" tone="info" />}
          />

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Input
              label="Nombre del negocio"
              required
              value={form.businessName}
              error={fieldErrors.businessName}
              placeholder="Registry POS"
              onChange={(event) => {
                setField('businessName', event.target.value);
                setFieldErrors((current) => ({ ...current, businessName: undefined }));
              }}
            />
            <Input
              label="Razon social"
              value={form.legalName}
              placeholder="Opcional"
              onChange={(event) => setField('legalName', event.target.value)}
            />
            <Input
              label="Email"
              type="email"
              value={form.email}
              error={fieldErrors.email}
              placeholder="negocio@empresa.com"
              onChange={(event) => {
                setField('email', event.target.value);
                setFieldErrors((current) => ({ ...current, email: undefined }));
              }}
            />
            <Input
              label="Telefono"
              value={form.phone}
              placeholder="+57 300 000 0000"
              onChange={(event) => setField('phone', event.target.value)}
            />
            <Input
              label="Moneda"
              required
              maxLength={3}
              value={form.currencyCode}
              error={fieldErrors.currencyCode}
              placeholder="COP"
              onChange={(event) => {
                setField('currencyCode', event.target.value.toUpperCase());
                setFieldErrors((current) => ({ ...current, currencyCode: undefined }));
              }}
            />
            <Input
              label="Pais"
              required
              maxLength={2}
              value={form.countryCode}
              error={fieldErrors.countryCode}
              placeholder="CO"
              onChange={(event) => {
                setField('countryCode', event.target.value.toUpperCase());
                setFieldErrors((current) => ({ ...current, countryCode: undefined }));
              }}
            />
            <Input
              label="Zona horaria"
              required
              value={form.timezone}
              error={fieldErrors.timezone}
              placeholder="America/Bogota"
              wrapperClassName="md:col-span-2 xl:col-span-1"
              onChange={(event) => {
                setField('timezone', event.target.value);
                setFieldErrors((current) => ({ ...current, timezone: undefined }));
              }}
            />
            <Textarea
              label="Direccion"
              value={form.address}
              placeholder="Direccion principal del negocio"
              wrapperClassName="md:col-span-2 xl:col-span-2"
              onChange={(event) => setField('address', event.target.value)}
            />
          </div>
        </Card>

        <div className="grid min-w-0 gap-5 xl:grid-cols-[0.92fr_1.08fr] xl:items-start">
          <Card>
            <SectionHeader
              eyebrow="Tipo de negocio"
              title="Preset comercial"
              description="Cambia el perfil operativo del negocio y decide si quieres aplicar el preset recomendado o conservar la configuracion actual."
              actions={
                <StatusBadge
                  label={form.applyPreset ? 'Preset activo' : 'Conservar actual'}
                  tone={form.applyPreset ? 'success' : 'default'}
                />
              }
            />

            <div className="mt-6 grid gap-4">
              <Select
                label="Tipo de negocio"
                value={form.businessType}
                onChange={(event) =>
                  handleBusinessTypeChange(event.target.value as BusinessType)
                }
              >
                {businessTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>

              <CheckboxField
                label="Aplicar preset recomendado"
                description="Si lo activas, los modulos se ajustan al preset del tipo seleccionado. Si lo dejas apagado, se conserva tu combinacion actual."
                checked={form.applyPreset}
                onChange={(event) => handleApplyPresetChange(event.target.checked)}
              />

              <div className="surface-subtle-strong rounded-[1.6rem] p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge label={selectedBusinessType?.label ?? form.businessType} tone="info" />
                  <StatusBadge
                    label={presetModules ? 'Preset disponible' : 'Sin preset automatico'}
                    tone={presetModules ? 'success' : 'default'}
                  />
                </div>
                <p className="mt-3 text-sm theme-text-strong">
                  {selectedBusinessType?.description ??
                    'Mantiene una configuracion totalmente manual.'}
                </p>
                <p className="mt-2 text-sm theme-text-muted">
                  {presetModules
                    ? `Activa ${countEnabledModules(presetModules)} de 6 modulos como recomendacion base.`
                    : 'El tipo personalizado no fuerza modulos y respeta tu configuracion actual.'}
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <SectionHeader
              eyebrow="Modulos activos"
              title="Capacidades habilitadas"
              description="Estos toggles solo preparan BusinessConfig. Todavia no ocultan sidebar ni bloquean rutas en esta fase."
              actions={<StatusBadge label={`${enabledModules} activos`} tone="success" />}
            />

            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {moduleDefinitions.map((module) => (
                <CheckboxField
                  key={module.key}
                  label={module.label}
                  description={module.description}
                  checked={form.modules[module.key]}
                  wrapperClassName="h-full rounded-[1.4rem] px-4 py-4"
                  onChange={(event) =>
                    handleModuleChange(module.key, event.target.checked)
                  }
                />
              ))}
            </div>

            <div className="surface-subtle-strong mt-5 rounded-[1.6rem] p-4">
              <div className="flex items-center gap-2">
                <Settings2 size={16} className="text-[color:var(--text-secondary)]" />
                <p className="text-sm font-medium theme-text-strong">Autoajustes UI activos</p>
              </div>
              <div className="mt-3 grid gap-2 text-sm theme-text-muted">
                <p>Si activas Recetas, Ingredientes se activa automaticamente.</p>
                <p>Si desactivas Ingredientes, Recetas se apaga automaticamente.</p>
                <p>Si activas Facturacion electronica, Campos fiscales se activa automaticamente.</p>
                <p>Si desactivas Campos fiscales, Facturacion electronica se apaga automaticamente.</p>
              </div>
            </div>
          </Card>
        </div>

        <Card>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="section-kicker">Acciones</p>
              <h2 className="mt-2 font-display text-xl font-bold theme-text-strong sm:text-2xl">
                Guardado manual
              </h2>
              <p className="section-note mt-2 max-w-3xl">
                El cambio se guarda por `PATCH /api/config` y no altera todavia la navegacion ni el comportamiento de otros modulos.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate('/admin')}
              >
                <ArrowLeft size={16} />
                Volver a admin
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={isLoadingConfig || saving}
                onClick={() => void handleRefresh()}
              >
                Actualizar
              </Button>
              <Button type="submit" disabled={saving}>
                <Save size={16} />
                {saving ? 'Guardando...' : 'Guardar configuracion'}
              </Button>
            </div>
          </div>
        </Card>
      </form>
    </div>
  );
}

function createFormState(config: BusinessConfig): BusinessConfigFormState {
  return {
    businessName: config.businessName,
    legalName: config.legalName ?? '',
    businessType: config.businessType,
    currencyCode: config.currencyCode,
    timezone: config.timezone,
    countryCode: config.countryCode,
    email: config.email ?? '',
    phone: config.phone ?? '',
    address: config.address ?? '',
    applyPreset: false,
    modules: normalizeModules(config.modules),
  };
}

function validateForm(form: BusinessConfigFormState): FormErrors {
  const errors: FormErrors = {};

  if (!form.businessName.trim()) {
    errors.businessName = 'Ingresa el nombre visible del negocio.';
  }

  if (!/^[A-Z]{3}$/.test(form.currencyCode.trim().toUpperCase())) {
    errors.currencyCode = 'Usa un codigo de moneda de 3 letras, por ejemplo COP.';
  }

  if (!/^[A-Z]{2}$/.test(form.countryCode.trim().toUpperCase())) {
    errors.countryCode = 'Usa un codigo de pais de 2 letras, por ejemplo CO.';
  }

  if (!form.timezone.trim()) {
    errors.timezone = 'Ingresa una zona horaria valida.';
  }

  if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = 'Ingresa un email valido o deja el campo vacio.';
  }

  return errors;
}

function normalizeOptionalText(value: string) {
  const normalized = value.trim();
  return normalized ? normalized : null;
}

function normalizeModules(modules: BusinessModules): BusinessModules {
  const normalized = { ...modules };

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

function getPresetModules(businessType: BusinessType): BusinessModules | null {
  const preset = presetByBusinessType[businessType];
  return preset ? { ...preset } : null;
}

function countEnabledModules(modules: BusinessModules) {
  return Object.values(modules).filter(Boolean).length;
}
