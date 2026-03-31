import { useEffect, useMemo, useState } from "react";
import { Boxes, ClipboardList, FlaskConical, Warehouse } from "lucide-react";
import { AccessState } from "@/components/AccessState";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { FeedbackMessage } from "@/components/FeedbackMessage";
import { Input } from "@/components/Input";
import {
  ModuleStatusCard,
  ModuleStatusHeader,
} from "@/components/ModuleStatusHeader";
import { ScrollPanel } from "@/components/ScrollPanel";
import { Select } from "@/components/Select";
import { StatusBadge } from "@/components/StatusBadge";
import { Textarea } from "@/components/Textarea";
import { posApi } from "@/services/api/posApi";
import { useAppStore } from "@/store/appStore";
import { useSessionStore } from "@/store/sessionStore";
import type {
  Ingredient,
  IngredientDimension,
  IngredientMovementReasonCode,
  IngredientMovementType,
  StockAdjustmentItem,
  StockListItem,
} from "@/types/api";
import { isAccessDeniedError, translateProtectedError } from "@/utils/apiError";
import { formatCurrency, formatDate, toNumber } from "@/utils/format";
import { normalizeNumberInput, parseNumberInput } from "@/utils/numberInput";

const unitsByDimension: Record<IngredientDimension, string[]> = {
  WEIGHT: ["g", "kg"],
  VOLUME: ["ml", "L"],
  COUNT: ["unit"],
};

const unitFactors: Record<string, number> = {
  g: 1,
  kg: 1000,
  ml: 1,
  L: 1000,
  unit: 1,
};

const dimensionLabels: Record<IngredientDimension, string> = {
  WEIGHT: "Peso",
  VOLUME: "Volumen",
  COUNT: "Cantidad",
};

const unitLabels: Record<string, string> = {
  g: "g",
  kg: "kg",
  ml: "ml",
  L: "L",
  unit: "unidad",
};

const movementTypeLabels: Record<IngredientMovementType, string> = {
  ENTRY: "Entrada",
  EXIT: "Salida",
  ADJUSTMENT: "Ajuste por conteo",
};


const movementTypeTones: Record<
  IngredientMovementType,
  "success" | "warning" | "info"
> = {
  ENTRY: "success",
  EXIT: "warning",
  ADJUSTMENT: "info",
};

const AUDIT_HISTORY_LIMIT = 12;

const reasonLabels: Record<IngredientMovementReasonCode, string> = {
  PURCHASE: "Compra",
  INITIAL_LOAD: "Carga inicial",
  SUPPLIER_RETURN: "Devolucion proveedor",
  POSITIVE_ADJUSTMENT: "Ajuste positivo",
  WASTE: "Merma",
  DAMAGE: "Daño",
  INTERNAL_USE: "Uso interno",
  EXPIRATION: "Vencimiento",
  NEGATIVE_ADJUSTMENT: "Ajuste negativo",
  PHYSICAL_COUNT: "Conteo fisico",
  ADMIN_CORRECTION: "Correccion administrativa",
};

const reasonsByMovementType: Record<
  IngredientMovementType,
  IngredientMovementReasonCode[]
> = {
  ENTRY: ["PURCHASE", "INITIAL_LOAD", "SUPPLIER_RETURN", "POSITIVE_ADJUSTMENT"],
  EXIT: [
    "WASTE",
    "DAMAGE",
    "INTERNAL_USE",
    "EXPIRATION",
    "NEGATIVE_ADJUSTMENT",
  ],
  ADJUSTMENT: ["PHYSICAL_COUNT", "ADMIN_CORRECTION"],
};

function getDimensionLabel(dimension: IngredientDimension) {
  return dimensionLabels[dimension];
}

function getUnitLabel(unitCode: string) {
  return unitLabels[unitCode] ?? unitCode;
}

function formatQty(value: number | string | null | undefined) {
  return new Intl.NumberFormat("es-CO", { maximumFractionDigits: 3 }).format(
    toNumber(value),
  );
}

