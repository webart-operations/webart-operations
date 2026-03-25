// Currency conversion with multiple fallback strategies for reliability

const FALLBACK_RATES = {
  USD: 1.0, INR: 83.2, GBP: 0.79,
  AUD: 1.51, CAD: 1.34, EUR: 0.92,
  AED: 3.67, SGD: 1.34
};

const APIS = [
  (base) => `https://open.er-api.com/v6/latest/${base}`,
  (base) => `https://api.exchangerate-api.com/v4/latest/${base}`,
];

let _cache = null;
let _cacheTime = null;
const CACHE_MS = 1000 * 60 * 60; // 1 hour

const isCacheFresh = () => _cache && _cacheTime && (Date.now() - _cacheTime < CACHE_MS);

export const getExchangeRates = async () => {
  if (isCacheFresh()) return _cache;

  // Try multiple APIs
  for (const buildUrl of APIS) {
    try {
      const res = await fetch(buildUrl('USD'), { signal: AbortSignal.timeout(5000) });
      if (!res.ok) continue;
      const data = await res.json();
      const rates = data.rates || data.conversion_rates;
      if (rates && rates.USD) {
        _cache = rates;
        _cacheTime = Date.now();
        return _cache;
      }
    } catch {
      // Try next API
    }
  }

  // Final fallback
  console.warn('[Currency] All APIs failed, using fallback rates');
  return FALLBACK_RATES;
};

export const convertToUSD = async (amount, fromCurrency) => {
  if (!amount || isNaN(amount)) return { usd: 0, rate: 1 };
  if (fromCurrency === 'USD') return { usd: Number(amount), rate: 1 };

  const rates = await getExchangeRates();
  const rate = rates[fromCurrency];

  if (!rate) {
    console.warn(`[Currency] Unknown currency: ${fromCurrency}, treating as USD`);
    return { usd: Number(amount), rate: 1 };
  }

  return {
    usd: Number((amount / rate).toFixed(2)),
    rate: Number(rate.toFixed(6))
  };
};

export const formatUSD = (amount) =>
  `$${Number(amount || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;

export const formatCurrency = (amount, currency = 'USD') => {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount || 0);
  } catch {
    return `${currency} ${Number(amount || 0).toLocaleString()}`;
  }
};