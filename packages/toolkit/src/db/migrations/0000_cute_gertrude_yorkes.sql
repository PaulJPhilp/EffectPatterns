CREATE TABLE "application_patterns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"learning_order" integer NOT NULL,
	"effect_module" varchar(100),
	"sub_patterns" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "application_patterns_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "effect_patterns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(255) NOT NULL,
	"title" varchar(500) NOT NULL,
	"summary" text NOT NULL,
	"skill_level" varchar(50) NOT NULL,
	"category" varchar(100),
	"difficulty" varchar(50),
	"tags" jsonb DEFAULT '[]'::jsonb,
	"examples" jsonb DEFAULT '[]'::jsonb,
	"use_cases" jsonb DEFAULT '[]'::jsonb,
	"rule" jsonb,
	"content" text,
	"author" varchar(255),
	"lesson_order" integer,
	"application_pattern_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "effect_patterns_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"category" varchar(100),
	"status" varchar(50) NOT NULL,
	"application_pattern_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "jobs_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "pattern_jobs" (
	"pattern_id" uuid NOT NULL,
	"job_id" uuid NOT NULL,
	CONSTRAINT "pattern_jobs_pattern_id_job_id_pk" PRIMARY KEY("pattern_id","job_id")
);
--> statement-breakpoint
CREATE TABLE "pattern_relations" (
	"pattern_id" uuid NOT NULL,
	"related_pattern_id" uuid NOT NULL,
	CONSTRAINT "pattern_relations_pattern_id_related_pattern_id_pk" PRIMARY KEY("pattern_id","related_pattern_id")
);
--> statement-breakpoint
ALTER TABLE "effect_patterns" ADD CONSTRAINT "effect_patterns_application_pattern_id_application_patterns_id_fk" FOREIGN KEY ("application_pattern_id") REFERENCES "public"."application_patterns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_application_pattern_id_application_patterns_id_fk" FOREIGN KEY ("application_pattern_id") REFERENCES "public"."application_patterns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pattern_jobs" ADD CONSTRAINT "pattern_jobs_pattern_id_effect_patterns_id_fk" FOREIGN KEY ("pattern_id") REFERENCES "public"."effect_patterns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pattern_jobs" ADD CONSTRAINT "pattern_jobs_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pattern_relations" ADD CONSTRAINT "pattern_relations_pattern_id_effect_patterns_id_fk" FOREIGN KEY ("pattern_id") REFERENCES "public"."effect_patterns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pattern_relations" ADD CONSTRAINT "pattern_relations_related_pattern_id_effect_patterns_id_fk" FOREIGN KEY ("related_pattern_id") REFERENCES "public"."effect_patterns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "application_patterns_slug_idx" ON "application_patterns" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "application_patterns_learning_order_idx" ON "application_patterns" USING btree ("learning_order");--> statement-breakpoint
CREATE UNIQUE INDEX "effect_patterns_slug_idx" ON "effect_patterns" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "effect_patterns_skill_level_idx" ON "effect_patterns" USING btree ("skill_level");--> statement-breakpoint
CREATE INDEX "effect_patterns_category_idx" ON "effect_patterns" USING btree ("category");--> statement-breakpoint
CREATE INDEX "effect_patterns_application_pattern_idx" ON "effect_patterns" USING btree ("application_pattern_id");--> statement-breakpoint
CREATE UNIQUE INDEX "jobs_slug_idx" ON "jobs" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "jobs_status_idx" ON "jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "jobs_application_pattern_idx" ON "jobs" USING btree ("application_pattern_id");--> statement-breakpoint
CREATE INDEX "pattern_jobs_pattern_idx" ON "pattern_jobs" USING btree ("pattern_id");--> statement-breakpoint
CREATE INDEX "pattern_jobs_job_idx" ON "pattern_jobs" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "pattern_relations_pattern_idx" ON "pattern_relations" USING btree ("pattern_id");--> statement-breakpoint
CREATE INDEX "pattern_relations_related_idx" ON "pattern_relations" USING btree ("related_pattern_id");