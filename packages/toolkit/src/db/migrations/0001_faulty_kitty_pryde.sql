ALTER TABLE "application_patterns" ADD COLUMN "validated" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "application_patterns" ADD COLUMN "validated_at" timestamp;--> statement-breakpoint
ALTER TABLE "effect_patterns" ADD COLUMN "validated" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "effect_patterns" ADD COLUMN "validated_at" timestamp;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "validated" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "validated_at" timestamp;--> statement-breakpoint
CREATE INDEX "application_patterns_validated_idx" ON "application_patterns" USING btree ("validated");--> statement-breakpoint
CREATE INDEX "effect_patterns_validated_idx" ON "effect_patterns" USING btree ("validated");--> statement-breakpoint
CREATE INDEX "jobs_validated_idx" ON "jobs" USING btree ("validated");