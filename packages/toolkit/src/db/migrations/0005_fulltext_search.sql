ALTER TABLE "effect_patterns" ADD COLUMN "search_vector" tsvector;--> statement-breakpoint
CREATE OR REPLACE FUNCTION effect_patterns_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.summary, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(
      (SELECT string_agg(tag, ' ') FROM jsonb_array_elements_text(COALESCE(NEW.tags, '[]'::jsonb)) AS tag),
      ''
    )), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER effect_patterns_search_vector_trigger
  BEFORE INSERT OR UPDATE OF title, summary, tags
  ON "effect_patterns"
  FOR EACH ROW
  EXECUTE FUNCTION effect_patterns_search_vector_update();--> statement-breakpoint
UPDATE "effect_patterns" SET search_vector =
  setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(summary, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(
    (SELECT string_agg(tag, ' ') FROM jsonb_array_elements_text(COALESCE(tags, '[]'::jsonb)) AS tag),
    ''
  )), 'C');--> statement-breakpoint
CREATE INDEX "effect_patterns_search_vector_idx" ON "effect_patterns" USING GIN("search_vector");
