CREATE TYPE "public"."delivery_method" AS ENUM('DELIVERY', 'PICKUP');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('PENDING_REVIEW', 'REJECTED', 'WAITING_PAYMENT', 'DP_PAID', 'PAID', 'IN_PRODUCTION', 'READY_TO_SHIP', 'COMPLETED');--> statement-breakpoint
CREATE TYPE "public"."order_type" AS ENUM('CATALOG', 'CUSTOM');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('PENDING', 'SETTLEMENT', 'EXPIRE');--> statement-breakpoint
CREATE TYPE "public"."payment_type" AS ENUM('DP', 'FULL', 'REMAINING');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('CUSTOMER', 'ADMIN', 'CRAFTSMAN');--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "order_details" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"product_id" integer,
	"furniture_name" varchar(150) NOT NULL,
	"order_type" "order_type" NOT NULL,
	"width" integer,
	"height" integer,
	"length" integer,
	"is_size_customized" boolean DEFAULT false NOT NULL,
	"material" varchar(100),
	"finishing" varchar(100),
	"color" varchar(100),
	"quantity" integer DEFAULT 1 NOT NULL,
	"agreed_price" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"reference_image_url" text
);
--> statement-breakpoint
CREATE TABLE "order_progress" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"updated_by" integer NOT NULL,
	"status" "order_status" NOT NULL,
	"description" text,
	"image_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"status" "order_status" DEFAULT 'PENDING_REVIEW' NOT NULL,
	"delivery_method" "delivery_method" DEFAULT 'DELIVERY' NOT NULL,
	"shipping_address" text,
	"total_price" integer DEFAULT 0 NOT NULL,
	"estimated_days" integer,
	"admin_notes" text,
	"production_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"midtrans_order_id" varchar(100) NOT NULL,
	"payment_type" "payment_type" NOT NULL,
	"amount" integer NOT NULL,
	"status" "payment_status" DEFAULT 'PENDING' NOT NULL,
	"snap_url" text,
	"paid_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "payments_midtrans_order_id_unique" UNIQUE("midtrans_order_id")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"category_id" integer NOT NULL,
	"name" varchar(150) NOT NULL,
	"description" text,
	"base_price" integer NOT NULL,
	"default_material" varchar(100),
	"width" integer,
	"height" integer,
	"length" integer,
	"image_url" text,
	"is_available" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"email" varchar(100) NOT NULL,
	"password" text NOT NULL,
	"phone" varchar(20),
	"address" text,
	"role" "user_role" DEFAULT 'CUSTOMER' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "order_details" ADD CONSTRAINT "order_details_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_details" ADD CONSTRAINT "order_details_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_progress" ADD CONSTRAINT "order_progress_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_progress" ADD CONSTRAINT "order_progress_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;