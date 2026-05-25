-- RAG similarity search over report_chunks (pgvector cosine distance).

create index if not exists report_chunks_embedding_hnsw_idx
  on public.report_chunks
  using hnsw (embedding vector_cosine_ops);

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
security invoker
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
grant execute on function public.match_report_chunks(vector, int, uuid[]) to authenticated;
