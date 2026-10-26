CREATE TABLE `analyses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`vacancy_id` integer NOT NULL,
	`profile_hash` text NOT NULL,
	`model` text NOT NULL,
	`score` integer NOT NULL,
	`summary` text NOT NULL,
	`pros` text DEFAULT '[]' NOT NULL,
	`cons` text DEFAULT '[]' NOT NULL,
	`red_flags` text DEFAULT '[]' NOT NULL,
	`data` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`vacancy_id`) REFERENCES `vacancies`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `analyses_cache_key` ON `analyses` (`vacancy_id`,`profile_hash`,`model`);--> statement-breakpoint
CREATE TABLE `filter_results` (
	`vacancy_id` integer PRIMARY KEY NOT NULL,
	`passed` integer NOT NULL,
	`reasons` text DEFAULT '[]' NOT NULL,
	`bonus` real DEFAULT 0 NOT NULL,
	`evaluated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`vacancy_id`) REFERENCES `vacancies`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `letters` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`vacancy_id` integer NOT NULL,
	`version` integer NOT NULL,
	`body` text NOT NULL,
	`model` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`vacancy_id`) REFERENCES `vacancies`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `letters_vacancy_version` ON `letters` (`vacancy_id`,`version`);--> statement-breakpoint
CREATE TABLE `profile` (
	`id` integer PRIMARY KEY NOT NULL,
	`resume` text DEFAULT '' NOT NULL,
	`preferences` text DEFAULT '' NOT NULL,
	`letter_examples` text DEFAULT '[]' NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`trigger` text NOT NULL,
	`status` text NOT NULL,
	`started_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`finished_at` integer,
	`stats` text,
	`error` text
);
--> statement-breakpoint
CREATE TABLE `search_vacancies` (
	`search_id` integer NOT NULL,
	`vacancy_id` integer NOT NULL,
	`found_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	PRIMARY KEY(`search_id`, `vacancy_id`),
	FOREIGN KEY (`search_id`) REFERENCES `searches`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`vacancy_id`) REFERENCES `vacancies`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `searches` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`source` text DEFAULT 'hh' NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`params` text DEFAULT '{}' NOT NULL,
	`rules` text DEFAULT '{}' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `vacancies` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source` text NOT NULL,
	`external_id` text NOT NULL,
	`url` text NOT NULL,
	`title` text NOT NULL,
	`company` text,
	`company_id` text,
	`area` text,
	`salary_from` integer,
	`salary_to` integer,
	`salary_currency` text,
	`salary_gross` integer,
	`work_format` text,
	`experience` text,
	`employment` text,
	`skills` text DEFAULT '[]' NOT NULL,
	`description` text,
	`published_at` integer,
	`first_seen_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`last_seen_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`archived` integer DEFAULT false NOT NULL,
	`raw` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `vacancies_source_external_id` ON `vacancies` (`source`,`external_id`);--> statement-breakpoint
CREATE INDEX `vacancies_first_seen_at` ON `vacancies` (`first_seen_at`);--> statement-breakpoint
CREATE TABLE `vacancy_state` (
	`vacancy_id` integer PRIMARY KEY NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`comment` text,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`vacancy_id`) REFERENCES `vacancies`(`id`) ON UPDATE no action ON DELETE cascade
);
