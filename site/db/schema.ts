import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const feedbackRecords = sqliteTable("feedback_records", {
  id: text("id").primaryKey(),
  traceCode: text("trace_code").notNull().unique(),
  workspaceId: text("workspace_id").notNull(),
  platform: text("platform").notNull(),
  sourceType: text("source_type").notNull(),
  externalId: text("external_id"),
  contentId: text("content_id"),
  authorAlias: text("author_alias"),
  summary: text("summary").notNull(),
  sentiment: text("sentiment").notNull(),
  needTag: text("need_tag").notNull(),
  priority: text("priority").notNull(),
  status: text("status").notNull(),
  assigneeEmail: text("assignee_email"),
  nextAction: text("next_action"),
  occurredAt: text("occurred_at").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  archivedAt: text("archived_at"),
}, (table) => [
  uniqueIndex("feedback_workspace_platform_external_idx").on(table.workspaceId, table.platform, table.externalId),
  index("feedback_workspace_updated_idx").on(table.workspaceId, table.updatedAt),
  index("feedback_workspace_status_idx").on(table.workspaceId, table.status, table.priority),
]);

export const recordEvents = sqliteTable("record_events", {
  id: text("id").primaryKey(),
  recordId: text("record_id").notNull().references(() => feedbackRecords.id),
  workspaceId: text("workspace_id").notNull(),
  actorEmail: text("actor_email").notNull(),
  action: text("action").notNull(),
  changesJson: text("changes_json").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [index("events_record_created_idx").on(table.recordId, table.createdAt)]);

export const metricSnapshots = sqliteTable("metric_snapshots", {
  id: text("id").primaryKey(), workspaceId: text("workspace_id").notNull(), platform: text("platform").notNull(),
  contentId: text("content_id").notNull(), metricDate: text("metric_date").notNull(), metricName: text("metric_name").notNull(),
  metricValue: real("metric_value").notNull(), createdAt: text("created_at").notNull(), updatedAt: text("updated_at").notNull(),
}, (table) => [uniqueIndex("metric_snapshot_unique_idx").on(table.workspaceId, table.platform, table.contentId, table.metricDate, table.metricName)]);

export const platformConnections = sqliteTable("platform_connections", {
  id: text("id").primaryKey(), workspaceId: text("workspace_id").notNull(), platform: text("platform").notNull(),
  status: text("status").notNull(), accountLabel: text("account_label"), scopes: text("scopes"),
  lastSyncedAt: text("last_synced_at"), updatedAt: text("updated_at").notNull(),
}, (table) => [uniqueIndex("platform_connection_unique_idx").on(table.workspaceId, table.platform)]);

export const syncRuns = sqliteTable("sync_runs", {
  id: text("id").primaryKey(), workspaceId: text("workspace_id").notNull(), platform: text("platform").notNull(),
  status: text("status").notNull(), insertedCount: integer("inserted_count").notNull().default(0),
  updatedCount: integer("updated_count").notNull().default(0), skippedCount: integer("skipped_count").notNull().default(0),
  errorSummary: text("error_summary"), startedAt: text("started_at").notNull(), finishedAt: text("finished_at"),
});

export const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS feedback_records (
    id TEXT PRIMARY KEY,
    trace_code TEXT NOT NULL UNIQUE,
    workspace_id TEXT NOT NULL,
    platform TEXT NOT NULL,
    source_type TEXT NOT NULL,
    external_id TEXT,
    content_id TEXT,
    author_alias TEXT,
    summary TEXT NOT NULL,
    sentiment TEXT NOT NULL,
    need_tag TEXT NOT NULL,
    priority TEXT NOT NULL,
    status TEXT NOT NULL,
    assignee_email TEXT,
    next_action TEXT,
    occurred_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    archived_at TEXT,
    UNIQUE(workspace_id, platform, external_id)
  )`,
  `CREATE INDEX IF NOT EXISTS feedback_workspace_updated_idx
    ON feedback_records (workspace_id, updated_at DESC)`,
  `CREATE INDEX IF NOT EXISTS feedback_workspace_status_idx
    ON feedback_records (workspace_id, status, priority)`,
  `CREATE TABLE IF NOT EXISTS record_events (
    id TEXT PRIMARY KEY,
    record_id TEXT NOT NULL,
    workspace_id TEXT NOT NULL,
    actor_email TEXT NOT NULL,
    action TEXT NOT NULL,
    changes_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (record_id) REFERENCES feedback_records(id)
  )`,
  `CREATE INDEX IF NOT EXISTS events_record_created_idx
    ON record_events (record_id, created_at DESC)`,
  `CREATE TABLE IF NOT EXISTS metric_snapshots (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    platform TEXT NOT NULL,
    content_id TEXT NOT NULL,
    metric_date TEXT NOT NULL,
    metric_name TEXT NOT NULL,
    metric_value REAL NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(workspace_id, platform, content_id, metric_date, metric_name)
  )`,
  `CREATE TABLE IF NOT EXISTS platform_connections (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    platform TEXT NOT NULL,
    status TEXT NOT NULL,
    account_label TEXT,
    scopes TEXT,
    last_synced_at TEXT,
    updated_at TEXT NOT NULL,
    UNIQUE(workspace_id, platform)
  )`,
  `CREATE TABLE IF NOT EXISTS sync_runs (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    platform TEXT NOT NULL,
    status TEXT NOT NULL,
    inserted_count INTEGER NOT NULL DEFAULT 0,
    updated_count INTEGER NOT NULL DEFAULT 0,
    skipped_count INTEGER NOT NULL DEFAULT 0,
    error_summary TEXT,
    started_at TEXT NOT NULL,
    finished_at TEXT
  )`,
] as const;

export const supportedPlatforms = ["B站", "抖音", "小红书", "视频号", "公众号"] as const;
