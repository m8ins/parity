// Validate restoration + authorization/conflicts using synthetic rows only.
// Everything, including the function replacement, is rolled back.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const migration = fs.readFileSync('supabase/migrations/20261120000001_restore_period_details_rpc.sql', 'utf8').replace(/^BEGIN;$/m, '').replace(/^COMMIT;$/m, '');
const owner = crypto.randomUUID(), other = crypto.randomUUID(), meter = crypto.randomUUID(), period = crypto.randomUUID();
const sql = `BEGIN;
DROP FUNCTION IF EXISTS public.save_billing_period_details(uuid,jsonb,date,text);
${migration}
INSERT INTO auth.users (id) VALUES ('${owner}'), ('${other}');
INSERT INTO public.meters (id,user_id,name,type) VALUES ('${meter}','${owner}','Synthetic details verification','electricity');
INSERT INTO public.contracts (id,meter_id,period_start,period_end,provider) VALUES ('${period}','${meter}','2026-01-01','2027-01-01','Before');
INSERT INTO public.rates (contract_id,effective_from,grundpreis,arbeitspreis,abschlag,umrechnungsfaktor) VALUES ('${period}','2026-01-01',10,30,100,1);
DO $$ BEGIN
 IF has_function_privilege('anon','public.save_billing_period_details(uuid,jsonb,date,text)','EXECUTE') THEN RAISE EXCEPTION 'Anonymous execute granted'; END IF;
END $$;
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 BEGIN
  PERFORM public.save_billing_period_details('${period}', '{}', '2026-01-01', 'After');
  RAISE EXCEPTION 'Unauthenticated call accepted';
 EXCEPTION WHEN SQLSTATE '28000' THEN NULL;
 END;
END $$;
SELECT set_config('request.jwt.claim.sub','${owner}',true) IS NOT NULL;
DO $$ DECLARE saved jsonb; BEGIN
 saved := public.save_billing_period_details('${period}', '{"period_start":"2026-01-01","period_end":"2027-01-01","provider":"Before"}', '2026-01-01', ' After ');
 IF saved->>'provider' <> 'After' THEN RAISE EXCEPTION 'Wrong confirmed provider'; END IF;
 -- Same absolute target is safe after a lost response, even with old snapshot.
 saved := public.save_billing_period_details('${period}', '{"period_start":"2026-01-01","period_end":"2027-01-01","provider":"Before"}', '2026-01-01', 'After');
 IF saved->>'provider' <> 'After' THEN RAISE EXCEPTION 'Retry failed'; END IF;
 BEGIN
  PERFORM public.save_billing_period_details('${period}', '{"period_start":"2026-01-01","period_end":"2027-01-01","provider":"Before"}', '2026-01-01', 'Concurrent');
  RAISE EXCEPTION 'Stale snapshot accepted';
 EXCEPTION WHEN SQLSTATE '40001' THEN NULL;
 END;
 BEGIN
  PERFORM public.save_billing_period_details('${period}', '{"period_start":"2026-01-01","period_end":"2027-01-01","provider":"After"}', '2026-02-01', 'After');
  RAISE EXCEPTION 'Start excluded an existing rate';
 EXCEPTION WHEN SQLSTATE '22023' THEN NULL;
 END;
END $$;
SELECT set_config('request.jwt.claim.sub','${other}',true) IS NOT NULL;
DO $$ BEGIN
 BEGIN
  PERFORM public.save_billing_period_details('${period}', '{}', '2026-01-01', 'Foreign');
  RAISE EXCEPTION 'Foreign write accepted';
 EXCEPTION WHEN SQLSTATE '42501' THEN NULL;
 END;
END $$;
ROLLBACK;`;
try {
  execFileSync('docker', ['exec','-i','supabase_db_Parity','psql','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-At'], { input: sql, encoding: 'utf8', stdio: ['pipe','pipe','pipe'] });
  const report = { passed: true, rolledBack: true, checks: ['Restore missing RPC from migration', 'Anonymous execute denied', 'Session required', 'Owner receives trimmed confirmed row', 'Identical absolute retry succeeds', 'Competing snapshot rejected', 'Existing condition cannot be excluded by start change', 'Foreign owner rejected'] };
  fs.writeFileSync(new URL('database.json', import.meta.url), JSON.stringify(report,null,2)+'\n'); console.log(JSON.stringify(report,null,2));
} catch(error) { console.error(error.stderr?.toString() ?? error.message); process.exitCode=1; }
