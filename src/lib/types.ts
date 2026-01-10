export type ContentType = 'MOVIE' | 'SERIES' | 'MANGA';

export interface Episode {
  id: string;
  title: string;
  number: number;
  video_url: string;
  duration_min?: number;
  source_type: 'UPLOAD' | 'URL';
}

export interface MediaContent {
  id: string;
  title: string;
  type: ContentType;
  description: string;
  poster_url: string;
  release_year: number;
  published: boolean;
  genres: string[];
  // Pour les films
  video_url?: string; 
  duration_min?: number;
  source_type?: 'UPLOAD' | 'URL';
  // Pour les séries / Mangas
  episodes?: Episode[];
  total_seasons?: number;
}