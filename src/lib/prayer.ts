import { Coordinates, CalculationMethod, PrayerTimes, Madhab } from 'adhan';

export interface PrayerInfo {
  key: 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
  nameAr: string;
  time: string; // ISO string
  timeFormatted: string; // e.g. "04:45 ص"
  timestamp: number;
  status: 'pending' | 'prayed' | 'snoozed' | 'missed';
  preWarningTime: string;
  postCheckTime: string;
}

export interface DayPrayers {
  dateStr: string;
  fajr: PrayerInfo;
  sunrise: { timeFormatted: string; timestamp: number };
  dhuhr: PrayerInfo;
  asr: PrayerInfo;
  maghrib: PrayerInfo;
  isha: PrayerInfo;
  nextPrayer: {
    key: string;
    nameAr: string;
    timeFormatted: string;
    diffMinutes: number;
    remainingFormatted: string;
  } | null;
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

export function formatTimeArabic(date: Date, timeZone: string = 'Africa/Cairo'): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timeZone || 'Africa/Cairo',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    const parts = formatter.formatToParts(date);
    const hour = parts.find(p => p.type === 'hour')?.value || '12';
    const minute = parts.find(p => p.type === 'minute')?.value || '00';
    const isPM = parts.find(p => p.type === 'dayPeriod')?.value?.toLowerCase() === 'pm';
    return `${hour}:${minute} ${isPM ? 'م' : 'ص'}`;
  } catch (e) {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const period = hours >= 12 ? 'م' : 'ص';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes < 10 ? '0' + minutes : minutes;
    return `${displayHours}:${displayMinutes} ${period}`;
  }
}

export function formatDurationArabic(diffMinutes: number): string {
  if (diffMinutes <= 0) return 'حان وقتها الآن';
  
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;

  if (hours === 0) {
    if (minutes === 1) return 'باقي دقيقة واحدة';
    if (minutes === 2) return 'باقي دقيقتان';
    if (minutes >= 3 && minutes <= 10) return `باقي ${minutes} دقائق`;
    return `باقي ${minutes} دقيقة`;
  }

  let hoursText = '';
  if (hours === 1) {
    hoursText = 'ساعة';
  } else if (hours === 2) {
    hoursText = 'ساعتان';
  } else if (hours >= 3 && hours <= 10) {
    hoursText = `${hours} ساعات`;
  } else {
    hoursText = `${hours} ساعة`;
  }

  if (minutes === 0) {
    return `باقي ${hoursText}`;
  }

  let minsText = '';
  if (minutes === 1) minsText = 'دقيقة واحدة';
  else if (minutes === 2) minsText = 'دقيقتان';
  else if (minutes >= 3 && minutes <= 10) minsText = `${minutes} دقائق`;
  else minsText = `${minutes} دقيقة`;

  return `باقي ${hoursText} و ${minsText}`;
}

export function calculateDailyPrayers(
  latitude: number,
  longitude: number,
  methodName: string,
  madhabName: string,
  date: Date = new Date(),
  preWarningMins = 15,
  postCheckMins = 15,
  timeZone: string = 'Africa/Cairo'
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
      timeFormatted: formatTimeArabic(pDate, timeZone),
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
  let nextPrayer: DayPrayers['nextPrayer'] = null;
  for (const p of list) {
    if (p.timestamp > now) {
      const diffMinutes = Math.round((p.timestamp - now) / 60000);
      nextPrayer = {
        key: p.key,
        nameAr: p.nameAr,
        timeFormatted: p.timeFormatted,
        diffMinutes,
        remainingFormatted: formatDurationArabic(diffMinutes)
      };
      break;
    }
  }

  return {
    dateStr,
    fajr,
    sunrise: {
      timeFormatted: formatTimeArabic(prayerTimes.sunrise, timeZone),
      timestamp: prayerTimes.sunrise.getTime()
    },
    dhuhr,
    asr,
    maghrib,
    isha,
    nextPrayer
  };
}
