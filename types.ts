export enum TabType {
  MENU = 'Planowanie Menu',
  ABONAMENT = 'Abonamenty',
  TABLICA = 'Tablica Menu',
  DANIA = 'Baza Dań'
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  portion: string; // e.g. "2szt", "100g"
  isVeg: boolean;
  isDaily: boolean; // Served every day in general menu
  isSubDaily: boolean; // Served every day in subscription menu
  isPopular?: boolean;
}

export interface SubscriptionPlan {
  id: string;
  title: string;
  price: number;
  benefits: string[];
  period: string;
  color: string;
  isActive: boolean;
}

export interface BoardConfig {
  date: string;
  mainDishId: string;
  promoText: string;
  activePromoIds: string[];
}

export interface BoardNotice {
  id: string;
  title: string;
  content: string;
  date: string;
  type: 'event' | 'promo' | 'news';
}

export interface DishGalleryItem {
  id: string;
  title: string;
  image: string;
  description: string;
}

export type MenuCategory = 'Zupy' | 'Dodatki' | 'Dania' | 'Pierogi' | 'Sałatki';
export type SubCategory = 'Zupy' | 'Dania' | 'Dodatki';

export interface DailyMenu {
  [key: string]: string[]; // category -> array of dish IDs
}

export interface FullPlannerState {
  [date: string]: DailyMenu;
}
