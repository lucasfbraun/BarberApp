/**
 * Motor de disponibilidade
 *
 * Calcula os slots livres para um profissional + serviço em uma data,
 * respeitando: jornada, pausas, bloqueios e agendamentos existentes.
 */

export type TimeSlot = {
  startsAt: string; // ISO
  endsAt: string;   // ISO
};

type WorkingHoursRow = {
  weekday: number;
  active: boolean;
  startTime: string; // "HH:MM"
  endTime: string;
  breakStart: string | null;
  breakEnd: string | null;
};

type BusyInterval = {
  startsAt: Date;
  endsAt: Date;
};

/**
 * Converte "HH:MM" + Date para um Date no fuso local.
 */
function timeToDate(date: Date, time: string): Date {
  const [h, m] = time.split(":").map(Number);
  const d = new Date(date);
  d.setHours(h, m, 0, 0);
  return d;
}

/**
 * Gera todos os slots de `slotMinutes` no intervalo [start, end),
 * excluindo os que se sobreponham a qualquer intervalo em `busy`.
 */
export function computeAvailableSlots({
  date,
  durationMinutes,
  slotIntervalMinutes = 30,
  workingHours,
  busyIntervals,
  minAdvanceMinutes = 60,
}: {
  date: Date;
  durationMinutes: number;
  slotIntervalMinutes?: number;
  workingHours: WorkingHoursRow[];
  busyIntervals: BusyInterval[];
  minAdvanceMinutes?: number;
}): TimeSlot[] {
  const weekday = date.getDay(); // 0=domingo … 6=sábado
  const wh = workingHours.find((w) => w.weekday === weekday && w.active);

  if (!wh) return []; // profissional não trabalha neste dia

  const workStart = timeToDate(date, wh.startTime);
  const workEnd = timeToDate(date, wh.endTime);

  // Pausa como intervalo ocupado adicional
  const allBusy: BusyInterval[] = [...busyIntervals];
  if (wh.breakStart && wh.breakEnd) {
    allBusy.push({
      startsAt: timeToDate(date, wh.breakStart),
      endsAt: timeToDate(date, wh.breakEnd),
    });
  }

  const now = new Date();
  const minStart = new Date(now.getTime() + minAdvanceMinutes * 60_000);

  const slots: TimeSlot[] = [];
  let cursor = new Date(workStart);

  while (cursor.getTime() + durationMinutes * 60_000 <= workEnd.getTime()) {
    const slotEnd = new Date(cursor.getTime() + durationMinutes * 60_000);

    // Não oferecer slots no passado nem dentro da antecedência mínima
    if (cursor >= minStart) {
      const overlaps = allBusy.some(
        (b) => cursor < b.endsAt && slotEnd > b.startsAt,
      );

      if (!overlaps) {
        slots.push({
          startsAt: cursor.toISOString(),
          endsAt: slotEnd.toISOString(),
        });
      }
    }

    cursor = new Date(cursor.getTime() + slotIntervalMinutes * 60_000);
  }

  return slots;
}
