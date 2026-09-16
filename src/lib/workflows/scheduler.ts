/**
 * Scheduler Engine
 *
 * Manages one-time, recurring, and cron-based workflow scheduling.
 * Supports business hours awareness and holiday calendars.
 */

import { supabaseAdmin } from '@/lib/automations/admin-client'
import type { WorkflowSchedule, ScheduleType } from '@/types'

export interface CreateScheduleInput {
  workflowId: string
  userId: string
  scheduleType: ScheduleType
  scheduleValue: string
  timezone?: string
  businessHoursOnly?: boolean
  holidayDates?: string[]
  maxFires?: number
}

/**
 * Register a new schedule for a workflow.
 */
export async function createSchedule(input: CreateScheduleInput): Promise<WorkflowSchedule> {
  const db = supabaseAdmin()

  const nextFireAt = computeNextFireAt(input.scheduleType, input.scheduleValue, input.timezone ?? 'Asia/Kolkata')

  const { data, error } = await db
    .from('workflow_schedules')
    .insert({
      workflow_id: input.workflowId,
      user_id: input.userId,
      schedule_type: input.scheduleType,
      schedule_value: input.scheduleValue,
      timezone: input.timezone ?? 'Asia/Kolkata',
      business_hours_only: input.businessHoursOnly ?? false,
      holiday_dates: input.holidayDates ?? [],
      is_active: true,
      next_fire_at: nextFireAt,
      fire_count: 0,
      max_fires: input.maxFires ?? null,
    })
    .select()
    .single()

  if (error || !data) throw new Error(`Failed to create schedule: ${error?.message}`)
  return data as WorkflowSchedule
}

/**
 * Process all due schedules (called by the cron API endpoint every minute).
 * Returns the number of workflows triggered.
 */
export async function processDueSchedules(): Promise<number> {
  const db = supabaseAdmin()
  const now = new Date().toISOString()

  const { data: schedules } = await db
    .from('workflow_schedules')
    .select('*')
    .eq('is_active', true)
    .lte('next_fire_at', now)

  if (!schedules || schedules.length === 0) return 0

  let fired = 0
  for (const schedule of schedules as WorkflowSchedule[]) {
    try {
      // Check business hours
      if (schedule.business_hours_only && !isBusinessHours(schedule.timezone)) {
        // Reschedule to next business hour
        const next = nextBusinessHour(schedule.timezone)
        await db.from('workflow_schedules').update({ next_fire_at: next.toISOString() }).eq('id', schedule.id)
        continue
      }

      // Check holiday
      const today = new Date().toISOString().split('T')[0]
      if (schedule.holiday_dates.includes(today)) {
        // Skip today, schedule for tomorrow same time
        const next = new Date(Date.now() + 86_400_000)
        await db.from('workflow_schedules').update({ next_fire_at: next.toISOString() }).eq('id', schedule.id)
        continue
      }

      // Trigger the workflow
      const { runWorkflow } = await import('./engine')
      await runWorkflow(schedule.workflow_id, schedule.user_id, {
        trigger_data: { scheduled: true, schedule_id: schedule.id },
        vars: { schedule_type: schedule.schedule_type },
      } as Record<string, unknown>)

      // Update schedule
      const newFireCount = schedule.fire_count + 1
      const maxReached = schedule.max_fires != null && newFireCount >= schedule.max_fires
      const nextFire = maxReached
        ? null
        : computeNextFireAt(schedule.schedule_type, schedule.schedule_value, schedule.timezone)

      await db
        .from('workflow_schedules')
        .update({
          last_fired_at: now,
          fire_count: newFireCount,
          next_fire_at: nextFire,
          is_active: !maxReached,
        })
        .eq('id', schedule.id)

      fired++
    } catch (err) {
      console.error('[scheduler] failed to fire schedule:', schedule.id, err)
    }
  }

  return fired
}

/**
 * Process pending workflow delays (called by the cron endpoint).
 */
