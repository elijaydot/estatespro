-- Appendix A — Live database introspection script
-- Run against the live Lovable-managed database and attach the output to the migration package.
-- All sections are read-only. Do not modify data.

-- 1. Basic instance metadata
select current_database() as database_name,
       current_user as connected_user,
       version() as postgres_version,
       current_setting('server_version_num') as version_num;

-- 2. Public tables and row counts
select t.table_name,
       (select count(*) from information_schema.columns c where c.table_schema = 'public' and c.table_name = t.table_name) as column_count,
       pg_catalog.pg_total_relation_size(quote_ident(t.table_name)::regclass) as total_bytes
from information_schema.tables t
where t.table_schema = 'public' and t.table_type = 'BASE TABLE'
order by t.table_name;

-- 3. Row counts (can be slow on large tables; run during low load)
-- select 'public.' || table_name as table_name, count(*) as rows from information_schema.tables
-- where table_schema = 'public' and table_type = 'BASE TABLE'
-- group by table_name order by table_name;

-- 4. RLS coverage
select t.table_name,
       c.relrowsecurity as rls_enabled,
       (select count(*) from pg_policies p where p.schemaname = 'public' and p.tablename = t.table_name) as policy_count,
       (select count(*) from information_schema.table_privileges tp where tp.table_schema = 'public' and tp.table_name = t.table_name and tp.privilege_type = 'SELECT') as grant_count
from information_schema.tables t
join pg_class c on c.relname = t.table_name
where t.table_schema = 'public' and t.table_type = 'BASE TABLE'
order by t.table_name;

-- 5. SECURITY DEFINER functions callable by anon
select n.nspname as schema,
       p.proname as function_name,
       pg_get_function_identity_arguments(p.oid) as args,
       p.prosecdef as is_security_definer
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
join pg_roles r on r.oid = p.proowner
where n.nspname = 'public'
  and p.prosecdef = true
  and has_function_privilege('anon', p.oid, 'EXECUTE')
order by p.proname;

-- 6. SECURITY DEFINER functions callable by authenticated
select n.nspname as schema,
       p.proname as function_name,
       pg_get_function_identity_arguments(p.oid) as args,
       p.prosecdef as is_security_definer
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
join pg_roles r on r.oid = p.proowner
where n.nspname = 'public'
  and p.prosecdef = true
  and has_function_privilege('authenticated', p.oid, 'EXECUTE')
order by p.proname;

-- 7. Cron jobs
select jobid, jobname, schedule, command, active, username
from cron.job
order by jobname;

-- 8. Enabled extensions
select e.extname, e.extversion
from pg_extension e
order by e.extname;

-- 9. Realtime publication tables
select schemaname, tablename
from pg_publication_tables
where pubname = 'supabase_realtime'
order by tablename;

-- 10. Storage buckets
select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets
order by id;

-- 11. Auth user summary (counts only, no PII)
select count(*) as total_users from auth.users;
select count(*) as confirmed_users from auth.users where email_confirmed_at is not null;
select count(*) as mfa_factors from auth.mfa_factors;
select provider, count(*) as identities from auth.identities group by provider order by provider;

-- 12. Largest tables by size
select relname as table_name,
       pg_size_pretty(pg_total_relation_size(relid)) as total_size,
       pg_total_relation_size(relid) as total_bytes
from pg_stat_user_tables
where schemaname = 'public'
order by pg_total_relation_size(relid) desc
limit 25;
