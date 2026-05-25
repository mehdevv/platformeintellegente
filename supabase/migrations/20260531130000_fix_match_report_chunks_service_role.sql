-- Backend RAG calls match_report_chunks with the service_role key (not authenticated).
-- Previous migration only granted EXECUTE to authenticated → PostgREST 500/permission errors.

create or replace function public.match_report_chunks(
  query_embedding vector(1536),
  match_count int default 8,
  filter_report_ids uuid[] default null
)
returns table (
  id uuid,
  report_id uuid,
  chunk_index int,
  content text,
  similarity float
)
language sql
stable
security definer
set search_path = public
as $$
  select
    rc.id,
    rc.report_id,
    rc.chunk_index,
    rc.content,
    (1 - (rc.embedding <=> query_embedding))::float as similarity
  from public.report_chunks rc
  where rc.embedding is not null
    and (
      filter_report_ids is null
      or cardinality(filter_report_ids) = 0
      or rc.report_id = any(filter_report_ids)
    )
  order by rc.embedding <=> query_embedding
  limit greatest(match_count, 1);
$$;

revoke all on function public.match_report_chunks(vector, int, uuid[]) from public;
revoke all on function public.match_report_chunks(vector, int, uuid[]) from authenticated;
grant execute on function public.match_report_chunks(vector, int, uuid[]) to service_role;
