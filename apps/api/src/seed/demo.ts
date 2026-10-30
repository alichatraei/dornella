/**
 * داده نمونه برای دیدن ظاهر فروشگاه قبل از بارگذاری محصولات واقعی.
 * اجرا:  npm run db:seed        (داخل داکر: docker compose exec api npm run db:seed)
 * فقط وقتی اجرا می‌شود که هیچ محصولی در پایگاه داده نباشد، مگر با --force
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const categories = [
  { name: 'پیراهن و سارافون', slug: 'dresses', sortOrder: 1 },
  { name: 'بلوز و شومیز', slug: 'tops', sortOrder: 2 },
  { name: 'ست', slug: 'sets', sortOrder: 3 },
  { name: 'شلوار و دامن', slug: 'bottoms', sortOrder: 4 },
  { name: 'بافت و هودی', slug: 'knitwear', sortOrder: 5 },
  { name: 'اکسسوری', slug: 'accessories', sortOrder: 6 },
];

const SIZES = ['S', 'M', 'L', 'XL'];

const products = [
  { title: 'پیراهن گل‌ریز نخی', cat: 'dresses', price: 1480000, cost: 890000, compare: 1690000, img: 'dress-1', color: 'صورتی', hex: '#F2A7BE', featured: true, material: 'نخ پنبه', collection: 'سری پاییز',
    desc: 'پیراهن آستین‌بلند با پارچه نخی و طرح گل‌ریز. یقه گرد دارد و کمرش کش‌دار است. بعد از شست‌وشو آب نمی‌رود.' },
  { title: 'سارافون جین سنگ‌شور', cat: 'dresses', price: 1650000, cost: 990000, img: 'dress-2', color: 'آبی روشن', hex: '#9DB4D3', featured: true, material: 'جین نرم', collection: 'سری پاییز',
    desc: 'سارافون جین با بند قابل تنظیم و دو جیب جلو. روی تیشرت یا بافت یقه‌اسکی پوشیده می‌شود.' },
  { title: 'پیراهن مجلسی ساتن', cat: 'dresses', price: 2350000, cost: 1450000, compare: 2700000, img: 'dress-3', color: 'گلبهی', hex: '#F4B6A6', featured: true, material: 'ساتن آمریکایی', collection: 'سری مجلسی',
    desc: 'پیراهن مجلسی با پارچه ساتن براق و آستر نخی. پشت لباس زیپ مخفی دارد و کمر با پاپیون بسته می‌شود.' },
  { title: 'شومیز آستین پفی', cat: 'tops', price: 890000, cost: 520000, img: 'top-1', color: 'شیری', hex: '#F3E9DC', material: 'کرپ ویسکوز', collection: 'سری پاییز',
    desc: 'شومیز سبک با آستین پفی و دکمه‌های صدفی. هم با شلوار جین خوب است هم با دامن.' },
  { title: 'تیشرت نخی چاپ گیلاس', cat: 'tops', price: 590000, cost: 310000, compare: 690000, img: 'top-2', color: 'سفید', hex: '#FFFFFF', featured: true, material: 'پنبه ۱۰۰٪',
    desc: 'تیشرت یقه گرد با چاپ گیلاس روی سینه. چاپ آن بعد از شست‌وشو ترک نمی‌خورد.' },
  { title: 'ست هودی و شلوار دورس', cat: 'sets', price: 1890000, cost: 1100000, img: 'set-1', color: 'صورتی', hex: '#F6C1D0', featured: true, material: 'دورس سه‌نخ', collection: 'سری زمستان',
    desc: 'ست دو تکه از دورس نرم و گرم. هودی کلاه‌دار با جیب کانگورویی و شلوار دمپا کش.' },
  { title: 'ست راحتی ابر و ستاره', cat: 'sets', price: 1250000, cost: 700000, img: 'set-2', color: 'یاسی', hex: '#D7C8E9', material: 'نخ پنبه',
    desc: 'ست بلوز و شلوار راحتی برای خانه و خواب. پارچه‌اش با هر شست‌وشو نرم‌تر می‌شود.' },
  { title: 'دامن پلیسه میدی', cat: 'bottoms', price: 980000, cost: 560000, img: 'bottom-1', color: 'صورتی', hex: '#F5C6D3', material: 'کرپ پلیسه', collection: 'سری پاییز',
    desc: 'دامن پلیسه با کمر کش پهن و آستر کوتاه. سبک است و پلیسه‌هایش با شست‌وشو باز نمی‌شود.' },
  { title: 'شلوار مام‌استایل کتان', cat: 'bottoms', price: 1150000, cost: 650000, img: 'bottom-2', color: 'کرم', hex: '#E9DCC7', material: 'کتان کش',
    desc: 'شلوار فاق‌بلند با پاچه گشاد. کتانش کمی کش دارد و موقع نشستن راحت است.' },
  { title: 'بافت یقه‌اسکی صورتی', cat: 'knitwear', price: 1350000, cost: 780000, compare: 1550000, img: 'knit-1', color: 'صورتی', hex: '#EFA6BD', featured: true, material: 'اکریلیک نرم', collection: 'سری زمستان',
    desc: 'بافت یقه‌اسکی با نخ نرم که زبر نیست و پرز نمی‌دهد. فرمش کمی آزاد است.' },
  { title: 'هودی قلب گلدوزی‌شده', cat: 'knitwear', price: 1450000, cost: 820000, img: 'knit-2', color: 'یاسی', hex: '#CDBDE4', material: 'دورس دولایه', collection: 'سری زمستان',
    desc: 'هودی کلاه‌دار با گلدوزی قلب روی سینه. داخل پارچه پرزدار و گرم است.' },
  { title: 'ست تل و اسکرانچی', cat: 'accessories', price: 290000, cost: 120000, img: 'acc-1', color: 'گلبهی', hex: '#F6BFAE', material: 'ساتن و مخمل',
    desc: 'یک تل روبان‌دار و دو اسکرانچی ساتن. برای هدیه هم بسته‌بندی می‌شود.' },
];

async function main() {
  const force = process.argv.includes('--force');
  if (!force && (await prisma.product.count()) > 0) {
    console.log('محصول در پایگاه داده هست؛ داده نمونه ساخته نشد. برای ساخت دوباره: --force');
    return;
  }
  if (force) {
    await prisma.$transaction([
      prisma.payment.deleteMany(), prisma.orderItem.deleteMany(), prisma.order.deleteMany(),
      prisma.festival.deleteMany(), prisma.productImage.deleteMany(), prisma.productVariant.deleteMany(),
      prisma.product.deleteMany(), prisma.category.deleteMany(), prisma.coupon.deleteMany(),
    ]);
  }

  const catIds: Record<string, string> = {};
  for (const c of categories) {
    const row = await prisma.category.upsert({ where: { slug: c.slug }, create: { ...c, image: `/img/demo/${c.slug}.svg` }, update: {} });
    catIds[c.slug] = row.id;
  }

  for (const [i, p] of products.entries()) {
    await prisma.product.create({
      data: {
        title: p.title,
        slug: p.title.replace(/\s+/g, '-'),
        description: p.desc,
        shortDescription: p.desc.split('.')[0] + '.',
        price: p.price,
        compareAtPrice: p.compare ?? null,
        costPrice: p.cost,
        categoryId: catIds[p.cat],
        collection: p.collection ?? null,
        material: p.material,
        isFeatured: !!p.featured,
        createdAt: new Date(Date.now() - i * 3600_000),
        images: { create: [{ url: `/img/demo/${p.img}.svg`, alt: p.title, position: 0 }] },
        variants: {
          create: (p.cat === 'accessories' ? ['فری‌سایز'] : SIZES).map((size, j) => ({
            size, color: p.color, colorHex: p.hex, stock: [4, 7, 5, 2][j] ?? 6,
          })),
        },
      },
    });
  }

  const now = Date.now();
  await prisma.festival.create({
    data: {
      title: 'حراج آخر فصل پاییز',
      slug: 'autumn-sale',
      bannerText: '۲۰٪ تخفیف بافت و هودی، فقط تا آخر هفته',
      description: 'تخفیف روی بافت‌ها و هودی‌های سری زمستان، فقط تا آخر این هفته.',
      percent: 20,
      startsAt: new Date(now - 86400000),
      endsAt: new Date(now + 6 * 86400000),
      allProducts: false,
      categoryIds: [catIds.knitwear],
    },
  });
  await prisma.coupon.create({
    data: { code: 'WELCOME', description: '۱۰٪ تخفیف اولین خرید اعضای باشگاه', type: 'PERCENT', value: 10, maxDiscount: 300000, perUserLimit: 1 },
  });

  console.log(`✅ ${products.length} محصول نمونه، ${categories.length} دسته، یک جشنواره و کد WELCOME ساخته شد`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
