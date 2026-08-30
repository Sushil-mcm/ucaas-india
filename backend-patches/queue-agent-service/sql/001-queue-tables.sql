-- Queue tables for the shared database (mycountrymobile_db).
--
-- NOT APPLIED. Nothing has been run against any database. A human reviews this
-- and runs it. See README.md, "What a human must do".
--
-- Two parts, and only the first is needed to make queued calls ring:
--
--   1. Indexes on the agents table. It already exists and already holds the
--      right columns, but it has no index except the primary key, so every
--      lookup reads the whole table. A caller is on the line while that runs.
--
--   2. The queues and tiers tables. Neither exists yet. The switch's own
--      dialplan service already reads a queues table with exactly these
--      columns, and fails its queue lookup because it is not there. The tiers
--      table is what lets a queue ring a first group first and widen to a
--      second group if nobody picks up.
--
-- Both new tables are written to match, column for column, the records the
-- product already stores for queues, so nothing has to be reshaped when the
-- data is moved across.

-- ---------------------------------------------------------------------------
-- 1. Indexes on the table that already exists
-- ---------------------------------------------------------------------------

-- Look up everybody in one queue. This is the query on the call path.
ALTER TABLE `agents` ADD INDEX `idx_agents_queue_uuid` (`queue_uuid`);

-- Look up one person by their extension and company, which is how every update
-- from the event manager arrives.
ALTER TABLE `agents` ADD INDEX `idx_agents_name` (`name`);

-- ---------------------------------------------------------------------------
-- 2. The two missing tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `queues` (
  `id`           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `uuid`         VARCHAR(100) NOT NULL,
  `company_uuid` VARCHAR(36)  DEFAULT NULL,
  `user_uuid`    VARCHAR(36)  DEFAULT NULL,
  `site_uuid`    VARCHAR(36)  DEFAULT NULL,
  `campaign_uuid` VARCHAR(36) DEFAULT NULL,
  `name`         VARCHAR(100) NOT NULL,
  `extension`    VARCHAR(20)  NOT NULL,
  `domain`       VARCHAR(150) DEFAULT NULL,
  `type`         VARCHAR(20)  NOT NULL DEFAULT 'QUEUE',
  `manager`      JSON         DEFAULT NULL,
  `members`      JSON         DEFAULT NULL,
  `settings`     JSON         DEFAULT NULL,
  `description`  TEXT         DEFAULT NULL,
  `script_type`  VARCHAR(20)  DEFAULT 'text',
  `script`       TEXT         DEFAULT NULL,
  `auto_answer`     TINYINT(1) NOT NULL DEFAULT 0,
  `call_recording`  TINYINT(1) NOT NULL DEFAULT 0,
  `config_applied`  TINYINT(1) NOT NULL DEFAULT 0,
  `max_wait_time`   INT NOT NULL DEFAULT 0,
  `wrap_seconds`    INT NOT NULL DEFAULT 0,
  `moh_sound`    VARCHAR(255) DEFAULT NULL,
  `created_at`   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at`   DATETIME DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_queues_uuid` (`uuid`),
  -- The switch looks a queue up by its reference or its extension, together
  -- with the company's domain, so that pair is the index that matters.
  KEY `idx_queues_domain_extension` (`domain`, `extension`),
  KEY `idx_queues_company` (`company_uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `tiers` (
  `id`       INT UNSIGNED NOT NULL AUTO_INCREMENT,
  -- Both of these are written the same way everywhere else in the platform:
  -- "extension@company-domain".
  `queue`    VARCHAR(255) NOT NULL,
  `agent`    VARCHAR(255) NOT NULL,
  -- 'Ready' means this person is part of this queue's rota.
  `state`    VARCHAR(50)  NOT NULL DEFAULT 'Ready',
  -- Which ring round they are in. Round 0 and 1 are tried first; a higher
  -- number is only added once the earlier rounds have had their turn.
  `level`    INT NOT NULL DEFAULT 1,
  -- Their place within that round, for queues that ring one person at a time.
  `position` INT NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_tiers_queue_agent` (`queue`, `agent`),
  KEY `idx_tiers_queue_order` (`queue`, `level`, `position`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
