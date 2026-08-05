const STORAGE_KEY = 'semantix_marketing_attribution';

export const ATTRIBUTION_PARAMS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'gclid',
  'fbclid',
];

function readStoredAttribution() {
  if (typeof window === 'undefined') return {};

  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeStoredAttribution(next) {
  if (typeof window === 'undefined') return;

  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

/** Capture UTM/ad params from the current URL into sessionStorage (first-touch preserved). */
export function captureMarketingAttribution(search = '') {
  if (typeof window === 'undefined') return readStoredAttribution();

  const params = new URLSearchParams(search || window.location.search);
  const stored = readStoredAttribution();
  const captured = { ...stored };

  for (const key of ATTRIBUTION_PARAMS) {
    const value = params.get(key);
    if (value && !captured[key]) {
      captured[key] = value;
    }
  }

  if (!captured.landingPage) {
    captured.landingPage = window.location.pathname;
  }

  if (!captured.referrer && document.referrer) {
    captured.referrer = document.referrer;
  }

  writeStoredAttribution(captured);
  return captured;
}

export function getStoredMarketingAttribution() {
  return readStoredAttribution();
}
