-- Supabase SQL Editorで実行します。既存サイトを変更しません。
-- 管理者UIDは指定済み。このファイルの全文を実行してください。
begin;
create table public.portfolio_content (
  id text primary key check (id = 'main'),
  owner_id uuid not null references auth.users(id),
  content jsonb not null default '{}'::jsonb check (jsonb_typeof(content) = 'object'),
  revision bigint not null default 0 check (revision >= 0)
);
alter table public.portfolio_content enable row level security;
revoke all on public.portfolio_content from anon, authenticated;
grant select on public.portfolio_content to anon, authenticated;
grant update (content, revision) on public.portfolio_content to authenticated;
create policy "Public can read published content"
  on public.portfolio_content for select to anon, authenticated using (true);
create policy "Only designated owner can update"
  on public.portfolio_content for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);
insert into public.portfolio_content (id, owner_id)
values ('main', 'd87345fc-2b1f-4d07-9722-67628aa5c0a9'::uuid);
commit;
-- INSERT / DELETE / owner_id変更はブラウザに許可していません。
-- 新規登録できる人がいても、指定したUID以外は更新できません。
