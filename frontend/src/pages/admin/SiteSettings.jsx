import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  Plus,
  X,
  Upload,
  Type,
  Image as ImageIcon,
  Sparkles,
  Layers,
  Phone,
  ChevronUp,
  ChevronDown,
  Trash2,
} from 'lucide-react';
import api from '../../services/api';
import { resolveImageUrl } from '../../config/config';
import {
  DEFAULT_SETTINGS,
  buildFontCss,
  mergeWithDefaults,
  useSiteSettings,
} from '../../contexts/SiteSettingsContext';
import defaultLogo from '../../assets/Sri_Bogat_logo.png';
import sample1 from '../../assets/sample1.jpeg';
import sample2 from '../../assets/sample2.jpeg';
import sample3 from '../../assets/sample3.jpeg';
import hero1 from '../../assets/hero1.jpg';
import hero2 from '../../assets/hero2.jpg';
import hero3 from '../../assets/hero3.jpg';

const FONT_PRESETS = [
  { label: 'Georgia (serif)', value: "Georgia, 'Times New Roman', serif" },
  { label: 'Times New Roman (serif)', value: "'Times New Roman', Times, serif" },
  { label: 'Palatino (serif)', value: "'Palatino Linotype', Palatino, serif" },
  { label: 'Trebuchet MS (sans)', value: "'Trebuchet MS', Tahoma, sans-serif" },
  { label: 'Verdana (sans)', value: 'Verdana, Geneva, sans-serif' },
  { label: 'System UI (sans)', value: 'system-ui, -apple-system, sans-serif' },
  { label: 'Courier New (mono)', value: "'Courier New', Courier, monospace" },
];

const MAX_BADGES = 6;
const MAX_SLIDES = 6;

// bundled fallback images, in the same order HomeHero cycles them
const FALLBACK_SLIDE_IMAGES = [sample1, sample2, sample3];
const FALLBACK_SLIDE_BGS = [hero3, hero2, hero1];

// text of the slides currently hardcoded on the homepage — shown when nothing is saved yet
const DEFAULT_SLIDES = [
  {
    badge: 'Heritage Coffee',
    name: 'South Indian Filter Coffee Powder',
    tagline: 'Estate-grown coffee with a classic 70:30 blend',
    description:
      'Slow-roasted in small batches for a deep, balanced decoction with the richness of traditional South Indian coffee.',
    features: [
      'Single-origin Chikkamagaluru beans',
      'Shadow-grown and handpicked',
      'Small-batch roast for consistent aroma',
    ],
    weight: '450gm',
    image: '',
    backgroundImage: '',
  },
  {
    badge: 'Kitchen Essential',
    name: 'Black Pepper Powder',
    tagline: 'Bold aroma and clean heat from premium peppercorns',
    description:
      'Naturally sun-dried and finely ground to preserve piperine strength, warm flavor, and kitchen versatility.',
    features: [
      'Premium Indian pepper source',
      'No additives or preservatives',
      'Strong aroma with wellness value',
    ],
    weight: '200gm',
    image: '',
    backgroundImage: '',
  },
  {
    badge: 'Royal Spice',
    name: 'Whole Cardamom',
    tagline: 'Sweet, aromatic elaichi chosen for premium flavor',
    description:
      'Hand-selected bold pods that lift tea, sweets, biryani, and curries with a floral warmth that feels unmistakably Indian.',
    features: ['Premium whole pods', 'Naturally fragrant and fresh', 'Sourced from trusted growers'],
    weight: '100gm',
    image: '',
    backgroundImage: '',
  },
];

const toEditableSlide = (slide) => ({
  badge: slide.badge ?? '',
  name: slide.name ?? '',
  tagline: slide.tagline ?? '',
  description: slide.description ?? '',
  featuresText: (slide.features ?? []).join('\n'),
  weight: slide.weight ?? '',
  accentColor: slide.accentColor ?? '',
  image: slide.image ?? '',
  backgroundImage: slide.backgroundImage ?? '',
  imageFile: null,
  imagePreview: null,
  bgFile: null,
  bgPreview: null,
});

