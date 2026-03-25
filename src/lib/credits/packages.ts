export const CREDIT_PACKAGES = {
  starter: {
    id: 'starter' as const,
    name: '스타터',
    credits: 500,
    price: 100_000,
    pricePerCredit: 200,
    bonus: null,
  },
  business: {
    id: 'business' as const,
    name: '비즈니스',
    credits: 1_250,
    price: 220_000,
    pricePerCredit: 176,
    bonus: '+12%',
  },
  pro: {
    id: 'pro' as const,
    name: '프로',
    credits: 3_000,
    price: 480_000,
    pricePerCredit: 160,
    bonus: '+20%',
  },
  enterprise: {
    id: 'enterprise' as const,
    name: '엔터프라이즈',
    credits: 7_500,
    price: 1_000_000,
    pricePerCredit: 133,
    bonus: '+33%',
  },
} as const;

export type PackageId = keyof typeof CREDIT_PACKAGES;
