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
  gregorianFormatted: string;
  hijriFormatted: string;
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
    isTomorrow?: boolean;
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

export function formatDayDates(date: Date, timeZone: string = 'Africa/Cairo'): {
  gregorian: string;
  hijri: string;
} {
  const gregorian = new Intl.DateTimeFormat('ar-EG-u-nu-latn', {
    timeZone: timeZone || 'Africa/Cairo',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date);

  const hijri = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura-nu-latn', {
    timeZone: timeZone || 'Africa/Cairo',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date);

  return { gregorian, hijri };
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

export function getLocalDateString(date: Date = new Date(), timeZone: string = 'Africa/Cairo'): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timeZone || 'Africa/Cairo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(date);
}

export function getLocalDateInTimezone(date: Date, timeZone: string): Date {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timeZone || 'Africa/Cairo',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour12: false
  });
  const parts = formatter.formatToParts(date);
  const year = parseInt(parts.find(p => p.type === 'year')?.value || '2026');
  const month = parseInt(parts.find(p => p.type === 'month')?.value || '1') - 1;
  const day = parseInt(parts.find(p => p.type === 'day')?.value || '1');
  return new Date(year, month, day);
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
  
  // Calculate prayer times based on the local calendar date in the target timezone
  const localDate = getLocalDateInTimezone(date, timeZone);
  const prayerTimes = new PrayerTimes(coordinates, localDate, params);

  const dateStr = getLocalDateString(date, timeZone);
  const todayStr = getLocalDateString(new Date(), timeZone);
  const realNow = Date.now();
  const isTargetToday = dateStr === todayStr;

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

  if (isTargetToday) {
    // For today, check against real-time current moment
    for (const p of list) {
      if (p.timestamp > realNow) {
        const diffMinutes = Math.round((p.timestamp - realNow) / 60000);
        nextPrayer = {
          key: p.key,
          nameAr: p.nameAr,
          timeFormatted: p.timeFormatted,
          diffMinutes,
          remainingFormatted: formatDurationArabic(diffMinutes),
          isTomorrow: false
        };
        break;
      }
    }

    // If all prayers of today have passed (e.g. late night after Isha), calculate tomorrow's Fajr
    if (!nextPrayer) {
      const tomorrowDate = new Date(realNow + 24 * 60 * 60 * 1000);
      const tomorrowLocalDate = getLocalDateInTimezone(tomorrowDate, timeZone);
      const tomorrowPt = new PrayerTimes(coordinates, tomorrowLocalDate, params);
      const tomorrowFajr = tomorrowPt.fajr;
      const diffMinutes = Math.round((tomorrowFajr.getTime() - realNow) / 60000);
      nextPrayer = {
        key: 'fajr',
        nameAr: 'الفجر (غداً)',
        timeFormatted: formatTimeArabic(tomorrowFajr, timeZone),
        diffMinutes,
        remainingFormatted: formatDurationArabic(diffMinutes),
        isTomorrow: true
      };
    }
  }

  const { gregorian, hijri } = formatDayDates(date, timeZone);

  return {
    dateStr,
    gregorianFormatted: gregorian,
    hijriFormatted: hijri,
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