const slidesFromSettings = (settings) =>
  (settings.heroSlides?.length ? settings.heroSlides : DEFAULT_SLIDES).map(toEditableSlide);

const inputClass =
  'w-full rounded-lg border border-amber-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400';
const labelClass = 'block text-sm font-medium text-amber-900 mb-1';
const uploadBtnClass =
  'inline-flex items-center gap-2 cursor-pointer rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100 transition';

const SectionCard = ({ icon: Icon, title, subtitle, children }) => (
  <section className="bg-white rounded-2xl shadow-lg border border-amber-100 overflow-hidden">
    <div className="px-6 py-4 border-b border-amber-100 flex items-center gap-2">
      <Icon className="w-5 h-5 text-amber-600" />
      <div>
        <h2 className="text-lg font-semibold text-amber-900">{title}</h2>
        {subtitle && <p className="text-xs text-amber-600">{subtitle}</p>}
      </div>
    </div>
    {children}
  </section>
);

const SiteSettings = () => {
  const { refresh } = useSiteSettings();

  const [saved, setSaved] = useState(DEFAULT_SETTINGS);
  const [form, setForm] = useState(DEFAULT_SETTINGS);
  const [slides, setSlides] = useState(slidesFromSettings(DEFAULT_SETTINGS));
  // '' = site default, 'custom' = keep uploaded font, otherwise a preset stack
  const [fontChoice, setFontChoice] = useState('');
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [fontFile, setFontFile] = useState(null);
  const [fontPreview, setFontPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const applyServerSettings = (data) => {
    const merged = mergeWithDefaults(data);
    setSaved(merged);
    setForm(merged);
    setSlides(slidesFromSettings(merged));
    setFontChoice(merged.fontFileUrl ? 'custom' : merged.fontFamily);
  };

  const loadSettings = async () => {
    try {
      const { data } = await api.get('/settings');
      applyServerSettings(data);
    } catch {
      toast.error('Failed to load site settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const setField = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));

  const setBadge = (index, value) =>
    setForm((prev) => ({
      ...prev,
      badges: prev.badges.map((badge, i) => (i === index ? value : badge)),
    }));

  const addBadge = () => setForm((prev) => ({ ...prev, badges: [...prev.badges, ''] }));

  const removeBadge = (index) =>
    setForm((prev) => ({ ...prev, badges: prev.badges.filter((_, i) => i !== index) }));

  // ----- slides -----
  const setSlideField = (index, name, value) =>
    setSlides((prev) => prev.map((slide, i) => (i === index ? { ...slide, [name]: value } : slide)));

  const handleSlideFile = (index, kind) => (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setSlides((prev) =>
      prev.map((slide, i) => {
        if (i !== index) return slide;
        const previewKey = kind === 'image' ? 'imagePreview' : 'bgPreview';
        const fileKey = kind === 'image' ? 'imageFile' : 'bgFile';
        if (slide[previewKey]) URL.revokeObjectURL(slide[previewKey]);
        return { ...slide, [fileKey]: file, [previewKey]: URL.createObjectURL(file) };
      })
    );
  };

  const addSlide = () =>
    setSlides((prev) => [
      ...prev,
      toEditableSlide({ badge: '', name: '', tagline: '', description: '', features: [], weight: '' }),
    ]);

  const removeSlide = (index) => setSlides((prev) => prev.filter((_, i) => i !== index));

  const moveSlide = (index, delta) =>
    setSlides((prev) => {
      const target = index + delta;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  const slideImageSrc = (slide, index) =>
    slide.imagePreview ||
    (slide.image ? resolveImageUrl(slide.image) : FALLBACK_SLIDE_IMAGES[index % FALLBACK_SLIDE_IMAGES.length]);

  const slideBgSrc = (slide, index) =>
    slide.bgPreview ||
    (slide.backgroundImage
      ? resolveImageUrl(slide.backgroundImage)
      : FALLBACK_SLIDE_BGS[index % FALLBACK_SLIDE_BGS.length]);

  // ----- logo / font -----
  const handleLogoFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  };

  const handleFontFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFontFile(file);
    setFontPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  };

  const clearFontFile = () => {
    setFontFile(null);
    setFontPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  };

  const handleCancel = () => {
    setForm(saved);
    setSlides(slidesFromSettings(saved));
    setFontChoice(saved.fontFileUrl ? 'custom' : saved.fontFamily);
    setLogoFile(null);
    setLogoPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    clearFontFile();
    toast('Changes discarded');
  };

  const handleSave = async () => {
    const heroHeading = form.heroHeading.trim();
    const heroSubheading = form.heroSubheading.trim();
    const badges = form.badges.map((badge) => badge.trim()).filter(Boolean);

    if (!heroHeading || !heroSubheading) {
      toast.error('Heading and description cannot be empty');
      return;
    }
    if (slides.some((slide) => !slide.name.trim())) {
      toast.error('Every slide needs a product name');
      return;
    }

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('heroHeading', heroHeading);
      fd.append('heroSubheading', heroSubheading);
      fd.append('badges', JSON.stringify(badges));
      // optional text fields: only send when non-empty (empty = keep showing the built-in default)
      for (const key of ['brandName', 'heroTagline', 'contactPhone', 'contactEmail', 'footerDescription', 'footerCopyright']) {
        if (form[key].trim()) fd.append(key, form[key].trim());
      }
      fd.append('brandColorStart', form.brandColorStart);
      fd.append('brandColorEnd', form.brandColorEnd);

      fd.append(
        'heroSlides',
        JSON.stringify(
          slides.map((slide) => ({
            badge: slide.badge.trim(),
            name: slide.name.trim(),
            tagline: slide.tagline.trim(),
            description: slide.description.trim(),
            features: slide.featuresText
              .split('\n')
              .map((line) => line.trim())
              .filter(Boolean),
            weight: slide.weight.trim(),
            accentColor: slide.accentColor,
            image: slide.image,
            backgroundImage: slide.backgroundImage,
          }))
        )
      );
      slides.forEach((slide, index) => {
        if (slide.imageFile) fd.append(`slideImage_${index}`, slide.imageFile);
        if (slide.bgFile) fd.append(`slideBg_${index}`, slide.bgFile);
      });

      if (fontFile) {
        fd.append('font', fontFile);
      } else if (fontChoice !== 'custom') {
        // sending fontFamily (even '') clears any previously uploaded font
        fd.append('fontFamily', fontChoice);
      }
      if (logoFile) fd.append('logo', logoFile);

      const { data } = await api.put('/settings', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      applyServerSettings(data);
      setLogoFile(null);
      setLogoPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      clearFontFile();
      refresh();
      toast.success('Site settings saved');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  // font applied to the preview: staged upload > kept custom font > preset
  const previewFontCss = fontFile
    ? buildFontCss('', fontPreview, '.site-settings-preview')
    : fontChoice === 'custom'
      ? buildFontCss('', saved.fontFileUrl, '.site-settings-preview')
      : buildFontCss(fontChoice, null, '.site-settings-preview');

  const headingLines = form.heroHeading.split('\n').filter((line) => line.trim());
  const previewLogo = logoPreview || (saved.logoUrl ? resolveImageUrl(saved.logoUrl) : defaultLogo);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-amber-800">Loading settings…</div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-8">
      <style>{previewFontCss}</style>

      <div>
        <h1 className="text-2xl font-bold text-amber-900">Site Settings</h1>
        <p className="text-sm text-amber-700 mt-1">
          Control the homepage hero, product slides, branding and footer. Changes go live after you save.
        </p>
      </div>

      {/* Section 1 — Site Preview / Content */}
      <SectionCard icon={Sparkles} title="Site Preview & Content" subtitle="The headline area of your homepage">
        <div className="grid gap-6 p-6 lg:grid-cols-2">
          <div className="space-y-5">
            <div>
              <label className={labelClass}>Top badge line</label>
              <input
                type="text"
                value={form.heroTagline}
                maxLength={160}
                onChange={(e) => setField('heroTagline', e.target.value)}
                className={inputClass}
                placeholder="Estate Coffee and Heritage Spices"
              />
            </div>

            <div>
              <label className={labelClass}>Hero heading</label>
              <textarea
                rows={2}
                value={form.heroHeading}
                onChange={(e) => setField('heroHeading', e.target.value)}
                className={inputClass}
                placeholder={'Authentic flavour,\ncrafted with care.'}
              />
              <p className="mt-1 text-xs text-amber-600">
                Tip: press Enter to control where the heading breaks — the first line is shown in gold.
              </p>
            </div>

            <div>
              <label className={labelClass}>Description / subheading</label>
              <textarea
                rows={3}
                value={form.heroSubheading}
                onChange={(e) => setField('heroSubheading', e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-amber-900 mb-2">Badge chips</label>
              <div className="space-y-2">
                {form.badges.map((badge, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={badge}
                      maxLength={60}
                      onChange={(e) => setBadge(index, e.target.value)}
                      className={inputClass}
                      placeholder="e.g. Small Batch Crafted"
                    />
                    <button
                      type="button"
                      onClick={() => removeBadge(index)}
                      className="p-2 text-amber-600 hover:text-red-600 transition"
                      aria-label="Remove badge"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              {form.badges.length < MAX_BADGES && (
                <button
                  type="button"
                  onClick={addBadge}
                  className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-amber-700 hover:text-amber-900"
                >
                  <Plus className="w-4 h-4" /> Add badge
                </button>
              )}
            </div>
          </div>

          {/* Live preview */}
          <div className="site-settings-preview rounded-2xl bg-[#1f130d] p-6 self-start">
            <p className="text-xs uppercase tracking-[0.24em] text-amber-200 mb-3">Live preview</p>
            <div className="flex items-center gap-2 mb-3">
              <img src={previewLogo} alt="Logo preview" className="h-9 w-9 object-contain" />
              <span className="font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-[#ffe5b8] to-[#dd9941]">
                {form.brandName.trim() || 'SRI BOGAT'}
              </span>
            </div>
            {form.heroTagline.trim() && (
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-amber-100">
                <Sparkles className="h-3 w-3 text-amber-300" />
                {form.heroTagline}
              </div>
            )}
            <h3 className="text-3xl font-black leading-[1.05] text-white">
              {headingLines.map((line, index) => (
                <span
                  key={index}
                  className={
                    index === 0
                      ? 'block bg-gradient-to-r from-[#ffe5b8] via-[#f8c47a] to-[#f59b52] bg-clip-text text-transparent'
                      : 'block text-white/90'
                  }
                >
                  {line}
                </span>
              ))}
            </h3>
            <p className="mt-4 text-sm leading-6 text-white/80">{form.heroSubheading}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {form.badges
                .filter((badge) => badge.trim())
                .map((badge, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90"
                  >
                    {badge}
                  </span>
                ))}
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Section 2 — Hero Product Slides */}
      <SectionCard
        icon={Layers}
        title="Hero Product Slides"
        subtitle="The rotating product showcase on the right of the hero"
      >
        <div className="p-6 space-y-6">
          {slides.map((slide, index) => (
            <div key={index} className="rounded-xl border border-amber-200 overflow-hidden">
              <div className="flex items-center justify-between bg-amber-50 px-4 py-2">
                <span className="text-sm font-semibold text-amber-900">
                  Slide {index + 1}
                  {slide.name.trim() ? ` — ${slide.name}` : ''}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveSlide(index, -1)}
                    disabled={index === 0}
                    className="p-1.5 text-amber-700 hover:text-amber-900 disabled:opacity-30"
                    aria-label="Move slide up"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveSlide(index, 1)}
                    disabled={index === slides.length - 1}
                    className="p-1.5 text-amber-700 hover:text-amber-900 disabled:opacity-30"
                    aria-label="Move slide down"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeSlide(index)}
                    disabled={slides.length === 1}
                    className="p-1.5 text-amber-600 hover:text-red-600 disabled:opacity-30"
                    aria-label="Delete slide"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid gap-5 p-4 lg:grid-cols-[1fr_320px]">
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className={labelClass}>Product name *</label>
                      <input
                        type="text"
                        value={slide.name}
                        maxLength={180}
                        onChange={(e) => setSlideField(index, 'name', e.target.value)}
                        className={inputClass}
                        placeholder="South Indian Filter Coffee Powder"
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Badge label</label>
                      <input
                        type="text"
                        value={slide.badge}
                        maxLength={60}
                        onChange={(e) => setSlideField(index, 'badge', e.target.value)}
                        className={inputClass}
                        placeholder="Heritage Coffee"
                      />
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
                    <div>
                      <label className={labelClass}>Tagline</label>
                      <input
                        type="text"
                        value={slide.tagline}
                        maxLength={255}
                        onChange={(e) => setSlideField(index, 'tagline', e.target.value)}
                        className={inputClass}
                        placeholder="Estate-grown coffee with a classic 70:30 blend"
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Weight</label>
                      <input
                        type="text"
                        value={slide.weight}
                        maxLength={30}
                        onChange={(e) => setSlideField(index, 'weight', e.target.value)}
                        className={inputClass}
                        placeholder="450gm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Description</label>
                    <textarea
                      rows={2}
                      value={slide.description}
                      onChange={(e) => setSlideField(index, 'description', e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Feature points (one per line)</label>
                    <textarea
                      rows={3}
                      value={slide.featuresText}
                      onChange={(e) => setSlideField(index, 'featuresText', e.target.value)}
                      className={inputClass}
                      placeholder={'Single-origin beans\nShadow-grown and handpicked'}
                    />
                  </div>
                  <div className="flex items-center gap-3 pt-1">
                    <label className="text-sm font-medium text-amber-900">Accent colour</label>
                    <input
                      type="color"
                      value={slide.accentColor || '#f59b52'}
                      onChange={(e) => setSlideField(index, 'accentColor', e.target.value)}
                      className="h-8 w-12 cursor-pointer rounded border border-amber-200 bg-white"
                      aria-label="Slide accent colour"
                    />
                    {slide.accentColor ? (
                      <button
                        type="button"
                        onClick={() => setSlideField(index, 'accentColor', '')}
                        className="text-xs font-medium text-amber-700 underline hover:text-amber-900"
                      >
                        Use default
                      </button>
                    ) : (
                      <span className="text-xs text-amber-600">Default (auto) — used on badge &amp; weight chips</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-3 pt-1">
                    <label className={uploadBtnClass}>
                      <Upload className="w-3.5 h-3.5" />
                      {slide.imageFile ? 'Change product photo' : 'Product photo'}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/svg+xml"
                        className="hidden"
                        onChange={handleSlideFile(index, 'image')}
                      />
                    </label>
                    <label className={uploadBtnClass}>
                      <Upload className="w-3.5 h-3.5" />
                      {slide.bgFile ? 'Change background' : 'Background image'}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/svg+xml"
                        className="hidden"
                        onChange={handleSlideFile(index, 'bg')}
                      />
                    </label>
                  </div>
                </div>

                {/* per-slide live preview, styled like the homepage card */}
                <div className="site-settings-preview">
                  <div
                    className="relative h-72 overflow-hidden rounded-2xl border border-amber-100"
                    style={{
                      backgroundImage: `url(${slideBgSrc(slide, index)})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-black/20" />
                    <img
                      src={slideImageSrc(slide, index)}
                      alt={slide.name || 'Slide product'}
                      className="absolute inset-x-0 top-8 mx-auto h-32 w-32 rounded-xl object-cover shadow-2xl"
                    />
                    {slide.badge.trim() && (
                      <div
                        className="absolute left-3 top-3 rounded-full bg-[#7c360d] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white shadow-lg"
                        style={slide.accentColor ? { backgroundColor: slide.accentColor } : undefined}
                      >
                        {slide.badge}
                      </div>
                    )}
                    {slide.weight.trim() && (
                      <div
                        className="absolute bottom-3 right-3 rounded-full bg-[#f59b52] px-3 py-1 text-xs font-bold text-white shadow-lg"
                        style={slide.accentColor ? { backgroundColor: slide.accentColor } : undefined}
                      >
                        {slide.weight}
                      </div>
                    )}
                    <div className="absolute bottom-3 left-3 max-w-[72%] rounded-xl border border-white/12 bg-black/40 p-3 backdrop-blur-md">
                      <p className="text-[9px] uppercase tracking-[0.24em] text-amber-200">
                        {form.brandName.trim() || 'SRI BOGAT'} Select
                      </p>
                      <p className="mt-1 text-sm font-bold leading-snug text-white">
                        {slide.name || 'Product name'}
                      </p>
                      {slide.tagline.trim() && (
                        <p className="mt-0.5 text-xs text-white/75">{slide.tagline}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {slides.length < MAX_SLIDES && (
            <button
              type="button"
              onClick={addSlide}
              className="inline-flex items-center gap-1 text-sm font-medium text-amber-700 hover:text-amber-900"
            >
              <Plus className="w-4 h-4" /> Add slide
            </button>
          )}
        </div>
      </SectionCard>

      {/* Section 3 — Branding: Logo & Font */}
      <SectionCard icon={ImageIcon} title="Branding — Logo & Font" subtitle="Identity applied across the whole site">
        <div className="grid gap-6 p-6 lg:grid-cols-2">
          <div className="lg:col-span-2">
            <label className={labelClass}>Brand name (text shown beside the logo)</label>
            <div className="flex flex-wrap items-center gap-4">
              <input
                type="text"
                value={form.brandName}
                maxLength={120}
                onChange={(e) => setField('brandName', e.target.value)}
                className={`${inputClass} max-w-sm`}
                placeholder="SRI BOGAT"
              />
              {/* wordmark preview, styled like the navbar */}
              <div className="site-settings-preview flex items-center gap-2 rounded-lg border border-amber-100 bg-white px-4 py-2 shadow-sm">
                <img src={previewLogo} alt="Logo" className="h-8 w-8 object-contain" />
                <span
                  className="text-lg font-bold tracking-wider text-transparent bg-clip-text"
                  style={{
                    backgroundImage: `linear-gradient(to right, ${form.brandColorStart}, ${form.brandColorEnd})`,
                  }}
                >
                  {form.brandName.trim() || 'SRI BOGAT'}
                </span>
              </div>
            </div>
            <p className="mt-1 text-xs text-amber-600">
              Used in the header, the hero heading and the “{form.brandName.trim() || 'SRI BOGAT'} Select” labels.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <label className="text-sm font-medium text-amber-900">Wordmark colours</label>
              <input
                type="color"
                value={form.brandColorStart}
                onChange={(e) => setField('brandColorStart', e.target.value)}
                className="h-8 w-12 cursor-pointer rounded border border-amber-200 bg-white"
                aria-label="Wordmark start colour"
              />
              <span className="text-xs text-amber-600">to</span>
              <input
                type="color"
                value={form.brandColorEnd}
                onChange={(e) => setField('brandColorEnd', e.target.value)}
                className="h-8 w-12 cursor-pointer rounded border border-amber-200 bg-white"
                aria-label="Wordmark end colour"
              />
              {(form.brandColorStart !== DEFAULT_SETTINGS.brandColorStart ||
                form.brandColorEnd !== DEFAULT_SETTINGS.brandColorEnd) && (
                <button
                  type="button"
                  onClick={() => {
                    setField('brandColorStart', DEFAULT_SETTINGS.brandColorStart);
                    setField('brandColorEnd', DEFAULT_SETTINGS.brandColorEnd);
                  }}
                  className="text-xs font-medium text-amber-700 underline hover:text-amber-900"
                >
                  Reset to default
                </button>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-amber-900 mb-2">Site logo</label>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="h-24 w-24 rounded-xl border border-amber-200 bg-amber-50 flex items-center justify-center overflow-hidden">
                  <img
                    src={saved.logoUrl ? resolveImageUrl(saved.logoUrl) : defaultLogo}
                    alt="Current logo"
                    className="h-20 w-20 object-contain"
                  />
                </div>
                <p className="mt-1 text-xs text-amber-600">Current</p>
              </div>
              {logoPreview && (
                <div className="text-center">
                  <div className="h-24 w-24 rounded-xl border-2 border-amber-400 bg-amber-50 flex items-center justify-center overflow-hidden">
                    <img src={logoPreview} alt="New logo preview" className="h-20 w-20 object-contain" />
                  </div>
                  <p className="mt-1 text-xs font-medium text-amber-700">New (unsaved)</p>
                </div>
              )}
            </div>
            <label className="mt-4 inline-flex items-center gap-2 cursor-pointer rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100 transition">
              <Upload className="w-4 h-4" />
              {logoFile ? 'Choose a different image' : 'Upload new logo'}
              <input
                type="file"
                accept="image/png,image/jpeg,image/svg+xml"
                className="hidden"
                onChange={handleLogoFile}
              />
            </label>
            <p className="mt-1 text-xs text-amber-600">PNG, JPG or SVG, up to 10 MB.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-amber-900 mb-2">Site font</label>
            {fontFile ? (
              <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-800">
                <Type className="w-4 h-4" />
                <span className="truncate">Custom font: {fontFile.name}</span>
                <button
                  type="button"
                  onClick={clearFontFile}
                  className="ml-auto text-amber-600 hover:text-red-600"
                  aria-label="Remove custom font"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <select
                value={fontChoice}
                onChange={(e) => setFontChoice(e.target.value)}
                className={inputClass}
              >
                <option value="">Site default</option>
                {saved.fontFileUrl && <option value="custom">Custom uploaded font (current)</option>}
                {FONT_PRESETS.map((preset) => (
                  <option key={preset.value} value={preset.value}>
                    {preset.label}
                  </option>
                ))}
              </select>
            )}
            <label className="mt-4 inline-flex items-center gap-2 cursor-pointer rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100 transition">
              <Upload className="w-4 h-4" />
              Upload font file
              <input
                type="file"
                accept=".ttf,.woff,.woff2"
                className="hidden"
                onChange={handleFontFile}
              />
            </label>
            <p className="mt-1 text-xs text-amber-600">
              .ttf, .woff or .woff2 — the previews update immediately.
            </p>
          </div>
        </div>
      </SectionCard>

      {/* Section 4 — Contact & Footer */}
      <SectionCard icon={Phone} title="Contact & Footer" subtitle="Details shown in the site footer">
        <div className="grid gap-5 p-6 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Phone number</label>
            <input
              type="text"
              value={form.contactPhone}
              maxLength={30}
              onChange={(e) => setField('contactPhone', e.target.value)}
              className={inputClass}
              placeholder="+91 7795451890"
            />
          </div>
          <div>
            <label className={labelClass}>Support email</label>
            <input
              type="email"
              value={form.contactEmail}
              maxLength={255}
              onChange={(e) => setField('contactEmail', e.target.value)}
              className={inputClass}
              placeholder="support@sribogat.com"
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Footer description</label>
            <textarea
              rows={2}
              value={form.footerDescription}
              onChange={(e) => setField('footerDescription', e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Copyright line</label>
            <input
              type="text"
              value={form.footerCopyright}
              maxLength={255}
              onChange={(e) => setField('footerCopyright', e.target.value)}
              className={inputClass}
              placeholder="© 2024 BOGAT. Crafted with tradition for authentic flavors."
            />
          </div>
        </div>
      </SectionCard>

      <div className="flex items-center justify-end gap-3 pb-8">
        <button
          type="button"
          onClick={handleCancel}
          disabled={saving}
          className="rounded-lg border border-amber-300 px-6 py-2.5 text-sm font-medium text-amber-800 hover:bg-amber-50 transition disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg hover:from-amber-700 hover:to-orange-700 transition disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </div>
  );
};

export default SiteSettings;
