export interface KdpCategoryRecommendation {
  category: string;
  rationale: string;
}

export interface KdpSocialPack {
  twitterThread: string[];
  linkedinPost: string;
  newsletterTeaser: string;
}

export interface KdpPricingStrategy {
  suggestedPriceUsd: string;
  kdpRoyaltyTier: "70%" | "35%";
  strategy: string;
}

export interface KdpLaunchKit {
  headline: string;
  htmlDescription: string;
  plainDescription: string;
  searchKeywords: string[]; // 7 high-impact Amazon backend search terms
  recommendedCategories: KdpCategoryRecommendation[];
  targetAudienceHook: string;
  socialPosts: KdpSocialPack;
  pricingRecommendation: KdpPricingStrategy;
  generatedAt: string;
}
