CREATE TABLE `feedback_records` (
	`id` text PRIMARY KEY NOT NULL,
	`trace_code` text NOT NULL,
	`workspace_id` text NOT NULL,
	`platform` text NOT NULL,
	`source_type` text NOT NULL,
	`external_id` text,
	`content_id` text,
	`author_alias` text,
	`summary` text NOT NULL,
	`sentiment` text NOT NULL,
	`need_tag` text NOT NULL,
	`priority` text NOT NULL,
	`status` text NOT NULL,
	`assignee_email` text,
	`next_action` text,
	`occurred_at` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`archived_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `feedback_records_trace_code_unique` ON `feedback_records` (`trace_code`);--> statement-breakpoint
CREATE UNIQUE INDEX `feedback_workspace_platform_external_idx` ON `feedback_records` (`workspace_id`,`platform`,`external_id`);--> statement-breakpoint
CREATE INDEX `feedback_workspace_updated_idx` ON `feedback_records` (`workspace_id`,`updated_at`);--> statement-breakpoint
CREATE INDEX `feedback_workspace_status_idx` ON `feedback_records` (`workspace_id`,`status`,`priority`);--> statement-breakpoint
CREATE TABLE `metric_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`platform` text NOT NULL,
	`content_id` text NOT NULL,
	`metric_date` text NOT NULL,
	`metric_name` text NOT NULL,
	`metric_value` real NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `metric_snapshot_unique_idx` ON `metric_snapshots` (`workspace_id`,`platform`,`content_id`,`metric_date`,`metric_name`);--> statement-breakpoint
CREATE TABLE `platform_connections` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`platform` text NOT NULL,
	`status` text NOT NULL,
	`account_label` text,
	`scopes` text,
	`last_synced_at` text,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `platform_connection_unique_idx` ON `platform_connections` (`workspace_id`,`platform`);--> statement-breakpoint
CREATE TABLE `record_events` (
	`id` text PRIMARY KEY NOT NULL,
	`record_id` text NOT NULL,
	`workspace_id` text NOT NULL,
	`actor_email` text NOT NULL,
	`action` text NOT NULL,
	`changes_json` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`record_id`) REFERENCES `feedback_records`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `events_record_created_idx` ON `record_events` (`record_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `sync_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`platform` text NOT NULL,
	`status` text NOT NULL,
	`inserted_count` integer DEFAULT 0 NOT NULL,
	`updated_count` integer DEFAULT 0 NOT NULL,
	`skipped_count` integer DEFAULT 0 NOT NULL,
	`error_summary` text,
	`started_at` text NOT NULL,
	`finished_at` text
);
