export type User = {
  id: string;
  username: string;
  full_name: string;
  email: string | null;
  is_admin: boolean;
  must_change_pw: boolean;
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
};

export type Dashboard = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  upstream_url: string;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
  category: string | null;
  category_order: number | null;
  open_in_new_tab: boolean;
};
