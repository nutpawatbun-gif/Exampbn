export function formatThaiDateTime(isoString: string | null | undefined): string {
  if (!isoString) return 'ไม่มีกำหนดหมดอายุ (ตลอดไป)';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return 'ไม่ระบุ';
    return d.toLocaleString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return 'ไม่ระบุ';
  }
}

export function getTimeRemaining(isoString: string | null | undefined): {
  totalMs: number;
  isExpired: boolean;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  formattedText: string;
} {
  if (!isoString) {
    return {
      totalMs: Infinity,
      isExpired: false,
      days: 999,
      hours: 0,
      minutes: 0,
      seconds: 0,
      formattedText: 'ไม่มีกำหนดหมดอายุ',
    };
  }

  const expiry = new Date(isoString).getTime();
  const now = Date.now();
  const totalMs = expiry - now;

  if (totalMs <= 0) {
    return {
      totalMs: 0,
      isExpired: true,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      formattedText: 'หมดอายุแล้ว',
    };
  }

  const seconds = Math.floor((totalMs / 1000) % 60);
  const minutes = Math.floor((totalMs / 1000 / 60) % 60);
  const hours = Math.floor((totalMs / (1000 * 60 * 60)) % 24);
  const days = Math.floor(totalMs / (1000 * 60 * 60 * 24));

  let text = '';
  if (days > 0) {
    text = `${days} วัน ${hours} ชั่วโมง ${minutes} นาที`;
  } else if (hours > 0) {
    text = `${hours} ชั่วโมง ${minutes} นาที ${seconds} วินาที`;
  } else {
    text = `${minutes} นาที ${seconds} วินาที`;
  }

  return {
    totalMs,
    isExpired: false,
    days,
    hours,
    minutes,
    seconds,
    formattedText: text,
  };
}
