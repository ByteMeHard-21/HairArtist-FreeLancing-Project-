export type PortfolioAudience = "men" | "women";
export type PortfolioItem = {
  id: string;
  title: string;
  audience: PortfolioAudience;
  image: string | null;
  alt: string;
  position: string;
  published: boolean;
  note?: string;
  fit?: "contain";
  beforeImage?: string;
  afterImage?: string;
  afterAlt?: string;
};

export const portfolioItems: PortfolioItem[] = [
  { id: "01", title: "Precision cut", audience: "men", image: "/images/precision-cut-v2.png", alt: "Back and side view of a precision haircut with a blended fade and textured top", position: "50% 40%", published: true },
  { id: "02", title: "Fade + beard", audience: "men", image: "/images/fade-beard.png", alt: "Side view of a close fade blending into a full, carefully shaped beard", position: "50% 42%", published: true },
  { id: "03", title: "Italian beard", audience: "men", image: "/images/italian-beard.png", alt: "Profile of a sculpted beard with a defined cheek line and shaped moustache", position: "50% 38%", published: true },
  { id: "04", title: "Hair styling", audience: "men", image: "/images/men-hair-styling.png", alt: "Profile of textured curly hair styling; supplied image includes an AI-generated content marking", position: "50% 50%", fit: "contain", published: true, note: "User confirmed this is David's work and approved display with the original AI-generated content marking intact." },
  { id: "05", title: "Hair colour", audience: "men", image: "/images/hair-colour-v2.png", alt: "Side view of textured hair with subtle lighter tones through the top", position: "50% 35%", published: true },
  { id: "06", title: "Groom styling", audience: "men", image: "/images/groom-styling.png", alt: "Finished groom look with styled hair and a groomed beard, wearing a pink occasion jacket", position: "50% 35%", published: true },
  { id: "01", title: "Women's haircut", audience: "women", image: "/images/women-haircut.png", alt: "Back view of a finished women's haircut with long, shaped lengths and softly curled ends", position: "50% 50%", published: true },
  { id: "02", title: "Women's hair colour", audience: "women", image: "/images/women-hair-colour.png", alt: "Back view of glossy reddish-brown hair colour with a soft wave through the lengths", position: "50% 65%", published: true },
  { id: "03", title: "Women's hair styling", audience: "women", image: "/images/women-hair-styling.png", alt: "Long hair styled in defined, flowing waves, shown from behind", position: "50% 50%", published: true },
  { id: "04", title: "Hair transformation", audience: "women", image: "/images/women-transformation-before.png", beforeImage: "/images/women-transformation-before.png", afterImage: "/images/women-transformation-after.png", alt: "Before: long hair with loose, unstyled lengths, viewed from behind", afterAlt: "After: the same hair finished with smooth lengths and defined curled ends", position: "50% 70%", published: true },
  { id: "05", title: "Hair treatment", audience: "women", image: "/images/women-hair-treatment.png", alt: "Hair treatment being worked through wet hair at a salon wash basin", position: "50% 50%", published: true },
];

export const publishedPortfolio = portfolioItems.filter((item): item is PortfolioItem & { image: string } => item.published && item.image !== null);

// A balanced six-project edit for All; each audience filter shows its complete collection.
const featuredKeys = ["men-01", "women-01", "men-02", "women-02", "men-04", "women-04"];
export const featuredPortfolio = featuredKeys.flatMap(key => {
  const item = publishedPortfolio.find(item => item.audience + "-" + item.id === key);
  return item ? [item] : [];
});