function roundValue(value: number, decimals = 3) {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function getMovementDelta(item: StockAdjustmentItem) {
  if (item.movementType === "ENTRY") return toNumber(item.qtyBase);
  if (item.movementType === "EXIT") return toNumber(item.qtyBase) * -1;
  return toNumber(item.qtyBase);
}

export function IngredientsPage() {
  const currentUser = useSessionStore((state) => state.currentUser);
  const currentLocation = useAppStore((state) => state.currentLocation);
  const availableLocations = useAppStore((state) => state.availableLocations);
  const sessionIngredients = useAppStore((state) => state.sessionIngredients);
  const addSessionIngredient = useAppStore(
    (state) => state.addSessionIngredient,
  );

  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [stockItems, setStockItems] = useState<StockListItem[]>([]);
  const [adjustmentItems, setAdjustmentItems] = useState<StockAdjustmentItem[]>(
    [],
  );
  const [adjustmentItemsLocationId, setAdjustmentItemsLocationId] = useState<
    number | null
  >(null);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [loadingStock, setLoadingStock] = useState(true);
  const [loadingAdjustments, setLoadingAdjustments] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [stockError, setStockError] = useState<string | null>(null);
  const [adjustmentsError, setAdjustmentsError] = useState<string | null>(null);
  const [catalogAccessDenied, setCatalogAccessDenied] = useState(false);
  const [stockAccessDenied, setStockAccessDenied] = useState(false);
  const [adjustmentsAccessDenied, setAdjustmentsAccessDenied] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [creatingIngredient, setCreatingIngredient] = useState(false);
  const [submittingMovement, setSubmittingMovement] = useState(false);

  const [name, setName] = useState("");
  const [dimension, setDimension] = useState<IngredientDimension>("WEIGHT");
  const [defaultUnitCode, setDefaultUnitCode] = useState("g");
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(
    null,
  );
  const [selectedIngredientId, setSelectedIngredientId] = useState("");
  const [movementType, setMovementType] =
    useState<IngredientMovementType>("ENTRY");
  const [reasonCode, setReasonCode] =
    useState<IngredientMovementReasonCode>("PURCHASE");
  const [qtyInput, setQtyInput] = useState("");
  const [countedStockInput, setCountedStockInput] = useState("");
  const [unitCode, setUnitCode] = useState("g");
  const [supportDocument, setSupportDocument] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [unitCostInput, setUnitCostInput] = useState("");
  const [notes, setNotes] = useState("");

  const isAdmin = currentUser?.role === "ADMIN";

  const mergedIngredients = useMemo(() => {
    const stockIngredients = stockItems.map((item) => item.ingredient);
    const combined = [
      ...ingredients,
      ...sessionIngredients,
      ...stockIngredients,
    ];
    const map = new Map<number, Ingredient>();
    for (const ingredient of combined) map.set(ingredient.id, ingredient);
    return Array.from(map.values()).sort((left, right) =>
      left.name.localeCompare(right.name),
    );
  }, [ingredients, sessionIngredients, stockItems]);

  const selectedIngredient =
    mergedIngredients.find(
      (ingredient) => ingredient.id === Number(selectedIngredientId),
    ) ?? null;
  const availableDefaultUnits = unitsByDimension[dimension];
  const availableAdjustUnits = selectedIngredient
    ? unitsByDimension[selectedIngredient.dimension]
    : [];
  const movementReasonOptions = reasonsByMovementType[movementType];

  useEffect(() => {
    setSelectedLocationId(currentLocation?.id ?? null);
  }, [currentLocation]);

  useEffect(() => {
    setDefaultUnitCode(availableDefaultUnits[0]);
  }, [availableDefaultUnits]);

  useEffect(() => {
    if (!selectedIngredient) {
      setUnitCode("");
      return;
    }

    const allowedUnits = unitsByDimension[selectedIngredient.dimension];
    const defaultUnit = selectedIngredient.defaultUnitCode;
    setUnitCode(
      allowedUnits.includes(defaultUnit as (typeof allowedUnits)[number])
        ? defaultUnit
        : allowedUnits[0],
    );
  }, [selectedIngredient]);

  useEffect(() => {
    if (!movementReasonOptions.includes(reasonCode)) {
      setReasonCode(movementReasonOptions[0]);
    }
  }, [movementReasonOptions, reasonCode]);

  useEffect(() => {
    void loadIngredients();
  }, []);

  useEffect(() => {
    if (selectedLocationId === null) {
      setStockItems([]);
      setAdjustmentItems([]);
      setAdjustmentItemsLocationId(null);
      setAdjustmentsError(null);
      setLoadingStock(false);
      setLoadingAdjustments(false);
      return;
    }

    void loadStock(selectedLocationId);
    void loadAdjustments(selectedLocationId);
  }, [selectedLocationId]);

  async function loadIngredients() {
    try {
      setLoadingCatalog(true);
      setCatalogError(null);
      setCatalogAccessDenied(false);
      setIngredients(await posApi.getIngredients());
    } catch (error) {
      setIngredients([]);
      setCatalogAccessDenied(isAccessDeniedError(error));
      setCatalogError(
        error instanceof Error
          ? translateProtectedError(error, "No fue posible cargar ingredientes")
          : "No fue posible cargar ingredientes",
      );
    } finally {
      setLoadingCatalog(false);
    }
  }

  async function loadStock(locationId: number) {
    try {
      setLoadingStock(true);
      setStockError(null);
      setStockAccessDenied(false);
      const response = await posApi.getStock(locationId);
      setStockItems(response.items);
    } catch (error) {
      setStockItems([]);
      setStockAccessDenied(isAccessDeniedError(error));
      setStockError(
        error instanceof Error
          ? translateProtectedError(error, "No fue posible cargar stock")
          : "No fue posible cargar stock",
      );
    } finally {
      setLoadingStock(false);
    }
  }

  async function loadAdjustments(locationId: number) {
    if (!Number.isInteger(locationId) || locationId <= 0) {
      setAdjustmentItems([]);
      setAdjustmentItemsLocationId(null);
      setAdjustmentsError(null);
      setLoadingAdjustments(false);
      return;
    }

    try {
      setLoadingAdjustments(true);
      setAdjustmentsError(null);
      setAdjustmentsAccessDenied(false);
      const response = await posApi.getStockAdjustments({
        location_id: locationId,
        limit: AUDIT_HISTORY_LIMIT,
      });
      setAdjustmentItems(response.items);
      setAdjustmentItemsLocationId(locationId);
    } catch (error) {
      if (adjustmentItemsLocationId !== locationId) {
        setAdjustmentItems([]);
        setAdjustmentItemsLocationId(null);
      }
      setAdjustmentsAccessDenied(isAccessDeniedError(error));
      setAdjustmentsError(
        error instanceof Error
          ? translateProtectedError(error, "No fue posible cargar movimientos")
          : "No fue posible cargar movimientos",
      );
    } finally {
      setLoadingAdjustments(false);
    }
  }

  async function handleCreateIngredient() {
    if (!name.trim()) {
      setSubmitError("El nombre del ingrediente es obligatorio.");
      return;
    }

    try {
      setCreatingIngredient(true);
      setSubmitError(null);
      setMessage(null);
      const ingredient = await posApi.createIngredient({
        name: name.trim(),
        dimension,
        default_unit_code: defaultUnitCode,
      });
      addSessionIngredient(ingredient);
      setSelectedIngredientId(String(ingredient.id));
      setName("");
      setMessage(`Ingrediente #${ingredient.id} creado correctamente.`);
      await loadIngredients();
      if (selectedLocationId !== null) await loadStock(selectedLocationId);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "No se pudo crear el ingrediente",
      );
    } finally {
      setCreatingIngredient(false);
    }
  }

  const stockQtyByIngredientId = useMemo(
    () =>
      new Map(
        stockItems.map((item) => [
          item.ingredientId,
          toNumber(item.qtyOnHandBase),
        ]),
      ),
    [stockItems],
  );

  const currentBaseStock = selectedIngredient
    ? (stockQtyByIngredientId.get(selectedIngredient.id) ?? 0)
    : 0;
  const unitFactor = unitFactors[unitCode] ?? 1;
  const parsedQty = parseNumberInput(qtyInput);
  const parsedCountedStock = parseNumberInput(countedStockInput);
  const parsedUnitCost = unitCostInput.trim()
    ? parseNumberInput(unitCostInput)
    : null;

  const movementPreview = useMemo(() => {
    if (!selectedIngredient || !unitCode) return null;

    const currentInSelectedUnit = roundValue(currentBaseStock / unitFactor, 3);
    if (movementType === "ADJUSTMENT") {
      if (parsedCountedStock === null || parsedCountedStock < 0) {
        return {
          currentBaseStock,
          currentInSelectedUnit,
          deltaBase: null,
          nextBaseStock: null,
          invalid: true,
          invalidMessage: "Ingresa un stock contado valido.",
        };
      }

      const countedBase = roundValue(parsedCountedStock * unitFactor, 3);
      return {
        currentBaseStock,
        currentInSelectedUnit,
        deltaBase: roundValue(countedBase - currentBaseStock, 3),
        nextBaseStock: countedBase,
        invalid: false,
        invalidMessage: null,
      };
    }

    if (parsedQty === null || parsedQty <= 0) {
      return {
        currentBaseStock,
        currentInSelectedUnit,
        deltaBase: null,
        nextBaseStock: null,
        invalid: true,
        invalidMessage: "Ingresa una cantidad mayor a 0.",
      };
    }

    const qtyBase = roundValue(parsedQty * unitFactor, 3);
    const deltaBase = movementType === "EXIT" ? qtyBase * -1 : qtyBase;
    const nextBaseStock = roundValue(currentBaseStock + deltaBase, 3);
    return {
      currentBaseStock,
      currentInSelectedUnit,
      deltaBase,
      nextBaseStock,
      invalid: nextBaseStock < 0,
      invalidMessage:
        nextBaseStock < 0
          ? "El movimiento dejaria el stock en negativo."
          : null,
    };
  }, [
    currentBaseStock,
    movementType,
    parsedCountedStock,
    parsedQty,
    selectedIngredient,
    unitCode,
    unitFactor,
  ]);

  async function handleSubmitMovement() {
    if (!currentUser || !isAdmin) {
      setSubmitError("Tu perfil no puede registrar movimientos de stock.");
      return;
    }
    if (!selectedIngredient) {
      setSubmitError("Selecciona un ingrediente para registrar el movimiento.");
      return;
    }
    if (selectedLocationId === null) {
      setSubmitError(
        "Selecciona una ubicacion valida para registrar el movimiento.",
      );
      return;
    }
    if (!unitCode) {
      setSubmitError("Selecciona la unidad del movimiento.");
      return;
    }

    const trimmedNotes = notes.trim();
    if (movementType === "ADJUSTMENT") {
      if (parsedCountedStock === null || parsedCountedStock < 0) {
        setSubmitError("Ingresa un stock contado valido.");
        return;
      }
      if (!trimmedNotes) {
        setSubmitError(
          "Las observaciones son obligatorias para ajustes por conteo.",
        );
        return;
      }
    } else {
      if (parsedQty === null || parsedQty <= 0) {
        setSubmitError("Ingresa una cantidad valida mayor a 0.");
        return;
      }
      if (movementType === "EXIT" && !trimmedNotes) {
        setSubmitError(
          "Las observaciones son obligatorias para salidas manuales.",
        );
        return;
      }
    }
    if (parsedUnitCost !== null && parsedUnitCost < 0) {
      setSubmitError("El costo unitario no puede ser negativo.");
      return;
    }
    if (movementPreview?.invalid) {
      setSubmitError(
        movementPreview.invalidMessage ?? "No se puede guardar el movimiento.",
      );
      return;
    }

    try {
      setSubmittingMovement(true);
      setSubmitError(null);
      setMessage(null);
      await posApi.createStockAdjustment({
        location_id: selectedLocationId,
        ingredient_id: selectedIngredient.id,
        movement_type: movementType,
        reason_code: reasonCode,
        qty:
          movementType === "ADJUSTMENT" ? undefined : (parsedQty ?? undefined),
        unit_code: unitCode,
        counted_stock:
          movementType === "ADJUSTMENT"
            ? (parsedCountedStock ?? undefined)
            : undefined,
        support_document: supportDocument.trim() || undefined,
        unit_cost_at_time:
          movementType === "ENTRY" && parsedUnitCost !== null
            ? parsedUnitCost
            : undefined,
        batch_number: batchNumber.trim() || undefined,
        notes: trimmedNotes || undefined,
      });
      setQtyInput("");
      setCountedStockInput("");
      setSupportDocument("");
      setBatchNumber("");
      setUnitCostInput("");
      setNotes("");
      setMessage("Movimiento registrado correctamente.");
      await Promise.all([
        loadStock(selectedLocationId),
        loadAdjustments(selectedLocationId),
      ]);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "No se pudo registrar el movimiento de stock",
      );
    } finally {
      setSubmittingMovement(false);
    }
  }

  const selectedLocation =
    availableLocations.find((location) => location.id === selectedLocationId) ??
    currentLocation ??
    null;
  const inventoryStatusTone =
    catalogAccessDenied || stockAccessDenied || adjustmentsAccessDenied
      ? "danger"
      : catalogError || stockError || adjustmentsError
        ? "warning"
        : loadingCatalog || loadingStock || loadingAdjustments
          ? "info"
          : selectedLocation
            ? "success"
            : "default";
  const inventoryStatusLabel =
    catalogAccessDenied || stockAccessDenied || adjustmentsAccessDenied
      ? "Acceso restringido"
      : catalogError || stockError || adjustmentsError
        ? "Revision requerida"
        : loadingCatalog || loadingStock || loadingAdjustments
          ? "Sincronizando"
          : selectedLocation
            ? "Inventario auditado"
            : "Selecciona ubicacion";
  const ingredientCatalogTone = loadingCatalog
    ? "info"
    : catalogError
      ? "warning"
      : mergedIngredients.length > 0
        ? "success"
        : "default";
  const stockTone = loadingStock
    ? "info"
    : selectedLocation
      ? stockItems.length > 0
        ? "info"
        : "warning"
      : "default";
  const outOfStockCount = selectedLocation
    ? mergedIngredients.filter(
        (ingredient) => (stockQtyByIngredientId.get(ingredient.id) ?? 0) <= 0,
      ).length
    : 0;
  const outOfStockTone = loadingStock
    ? "info"
    : !selectedLocation
      ? "default"
      : outOfStockCount > 0
        ? "warning"
        : "success";

  return (
    <div className="grid min-w-0 gap-4 sm:gap-5">
      <ModuleStatusHeader
        ariaLabel="Estado operativo de ingredientes"
        eyebrow="Operacion de inventario"
        title="Ingredientes"
        statusLabel={inventoryStatusLabel}
        statusTone={inventoryStatusTone}
        description="Catalogo base, stock por POS y movimientos auditados."
        helpText="Resume el catalogo, el stock por ubicacion y el historial reciente de entradas, salidas y ajustes por conteo."
        icon={<FlaskConical size={18} />}
      >
        <ModuleStatusCard
          label="Ingredientes"
          value={String(mergedIngredients.length)}
          icon={<FlaskConical size={16} />}
          iconTone={ingredientCatalogTone}
          badgeLabel="Catalogo"
          badgeTone={ingredientCatalogTone}
          meta={
            loadingCatalog ? "Leyendo catalogo" : "Base lista para inventario"
          }
        />
        <ModuleStatusCard
          label="Items con stock"
          value={String(stockItems.length)}
          icon={<Warehouse size={16} />}
          iconTone={stockTone}
          badgeLabel={
            selectedLocation ? `POS #${selectedLocation.id}` : "Sin POS"
          }
          badgeTone={selectedLocation ? "info" : "default"}
          meta={
            selectedLocation
              ? selectedLocation.name
              : "Selecciona una ubicacion"
          }
        />
        <ModuleStatusCard
          label="Sin stock"
          value={loadingStock ? "..." : String(outOfStockCount)}
          icon={<Boxes size={16} />}
          iconTone={outOfStockTone}
          badgeLabel={selectedLocation ? "Reposicion" : "Sin POS"}
          badgeTone={outOfStockTone}
          meta={
            selectedLocation
              ? "Pendientes operativos"
              : "Selecciona una ubicacion"
          }
        />
      </ModuleStatusHeader>

      {message ? (
        <FeedbackMessage tone="success">{message}</FeedbackMessage>
      ) : null}
      {submitError ? (
        <FeedbackMessage tone="error">{submitError}</FeedbackMessage>
      ) : null}
      {!currentLocation ? (
        <Card>
          <EmptyState
            title="Sin punto de venta activo"
            description="Selecciona una ubicacion real en el encabezado para consultar y registrar inventario."
          />
        </Card>
      ) : null}
      {catalogAccessDenied || stockAccessDenied || adjustmentsAccessDenied ? (
        <AccessState description="Tu perfil actual no tiene permiso para consultar este modulo completo." />
      ) : null}
      {!isAdmin ? (
        <FeedbackMessage tone="info">
          Tu perfil esta en modo consulta. Puedes revisar catalogo, stock e
          historial, pero no crear ingredientes ni registrar movimientos
          manuales.
        </FeedbackMessage>
      ) : null}

      <div className="grid min-w-0 items-start gap-4 xl:grid-cols-[460px_minmax(0,1fr)]">
        <div className="grid min-w-0 gap-4 sm:gap-5">
          {isAdmin ? (
            <Card>
              <p className="text-sm theme-text-muted">Crear ingrediente</p>
              <h2 className="font-display text-2xl font-bold theme-text-strong">
                Gestion base del inventario
              </h2>
              <div className="mt-5 grid gap-4">
                <Input
                  label="Nombre"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
                <Select
                  label="Dimension"
                  value={dimension}
                  onChange={(event) =>
                    setDimension(event.target.value as IngredientDimension)
                  }
                >
                  <option value="WEIGHT">{getDimensionLabel("WEIGHT")}</option>
                  <option value="VOLUME">{getDimensionLabel("VOLUME")}</option>
                  <option value="COUNT">{getDimensionLabel("COUNT")}</option>
                </Select>
                <Select
                  label="Unidad por defecto"
                  value={defaultUnitCode}
                  onChange={(event) => setDefaultUnitCode(event.target.value)}
                >
                  {availableDefaultUnits.map((unit) => (
                    <option key={unit} value={unit}>
                      {getUnitLabel(unit)}
                    </option>
                  ))}
                </Select>
                <Button
                  disabled={creatingIngredient || !name.trim()}
                  onClick={handleCreateIngredient}
                >
                  {creatingIngredient ? "Guardando..." : "Crear ingrediente"}
                </Button>
              </div>
            </Card>
          ) : null}

          {isAdmin ? (
            <Card>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm theme-text-muted">
                    Movimiento de stock
                  </p>
                  <h2 className="font-display text-2xl font-bold theme-text-strong">
                    Registro auditado
                  </h2>
                </div>
                <StatusBadge
                  label={movementTypeLabels[movementType]}
                  tone={movementTypeTones[movementType]}
                />
              </div>
              <div className="mt-5 grid gap-4">
                <Select
                  label="Ubicacion"
                  value={selectedLocationId ?? ""}
                  onChange={(event) =>
                    setSelectedLocationId(
                      event.currentTarget.value
                        ? Number(event.currentTarget.value)
                        : null,
                    )
                  }
                >
                  <option value="">Selecciona una ubicacion</option>
                  {availableLocations.map((location) => (
                    <option key={location.id} value={location.id}>
                      #{location.id} / {location.name}
                    </option>
                  ))}
                </Select>
                <Select
                  label="Ingrediente"
                  value={selectedIngredientId}
                  onChange={(event) =>
                    setSelectedIngredientId(event.target.value)
                  }
                >
                  <option value="">Selecciona un ingrediente</option>
                  {mergedIngredients.map((ingredient) => (
                    <option key={ingredient.id} value={String(ingredient.id)}>
                      #{ingredient.id} / {ingredient.name}
                    </option>
                  ))}
                </Select>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Select
                    label="Tipo de movimiento"
                    value={movementType}
                    onChange={(event) =>
                      setMovementType(
                        event.target.value as IngredientMovementType,
                      )
                    }
                  >
                    <option value="ENTRY">{movementTypeLabels.ENTRY}</option>
                    <option value="EXIT">{movementTypeLabels.EXIT}</option>
                    <option value="ADJUSTMENT">
                      {movementTypeLabels.ADJUSTMENT}
                    </option>
                  </Select>
                  <Select
                    label="Motivo"
                    value={reasonCode}
                    onChange={(event) =>
                      setReasonCode(
                        event.target.value as IngredientMovementReasonCode,
                      )
                    }
                  >
                    {movementReasonOptions.map((code) => (
                      <option key={code} value={code}>
                        {reasonLabels[code]}
                      </option>
                    ))}
                  </Select>
                </div>
                {movementType === "ADJUSTMENT" ? (
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Input
                      label="Stock actual"
                      value={formatQty(
                        movementPreview?.currentInSelectedUnit ??
                          currentBaseStock / unitFactor,
                      )}
                      readOnly
                    />
                    <Input
                      label="Stock actual base"
                      value={formatQty(currentBaseStock)}
                      readOnly
                    />
                    <Input
                      type="number"
                      label="Stock contado"
                      value={countedStockInput}
                      onChange={(event) => {
                        const nextValue = normalizeNumberInput(
                          event.target.value,
                          { allowDecimal: true },
                        );
                        if (nextValue !== null) setCountedStockInput(nextValue);
                      }}
                    />
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input
                      type="number"
                      label="Cantidad"
                      value={qtyInput}
                      onChange={(event) => {
                        const nextValue = normalizeNumberInput(
                          event.target.value,
                          { allowDecimal: true },
                        );
                        if (nextValue !== null) setQtyInput(nextValue);
                      }}
                    />
                    <Input
                      label="Stock actual base"
                      value={formatQty(currentBaseStock)}
                      readOnly
                    />
                  </div>
                )}
                <Select
                  label={
                    movementType === "ADJUSTMENT"
                      ? "Unidad de conteo"
                      : "Unidad"
                  }
                  value={unitCode}
                  onChange={(event) => setUnitCode(event.target.value)}
                >
                  {availableAdjustUnits.map((unit) => (
                    <option key={unit} value={unit}>
                      {getUnitLabel(unit)}
                    </option>
                  ))}
                </Select>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Documento soporte"
                    value={supportDocument}
                    onChange={(event) => setSupportDocument(event.target.value)}
                    placeholder="Factura, acta o remision"
                  />
                  <Input
                    label="Lote"
                    value={batchNumber}
                    onChange={(event) => setBatchNumber(event.target.value)}
                    placeholder="Opcional"
                  />
                </div>
                {movementType === "ENTRY" ? (
                  <Input
                    type="number"
                    label="Costo unitario"
                    value={unitCostInput}
                    onChange={(event) => {
                      const nextValue = normalizeNumberInput(
                        event.target.value,
                        { allowDecimal: true },
                      );
                      if (nextValue !== null) setUnitCostInput(nextValue);
                    }}
                    hint={
                      parsedUnitCost !== null
                        ? `Snapshot estimado: ${formatCurrency(parsedUnitCost)}`
                        : "Opcional para entradas de inventario"
                    }
                  />
                ) : null}
                <Textarea
                  label="Observaciones"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  hint={
                    movementType === "ENTRY"
                      ? "Opcional para entradas."
                      : "Obligatorio para salidas y ajustes por conteo."
                  }
                />
                <div className="data-list-card rounded-3xl p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium theme-text-strong">
                      Preview del impacto
                    </p>
                    <StatusBadge
                      label={movementPreview?.invalid ? "Bloqueado" : "Listo"}
                      tone={movementPreview?.invalid ? "danger" : "info"}
                    />
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="toolbar-shell rounded-2xl px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.24em] text-[color:var(--text-faint)]">
                        Actual
                      </p>
                      <p className="mt-2 font-display text-2xl font-bold theme-text-strong">
                        {formatQty(
                          movementPreview?.currentBaseStock ?? currentBaseStock,
                        )}
                      </p>
                    </div>
                    <div className="toolbar-shell rounded-2xl px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.24em] text-[color:var(--text-faint)]">
                        Diferencia
                      </p>
                      <p className="mt-2 font-display text-2xl font-bold theme-text-strong">
                        {movementPreview?.deltaBase === null ||
                        movementPreview?.deltaBase === undefined
                          ? "--"
                          : `${movementPreview.deltaBase >= 0 ? "+" : ""}${formatQty(movementPreview.deltaBase)}`}
                      </p>
                    </div>
                    <div className="toolbar-shell rounded-2xl px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.24em] text-[color:var(--text-faint)]">
                        Nuevo
                      </p>
                      <p className="mt-2 font-display text-2xl font-bold theme-text-strong">
                        {movementPreview?.nextBaseStock === null ||
                        movementPreview?.nextBaseStock === undefined
                          ? "--"
                          : formatQty(movementPreview.nextBaseStock)}
                      </p>
                    </div>
                  </div>
                  {movementPreview?.invalidMessage ? (
                    <p className="mt-3 text-sm text-[color:var(--danger-text)]">
                      {movementPreview.invalidMessage}
                    </p>
                  ) : null}
                </div>
                <div className="toolbar-shell rounded-2xl px-4 py-3 text-sm text-[color:var(--text-secondary)]">
                  Usuario responsable:{" "}
                  <span className="font-medium theme-text-strong">
                    {currentUser?.name ?? "Sin sesion"}
                  </span>
                </div>
                <Button
                  disabled={
                    submittingMovement ||
                    selectedLocationId === null ||
                    !selectedIngredient
                  }
                  onClick={handleSubmitMovement}
                >
                  {submittingMovement ? "Guardando..." : "Registrar movimiento"}
                </Button>
              </div>
            </Card>
          ) : null}
        </div>

        <div className="grid min-w-0 gap-4 sm:gap-5">
          <Card>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm theme-text-muted">
                  Listado de ingredientes
                </p>
                <h2 className="font-display text-2xl font-bold theme-text-strong">
                  Catalogo base
                </h2>
              </div>
              <Button
                variant="secondary"
                onClick={() => void loadIngredients()}
              >
                Refrescar
              </Button>
            </div>
            {loadingCatalog ? (
              <div className="mt-6 grid gap-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="data-list-card h-20 animate-pulse rounded-3xl"
                  />
                ))}
              </div>
            ) : mergedIngredients.length === 0 ? (
              <div className="mt-6">
                <EmptyState
                  title="Sin ingredientes cargados"
                  description="Crea el primer ingrediente para comenzar a controlar inventario."
                />
              </div>
            ) : (
              <ScrollPanel
                className="mt-6 grid gap-3"
                tabIndex={0}
                aria-label="Catalogo de ingredientes"
              >
                {mergedIngredients.map((ingredient) => (
                  <div
                    key={ingredient.id}
                    className="data-list-card rounded-3xl p-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-medium theme-text-strong">
                          {ingredient.name}
                        </p>
                        <p className="mt-1 text-sm theme-text-muted">
                          {getDimensionLabel(ingredient.dimension)} -{" "}
                          {getUnitLabel(ingredient.defaultUnitCode)}
                        </p>
                      </div>
                      <p className="text-sm text-[color:var(--text-faint)]">
                        ID {ingredient.id}
                      </p>
                    </div>
                  </div>
                ))}
              </ScrollPanel>
            )}
            {catalogError ? (
              <FeedbackMessage tone="info" className="mt-4">
                GET /ingredients no esta disponible o fallo. La vista usa
                ingredientes de sesion y del stock para no bloquear la
                operacion.
              </FeedbackMessage>
            ) : null}
          </Card>

          <Card>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm theme-text-muted">Existencias reales</p>
                <h2 className="font-display text-2xl font-bold theme-text-strong">
                  Stock por ubicacion
                </h2>
              </div>
              <Button
                variant="secondary"
                onClick={() =>
                  selectedLocationId !== null &&
                  void loadStock(selectedLocationId)
                }
              >
                Refrescar
              </Button>
            </div>
            {loadingStock ? (
              <div className="mt-6 grid gap-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="data-list-card h-24 animate-pulse rounded-3xl"
                  />
                ))}
              </div>
            ) : stockItems.length === 0 ? (
              <div className="mt-6">
                <EmptyState
                  title="Sin stock registrado"
                  description="Registra una entrada o ajuste para empezar a ver existencias por ubicacion."
                />
              </div>
            ) : (
              <ScrollPanel
                className="mt-6 grid gap-3"
                tabIndex={0}
                aria-label="Stock por ubicacion"
              >
                {stockItems.map((item) => (
                  <div
                    key={`${item.ingredientId}-${item.locationId}`}
                    className="data-list-card rounded-3xl p-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-medium theme-text-strong">
                          {item.ingredient.name}
                        </p>
                        <p className="mt-1 text-sm theme-text-muted">
                          {item.location.name} -{" "}
                          {getDimensionLabel(item.ingredient.dimension)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="metric-accent font-display text-2xl font-bold">
                          {formatQty(item.qtyOnHandBase)}
                        </p>
                        <p className="text-xs text-[color:var(--text-faint)]">
                          unidad base
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </ScrollPanel>
            )}
            {stockError ? (
              <FeedbackMessage tone="error" className="mt-4">
                {stockError}
              </FeedbackMessage>
            ) : null}
          </Card>

          <Card>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm theme-text-muted">Movimientos</p>
                <h2 className="font-display text-2xl font-bold theme-text-strong">
                  Historial auditado
                </h2>
              </div>
              <Button
                variant="secondary"
                onClick={() =>
                  selectedLocationId !== null &&
                  void loadAdjustments(selectedLocationId)
                }
              >
                <ClipboardList size={16} />
                Refrescar
              </Button>
            </div>
            {loadingAdjustments ? (
              <div className="mt-6 grid gap-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="data-list-card h-28 animate-pulse rounded-3xl"
                  />
                ))}
              </div>
            ) : adjustmentItems.length === 0 ? (
              <div className="mt-6">
                <EmptyState
                  title="Sin movimientos recientes"
                  description="Aqui se mostraran entradas, salidas y ajustes manuales con trazabilidad por usuario y ubicacion."
                />
              </div>
            ) : (
              <ScrollPanel
                className="mt-6 grid gap-3"
                tabIndex={0}
                aria-label="Historial de movimientos de stock"
              >
                {adjustmentItems.map((item) => {
                  const delta = getMovementDelta(item);
                  return (
                    <div
                      key={item.id}
                      className="data-list-card rounded-3xl p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <StatusBadge
                              label={movementTypeLabels[item.movementType]}
                              tone={movementTypeTones[item.movementType]}
                            />
                            {item.reasonCode ? (
                              <StatusBadge
                                label={reasonLabels[item.reasonCode]}
                                tone="info"
                              />
                            ) : null}
                          </div>
                          <p className="mt-3 font-medium theme-text-strong">
                            {item.ingredient.name}
                          </p>
                          <p className="mt-1 text-sm theme-text-muted">
                            {item.location.name} - {formatDate(item.createdAt)}{" "}
                            - {item.adjustedByUser.name}
                          </p>
                          {item.notes ? (
                            <p className="mt-3 text-sm text-[color:var(--text-secondary)]">
                              {item.notes}
                            </p>
                          ) : null}
                          <div className="mt-3 flex flex-wrap gap-4 text-xs text-[color:var(--text-faint)]">
                            <span>
                              Antes: {formatQty(item.previousStock)} base
                            </span>
                            <span>Nuevo: {formatQty(item.newStock)} base</span>
                            {item.countedStock !== null ? (
                              <span>
                                Contado: {formatQty(item.countedStock)} base
                              </span>
                            ) : null}
                            {item.supportDocument ? (
                              <span>Doc: {item.supportDocument}</span>
                            ) : null}
                            {item.batchNumber ? (
                              <span>Lote: {item.batchNumber}</span>
                            ) : null}
                            {item.unitCostAtTime !== null ? (
                              <span>
                                Costo:{" "}
                                {formatCurrency(toNumber(item.unitCostAtTime))}
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="metric-accent font-display text-2xl font-bold">
                            {delta >= 0 ? "+" : ""}
                            {formatQty(delta)}
                          </p>
                          <p className="text-xs text-[color:var(--text-faint)]">
                            diferencia base
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </ScrollPanel>
            )}
            {adjustmentsError ? (
              <FeedbackMessage tone="error" className="mt-4">
                {adjustmentsError}
              </FeedbackMessage>
            ) : null}
          </Card>
        </div>
      </div>
    </div>
  );
}



