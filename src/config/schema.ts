import { pgTable, pgEnum, serial, integer, varchar, text, boolean, timestamp } from "drizzle-orm/pg-core";

// ENUM
export const userRoleEnum = pgEnum("user_role", [
    "CUSTOMER",
    "ADMIN",
    "CRAFTSMAN", ]);

export const orderTypeEnum = pgEnum("order_type", [
    "CATALOG",
    "CUSTOM",
]);

export const deliveryMethodEnum = pgEnum("delivery_method", [
    "DELIVERY",
    "PICKUP",
]);

export const orderStatusEnum = pgEnum("order_status", [
    "PENDING_REVIEW",
    "REJECTED",
    "WAITING_PAYMENT",
    "DP_PAID",
    "PAID",
    "IN_PRODUCTION",
    "READY_TO_SHIP",
    "COMPLETED",
]);

export const paymentTypeEnum = pgEnum("payment_type", [
    "DP",
    "FULL",
    "REMAINING",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
    "PENDING",
    "SETTLEMENT",
    "EXPIRE",
]);

// 1. USERS
export const usersTable = pgTable("users", {
    id: serial("id").primaryKey(),
    username: varchar("username", { length: 100 }).notNull(),
    email: varchar("email", { length: 100 }).notNull().unique(),
    password: text("password").notNull(),
    phone: varchar("phone", { length: 20 }),
    address: text("address"),
    profileImage: text("profile_image"),
    profileImagePublicId: varchar("profile_image_public_id", { length: 255 }),
    role: userRoleEnum("role").default("CUSTOMER").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 2. CATEGORIES
export const categoriesTable = pgTable("categories", {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 100 }).notNull().unique(),
    description: text("description"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 3. PRODUCTS
export const productsTable = pgTable("products", {
    id: serial("id").primaryKey(),
    categoryId: integer("category_id")
        .references(() => categoriesTable.id)
        .notNull(),
    name: varchar("name", { length: 150 }).notNull(),
    description: text("description"),
    basePrice: integer("base_price").notNull(),
    defaultMaterial: varchar("default_material", { length: 100 }),
    width: integer("width"),
    height: integer("height"),
    length: integer("length"),
    imageUrl: text("image_url"),
    imagePublicId: varchar("image_public_id", {length: 255}),
    isAvailable: boolean("is_available").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 4. ORDERS
export const ordersTable = pgTable("orders", {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
        .references(() => usersTable.id)
        .notNull(),
    orderType: orderTypeEnum("order_type").notNull(),
    status: orderStatusEnum("status")
        .default("PENDING_REVIEW")
        .notNull(),
    deliveryMethod: deliveryMethodEnum("delivery_method")
        .default("DELIVERY")
        .notNull(),
    shippingAddress: text("shipping_address"),
    totalPrice: integer("total_price").default(0).notNull(),
    estimatedDays: integer("estimated_days"),
    adminNotes: text("admin_notes"),
    productionNotes: text("production_notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 5. ORDER DETAILS
export const orderDetailsTable = pgTable("order_details", {
    id: serial("id").primaryKey(),
    orderId: integer("order_id")
        .references(() => ordersTable.id, { onDelete: "cascade" })
        .notNull(),
    productId: integer("product_id")
        .references(() => productsTable.id, { onDelete: "set null" }),
    categoryId: integer("category_id")
        .references(() => categoriesTable.id),
    furnitureName: varchar("furniture_name", { length: 150 }).notNull(),
    orderType: orderTypeEnum("order_type").notNull(),
    width: integer("width"),
    height: integer("height"),
    length: integer("length"),
    // Menandakan apakah ukuran katalog diubah customer
    isSizeCustomized: boolean("is_size_customized")
        .default(false)
        .notNull(),
    material: varchar("material", { length: 100 }),
    finishing: varchar("finishing", { length: 100 }),
    color: varchar("color", { length: 100 }),
    quantity: integer("quantity").default(1).notNull(),
    agreedPrice: integer("agreed_price").default(0).notNull(),
    notes: text("notes"),
    referenceImageUrl: text("reference_image_url"),
});

// 6. PAYMENTS
export const paymentsTable = pgTable("payments", {
    id: serial("id").primaryKey(),
    orderId: integer("order_id")
        .references(() => ordersTable.id, { onDelete: "cascade" })
        .notNull(),
    midtransOrderId: varchar("midtrans_order_id", { length: 100 })
        .notNull()
        .unique(),
    paymentType: paymentTypeEnum("payment_type").notNull(),
    amount: integer("amount").notNull(),
    status: paymentStatusEnum("status")
        .default("PENDING")
        .notNull(),
    snapUrl: text("snap_url"),
    paidAt: timestamp("paid_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 7. ORDER PROGRESS
export const orderProgressTable = pgTable("order_progress", {
    id: serial("id").primaryKey(),
    orderId: integer("order_id")
        .references(() => ordersTable.id, { onDelete: "cascade" })
        .notNull(),
    // Pengrajin yang mengunggah perkembangan pengerjaan
    updatedBy: integer("updated_by")
        .references(() => usersTable.id)
        .notNull(),
    status: orderStatusEnum("status").notNull(),
    description: text("description"),
    imageUrl: text("image_url"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});