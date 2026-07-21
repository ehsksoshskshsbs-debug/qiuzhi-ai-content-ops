CREATE TABLE `workspace_events` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`actor_email` text NOT NULL,
	`action` text NOT NULL,
	`subject_email` text,
	`changes_json` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `workspace_events_created_idx` ON `workspace_events` (`workspace_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `workspace_members` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`email` text NOT NULL,
	`display_name` text,
	`role` text NOT NULL,
	`status` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `workspace_member_email_idx` ON `workspace_members` (`workspace_id`,`email`);--> statement-breakpoint
CREATE INDEX `workspace_member_status_idx` ON `workspace_members` (`workspace_id`,`status`,`role`);--> statement-breakpoint
ALTER TABLE `feedback_records` ADD `source_text` text;--> statement-breakpoint
ALTER TABLE `feedback_records` ADD `content_hash` text;--> statement-breakpoint
ALTER TABLE `feedback_records` ADD `ai_summary` text;--> statement-breakpoint
ALTER TABLE `feedback_records` ADD `ai_sentiment` text;--> statement-breakpoint
ALTER TABLE `feedback_records` ADD `version` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `feedback_workspace_content_hash_idx` ON `feedback_records` (`workspace_id`,`content_hash`);