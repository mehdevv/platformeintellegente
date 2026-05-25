-- AI assistant configuration (admin-editable) + public limits for signed-in users.

insert into public.platform_settings (key, value)
values (
  'ai_settings',
  '{
    "chat_enabled": true,
    "groq_chat_model": "",
    "temperature": 0.3,
    "rag_top_k": 8,
    "rag_max_context_chars": 24000,
    "web_search_enabled": true,
    "web_search_max_results": 6,
    "web_search_max_context_chars": 12000,
    "charts_enabled": true,
    "message_limits": {
      "default": 15,
      "simple": 50,
      "premium": 500,
      "corporate": null
    }
  }'::jsonb
)
on conflict (key) do nothing;

insert into public.platform_settings (key, value)
values (
  'ai_user_limits',
  '{
    "chat_enabled": true,
    "message_limits": {
      "default": 15,
      "simple": 50,
      "premium": 500,
      "corporate": null
    }
  }'::jsonb
)
on conflict (key) do nothing;

drop policy if exists "platform_settings_public_read" on public.platform_settings;
create policy "platform_settings_public_read"
  on public.platform_settings for select
  to anon, authenticated
  using (key in ('bank_rib', 'ai_user_limits'));
