export interface CityLocation {
  nameAr: string;
  nameEn: string;
  latitude: number;
  longitude: number;
}

export interface CountryData {
  countryCode: string;
  nameAr: string;
  nameEn: string;
  defaultMethod: string;
  cities: CityLocation[];
}

export const COUNTRIES_DATA: CountryData[] = [
  {
    countryCode: 'EG',
    nameAr: 'مصر',
    nameEn: 'Egypt',
    defaultMethod: 'Egyptian',
    cities: [
      { nameAr: 'القاهرة', nameEn: 'Cairo', latitude: 30.0444, longitude: 31.2357 },
      { nameAr: 'الإسكندرية', nameEn: 'Alexandria', latitude: 31.2001, longitude: 29.9187 },
      { nameAr: 'الجيزة', nameEn: 'Giza', latitude: 30.0131, longitude: 31.2089 },
      { nameAr: 'المنصورة', nameEn: 'Mansoura', latitude: 31.0409, longitude: 31.3785 },
      { nameAr: 'طنطا', nameEn: 'Tanta', latitude: 30.7865, longitude: 31.0004 },
      { nameAr: 'أسيوط', nameEn: 'Assiut', latitude: 27.1783, longitude: 31.1859 },
      { nameAr: 'سوهاج', nameEn: 'Sohag', latitude: 26.5569, longitude: 31.6948 },
      { nameAr: 'الأقصر', nameEn: 'Luxor', latitude: 25.6872, longitude: 32.6396 },
      { nameAr: 'أسوان', nameEn: 'Aswan', latitude: 24.0889, longitude: 32.8998 },
      { nameAr: 'الإسماعيلية', nameEn: 'Ismailia', latitude: 30.5965, longitude: 32.2715 },
      { nameAr: 'بورسعيد', nameEn: 'Port Said', latitude: 31.2653, longitude: 32.3019 },
      { nameAr: 'السويس', nameEn: 'Suez', latitude: 29.9668, longitude: 32.5498 }
    ]
  },
  {
    countryCode: 'SA',
    nameAr: 'المملكة العربية السعودية',
    nameEn: 'Saudi Arabia',
    defaultMethod: 'UmmAlQura',
    cities: [
      { nameAr: 'مكة المكرمة', nameEn: 'Makkah', latitude: 21.3891, longitude: 39.8579 },
      { nameAr: 'المدينة المنورة', nameEn: 'Madinah', latitude: 24.5247, longitude: 39.5692 },
      { nameAr: 'الرياض', nameEn: 'Riyadh', latitude: 24.7136, longitude: 46.6753 },
      { nameAr: 'جدة', nameEn: 'Jeddah', latitude: 21.5433, longitude: 39.1728 },
      { nameAr: 'الدمام', nameEn: 'Dammam', latitude: 26.4207, longitude: 50.0888 },
      { nameAr: 'الخبر', nameEn: 'Khobar', latitude: 26.2172, longitude: 50.1971 },
      { nameAr: 'أبها', nameEn: 'Abha', latitude: 18.2164, longitude: 42.5053 },
      { nameAr: 'تبوك', nameEn: 'Tabuk', latitude: 28.3835, longitude: 36.5662 }
    ]
  },
  {
    countryCode: 'AE',
    nameAr: 'الإمارات العربية المتحدة',
    nameEn: 'United Arab Emirates',
    defaultMethod: 'Dubai',
    cities: [
      { nameAr: 'دبي', nameEn: 'Dubai', latitude: 25.2048, longitude: 55.2708 },
      { nameAr: 'أبو ظبي', nameEn: 'Abu Dhabi', latitude: 24.4539, longitude: 54.3773 },
      { nameAr: 'الشارقة', nameEn: 'Sharjah', latitude: 25.3463, longitude: 55.4209 },
      { nameAr: 'عجمان', nameEn: 'Ajman', latitude: 25.4052, longitude: 55.5136 },
      { nameAr: 'العين', nameEn: 'Al Ain', latitude: 24.2075, longitude: 55.7447 }
    ]
  },
  {
    countryCode: 'KW',
    nameAr: 'الكويت',
    nameEn: 'Kuwait',
    defaultMethod: 'Kuwait',
    cities: [
      { nameAr: 'مدينة الكويت', nameEn: 'Kuwait City', latitude: 29.3759, longitude: 47.9774 },
      { nameAr: 'حولي', nameEn: 'Hawalli', latitude: 29.3328, longitude: 48.0286 },
      { nameAr: 'الأحمدي', nameEn: 'Al Ahmadi', latitude: 29.0769, longitude: 48.0839 }
    ]
  },
  {
    countryCode: 'QA',
    nameAr: 'قطر',
    nameEn: 'Qatar',
    defaultMethod: 'Qatar',
    cities: [
      { nameAr: 'الدوحة', nameEn: 'Doha', latitude: 25.2854, longitude: 51.5310 },
      { nameAr: 'الريان', nameEn: 'Al Rayyan', latitude: 25.2919, longitude: 51.4244 }
    ]
  },
  {
    countryCode: 'JO',
    nameAr: 'الأردن',
    nameEn: 'Jordan',
    defaultMethod: 'MuslimWorldLeague',
    cities: [
      { nameAr: 'عمان', nameEn: 'Amman', latitude: 31.9454, longitude: 35.9284 },
      { nameAr: 'الزرقاء', nameEn: 'Zarqa', latitude: 32.0728, longitude: 36.0880 },
      { nameAr: 'إربد', nameEn: 'Irbid', latitude: 32.5568, longitude: 35.8469 }
    ]
  },
  {
    countryCode: 'PS',
    nameAr: 'فلسطين',
    nameEn: 'Palestine',
    defaultMethod: 'Egyptian',
    cities: [
      { nameAr: 'القدس الشريف', nameEn: 'Jerusalem', latitude: 31.7683, longitude: 35.2137 },
      { nameAr: 'غزة', nameEn: 'Gaza', latitude: 31.5017, longitude: 34.4668 },
      { nameAr: 'رام الله', nameEn: 'Ramallah', latitude: 31.9038, longitude: 35.2034 }
    ]
  },
  {
    countryCode: 'MA',
    nameAr: 'المغرب',
    nameEn: 'Morocco',
    defaultMethod: 'MuslimWorldLeague',
    cities: [
      { nameAr: 'الرباط', nameEn: 'Rabat', latitude: 34.0209, longitude: -6.8416 },
      { nameAr: 'الدار البيضاء', nameEn: 'Casablanca', latitude: 33.5731, longitude: -7.5898 },
      { nameAr: 'مراكش', nameEn: 'Marrakech', latitude: 31.6295, longitude: -7.9811 }
    ]
  },
  {
    countryCode: 'DZ',
    nameAr: 'الجزائر',
    nameEn: 'Algeria',
    defaultMethod: 'MuslimWorldLeague',
    cities: [
      { nameAr: 'الجزائر العاصمة', nameEn: 'Algiers', latitude: 36.7538, longitude: 3.0588 },
      { nameAr: 'وهران', nameEn: 'Oran', latitude: 35.6987, longitude: -0.6349 }
    ]
  }
];

export const CALCULATION_METHODS = [
  { id: 'Egyptian', nameAr: 'الهيئة المصرية العامة للمساحة' },
  { id: 'UmmAlQura', nameAr: 'جامعة أم القرى (مكة المكرمة)' },
  { id: 'Dubai', nameAr: 'دبي - الإمارات' },
  { id: 'Kuwait', nameAr: 'الكويت' },
  { id: 'Qatar', nameAr: 'قطر' },
  { id: 'MuslimWorldLeague', nameAr: 'رابطة العالم الإسلامي' },
  { id: 'Karachi', nameAr: 'جامعة العلوم الإسلامية، كراتشي' },
  { id: 'NorthAmerica', nameAr: 'الجمعية الإسلامية لأمريكا الشمالية (ISNA)' }
];
