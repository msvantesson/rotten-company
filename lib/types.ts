// Shared TypeScript types for database entities and common structures

export interface Category {
  id: number;
  name: string;
  slug?: string;
  description?: string;
  base_weight?: number;
}

export interface Company {
  id: number;
  name: string;
  slug: string;
  description?: string;
  industry?: string;
  country?: string;
}

export interface Leader {
  id: number;
  name: string;
  slug?: string;
  role?: string;
}

export interface Manager {
  id: number;
  name: string;
  slug?: string;
  role?: string;
}

export interface Owner {
  id: number;
  name: string;
  slug?: string;
  type?: string;
}

export interface Evidence {
  id: number;
  title: string;
  description?: string;
  file_url?: string;
  file_type?: string;
  file_weight?: number;
  status?: string;
  manager_id?: number;
}

// Cookie options type for Supabase client
export interface CookieOptions {
  path?: string;
  maxAge?: number;
  domain?: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: 'lax' | 'strict' | 'none';
}
