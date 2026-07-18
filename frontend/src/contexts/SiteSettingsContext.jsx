import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api from '../services/api';
import { resolveImageUrl } from '../config/config';

export const DEFAULT_SETTINGS = {
  brandName: 'SRI BOGAT',
  // the current navbar wordmark gradient
  brandColorStart: '#4B2E2B',
  brandColorEnd: '#dd9941',
  heroTagline: 'Estate Coffee and Heritage Spices',
  heroHeading: 'Authentic flavour,\ncrafted with care.',
  heroSubheading:
    'Premium spices and coffee sourced with discipline, packed with character, and delivered for kitchens that care about aroma, purity, and everyday excellence.',
  badges: ['Small Batch Crafted', 'Pure Ingredients', 'Quality Checked'],
  // null = use the hardcoded slides bundled with the frontend
  heroSlides: null,
  logoUrl: null,
  fontFamily: '',
  fontFileUrl: null,
  contactPhone: '+91 7795451890',
  contactEmail: 'support@sribogat.com',
  footerDescription:
    'Preserving the authentic taste of India through premium spices and traditional coffee. From heritage farms to your kitchen, delivering excellence since generations.',
  footerCopyright: '© 2024 BOGAT. Crafted with tradition for authentic flavors.',
};

export const CUSTOM_FONT_NAME = 'SriBogatCustomFont';

// Builds the CSS that applies the chosen font to `scope` (body for the live
// site, a preview wrapper on the settings page). Custom font file wins.
export function buildFontCss(fontFamily, fontFileUrl, scope = 'body') {
  if (fontFileUrl) {
    const url = fontFileUrl.startsWith('blob:') ? fontFileUrl : resolveImageUrl(fontFileUrl, '');
    return `@font-face{font-family:'${CUSTOM_FONT_NAME}';src:url('${url}');font-display:swap;}${scope}{font-family:'${CUSTOM_FONT_NAME}',ui-sans-serif,system-ui,sans-serif;}`;
  }
  if (fontFamily) {
    return `${scope}{font-family:${fontFamily};}`;
  }
  return '';
}

export function mergeWithDefaults(data) {
  const merged = { ...DEFAULT_SETTINGS };
  for (const key of Object.keys(DEFAULT_SETTINGS)) {
    const value = data?.[key];
    if (value !== null && value !== undefined && value !== '' && !(Array.isArray(value) && value.length === 0)) {
      merged[key] = value;
    }
  }
  return merged;
}

const SiteSettingsContext = createContext({
  settings: DEFAULT_SETTINGS,
  refresh: () => {},
});

export const SiteSettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get('/settings');
      setSettings(mergeWithDefaults(data));
    } catch {
      // keep defaults — the site must render even if settings can't load
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    let styleEl = document.getElementById('site-font-style');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'site-font-style';
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = buildFontCss(settings.fontFamily, settings.fontFileUrl);
  }, [settings.fontFamily, settings.fontFileUrl]);

  return (
    <SiteSettingsContext.Provider value={{ settings, refresh }}>
      {children}
    </SiteSettingsContext.Provider>
  );
};

export const useSiteSettings = () => useContext(SiteSettingsContext);
