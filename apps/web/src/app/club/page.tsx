import type { Metadata } from 'next';
import ClubSignup from '@/components/shop/ClubSignup';
import { t } from '@/dictionary';

export const metadata: Metadata = { title: t.club.title, description: t.club.text, alternates: { canonical: '/club' } };

export default function ClubPage() {
  return (
    <div className="wrap max-w-4xl py-10">
      <ClubSignup />
    </div>
  );
}
