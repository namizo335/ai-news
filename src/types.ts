export type Lang = "ja" | "en";

export type SourceType = "rss" | "hackernews";

export interface SourceConfig {
  id: string;
  name: string;
  type: SourceType;
  url?: string;
  lang: Lang;
  official: boolean;
  queryTerms?: string[];
}

export interface LimitsConfig {
  digestJapanese: number;
  digestEnglish: number;
  maxAgeHoursDigest: number;
  maxAgeHoursAlert: number;
  sentRetention: number;
  hnFetchCount: number;
}

export interface SourcesFile {
  japanese: SourceConfig[];
  english: SourceConfig[];
  limits: LimitsConfig;
}

export interface KeywordsFile {
  immediate: string[];
}

export interface Article {
  id: string;
  title: string;
  url: string;
  sourceId: string;
  sourceName: string;
  lang: Lang;
  official: boolean;
  publishedAt: Date;
  score?: number;
}

export interface PresentedArticle extends Article {
  reasons: string[];
  /** Machine-translated Japanese title for English articles (optional). */
  titleJa?: string;
}

export type Mode = "digest" | "alert";

export interface CliOptions {
  mode: Mode;
  dryRun: boolean;
  statePath: string;
}
