import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Award,
  Leaf,
  ShieldCheck,
  Coffee,
} from "lucide-react";

import { useSiteSettings } from "../../contexts/SiteSettingsContext";
import { resolveImageUrl } from "../../config/config";
import sample1 from "../../assets/sample1.jpeg";
import sample2 from "../../assets/sample2.jpeg";
import sample3 from "../../assets/sample3.jpeg";
import hero1 from "../../assets/hero1.jpg";
import hero2 from "../../assets/hero2.jpg";
import hero3 from "../../assets/hero3.jpg";

const heroProducts = [
  {
    id: 1,
    name: "South Indian Filter Coffee Powder",
    tagline: "Estate-grown coffee with a classic 70:30 blend",
    description:
      "Slow-roasted in small batches for a deep, balanced decoction with the richness of traditional South Indian coffee.",
    features: [
      "Single-origin Chikkamagaluru beans",
      "Shadow-grown and handpicked",
      "Small-batch roast for consistent aroma",
    ],
    badge: "Heritage Coffee",
    weight: "450gm",
    image: sample1,
    backgroundImage: hero3,
    accent: "from-amber-500 via-orange-500 to-yellow-500",
  },
  {
    id: 2,
    name: "Black Pepper Powder",
    tagline: "Bold aroma and clean heat from premium peppercorns",
    description:
      "Naturally sun-dried and finely ground to preserve piperine strength, warm flavor, and kitchen versatility.",
    features: [
      "Premium Indian pepper source",
      "No additives or preservatives",
      "Strong aroma with wellness value",
    ],
    badge: "Kitchen Essential",
    weight: "200gm",
    image: sample2,
    backgroundImage: hero2,
    accent: "from-stone-500 via-orange-500 to-amber-500",
  },
  {
    id: 3,
    name: "Whole Cardamom",
    tagline: "Sweet, aromatic elaichi chosen for premium flavor",
    description:
      "Hand-selected bold pods that lift tea, sweets, biryani, and curries with a floral warmth that feels unmistakably Indian.",
    features: [
      "Premium whole pods",
      "Naturally fragrant and fresh",
      "Sourced from trusted growers",
    ],
    badge: "Royal Spice",
    weight: "100gm",
    image: sample3,
    backgroundImage: hero1,
    accent: "from-lime-500 via-emerald-500 to-amber-500",
  },
];

const badgeIcons = [Coffee, Leaf, ShieldCheck];

const slideAccents = [
  "from-amber-500 via-orange-500 to-yellow-500",
  "from-stone-500 via-orange-500 to-amber-500",
  "from-lime-500 via-emerald-500 to-amber-500",
];

// mixes a hex colour toward white for the light end of an accent gradient
export const lightenHex = (hex, amount = 0.35) => {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c) => Math.round(c + (255 - c) * amount);
  return `rgb(${mix((n >> 16) & 255)}, ${mix((n >> 8) & 255)}, ${mix(n & 255)})`;
};

export const accentGradient = (color) =>
  `linear-gradient(90deg, ${color}, ${lightenHex(color)})`;

