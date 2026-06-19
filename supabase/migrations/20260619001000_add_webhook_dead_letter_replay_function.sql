-- Wave 3 webhook replay helper

create or replace function public.replay_webhook_dead_letter(
  p_dead_letter_id uuid,
  p_requested_by text default null,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  dl record;
  next_attempt integer;
  attempt_id uuid;
  replay_note text;
begin
  select *
  into dl
  from public.webhook_dead_letters
  where id = p_dead_letter_id
  for update;

  if not found then
    raise exception 'webhook_dead_letter not found: %', p_dead_letter_id;
  end if;

  next_attempt := greatest(1, coalesce(dl.total_attempts, 0) + 1);
  replay_note := trim(both ' ' from coalesce(p_note, ''));

  insert into public.webhook_delivery_attempts (
    endpoint_id,
    event_type,
    event_id,
    correlation_id,
    payload,
    attempt,
    status_code,
    success,
    error_message,
    duration_ms,
    next_retry_at,
    delivered_at
  ) values (
    dl.endpoint_id,
    dl.event_type,
    dl.event_id,
    dl.correlation_id,
    dl.payload,
    next_attempt,
    null,
    false,
    'manual_replay_requested',
    null,
    now(),
    null
  )
  returning id into attempt_id;

  update public.webhook_dead_letters
  set
    resolved_at = now(),
    resolution_notes = concat_ws(
      E'\n',
      nullif(dl.resolution_notes, ''),
      concat(
        '[replay_queued] attempt=',
        next_attempt,
        case
          when p_requested_by is not null and p_requested_by <> '' then concat(' requested_by=', p_requested_by)
          else ''
        end,
        case
          when replay_note <> '' then concat(' note="', replay_note, '"')
          else ''
        end
      )
    ),
    total_attempts = next_attempt
  where id = p_dead_letter_id;

  return jsonb_build_object(
    'queued', true,
    'dead_letter_id', p_dead_letter_id,
    'attempt_id', attempt_id,
    'attempt', next_attempt,
    'next_retry_at', now()
  );
end;
$$;

comment on function public.replay_webhook_dead_letter(uuid, text, text)
is 'Queues a manual replay attempt for a webhook dead-letter entry and records operator notes.';
