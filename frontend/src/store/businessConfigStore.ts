import { create } from 'zustand';
import { posApi } from '@/services/api/posApi';
import type { BusinessConfig } from '@/types/api';

interface BusinessConfigState {
  config: BusinessConfig | null;
  isLoadingConfig: boolean;
  configError: string | null;
  requestSequence: number;
  refreshConfig: () => Promise<BusinessConfig | null>;
  setConfig: (config: BusinessConfig | null) => void;
  resetConfigState: () => void;
}

export const useBusinessConfigStore = create<BusinessConfigState>((set, get) => ({
  config: null,
  isLoadingConfig: false,
  configError: null,
  requestSequence: 0,
  refreshConfig: async () => {
    if (get().isLoadingConfig) {
      return get().config;
    }

    const requestSequence = get().requestSequence + 1;
    set({
      isLoadingConfig: true,
      configError: null,
      requestSequence,
    });

    try {
      const config = await posApi.getBusinessConfig();

      if (get().requestSequence !== requestSequence) {
        return get().config;
      }

      set({
        config,
        isLoadingConfig: false,
        configError: null,
      });

      return config;
    } catch (error) {
      if (get().requestSequence !== requestSequence) {
        return get().config;
      }

      set({
        isLoadingConfig: false,
        configError:
          error instanceof Error
            ? error.message
            : 'No fue posible cargar la configuracion del negocio.',
      });

      return get().config;
    }
  },
  setConfig: (config) =>
    set({
      config,
      isLoadingConfig: false,
      configError: null,
    }),
  resetConfigState: () =>
    set((state) => ({
      config: null,
      isLoadingConfig: false,
      configError: null,
      requestSequence: state.requestSequence + 1,
    })),
}));