const HomeHero = () => {
  const { settings } = useSiteSettings();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const navigate = useNavigate();

  // admin-saved slides override the bundled defaults; missing images fall back to bundled assets
  const slides = settings.heroSlides?.length
    ? settings.heroSlides.map((slide, index) => ({
        id: index + 1,
        name: slide.name,
        tagline: slide.tagline,
        description: slide.description,
        features: slide.features ?? [],
        badge: slide.badge,
        weight: slide.weight,
        accentColor: slide.accentColor ?? "",
        image: slide.image
          ? resolveImageUrl(slide.image)
          : heroProducts[index % heroProducts.length].image,
        backgroundImage: slide.backgroundImage
          ? resolveImageUrl(slide.backgroundImage)
          : heroProducts[index % heroProducts.length].backgroundImage,
        accent: slideAccents[index % slideAccents.length],
      }))
    : heroProducts;

  useEffect(() => {
    if (currentSlide >= slides.length) setCurrentSlide(0);
  }, [slides.length, currentSlide]);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentSlide((prev) => (prev + 1) % slides.length);
        setTimeout(() => setIsTransitioning(false), 100);
      }, 260);
    }, 6500);

    return () => clearInterval(interval);
  }, [slides.length]);

  const handleSlideChange = (index) => {
    if (index === currentSlide || isTransitioning) return;

    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentSlide(index);
      setTimeout(() => setIsTransitioning(false), 100);
    }, 260);
  };

  const currentProduct = slides[currentSlide] ?? slides[0];
  const headingLines = settings.heroHeading.split("\n").filter((line) => line.trim());

  return (
    <section className="relative overflow-hidden bg-[#1f130d]">
      <div className="absolute inset-0">
        {slides.map((product, index) => (
          <div
            key={product.id}
            className={`absolute inset-0 transition-all duration-700 ${
              index === currentSlide ? "opacity-100 scale-100" : "opacity-0 scale-105"
            }`}
            style={{
              backgroundImage: `url(${product.backgroundImage})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
        ))}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(245,155,82,0.22),transparent_30%),linear-gradient(110deg,rgba(25,14,9,0.96)_8%,rgba(41,22,14,0.9)_42%,rgba(61,31,16,0.58)_68%,rgba(24,12,8,0.78)_100%)]" />
      </div>

      <div className="absolute inset-0 opacity-30">
        <div className="absolute left-[-6rem] top-20 h-56 w-56 rounded-full bg-orange-300/30 blur-3xl" />
        <div className="absolute right-[-4rem] top-32 h-64 w-64 rounded-full bg-amber-200/20 blur-3xl" />
        <div className="absolute bottom-[-5rem] left-1/3 h-56 w-56 rounded-full bg-yellow-200/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-10 sm:px-6 md:pb-20 md:pt-14 lg:px-8 lg:pb-24 lg:pt-16">
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-amber-100 shadow-lg shadow-black/10 backdrop-blur-md">
              <Sparkles className="h-4 w-4 text-amber-300" />
              {settings.heroTagline}
            </div>

            <h1 className="mt-6 max-w-3xl text-4xl font-black leading-[0.95] text-white sm:text-5xl lg:text-7xl">
              {settings.brandName}
              {headingLines.map((line, index) => (
                <span
                  key={index}
                  className={
                    index === 0
                      ? "mt-3 block bg-gradient-to-r from-[#ffe5b8] via-[#f8c47a] to-[#f59b52] bg-clip-text text-transparent"
                      : "mt-2 block text-white/92"
                  }
                >
                  {line}
                </span>
              ))}
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-white/80 sm:text-lg">
              {settings.heroSubheading}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              {settings.badges.map((label, index) => {
                const Icon = badgeIcons[index % badgeIcons.length];
                return (
                  <div
                    key={label}
                    className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/10 px-4 py-2 text-sm font-medium text-white/90 backdrop-blur-md"
                  >
                    <Icon className="h-4 w-4 text-amber-300" />
                    {label}
                  </div>
                );
              })}
            </div>

            <div className="mt-10 rounded-[28px] border border-white/12 bg-white/8 p-6 shadow-2xl shadow-black/20 backdrop-blur-xl">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-[#7b3b0e]">
                  Featured Today
                </span>
                <span
                  className={`rounded-full bg-gradient-to-r px-3 py-1 text-xs font-bold text-white shadow-lg ${
                    currentProduct.accentColor ? "" : currentProduct.accent
                  }`}
                  style={
                    currentProduct.accentColor
                      ? { background: accentGradient(currentProduct.accentColor) }
                      : undefined
                  }
                >
                  {currentProduct.badge}
                </span>
              </div>

              <div className="mt-5 grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
                <div>
                  <h2 className="text-2xl font-bold text-white sm:text-3xl">{currentProduct.name}</h2>
                  <p className="mt-2 text-base font-medium text-amber-100/90">
                    {currentProduct.tagline}
                  </p>
                  <p className="mt-4 max-w-xl text-sm leading-7 text-white/78 sm:text-base">
                    {currentProduct.description}
                  </p>

                  <ul className="mt-5 space-y-2 text-sm text-white/85">
                    {currentProduct.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <span className="mt-2 h-2 w-2 rounded-full bg-amber-300" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex flex-wrap gap-3 md:flex-col md:items-end">
                  <button
                    onClick={() => navigate("/products")}
                    className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#f59b52] to-[#e36d14] px-6 py-3 text-sm font-bold text-white shadow-xl shadow-orange-900/25 transition hover:scale-[1.02]"
                  >
                    Shop Collection
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => navigate("/blogs")}
                    className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/8 px-5 py-3 text-sm font-semibold text-white/90 backdrop-blur-md transition hover:border-amber-300/50 hover:bg-white/12"
                  >
                    Read the Story
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 translate-x-4 translate-y-6 rounded-[36px] bg-gradient-to-br from-[#f59b52]/30 to-transparent blur-3xl" />
            <div className="relative overflow-hidden rounded-[32px] border border-white/12 bg-white/8 p-4 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-5">
              <div className="relative overflow-hidden rounded-[26px]">
                <img
                  src={currentProduct.image}
                  alt={currentProduct.name}
                  className={`h-[440px] w-full object-cover object-center transition-all duration-700 sm:h-[540px] ${
                    isTransitioning ? "scale-110 opacity-0" : "scale-100 opacity-100"
                  }`}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#25140d]/65 via-transparent to-transparent" />

                <div
                  className="absolute left-4 top-4 rounded-full bg-[#7c360d] px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-white shadow-lg"
                  style={
                    currentProduct.accentColor
                      ? { backgroundColor: currentProduct.accentColor }
                      : undefined
                  }
                >
                  {currentProduct.badge}
                </div>
                <div
                  className="absolute bottom-4 right-4 rounded-full bg-[#f59b52] px-4 py-2 text-sm font-bold text-white shadow-lg"
                  style={
                    currentProduct.accentColor
                      ? { backgroundColor: currentProduct.accentColor }
                      : undefined
                  }
                >
                  {currentProduct.weight}
                </div>

                <div className="absolute bottom-4 left-4 max-w-[75%] rounded-2xl border border-white/12 bg-black/30 p-4 backdrop-blur-md">
                  <p className="text-xs uppercase tracking-[0.24em] text-amber-200">{settings.brandName} Select</p>
                  <h3 className="mt-2 text-xl font-bold text-white">{currentProduct.name}</h3>
                  <p className="mt-1 text-sm text-white/75">{currentProduct.tagline}</p>
                </div>

                <button
                  onClick={() =>
                    handleSlideChange(currentSlide === 0 ? slides.length - 1 : currentSlide - 1)
                  }
                  className="absolute left-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-white/80 text-[#7b3b0e] shadow-lg transition hover:scale-105 hover:bg-white"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={() => handleSlideChange((currentSlide + 1) % slides.length)}
                  className="absolute right-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-white/80 text-[#7b3b0e] shadow-lg transition hover:scale-105 hover:bg-white"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-3">
                {slides.map((product, index) => (
                  <button
                    key={product.id}
                    onClick={() => handleSlideChange(index)}
                    className={`overflow-hidden rounded-2xl border transition ${
                      index === currentSlide
                        ? "border-amber-300 bg-white/18 shadow-lg"
                        : "border-white/10 bg-white/6 opacity-80 hover:opacity-100"
                    }`}
                  >
                    <div className="flex items-center gap-3 p-2 text-left">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="h-14 w-14 rounded-xl object-cover"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold uppercase tracking-[0.18em] text-amber-200">
                          {product.weight}
                        </p>
                        <p className="line-clamp-2 text-sm font-semibold text-white">{product.name}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-6 border-t border-white/10 pt-6 text-white/72">
          <div className="flex items-center gap-3 text-sm">
            <Award className="h-4 w-4 text-amber-300" />
            Premium pantry essentials designed for repeat purchase, not just shelf appeal.
          </div>
          <div className="flex items-center gap-3">
            {slides.map((product, index) => (
              <button
                key={product.id}
                onClick={() => handleSlideChange(index)}
                className={`h-3 w-3 rounded-full transition ${
                  index === currentSlide ? "bg-amber-300" : "bg-white/35 hover:bg-white/60"
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HomeHero;
