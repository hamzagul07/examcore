-- Android delivery: name the channel the app creates ('default') so its
-- importance setting actually governs these notifications.
-- Applied to production 2026-09-06 via MCP (mobile_push_channel_id).
create or replace function public.push_to_user(
  target_user uuid,
  push_title text,
  push_body text,
  push_data jsonb
) returns void
language plpgsql security definer set search_path = public
as $$
declare
  device record;
begin
  for device in select token from public.push_tokens where user_id = target_user loop
    perform net.http_post(
      url := 'https://exp.host/--/api/v2/push/send',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object(
        'to', device.token,
        'title', push_title,
        'body', push_body,
        'data', coalesce(push_data, '{}'::jsonb),
        'sound', 'default',
        'channelId', 'default'
      )
    );
  end loop;
end
$$;
