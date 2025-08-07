ALTER TABLE "communities" DROP CONSTRAINT "communities_created_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "communities" ALTER COLUMN "created_by" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "communities" ADD CONSTRAINT "communities_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;