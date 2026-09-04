-- Point outbound calling at the Tata trunk (45.126.188.28).
--
-- READ THIS BEFORE RUNNING. get_outbound_provider() in
-- /opt/fs-xml-api-1.2.5/dialplan_service.py:177 selects ONE provider globally:
--
--     SELECT ... FROM providers
--     WHERE status='A' AND type='CALL' AND host_ip_outbound IS NOT NULL
--     ORDER BY providerID LIMIT 1
--
-- There is no per-tenant selection. So making Tata win means deactivating the
-- others, and that switches outbound for ALL 17 companies on this box, not just
-- Sushil Company. Every tenant's calls start leaving over Tata the moment the
-- provider cache expires.
--
-- Reversible: the old rows are set to status='D', not deleted. Putting them
-- back is the UPDATE at the bottom of this file.

START TRANSACTION;

-- 1. The Tata trunk.
--    Prefixes are deliberately empty. format_outbound_number() (line 204)
--    strips a leading '+', applies remove_prefix, then prepends add_prefix, so
--    empty/empty sends plain E.164 without the plus:
--
--        +917666718264  ->  917666718264
--
--    which is what a direct Indian SIP trunk normally expects. The old carrier
--    was prepending its own technical prefix 77701, producing
--    77701917666718264 — that is what was being sent when the call came back
--    480. If Tata wants national format (07666718264) set add_prefix='0' and
--    remove_prefix='91'; if it wants the plus, that needs a code change, since
--    format_outbound_number always strips it.
INSERT INTO providers
  (uuid, name, type, status, add_prefix, remove_prefix, request_mode,
   host_ip_outbound, host_ip_inbound, provider_tech, calllimit, created_at, updated_at)
SELECT UUID(), 'Tata', 'CALL', 'A', '', '', 'HTTP',
       '45.126.188.28', '45.126.188.28', 'SIP', 0, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM providers p WHERE p.host_ip_outbound = '45.126.188.28' AND p.deleted_at IS NULL
);

-- 2. Stand the old carriers down so the query above resolves to Tata.
--    Without this, providerID 1 (Ucaas Callcenter, 38.147.130.91) keeps winning
--    on ORDER BY providerID and nothing changes.
UPDATE providers
SET status = 'D', updated_at = NOW()
WHERE type = 'CALL'
  AND status = 'A'
  AND deleted_at IS NULL
  AND host_ip_outbound <> '45.126.188.28';

COMMIT;

-- 3. Confirm exactly one active CALL provider remains, and that it is Tata:
--
--   SELECT providerID, name, host_ip_outbound, add_prefix, remove_prefix, status
--   FROM providers WHERE type='CALL' AND status='A' AND deleted_at IS NULL;
--
-- 4. The lookup is cached for 300s (_provider_cache_time). Either wait five
--    minutes or restart the service so the change takes effect immediately:
--
--   systemctl restart fs-xml-api
--
-- TO ROLL BACK:
--   UPDATE providers SET status='A' WHERE providerID IN (1,25,26);
--   UPDATE providers SET status='D' WHERE host_ip_outbound='45.126.188.28';
--   systemctl restart fs-xml-api
