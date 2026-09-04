-- Send outbound to Tata on its real signalling port, 9080.
--
-- We were sending to 45.126.188.28:5060, because host_ip_outbound carried the
-- bare IP and FreeSWITCH defaults to 5060. Something on that host's 5060
-- answers SIP and challenges every call:
--
--     INVITE sip:917666718264@45.126.188.28   ->  100 Trying
--                                             ->  407 Proxy Authentication Required
--                                                 Digest realm="45.126.188.28"
--
-- which is why the trunk looked like it wanted credentials while Tata had
-- IP-authenticated us all along. We were knocking on the wrong port.
--
-- host_ip_outbound already supports host:port - provider 26 ("demo") is stored
-- as 209.38.151.20:6060 - and the dialplan interpolates it straight into the
-- bridge target, so this alone is enough:
--
--     sofia/internal/917666718264@45.126.188.28:9080
--
-- Kamailio's inbound allowlist entry needs no change: it matches on source
-- address with port 0, meaning any port.

UPDATE providers
SET host_ip_outbound = '45.126.188.28:9080',
    updated_at = NOW()
WHERE name = 'Tata'
  AND type = 'CALL'
  AND deleted_at IS NULL;

-- Confirm:
--   SELECT providerID, name, host_ip_outbound, add_prefix, remove_prefix, status
--   FROM providers WHERE type='CALL' AND status='A' AND deleted_at IS NULL;
--
-- The provider lookup is cached for 300s, so restart to pick it up now:
--   systemctl restart fs-xml-api
--
-- TO ROLL BACK:
--   UPDATE providers SET host_ip_outbound='45.126.188.28' WHERE name='Tata';
