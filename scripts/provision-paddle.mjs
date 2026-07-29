#!/usr/bin/env node

/**
 * Idempotent provisioning script for Paddle Sandbox catalog.
 *
 * Reads PADDLE_API_KEY from environment. Creates products and prices
 * only if they don't already exist (matched by custom_data.app + name).
 *
 * Usage:
 *   PADDLE_API_KEY=pdl_sdbx_... node scripts/provision-paddle.mjs
 */

const PADDLE_API_KEY = process.env.PADDLE_API_KEY;
if (!PADDLE_API_KEY) {
  console.error('Missing PADDLE_API_KEY environment variable.');
  console.error('Usage: PADDLE_API_KEY=pdl_sdbx_... node scripts/provision-paddle.mjs');
  process.exit(1);
}

const BASE = 'https://sandbox-api.paddle.com';
const headers = {
  Authorization: `Bearer ${PADDLE_API_KEY}`,
  'Content-Type': 'application/json',
};

const CUSTOM_DATA = { app: 'ringlume', environment: 'sandbox' };

const PRICE_VERSION = '2'

const PRODUCT_DEFS = [
  {
    name: 'Basic',
    description: 'Perfect for small businesses getting started with Voice AI',
    tax_category: 'saas',
    custom_data: { ...CUSTOM_DATA, plan: 'basic' },
    prices: [
      {
        description: 'Basic Monthly',
        billing_cycle: { interval: 'month', frequency: 1 },
        unit_price: { amount: '29900', currency_code: 'USD' },
        custom_data: { ...CUSTOM_DATA, plan: 'basic', billing_interval: 'month' },
      },
      {
        description: 'Basic Annual',
        billing_cycle: { interval: 'year', frequency: 1 },
        unit_price: { amount: '299000', currency_code: 'USD' },
        custom_data: { ...CUSTOM_DATA, plan: 'basic', billing_interval: 'year' },
      },
    ],
  },
  {
    name: 'Pro',
    description: 'Built for growing businesses that need advanced capabilities',
    tax_category: 'saas',
    custom_data: { ...CUSTOM_DATA, plan: 'pro' },
    prices: [
      {
        description: 'Pro Monthly',
        billing_cycle: { interval: 'month', frequency: 1 },
        unit_price: { amount: '59900', currency_code: 'USD' },
        custom_data: { ...CUSTOM_DATA, plan: 'pro', billing_interval: 'month', price_version: PRICE_VERSION },
      },
      {
        description: 'Pro Annual',
        billing_cycle: { interval: 'year', frequency: 1 },
        unit_price: { amount: '599000', currency_code: 'USD' },
        custom_data: { ...CUSTOM_DATA, plan: 'pro', billing_interval: 'year', price_version: PRICE_VERSION },
      },
    ],
  },
  {
    name: 'Plus',
    description: 'Most popular for scaling teams that need more power',
    tax_category: 'saas',
    custom_data: { ...CUSTOM_DATA, plan: 'plus' },
    prices: [
      {
        description: 'Plus Monthly',
        billing_cycle: { interval: 'month', frequency: 1 },
        unit_price: { amount: '99900', currency_code: 'USD' },
        custom_data: { ...CUSTOM_DATA, plan: 'plus', billing_interval: 'month', price_version: PRICE_VERSION },
      },
      {
        description: 'Plus Annual',
        billing_cycle: { interval: 'year', frequency: 1 },
        unit_price: { amount: '999000', currency_code: 'USD' },
        custom_data: { ...CUSTOM_DATA, plan: 'plus', billing_interval: 'year', price_version: PRICE_VERSION },
      },
    ],
  },
  {
    name: 'Max',
    description: 'For enterprises that need maximum capacity and customization',
    tax_category: 'saas',
    custom_data: { ...CUSTOM_DATA, plan: 'max' },
    prices: [
      {
        description: 'Max Monthly',
        billing_cycle: { interval: 'month', frequency: 1 },
        unit_price: { amount: '199900', currency_code: 'USD' },
        custom_data: { ...CUSTOM_DATA, plan: 'max', billing_interval: 'month', price_version: PRICE_VERSION },
      },
      {
        description: 'Max Annual',
        billing_cycle: { interval: 'year', frequency: 1 },
        unit_price: { amount: '1999000', currency_code: 'USD' },
        custom_data: { ...CUSTOM_DATA, plan: 'max', billing_interval: 'year', price_version: PRICE_VERSION },
      },
    ],
  },
  {
    name: 'Voice AI Setup Fee',
    description: 'One-time setup fee for Voice AI receptionist',
    tax_category: 'standard',
    custom_data: { ...CUSTOM_DATA, type: 'setup_fee' },
    prices: [
      {
        description: 'Setup Fee - One Time',
        billing_cycle: null,
        unit_price: { amount: '120000', currency_code: 'USD' },
        quantity: { minimum: 1, maximum: 1 },
        custom_data: { ...CUSTOM_DATA, type: 'setup_fee', price_version: PRICE_VERSION },
      },
    ],
  },
];

