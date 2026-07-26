/**
 * Motor de disponibilidade
 *
 * Calcula os slots livres para um profissional + serviço em uma data,
 * respeitando: jornada, pausas, bloqueios e agendamentos existentes.
 *
 * IMPORTANTE — fuso horario
 * A jornada (`WorkingHours.startTime`) e a data pedida sao "hora de parede"
 * da barbearia, nao do servidor. Em producao o Node roda em UTC, entao montar
 * as horas com `new Date()`/`setHours` deslocaria a agenda inteira (uma
 * jornada 09:00–18:00 apareceria como 06:00–15:00 para o cliente no Brasil).
 * Por isso tudo aqui e convertido explicitamente a partir de
 * `Barbershop.timezone`, e o resultado sai como instante absoluto (ISO/UTC).
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

/** Fuso usado quando a barbearia nao tem `timezone` preenchido. */
export const DEFAULT_TIMEZONE = "America/Sao_Paulo";

/**
 * Diferenca, em ms, entre a hora de parede da zona e o UTC no instante dado.
 * Positivo a leste de Greenwich. Usa o proprio Intl, entao respeita horario
 * de verao sem precisar de biblioteca.
 */
function timeZoneOffsetMs(instant: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const parts: Record<string, string> = {};
  for (const part of dtf.formatToParts(instant)) {
    if (part.type !== "literal") parts[part.type] = part.value;
  }

  const asIfUTC = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) % 24, // algumas engines devolvem "24" para meia-noite
    Number(parts.minute),
    Number(parts.second),
  );

  return asIfUTC - instant.getTime();
}

/**
 * "2026-07-26" + "09:00" na zona da barbearia -> instante absoluto (Date UTC).
 */
export function zonedTimeToUtc(dateStr: string, time: string, timeZone: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);

  // Primeiro palpite: trata a hora de parede como se fosse UTC.
  const guess = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  // Corrige pelo offset real da zona naquele momento.
  const offset = timeZoneOffsetMs(new Date(guess), timeZone);
  return new Date(guess - offset);
}

/** Comeco e fim do dia civil da barbearia, em instantes absolutos. */
export function dayRangeInTimeZone(
  dateStr: string,
  timeZone: string,
): { start: Date; end: Date } {
  const start = zonedTimeToUtc(dateStr, "00:00", timeZone);
  const end = new Date(start.getTime() + 24 * 60 * 60_000);
  return { start, end };
}

/**
 * Dia da semana (0=domingo) de uma data civil.
 * Independe de fuso: e propriedade do calendario, nao do relogio.
 */
export function weekdayOf(dateStr: string): number {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

/**
 * Gera os slots livres do dia, excluindo os que se sobrepoem a qualquer
 * intervalo ocupado (agendamentos, bloqueios e a pausa da jornada).
 */
export function computeAvailableSlots({
  dateStr,
  timeZone = DEFAULT_TIMEZONE,
  durationMinutes,
  slotIntervalMinutes = 30,
  workingHours,
  busyIntervals,
  minAdvanceMinutes = 60,
}: {
  /** Data civil pedida, "YYYY-MM-DD". */
  dateStr: string;
  /** IANA timezone da barbearia. */
  timeZone?: string;
  durationMinutes: number;
  slotIntervalMinutes?: number;
  workingHours: WorkingHoursRow[];
  busyIntervals: BusyInterval[];
  minAdvanceMinutes?: number;
}): TimeSlot[] {
  const weekday = weekdayOf(dateStr);
  const wh = workingHours.find((w) => w.weekday === weekday && w.active);

  if (!wh) return []; // profissional nao trabalha neste dia

  const workStart = zonedTimeToUtc(dateStr, wh.startTime, timeZone);
  const workEnd = zonedTimeToUtc(dateStr, wh.endTime, timeZone);

  // Pausa entra como intervalo ocupado adicional.
  const allBusy: BusyInterval[] = [...busyIntervals];
  if (wh.breakStart && wh.breakEnd) {
    allBusy.push({
      startsAt: zonedTimeToUtc(dateStr, wh.breakStart, timeZone),
      endsAt: zonedTimeToUtc(dateStr, wh.breakEnd, timeZone),
    });
  }

  const minStart = new Date(Date.now() + minAdvanceMinutes * 60_000);

  const slots: TimeSlot[] = [];
  let cursor = new Date(workStart);

  while (cursor.getTime() + durationMinutes * 60_000 <= workEnd.getTime()) {
    const slotEnd = new Date(cursor.getTime() + durationMinutes * 60_000);

    // Nao oferecer slots no passado nem dentro da antecedencia minima.
    if (cursor >= minStart) {
      const overlaps = allBusy.some((b) => cursor < b.endsAt && slotEnd > b.startsAt);

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
