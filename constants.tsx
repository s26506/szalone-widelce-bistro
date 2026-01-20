
import { MenuItem, SubscriptionPlan, BoardNotice, DishGalleryItem } from './types';

export const COLORS = {
  primary: '#C32026', // Red
  secondary: '#4A2C2A', // Brown
  accent: '#F28D91', // Pink
  bg: '#F2E7D5', // Cream
  white: '#FFFFFF',
};

import menuData from './data/menu.json';

export const MENU_ITEMS: MenuItem[] = menuData as MenuItem[];

export const SUBSCRIPTIONS: SubscriptionPlan[] = [
  {
    id: 'sub1',
    title: 'Lunch Standard',
    price: 450,
    period: 'miesiąc',
    color: '#F28D91',
    isActive: true,
    benefits: ['Zupa + Danie Główne codziennie (Pn-Pt)', 'Kawa lub herbata gratis', '10% rabatu na desery']
  },
  {
    id: 'sub2',
    title: 'Gourmet Premium',
    price: 890,
    period: 'miesiąc',
    color: '#C32026',
    isActive: true,
    benefits: ['Dowolne 3 dania z karty codziennie', 'Rezerwacja stolika VIP', 'Darmowa dostawa do 5km', 'Degustacja win raz w miesiącu']
  }
];

export const BOARD_NOTICES: BoardNotice[] = [
  {
    id: 'b1',
    title: 'Tydzień Kuchni Włoskiej',
    content: 'Już od poniedziałku zapraszamy na specjalne menu inspirowane słoneczną Italią.',
    date: '20.05.2024',
    type: 'event'
  }
];

export const GALLERY_ITEMS: DishGalleryItem[] = [
  { id: 'g1', title: 'Stek z Antrykotu', image: '', description: 'Soczysty stek.' }
];

// Wskazujemy na plik, który musi znajdować się w folderze 'public' lub w głównym katalogu projektu
// Upewnij się, że wgrałeś tam plik o nazwie 'banner.png'
// Wskazujemy na plik, który musi znajdować się w folderze 'public' lub w głównym katalogu projektu
// Upewnij się, że wgrałeś tam plik o nazwie 'banner.png'
export { BANNER_IMAGE_SRC } from './constants_banner';
export const SUBSCRIPTION_FOOTER_SRC = '/subscription_footer_placeholder.svg';
