CREATE TYPE "public"."permissions" AS ENUM('manage_users', 'edit_settings', 'mange_post');--> statement-breakpoint
CREATE TYPE "public"."role_user" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TABLE "communities" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" varchar(500) NOT NULL,
	"avatar_url" varchar(300),
	"created_by" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "community_admins" (
	"id" serial NOT NULL,
	"user_id" integer NOT NULL,
	"community_id" integer NOT NULL,
	"permissions" "permissions"[] NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "community_admins_community_id_user_id_pk" PRIMARY KEY("community_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "email_verifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer,
	"code" text NOT NULL,
	"expired_at" timestamp NOT NULL,
	"used" boolean DEFAULT false,
	"createdAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "forget_password" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar NOT NULL,
	"code" varchar NOT NULL,
	"expired_at" timestamp NOT NULL,
	"used" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"email" varchar(100) NOT NULL,
	"password" varchar(100) NOT NULL,
	"role" "role_user" DEFAULT 'user',
	"avatar_url" varchar(250),
	"bio" text,
	"email_verified" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "communities" ADD CONSTRAINT "communities_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_admins" ADD CONSTRAINT "community_admins_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_admins" ADD CONSTRAINT "community_admins_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_verifications" ADD CONSTRAINT "email_verifications_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;