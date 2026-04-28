import '@/features/admin/admin-d1.css';
import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Boxes,
  Building2,
  CreditCard,
  FileText,
  Globe2,
  Mail,
  MapPin,
  Phone,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  Save,
  Settings2,
  ShieldCheck,
  Sparkles,
  Store,
  TestTube2,
  type LucideIcon,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AdminSubmoduleNav } from '@/features/admin/AdminSubmoduleNav';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { CheckboxField } from '@/components/CheckboxField';
import { FeedbackMessage } from '@/components/FeedbackMessage';
import { Input } from '@/components/Input';
import { LoadingState } from '@/components/LoadingState';
import { ModulePageHeader } from '@/components/ModulePageHeader';
import type { ModulePageHeaderCard } from '@/components/ModulePageHeader';
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
  impact: string;
  icon: LucideIcon;
}> = [
  {
    key: 'ingredients',
    label: 'Ingredientes',
    description: 'Controla inventario base, consumos y disponibilidad de insumos.',
    impact: 'Habilita stock base y prepara recetas.',
    icon: TestTube2,
  },
  {
    key: 'recipes',
    label: 'Recetas',
    impact: 'Depende de ingredientes activos.',
    icon: Settings2,
    description: 'Permite definir composiciones y descuentos automáticos por consumo.',
  },
  {
    key: 'combos',
    label: 'Combos',
    impact: 'Muestra ventas agrupadas en catalogo operativo.',
    icon: Boxes,
    description: 'Habilita venta agrupada con combinaciones comerciales.',
  },
  {
    key: 'priceLists',
    label: 'Listas de precio',
    impact: 'Prepara precios por contexto comercial.',
    icon: CreditCard,
    description: 'Prepara escenarios comerciales por canal o tipo de cliente.',
  },
  {
    key: 'fiscalFields',
    label: 'Campos fiscales',
    impact: 'Base para datos tributarios extendidos.',
    icon: ReceiptText,
    description: 'Guarda datos tributarios y campos extendidos para cumplimiento.',
  },
  {
    key: 'electronicInvoicing',
    label: 'Facturacion electronica',
    impact: 'Requiere campos fiscales activos.',
    icon: FileText,
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

  function handleRestoreForm() {
    if (!config) {
      return;
    }

    setForm(createFormState(config));
    setFieldErrors({});
    setSubmitError(null);
    setSubmitSuccess(null);
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
  const configHeaderStatusLabel = saving ? 'Guardando' : isLoadingConfig ? 'Sincronizando' : 'Editable';
  const configHeaderStatusTone = saving ? 'info' : isLoadingConfig ? 'info' : 'success';
  const configHeaderCards: ModulePageHeaderCard[] = [
    {
      label: 'Negocio',
      value: form.businessName || 'Sin nombre',
      icon: <Building2 size={16} />,
      iconTone: 'info',
      badge: {
        label: 'Base editable',
        tone: 'info',
      },
      note: form.legalName || 'Sin razon social registrada',
    },
    {
      label: 'Tipo actual',
      value: selectedBusinessType?.label ?? form.businessType,
      icon: <Store size={16} />,
      iconTone: 'success',
      badge: {
        label: form.applyPreset ? 'Preset listo' : 'Manual',
        tone: form.applyPreset ? 'success' : 'default',
      },
      note: selectedBusinessType?.description ?? 'Configuracion personalizada',
    },
    {
      label: 'Modulos activos',
      value: `${enabledModules}/6`,
      icon: <ShieldCheck size={16} />,
      iconTone: enabledModules >= 4 ? 'success' : 'default',
      badge: {
        label: updatedAt ? 'Sincronizado' : 'Pendiente',
        tone: updatedAt ? 'success' : 'warning',
      },
      note: updatedAt ? `Ultima actualizacion ${formatDate(updatedAt)}` : 'Sin fecha registrada',
    },
  ];
  const impactNotes = getImpactNotes({
    form,
    enabledModules,
    presetModules,
    selectedBusinessTypeLabel: selectedBusinessType?.label ?? form.businessType,
  });

  return (
    <div className="admin-dashboard admin-config-page grid min-w-0 gap-5 sm:gap-6">
      <AdminSubmoduleNav />

      <form className="admin-config-form grid min-w-0 gap-5 sm:gap-6" onSubmit={handleSubmit}>
        <ModulePageHeader
          ariaLabel="Estado de la configuracion del negocio"
          eyebrow="Centro de configuracion"
          title="Configuracion de negocio"
          badges={[{ label: configHeaderStatusLabel, tone: configHeaderStatusTone }]}
          description="Administra identidad, perfil comercial y modulos visibles del negocio desde un panel claro y escalable."
          helpText="Esta pantalla usa BusinessConfig existente. No cambia contratos API ni logica de venta, caja o catalogo."
          icon={<Sparkles size={18} />}
          summary={{
            label: 'Estado actual',
            value: saving ? 'Guardando' : `${enabledModules}/6 modulos`,
            note: updatedAt ? `Actualizado ${formatDate(updatedAt)}` : 'Sin fecha registrada',
          }}
          asideAction={
            <div className="admin-config-header-actions">
              <Button
                type="button"
                variant="secondary"
                disabled={isLoadingConfig || saving}
                onClick={() => void handleRefresh()}
              >
                <RefreshCw size={16} />
                Actualizar
              </Button>
              <Button type="submit" disabled={saving}>
                <Save size={16} />
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            </div>
          }
          cards={configHeaderCards}
        />

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

        <Card padding="none" glow={false} className="admin-panel admin-config-section admin-config-section--identity">
          <div className="admin-panel__body admin-config-section__body">
          <SectionHeader
            eyebrow="Datos del negocio"
            title="Identidad comercial"
            description="Datos visibles y operativos para reconocer el negocio en administracion, caja y reportes."
            actions={<StatusBadge label="Datos base" tone="info" />}
          />

          <div className="admin-config-identity-layout">
            <div className="admin-config-profile-card">
              <div className="admin-config-profile-card__halo" />
              <p className="admin-kicker">Perfil actual</p>
              <h2>{form.businessName || 'Sin nombre'}</h2>
              <p>{selectedBusinessType?.description ?? 'Configuracion personalizada.'}</p>
              <div className="admin-config-profile-meta">
                <span>
                  <Building2 size={14} />
                  {form.legalName || 'Sin razon social'}
                </span>
                <span>
                  <Globe2 size={14} />
                  {form.countryCode || 'Pais pendiente'} / {form.currencyCode || 'Moneda pendiente'}
                </span>
                <span>
                  <MapPin size={14} />
                  {form.timezone || 'Zona horaria pendiente'}
                </span>
                <span>
                  <Mail size={14} />
                  {form.email || 'Correo no registrado'}
                </span>
                <span>
                  <Phone size={14} />
                  {form.phone || 'Telefono no registrado'}
                </span>
              </div>
            </div>

            <div className="admin-config-field-grid">
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
                wrapperClassName="admin-config-address-field md:col-span-2"
                onChange={(event) => setField('address', event.target.value)}
              />
            </div>
          </div>
          </div>
        </Card>

        <div className="admin-config-two-column">
          <Card padding="none" glow={false} className="admin-panel admin-config-section admin-config-section--type">
            <div className="admin-panel__body admin-config-section__body">
            <SectionHeader
              eyebrow="Tipo de negocio"
              title="Preset comercial"
              description="Selecciona perfil base y decide si el sistema debe aplicar modulos recomendados para ese perfil."
              actions={
                <StatusBadge
                  label={form.applyPreset ? 'Preset activo' : 'Conservar actual'}
                  tone={form.applyPreset ? 'success' : 'default'}
                />
              }
            />

            <div className="admin-config-type-control">
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
                wrapperClassName="admin-config-preset-toggle"
                onChange={(event) => handleApplyPresetChange(event.target.checked)}
              />

              <div className="admin-config-preset-summary">
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
            </div>
          </Card>

          <Card padding="none" glow={false} className="admin-panel admin-config-section admin-config-section--presets">
            <div className="admin-panel__body admin-config-section__body">
            <SectionHeader
              eyebrow="Perfiles"
              title="Presets disponibles"
              description="Cards rapidas para entender el enfoque de cada tipo antes de guardar."
              actions={<StatusBadge label={selectedBusinessType?.label ?? form.businessType} tone="info" />}
            />

            <div className="admin-config-type-card-grid">
              {businessTypeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className="admin-config-type-card"
                  data-active={form.businessType === option.value}
                  aria-pressed={form.businessType === option.value}
                  onClick={() => handleBusinessTypeChange(option.value)}
                >
                  <span>{option.label}</span>
                  <p>{option.description}</p>
                </button>
              ))}
            </div>
            </div>
          </Card>
        </div>

        <Card padding="none" glow={false} className="admin-panel admin-config-section admin-config-section--modules">
          <div className="admin-panel__body admin-config-section__body">
            <SectionHeader
              eyebrow="Modulos activos"
              title="Capacidades habilitadas"
              description="Activa capacidades del negocio con cards legibles. Dependencias automaticas se mantienen como antes."
              actions={<StatusBadge label={`${enabledModules} activos`} tone="success" />}
            />

            <div className="admin-config-module-grid">
              {moduleDefinitions.map((module) => {
                const Icon = module.icon;
                const isActive = form.modules[module.key];
                const inputId = `admin-config-module-${module.key}`;
                const descriptionId = `${inputId}-description`;

                return (
                  <label
                    key={module.key}
                    className="admin-config-module-card"
                    data-active={isActive}
                    htmlFor={inputId}
                  >
                    <span className="admin-config-module-card__top">
                      <span className="admin-config-module-card__icon" aria-hidden="true">
                        <Icon size={17} />
                      </span>
                      <span className="admin-config-module-card__title">
                        <span>{module.label}</span>
                        <StatusBadge
                          label={isActive ? 'Activo' : 'Inactivo'}
                          tone={isActive ? 'success' : 'default'}
                        />
                      </span>
                      <input
                        id={inputId}
                        type="checkbox"
                        checked={isActive}
                        aria-describedby={descriptionId}
                        className="ui-checkbox admin-config-module-card__checkbox"
                        onChange={(event) =>
                          handleModuleChange(module.key, event.target.checked)
                        }
                      />
                    </span>
                    <span id={descriptionId} className="admin-config-module-card__copy">
                      {module.description}
                    </span>
                    <span className="admin-config-module-card__impact">
                      {module.impact}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        </Card>

        <Card padding="none" glow={false} className="admin-panel admin-config-section admin-config-section--impact">
          <div className="admin-panel__body admin-config-section__body">
            <SectionHeader
              eyebrow="Resumen de impacto"
              title="Que cambia al guardar"
              description="Lectura corta de dependencias, visibilidad gradual y decisiones que afectan modulos."
              actions={<StatusBadge label="Revision final" tone="warning" />}
            />

            <div className="admin-config-impact-grid">
              {impactNotes.map((note) => {
                const Icon = note.icon;

                return (
                  <div key={note.title} className="admin-config-impact-note" data-tone={note.tone}>
                    <span className="admin-config-impact-note__icon" aria-hidden="true">
                      <Icon size={16} />
                    </span>
                    <div>
                      <strong>{note.title}</strong>
                      <p>{note.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        <Card padding="none" glow={false} className="admin-panel admin-config-actions-card">
          <div className="admin-panel__body admin-config-actions-card__body">
            <SectionHeader
              eyebrow="Acciones finales"
              title="Guardar configuracion"
              description="Guarda por PATCH /api/config usando el flujo existente."
              actions={
                <StatusBadge
                  label={saving ? 'Guardando' : 'Listo para guardar'}
                  tone={saving ? 'info' : 'success'}
                />
              }
            />

            <div className="admin-config-actions">
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
                disabled={!config || saving}
                onClick={handleRestoreForm}
              >
                <RotateCcw size={16} />
                Restaurar
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={isLoadingConfig || saving}
                onClick={() => void handleRefresh()}
              >
                <RefreshCw size={16} />
                Actualizar
              </Button>
              <Button type="submit" disabled={saving}>
                <Save size={16} />
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            </div>
          </div>
        </Card>
      </form>
    </div>
  );
}

function getImpactNotes({
  form,
  enabledModules,
  presetModules,
  selectedBusinessTypeLabel,
}: {
  form: BusinessConfigFormState;
  enabledModules: number;
  presetModules: BusinessModules | null;
  selectedBusinessTypeLabel: string;
}) {
  return [
    {
      title: 'Visibilidad gradual',
      description: `${enabledModules} de 6 modulos quedaran activos para orientar navegacion y capacidades disponibles.`,
      tone: enabledModules > 0 ? 'success' : 'warning',
      icon: ShieldCheck,
    },
    {
      title: form.applyPreset ? 'Preset aplicado' : 'Control manual',
      description: form.applyPreset && presetModules
        ? `${selectedBusinessTypeLabel} ajusta modulos recomendados al cambiar de tipo.`
        : 'Cambiar tipo no fuerza modulos; se conserva tu combinacion actual.',
      tone: form.applyPreset ? 'info' : 'default',
      icon: Store,
    },
    {
      title: form.modules.ingredients ? 'Inventario base disponible' : 'Recetas limitadas',
      description: form.modules.ingredients
        ? 'Ingredientes permite stock base y recetas cuando estan activas.'
        : 'Sin ingredientes, recetas se apaga automaticamente para evitar configuracion incompleta.',
      tone: form.modules.ingredients ? 'success' : 'warning',
      icon: TestTube2,
    },
    {
      title: form.modules.fiscalFields ? 'Base fiscal preparada' : 'Fiscal pendiente',
      description: form.modules.electronicInvoicing
        ? 'Facturacion electronica mantiene campos fiscales activos como dependencia.'
        : 'Campos fiscales puede quedar preparado sin activar facturacion electronica.',
      tone: form.modules.fiscalFields ? 'info' : 'default',
      icon: ReceiptText,
    },
  ];
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
