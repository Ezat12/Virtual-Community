ALTER TABLE "community" RENAME TO "communities";--> statement-breakpoint
ALTER TABLE "communities" DROP CONSTRAINT "community_created_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "communities" ADD CONSTRAINT "communities_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;