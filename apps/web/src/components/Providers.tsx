'use client';

import { AuthProvider } from './AuthProvider';
import { CartProvider } from './CartProvider';
import { SettingsProvider } from './SettingsProvider';
import type { Settings } from '@/lib/types';

export default function Providers({ settings, children }: { settings: Settings; children: React.ReactNode }) {
  return (
    <SettingsProvider value={settings}>
      <AuthProvider>
        <CartProvider>{children}</CartProvider>
      </AuthProvider>
    </SettingsProvider>
  );
}
