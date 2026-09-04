-- Sushil Company: move onto the Indian Tata numbers, retire the US ones.
--
-- Scope is deliberately ONE company (d3e6c538). The other 16 tenants holding
-- +1 DIDs are untouched.
--
-- Reversible: the US numbers are soft-deleted (status='D', deleted_at set), not
-- removed. Full table backup taken alongside this file.

-- The did_numbers/users columns are utf8mb4_unicode_ci, while MySQL 8 hands a
-- connection utf8mb4_0900_ai_ci by default. A user variable takes the
-- connection collation, so `company_uuid = @company` puts two collations of
-- equal coercibility against each other and the server refuses it:
--   ERROR 1267 Illegal mix of collations ... for operation '='
-- Matching the connection to the columns settles it for every comparison below.
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

SET @company := 'd3e6c538-8a0c-4afd-a17b-579c279ae5f2';
SET @site    := 'ef0fbf44-963d-446b-bafb-aac5ba3f2acd';
SET @sushil  := 'c56baf9d-91a8-441a-a4af-0f05db3be162';  -- sushil yadav, ext 1000
SET @umar    := '2cd86a76-dcf7-47cb-be1d-3c53444c0351';  -- Umar Ansari2, ext 5806
SET @now     := NOW();

START TRANSACTION;

-- 1. The ten Indian numbers, as owned inventory at Rs 1000/month each.
--    did_order_id / did_id are left NULL: these were bought directly, they did
--    not come through DIDWW, and nothing should try to reconcile them with a
--    carrier order.
INSERT INTO did_numbers
  (uuid, company_uuid, site_uuid, created_by, user_uuid, did_number, did_country,
   did_name, buy_date, renewal_date, monthly_cost, setup_cost, type, did_type,
   is_fax_enabled, verification_status, status, created_at, updated_at)
SELECT UUID(), @company, @site, @sushil, NULL, n.num, 'India',
       n.nm, DATE(@now), DATE_ADD(DATE(@now), INTERVAL 1 MONTH), 1000.000, 0.000, 'F', 'L',
       0, 'approved', 'A', @now, @now
FROM (
  SELECT '+918037683127' AS num, 'India 1'  AS nm UNION ALL
  SELECT '+918037683128', 'India 2'  UNION ALL
  SELECT '+918037683129', 'India 3'  UNION ALL
  SELECT '+918037683130', 'India 4'  UNION ALL
  SELECT '+918037683131', 'India 5'  UNION ALL
  SELECT '+918037683171', 'India 6'  UNION ALL
  SELECT '+918037683174', 'India 7'  UNION ALL
  SELECT '+918037683175', 'India 8'  UNION ALL
  SELECT '+918037683176', 'India 9'  UNION ALL
  SELECT '+918037683177', 'India 10'
) AS n
-- There is no unique index on did_number, so guard against a re-run inserting
-- the whole set a second time.
WHERE NOT EXISTS (
  SELECT 1 FROM did_numbers d WHERE d.did_number = n.num AND d.deleted_at IS NULL
);

-- 2. One number each for sushil and Umar, routed to their extensions.
--    Everything else stays unassigned inventory, which is what makes it
--    sellable rather than already in use.
UPDATE did_numbers
SET user_uuid = @sushil,
    forward_call_actions = JSON_OBJECT(
      'condition', JSON_OBJECT(
        'operational_hours', JSON_OBJECT(
          'regional', JSON_OBJECT(
            'country',      JSON_OBJECT('name','India','label','India','value','India'),
            'timezone',     JSON_OBJECT('label','Asia/Kolkata','value','Asia/Kolkata'),
            'country_code', JSON_OBJECT('name','India','label','India (+91)','value','IN'),
            'time_format','24'),
          'type','24_hours'),
        'display_number', JSON_OBJECT(
          'incoming', JSON_OBJECT('label','Yes','value',TRUE),
          'masking',  JSON_OBJECT('type','N','label','None','value',''))),
      'call_handling', JSON_OBJECT(
        'business_hours', JSON_OBJECT('type','EXTENSION','value','1000','label','sushil yadav')),
      'media', JSON_OBJECT('voicemail', JSON_OBJECT('enabled',TRUE,'value',''))),
    updated_at = @now
WHERE did_number = '+918037683127' AND company_uuid = @company AND deleted_at IS NULL;

UPDATE did_numbers
SET user_uuid = @umar,
    forward_call_actions = JSON_OBJECT(
      'condition', JSON_OBJECT(
        'operational_hours', JSON_OBJECT(
          'regional', JSON_OBJECT(
            'country',      JSON_OBJECT('name','India','label','India','value','India'),
            'timezone',     JSON_OBJECT('label','Asia/Kolkata','value','Asia/Kolkata'),
            'country_code', JSON_OBJECT('name','India','label','India (+91)','value','IN'),
            'time_format','24'),
          'type','24_hours'),
        'display_number', JSON_OBJECT(
          'incoming', JSON_OBJECT('label','Yes','value',TRUE),
          'masking',  JSON_OBJECT('type','N','label','None','value',''))),
      'call_handling', JSON_OBJECT(
        'business_hours', JSON_OBJECT('type','EXTENSION','value','5806','label','Umar Ansari2')),
      'media', JSON_OBJECT('voicemail', JSON_OBJECT('enabled',TRUE,'value',''))),
    updated_at = @now
WHERE did_number = '+918037683128' AND company_uuid = @company AND deleted_at IS NULL;

-- 3. Retire this company's US numbers. Soft delete, so a mistake is one UPDATE
--    away from being undone.
UPDATE did_numbers
SET status = 'D', deleted_at = @now, updated_at = @now
WHERE company_uuid = @company
  AND deleted_at IS NULL
  AND did_number LIKE '+1%';

-- 4. sushil's stored caller_id still points at a number that no longer exists,
--    which is exactly the case the dialpad warns about. Umar had none at all.
UPDATE users SET caller_id = '+918037683127' WHERE uuid = @sushil;
UPDATE users SET caller_id = '+918037683128' WHERE uuid = @umar;

COMMIT;
