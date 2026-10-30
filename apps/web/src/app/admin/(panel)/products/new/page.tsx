import ProductForm from '@/components/admin/ProductForm';
import { PageHead } from '@/components/admin/ui';

export default function NewProductPage() {
  return (
    <>
      <PageHead title="محصول جدید" desc="دسته و سری آخرین محصول ثبت‌شده خودکار پر می‌شود." />
      <ProductForm />
    </>
  );
}
