ALTER TABLE "order_details" ADD COLUMN "reference_image_public_id" varchar(255);--> statement-breakpoint
ALTER TABLE "order_details" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;