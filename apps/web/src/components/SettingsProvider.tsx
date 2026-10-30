'use client';

import { createContext, useContext } from 'react';
import type { Settings } from '@/lib/types';

const SettingsContext = createContext<Settings>({});

export function SettingsProvider({ value, children }: { value: Settings; children: React.ReactNode }) {
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export const useSettings = () => useContext(SettingsContext);