export async function processPendingDelays(): Promise<number> {
  const db = supabaseAdmin()
  const now = new Date().toISOString()

  // Check if the table exists first (it's created inline by the engine)
  const { data: pending } = await db
    .from('workflow_pending_delays')
    .select('*')
    .eq('status', 'pending')
    .lte('resume_at', now)
    .limit(50)

  if (!pending || pending.length === 0) return 0

  let resumed = 0
  for (const item of pending) {
    try {
      // Mark as processing
      await db.from('workflow_pending_delays').update({ status: 'processing' }).eq('id', item.id)

      // Resume workflow from the delayed node
      const { runWorkflow } = await import('./engine')
      await runWorkflow(item.workflow_id, item.user_id, item.context ?? {})

      await db.from('workflow_pending_delays').update({ status: 'done' }).eq('id', item.id)
      resumed++
    } catch (err) {
      console.error('[scheduler] resume failed:', item.id, err)
      await db.from('workflow_pending_delays').update({ status: 'failed' }).eq('id', item.id)
    }
  }

  return resumed
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Helpers
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function computeNextFireAt(type: ScheduleType, value: string, timezone: string): string | null {
  const now = new Date()

  switch (type) {
    case 'once':
      // value is an ISO datetime string
      return new Date(value) > now ? value : null

    case 'cron':
      // Parse simple cron expressions (subset)
      return parseCronNextFire(value, now)?.toISOString() ?? null

    case 'recurring': {
      // value is like "1h", "30m", "1d", "1w"
      const ms = parseRecurringInterval(value)
      return ms ? new Date(Date.now() + ms).toISOString() : null
    }

    default:
      return null
  }
}

function parseRecurringInterval(value: string): number | null {
  const match = value.match(/^(\d+)([mhdw])$/)
  if (!match) return null
  const [, n, unit] = match
  const num = parseInt(n)
  switch (unit) {
    case 'm': return num * 60_000
    case 'h': return num * 3_600_000
    case 'd': return num * 86_400_000
    case 'w': return num * 7 * 86_400_000
    default: return null
  }
}

// Parses one cron field (e.g. "*", "5", "1-5", "*/15", "1,15,30") into the
// set of values it matches within [min, max].
function parseCronField(field: string, min: number, max: number): Set<number> {
  const values = new Set<number>()
  for (const part of field.split(',')) {
    let step = 1
    let range = part
    if (part.includes('/')) {
      const [r, s] = part.split('/')
      range = r
      step = parseInt(s, 10)
      if (!Number.isFinite(step) || step <= 0) continue
    }

    let start = min
    let end = max
    if (range !== '*') {
      if (range.includes('-')) {
        const [a, b] = range.split('-').map((n) => parseInt(n, 10))
        if (!Number.isFinite(a) || !Number.isFinite(b)) continue
        start = a
        end = b
      } else {
        const v = parseInt(range, 10)
        if (!Number.isFinite(v)) continue
        start = end = v
      }
    }
    for (let v = start; v <= end; v += step) {
      if (v >= min && v <= max) values.add(v)
    }
  }
  return values
}

// Standard 5-field cron (minute hour day-of-month month day-of-week).
// Searches forward minute-by-minute (day-granularity first, for speed) up
// to 4 years out; returns null if the expression is invalid or unsatisfiable
// in that window (e.g. "0 0 30 2 *" â€” Feb 30 never exists).
function parseCronNextFire(cron: string, from: Date): Date | null {
  const parts = cron.trim().split(/\s+/)
  if (parts.length !== 5) return null
  const [minField, hourField, domField, monthField, dowField] = parts

  const minutes = parseCronField(minField, 0, 59)
  const hours = parseCronField(hourField, 0, 23)
  const doms = parseCronField(domField, 1, 31)
  const months = parseCronField(monthField, 1, 12)
  const dows = parseCronField(dowField, 0, 6)

  if ([minutes, hours, doms, months, dows].some((s) => s.size === 0)) return null

  const sortedHours = Array.from(hours).sort((a, b) => a - b)
  const sortedMinutes = Array.from(minutes).sort((a, b) => a - b)

  // POSIX cron rule: if both day-of-month and day-of-week are restricted
  // (not "*"), a day matches when EITHER matches; if only one is
  // restricted, that one alone decides.
  const domWildcard = domField.trim() === '*'
  const dowWildcard = dowField.trim() === '*'

  const candidate = new Date(from)
  candidate.setSeconds(0, 0)
  candidate.setMinutes(candidate.getMinutes() + 1)

  const maxDays = 4 * 366
  for (let dayIter = 0; dayIter < maxDays; dayIter++) {
    const month = candidate.getMonth() + 1
    const dom = candidate.getDate()
    const dow = candidate.getDay()

    const domMatch = doms.has(dom)
    const dowMatch = dows.has(dow)
    const dayMatches =
      months.has(month) &&
      (domWildcard && dowWildcard ? true : domWildcard ? dowMatch : dowWildcard ? domMatch : domMatch || dowMatch)

    if (dayMatches) {
      const dayStart = new Date(candidate)
      dayStart.setHours(0, 0, 0, 0)
      const isFirstDay = dayIter === 0

      for (const h of sortedHours) {
        if (isFirstDay && h < candidate.getHours()) continue
        for (const m of sortedMinutes) {
          if (isFirstDay && h === candidate.getHours() && m < candidate.getMinutes()) continue
          const result = new Date(dayStart)
          result.setHours(h, m, 0, 0)
          return result
        }
      }
    }

    candidate.setDate(candidate.getDate() + 1)
    candidate.setHours(0, 0, 0, 0)
  }

  return null
}

function isBusinessHours(timezone: string): boolean {
  const now = new Date()
  const local = new Date(now.toLocaleString('en-US', { timeZone: timezone }))
  const hour = local.getHours()
  const day = local.getDay() // 0=Sun, 6=Sat
  return day >= 1 && day <= 5 && hour >= 9 && hour < 18
}

function nextBusinessHour(timezone: string): Date {
  const now = new Date()
  const next = new Date(now)
  next.setHours(9, 0, 0, 0)
  // Move to next day if after 18:00
  const local = new Date(now.toLocaleString('en-US', { timeZone: timezone }))
  if (local.getHours() >= 18) {
    next.setDate(next.getDate() + 1)
  }
  // Skip weekends
  const day = next.getDay()
  if (day === 6) next.setDate(next.getDate() + 2)
  if (day === 0) next.setDate(next.getDate() + 1)
  return next
}
