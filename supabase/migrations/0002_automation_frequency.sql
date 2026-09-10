-- Frequency is the user-facing schedule; schedule_cron stays the machine one.
--
-- Cron cannot express "run once" or "every two weeks", so those two are driven
-- by this column plus last_run_at, and their cron carries only the time of day.
-- Existing rows were all effectively daily, which is what their cron says.

alter table automations
  add column if not exists frequency text not null default 'daily';

alter table automations
  drop constraint if exists automations_frequency_check;

alter table automations
  add constraint automations_frequency_check
  check (frequency in ('once', 'daily', 'weekly', 'biweekly', 'monthly', 'custom'));

-- A spent one-time campaign has next_run_at = null and enabled = false, so the
-- due-automations index stays small.
comment on column automations.frequency is
  'once | daily | weekly | biweekly | monthly | custom. See src/lib/automation/schedule.ts.';
