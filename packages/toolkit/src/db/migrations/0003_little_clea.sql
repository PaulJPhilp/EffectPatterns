CREATE TABLE "skill_patterns" (
	"skill_id" uuid NOT NULL,
	"pattern_id" uuid NOT NULL,
	CONSTRAINT "skill_patterns_skill_id_pattern_id_pk" PRIMARY KEY("skill_id","pattern_id")
);
--> statement-breakpoint
CREATE TABLE "skills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"category" varchar(100),
	"content" text,
	"version" integer DEFAULT 1 NOT NULL,
	"pattern_count" integer DEFAULT 0 NOT NULL,
	"application_pattern_id" uuid,
	"validated" boolean DEFAULT false NOT NULL,
	"validated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "skills_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "skill_patterns" ADD CONSTRAINT "skill_patterns_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_patterns" ADD CONSTRAINT "skill_patterns_pattern_id_effect_patterns_id_fk" FOREIGN KEY ("pattern_id") REFERENCES "public"."effect_patterns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skills" ADD CONSTRAINT "skills_application_pattern_id_application_patterns_id_fk" FOREIGN KEY ("application_pattern_id") REFERENCES "public"."application_patterns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "skill_patterns_skill_idx" ON "skill_patterns" USING btree ("skill_id");--> statement-breakpoint
CREATE INDEX "skill_patterns_pattern_idx" ON "skill_patterns" USING btree ("pattern_id");--> statement-breakpoint
CREATE UNIQUE INDEX "skills_slug_idx" ON "skills" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "skills_category_idx" ON "skills" USING btree ("category");--> statement-breakpoint
CREATE INDEX "skills_application_pattern_idx" ON "skills" USING btree ("application_pattern_id");--> statement-breakpoint
CREATE INDEX "skills_validated_idx" ON "skills" USING btree ("validated");