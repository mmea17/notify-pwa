import { Coordinates, CalculationMethod, PrayerTimes, Madhab } from 'adhan';

export interface PrayerInfo {
  key: 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
  nameAr: string;
  time: string; // ISO string
  timeFormatted: string; // e.g. "04:45 ص"
  timestamp: number;
  status: 'pending' | 'prayed' | 'snoozed' | 'missed';
  preWarningTime: string; // Time to trigger pre-prayer reminder
  postCheckTime: string;  // Time to trigger post-prayer reminder
}

export interface DayPrayers {
  dateStr: string; // YYYY-MM-DD
  fajr: PrayerInfo;
  sunrise: { timeFormatted: string; timestamp: number };
  dhuhr: PrayerInfo;
  asr: PrayerInfo;
  maghrib: PrayerInfo;
  isha: PrayerInfo;
  nextPrayer: { key: string; nameAr: string; timeFormatted: string; diffMinutes: number } | null;
}

export function getCalculationParameters(methodName: string, madhabName: string) {
  let params = CalculationMethod.Egyptian();
  switch (methodName) {
    case 'UmmAlQura':
      params = CalculationMethod.UmmAlQura();
      break;
    case 'Dubai':
      params = CalculationMethod.Dubai();
      break;
    case 'Kuwait':
      params = CalculationMethod.Kuwait();
      break;
    case 'Qatar':
      params = CalculationMethod.Qatar();
      break;
    case 'MuslimWorldLeague':
      params = CalculationMethod.MuslimWorldLeague();
      break;
    case 'Karachi':
      params = CalculationMethod.Karachi();
      break;
    case 'NorthAmerica':
      params = CalculationMethod.NorthAmerica();
      break;
    default:
      params = CalculationMethod.Egyptian();
  }

  if (madhabName === 'Hanafi') {
    params.madhab = Madhab.Hanafi;
  } else {
    params.madhab = Madhab.Shafi;
  }

  return params;
}

export function formatTimeArabic(date: Date): string {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const period = hours >= 12 ? 'م' : 'ص';
  const displayHours = hours % 12 || 12;
  const displayMinutes = minutes < 10 ? '0' + minutes : minutes;
  return `${displayHours}:${displayMinutes} ${period}`;
}

export function calculateDailyPrayers(
  latitude: number,
  longitude: number,
  methodName: string,
  madhabName: string,
  date: Date = new Date(),
  preWarningMins = 15,
  postCheckMins = 15
): DayPrayers {
  const coordinates = new Coordinates(latitude, longitude);
  const params = getCalculationParameters(methodName, madhabName);
  const prayerTimes = new PrayerTimes(coordinates, date, params);

  const dateStr = date.toISOString().split('T')[0];
  const now = date.getTime();

  const createPrayerInfo = (key: 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha', nameAr: string, pDate: Date): PrayerInfo => {
    const preWarningDate = new Date(pDate.getTime() - preWarningMins * 60 * 1000);
    const postCheckDate = new Date(pDate.getTime() + postCheckMins * 60 * 1000);
    return {
      key,
      nameAr,
      time: pDate.toISOString(),
      timeFormatted: formatTimeArabic(pDate),
      timestamp: pDate.getTime(),
      status: 'pending',
      preWarningTime: preWarningDate.toISOString(),
      postCheckTime: postCheckDate.toISOString()
    };
  };

  const fajr = createPrayerInfo('fajr', 'الفجر', prayerTimes.fajr);
  const dhuhr = createPrayerInfo('dhuhr', 'الظهر', prayerTimes.dhuhr);
  const asr = createPrayerInfo('asr', 'العصر', prayerTimes.asr);
  const maghrib = createPrayerInfo('maghrib', 'المغرب', prayerTimes.maghrib);
  const isha = createPrayerInfo('isha', 'العشاء', prayerTimes.isha);

  // Find next upcoming prayer
  const list = [fajr, dhuhr, asr, maghrib, isha];
  let nextPrayer: { key: string; nameAr: string; timeFormatted: string; diffMinutes: number } | null = null;
  for (const p of list) {
    if (p.timestamp > now) {
      const diffMinutes = Math.round((p.timestamp - now) / 60000);
      nextPrayer = {
        key: p.key,
        nameAr: p.nameAr,
        timeFormatted: p.timeFormatted,
        diffMinutes
      };
      break;
    }
  }

  return {
    dateStr,
    fajr,
    sunrise: {
      timeFormatted: formatTimeArabic(prayerTimes.sunrise),
      timestamp: prayerTimes.sunrise.getTime()
    },
    dhuhr,
    asr,
    maghrib,
    isha,
    nextPrayer
  };
}