async function api(path, options = {}) {
  const url = `${BASE}${path}`;
  const res = await fetch(url, { headers, ...options });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Paddle API ${res.status} ${res.statusText}: ${path}\n${body}`);
  }
  return res.json();
}

async function fetchAllProducts() {
  const results = [];
  let after = null;
  while (true) {
    const params = new URLSearchParams({ status: 'active', include: 'prices' });
    if (after) params.set('after', after);
    const json = await api(`/products?${params}`);
    results.push(...json.data);
    if (!json.meta?.pagination?.has_more) break;
    after = json.data[json.data.length - 1].id;
  }
  return results;
}

function matchProduct(def, product) {
  if (product.name !== def.name) return false;
  const cd = product.custom_data;
  if (!cd || cd.app !== 'ringlume' || cd.environment !== 'sandbox') return false;
  if (def.custom_data.plan && cd.plan !== def.custom_data.plan) return false;
  if (def.custom_data.type && cd.type !== def.custom_data.type) return false;
  return true;
}

function matchPrice(def, price) {
  const cd = price.custom_data;
  if (!cd || cd.app !== 'ringlume' || cd.environment !== 'sandbox') return false;
  if (def.custom_data.plan && cd.plan !== def.custom_data.plan) return false;
  if (def.custom_data.type && cd.type !== def.custom_data.type) return false;
  if (def.custom_data.billing_interval && cd.billing_interval !== def.custom_data.billing_interval) return false;
  // Match price_version if present in the def (to distinguish updated prices)
  if (def.custom_data.price_version && cd.price_version !== def.custom_data.price_version) return false;
  return true;
}

async function ensureProduct(def) {
  const existing = await fetchAllProducts();
  const found = existing.find((p) => matchProduct(def, p));
  if (found) {
    console.log(`  EXISTS: ${found.name} → ${found.id}`);
    return found;
  }

  const body = {
    name: def.name,
    tax_category: def.tax_category,
    description: def.description,
    custom_data: def.custom_data,
  };
  const json = await api('/products', { method: 'POST', body: JSON.stringify(body) });
  const product = json.data;
  console.log(`  CREATED: ${product.name} → ${product.id}`);
  return product;
}

async function ensurePrice(productId, def, existingPrices) {
  const found = existingPrices.find((p) => matchPrice(def, p));
  if (found) {
    const interval = found.billing_cycle
      ? `${found.billing_cycle.interval}/${found.billing_cycle.frequency}`
      : 'one-time';
    console.log(`  EXISTS: ${found.description} → ${found.id} (${interval}, ${found.unit_price.amount} ${found.unit_price.currency_code})`);
    return found;
  }

  const body = {
    product_id: productId,
    description: def.description,
    billing_cycle: def.billing_cycle,
    unit_price: def.unit_price,
    custom_data: def.custom_data,
  };
  if (def.quantity) {
    body.quantity = def.quantity;
  }
  const json = await api('/prices', { method: 'POST', body: JSON.stringify(body) });
  const price = json.data;
  const interval = price.billing_cycle
    ? `${price.billing_cycle.interval}/${price.billing_cycle.frequency}`
    : 'one-time';
  console.log(`  CREATED: ${price.description} → ${price.id} (${interval}, ${price.unit_price.amount} ${price.unit_price.currency_code})`);
  return price;
}

async function main() {
  console.log('\n=== Paddle Sandbox Catalog Provisioning ===\n');

  const created = [];

  for (const def of PRODUCT_DEFS) {
    console.log(`\nProduct: ${def.name}`);
    const product = await ensureProduct(def);

    const pricesJson = product.prices
      ? { data: product.prices }
      : await api(`/prices?product_id=${product.id}`);

    const existingPrices = pricesJson.data || [];

    for (const priceDef of def.prices) {
      const price = await ensurePrice(product.id, priceDef, existingPrices);
      created.push({ product: def.name, productId: product.id, price });
    }
  }

  console.log('\n=== Summary ===\n');
  console.log('| Plan/Product | Product ID | Price type | Billing interval | Amount | Currency | Price ID |');
  console.log('| ------------ | ---------- | ---------- | ---------------- | -----: | -------- | -------- |');

  for (const item of created) {
    const p = item.price;
    const priceType = p.billing_cycle ? 'Recurring' : 'One-time';
    const interval = p.billing_cycle
      ? `${p.billing_cycle.interval.charAt(0).toUpperCase() + p.billing_cycle.interval.slice(1)}`
      : 'None';
    const amountCents = parseInt(p.unit_price.amount, 10);
    const amount = (amountCents / 100).toFixed(2);
    console.log(`| ${item.product} | ${item.productId} | ${priceType} | ${interval} | $${amount} | ${p.unit_price.currency_code} | ${p.id} |`);
  }

  console.log('\n=== Environment Variables ===\n');
  // Collect mappings
  const basicMonthly = created.find((c) => c.product === 'Basic' && c.price.billing_cycle?.interval === 'month');
  const basicAnnual = created.find((c) => c.product === 'Basic' && c.price.billing_cycle?.interval === 'year');
  const proMonthly = created.find((c) => c.product === 'Pro' && c.price.billing_cycle?.interval === 'month');
  const proAnnual = created.find((c) => c.product === 'Pro' && c.price.billing_cycle?.interval === 'year');
  const plusMonthly = created.find((c) => c.product === 'Plus' && c.price.billing_cycle?.interval === 'month');
  const plusAnnual = created.find((c) => c.product === 'Plus' && c.price.billing_cycle?.interval === 'year');
  const maxMonthly = created.find((c) => c.product === 'Max' && c.price.billing_cycle?.interval === 'month');
  const maxAnnual = created.find((c) => c.product === 'Max' && c.price.billing_cycle?.interval === 'year');
  const setupFee = created.find((c) => c.product === 'Voice AI Setup Fee');

  const lines = [
    '# Paddle Sandbox Configuration',
    `PUBLIC_PADDLE_ENVIRONMENT=sandbox`,
    `PUBLIC_PADDLE_CLIENT_TOKEN=test_a9915665ce96454b42712c2edb9`,
    '',
    '# Price IDs',
    `PUBLIC_PADDLE_BASIC_MONTHLY_PRICE_ID=${basicMonthly?.price?.id || 'MISSING'}`,
    `PUBLIC_PADDLE_BASIC_ANNUAL_PRICE_ID=${basicAnnual?.price?.id || 'MISSING'}`,
    `PUBLIC_PADDLE_PRO_MONTHLY_PRICE_ID=${proMonthly?.price?.id || 'MISSING'}`,
    `PUBLIC_PADDLE_PRO_ANNUAL_PRICE_ID=${proAnnual?.price?.id || 'MISSING'}`,
    `PUBLIC_PADDLE_PLUS_MONTHLY_PRICE_ID=${plusMonthly?.price?.id || 'MISSING'}`,
    `PUBLIC_PADDLE_PLUS_ANNUAL_PRICE_ID=${plusAnnual?.price?.id || 'MISSING'}`,
    `PUBLIC_PADDLE_MAX_MONTHLY_PRICE_ID=${maxMonthly?.price?.id || 'MISSING'}`,
    `PUBLIC_PADDLE_MAX_ANNUAL_PRICE_ID=${maxAnnual?.price?.id || 'MISSING'}`,
    `PUBLIC_PADDLE_SETUP_FEE_PRICE_ID=${setupFee?.price?.id || 'MISSING'}`,
    '',
    '# Server-side only (provisioning)',
    '# PADDLE_API_KEY=pdl_sdbx_...',
  ];
  console.log(lines.join('\n'));
}

main().catch((err) => {
  console.error('\nFatal:', err.message);
  process.exit(1);
});
