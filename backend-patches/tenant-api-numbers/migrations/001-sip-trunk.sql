-- The carrier connection every number on the account arrives over.
--
-- One row per trunk, per tenant. `password` is stored because SIP registration
-- needs the cleartext to compute its digest — it cannot be hashed. It is never
-- returned by the API.
CREATE TABLE IF NOT EXISTS `sip_trunk` (
  `id`           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `uuid`         CHAR(36)        NOT NULL,
  `company_uuid` CHAR(36)        NOT NULL,
  `name`         VARCHAR(120)    NOT NULL,
  `host`         VARCHAR(255)    NOT NULL,
  `port`         SMALLINT UNSIGNED NOT NULL DEFAULT 5060,
  `username`     VARCHAR(191)    NULL,
  `password`     VARBINARY(512)  NULL,
  `proxy`        VARCHAR(255)    NULL,
  `register`     TINYINT(1)      NOT NULL DEFAULT 1,
  `created_at`   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at`   DATETIME        NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_sip_trunk_uuid` (`uuid`),
  KEY `ix_sip_trunk_company` (`company_uuid`, `deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Which trunk a number arrives on. Nullable: an account with one trunk should
-- not have to say so, and a number registered before any trunk exists is still
-- a number the account holds.
ALTER TABLE `did_numbers`
  ADD COLUMN IF NOT EXISTS `trunk_uuid` CHAR(36) NULL AFTER `did_number`,
  ADD COLUMN IF NOT EXISTS `source` VARCHAR(24) NOT NULL DEFAULT 'carrier'
    COMMENT 'carrier = brought by the operator; wholesale = bought through the old DIDWW flow';
