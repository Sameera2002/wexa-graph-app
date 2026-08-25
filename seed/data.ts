// Realistic-ish seed data for a mid-sized e-commerce platform's service graph.
// Kept intentionally small (well within the free-tier limits) but deep enough
// to produce interesting multi-hop blast radii and incident correlations.

export type TierSeed = "critical" | "core" | "supporting";

export interface ServiceSeed {
  name: string;
  description: string;
  team: string;
  tier: TierSeed;
  language: string;
}

export const teams = [
  "Payments",
  "Storefront",
  "Fulfillment",
  "Platform",
  "Growth",
  "Data",
];

export const services: ServiceSeed[] = [
  // --- edge / bff layer ---
  { name: "web-storefront", description: "Customer-facing Next.js storefront", team: "Storefront", tier: "critical", language: "TypeScript" },
  { name: "mobile-bff", description: "Backend-for-frontend for iOS/Android apps", team: "Storefront", tier: "critical", language: "Go" },
  { name: "admin-console", description: "Internal ops & merchandising dashboard", team: "Platform", tier: "supporting", language: "TypeScript" },

  // --- storefront domain ---
  { name: "product-catalog", description: "Product listings, pricing, variants", team: "Storefront", tier: "critical", language: "Java" },
  { name: "search-service", description: "Product & content search", team: "Storefront", tier: "core", language: "Python" },
  { name: "recommendation-engine", description: "Personalized product recommendations", team: "Growth", tier: "supporting", language: "Python" },
  { name: "cart-service", description: "Shopping cart state", team: "Storefront", tier: "critical", language: "Go" },
  { name: "pricing-engine", description: "Dynamic pricing & discount rules", team: "Storefront", tier: "core", language: "Java" },

  // --- checkout / payments domain ---
  { name: "checkout-service", description: "Orchestrates the checkout flow", team: "Payments", tier: "critical", language: "Go" },
  { name: "payment-gateway", description: "Talks to external payment processors", team: "Payments", tier: "critical", language: "Java" },
  { name: "fraud-detection", description: "Real-time fraud scoring", team: "Payments", tier: "core", language: "Python" },
  { name: "tax-service", description: "Tax calculation by jurisdiction", team: "Payments", tier: "core", language: "Java" },
  { name: "invoice-service", description: "Generates & stores invoices", team: "Payments", tier: "supporting", language: "Java" },

  // --- order / fulfillment domain ---
  { name: "order-service", description: "Order lifecycle & state machine", team: "Fulfillment", tier: "critical", language: "Go" },
  { name: "inventory-service", description: "Stock levels across warehouses", team: "Fulfillment", tier: "critical", language: "Java" },
  { name: "shipping-service", description: "Rate shopping & label generation", team: "Fulfillment", tier: "core", language: "Python" },
  { name: "warehouse-gateway", description: "Integration with warehouse robotics", team: "Fulfillment", tier: "core", language: "Go" },
  { name: "returns-service", description: "Return merchandise authorizations", team: "Fulfillment", tier: "supporting", language: "Java" },
  { name: "notification-service", description: "Email/SMS/push notifications", team: "Platform", tier: "core", language: "Go" },

  // --- identity / platform domain ---
  { name: "identity-service", description: "AuthN/AuthZ, sessions, tokens", team: "Platform", tier: "critical", language: "Go" },
  { name: "user-profile-service", description: "Customer profile & preferences", team: "Platform", tier: "core", language: "Java" },
  { name: "config-service", description: "Central feature flags & config", team: "Platform", tier: "critical", language: "Go" },
  { name: "api-gateway", description: "Edge routing, rate limiting, auth check", team: "Platform", tier: "critical", language: "Go" },

  // --- data / infra layer ---
  { name: "orders-db", description: "Primary relational store for orders", team: "Data", tier: "critical", language: "PostgreSQL" },
  { name: "catalog-db", description: "Primary store for product catalog", team: "Data", tier: "critical", language: "PostgreSQL" },
  { name: "session-cache", description: "Distributed session/token cache", team: "Data", tier: "critical", language: "Redis" },
  { name: "event-bus", description: "Kafka event backbone", team: "Data", tier: "critical", language: "Kafka" },
  { name: "analytics-pipeline", description: "Streaming analytics & reporting", team: "Data", tier: "supporting", language: "Python" },
];

/** [from, to, critical] â€” `from` DEPENDS_ON `to`. */
export const dependencies: [string, string, boolean][] = [
  ["web-storefront", "api-gateway", true],
  ["mobile-bff", "api-gateway", true],
  ["admin-console", "api-gateway", false],

  ["api-gateway", "identity-service", true],
  ["api-gateway", "product-catalog", true],
  ["api-gateway", "cart-service", true],
  ["api-gateway", "checkout-service", true],
  ["api-gateway", "order-service", true],
  ["api-gateway", "search-service", false],
  ["api-gateway", "config-service", true],

  ["product-catalog", "catalog-db", true],
  ["product-catalog", "pricing-engine", true],
  ["product-catalog", "config-service", false],
  ["search-service", "product-catalog", true],
  ["recommendation-engine", "product-catalog", false],
  ["recommendation-engine", "user-profile-service", false],
  ["recommendation-engine", "analytics-pipeline", false],

  ["cart-service", "session-cache", true],
  ["cart-service", "product-catalog", true],
  ["cart-service", "pricing-engine", true],
  ["pricing-engine", "catalog-db", true],

  ["checkout-service", "cart-service", true],
  ["checkout-service", "payment-gateway", true],
  ["checkout-service", "fraud-detection", true],
  ["checkout-service", "tax-service", true],
  ["checkout-service", "order-service", true],
  ["checkout-service", "identity-service", true],
  ["payment-gateway", "fraud-detection", false],
  ["payment-gateway", "event-bus", true],
  ["fraud-detection", "user-profile-service", false],
  ["invoice-service", "order-service", true],
  ["invoice-service", "tax-service", false],

  ["order-service", "orders-db", true],
  ["order-service", "inventory-service", true],
  ["order-service", "event-bus", true],
  ["order-service", "notification-service", false],
  ["inventory-service", "warehouse-gateway", true],
  ["inventory-service", "catalog-db", false],
  ["shipping-service", "order-service", true],
  ["shipping-service", "warehouse-gateway", true],
  ["returns-service", "order-service", true],
  ["returns-service", "inventory-service", true],
  ["returns-service", "invoice-service", false],

  ["notification-service", "user-profile-service", false],
  ["notification-service", "event-bus", true],
  ["analytics-pipeline", "event-bus", true],

  ["identity-service", "session-cache", true],
  ["identity-service", "user-profile-service", false],
  ["user-profile-service", "catalog-db", false],
  ["config-service", "event-bus", false],
];

export interface PersonSeed {
  name: string;
  email: string;
  role: string;
  team: string;
}

export const people: PersonSeed[] = [
  { name: "Amara Diallo", email: "amara.diallo@example.com", role: "On-call SRE", team: "Payments" },
  { name: "Liam Chen", email: "liam.chen@example.com", role: "Backend Engineer", team: "Payments" },
  { name: "Sofia Rossi", email: "sofia.rossi@example.com", role: "Tech Lead", team: "Storefront" },
  { name: "Kenji Watanabe", email: "kenji.watanabe@example.com", role: "Backend Engineer", team: "Storefront" },
  { name: "Priya Nair", email: "priya.nair@example.com", role: "Tech Lead", team: "Fulfillment" },
  { name: "Owen Murphy", email: "owen.murphy@example.com", role: "SRE", team: "Fulfillment" },
  { name: "Grace Okafor", email: "grace.okafor@example.com", role: "Platform Engineer", team: "Platform" },
  { name: "Daniel Kim", email: "daniel.kim@example.com", role: "Platform Lead", team: "Platform" },
  { name: "Elena Petrova", email: "elena.petrova@example.com", role: "Data Engineer", team: "Data" },
  { name: "Marcus Webb", email: "marcus.webb@example.com", role: "Growth Engineer", team: "Growth" },
];

export interface DeploySeed {
  id: string;
  service: string;
  version: string;
  timestamp: string;
  status: "success" | "rolled_back";
}

export const deploys: DeploySeed[] = [
  { id: "dep-1001", service: "payment-gateway", version: "v2.14.0", timestamp: "2026-08-10T09:12:00Z", status: "rolled_back" },
  { id: "dep-1002", service: "session-cache", version: "v6.2.1", timestamp: "2026-08-14T22:40:00Z", status: "rolled_back" },
  { id: "dep-1003", service: "product-catalog", version: "v4.3.0", timestamp: "2026-08-17T15:05:00Z", status: "success" },
  { id: "dep-1004", service: "warehouse-gateway", version: "v1.9.2", timestamp: "2026-08-19T04:30:00Z", status: "rolled_back" },
  { id: "dep-1005", service: "config-service", version: "v3.0.0", timestamp: "2026-08-21T11:00:00Z", status: "rolled_back" },
];

export interface IncidentSeed {
  id: string;
  title: string;
  severity: "SEV1" | "SEV2" | "SEV3";
  startedAt: string;
  resolvedAt: string | null;
  rootCause: string;
  affectedService: string;
  causedByDeploy?: string;
  resolvedBy?: string;
}

export const incidents: IncidentSeed[] = [
  {
    id: "inc-501",
    title: "Checkout failures after payment gateway rollout",
    severity: "SEV1",
    startedAt: "2026-08-10T09:20:00Z",
    resolvedAt: "2026-08-10T10:45:00Z",
    rootCause: "Bad config in v2.14.0 caused payment-gateway to reject valid cards",
    affectedService: "payment-gateway",
    causedByDeploy: "dep-1001",
    resolvedBy: "Amara Diallo",
  },
  {
    id: "inc-502",
    title: "Sessions dropped platform-wide",
    severity: "SEV1",
    startedAt: "2026-08-14T22:45:00Z",
    resolvedAt: "2026-08-15T00:10:00Z",
    rootCause: "session-cache v6.2.1 memory leak triggered OOM restarts",
    affectedService: "session-cache",
    causedByDeploy: "dep-1002",
    resolvedBy: "Grace Okafor",
  },
  {
    id: "inc-503",
    title: "Cart totals showing stale prices",
    severity: "SEV2",
    startedAt: "2026-08-15T01:05:00Z",
    resolvedAt: "2026-08-15T02:00:00Z",
    rootCause: "cart-service served cached pricing after session-cache recovered mid-write",
    affectedService: "cart-service",
    resolvedBy: "Sofia Rossi",
  },
  {
    id: "inc-504",
    title: "Warehouse label generation stalled",
    severity: "SEV2",
    startedAt: "2026-08-19T04:35:00Z",
    resolvedAt: "2026-08-19T06:20:00Z",
    rootCause: "warehouse-gateway v1.9.2 broke the robotics protocol handshake",
    affectedService: "warehouse-gateway",
    causedByDeploy: "dep-1004",
    resolvedBy: "Owen Murphy",
  },
  {
    id: "inc-505",
    title: "Orders stuck in 'processing'",
    severity: "SEV1",
    startedAt: "2026-08-19T04:50:00Z",
    resolvedAt: "2026-08-19T06:30:00Z",
    rootCause: "inventory-service timed out waiting on warehouse-gateway",
    affectedService: "inventory-service",
    resolvedBy: "Priya Nair",
  },
  {
    id: "inc-506",
    title: "Returns could not be filed",
    severity: "SEV3",
    startedAt: "2026-08-19T05:10:00Z",
    resolvedAt: "2026-08-19T07:00:00Z",
    rootCause: "returns-service depends on inventory-service, which was degraded",
    affectedService: "returns-service",
    resolvedBy: "Priya Nair",
  },
  {
    id: "inc-507",
    title: "Feature flags frozen platform-wide",
    severity: "SEV1",
    startedAt: "2026-08-21T11:05:00Z",
    resolvedAt: "2026-08-21T11:50:00Z",
    rootCause: "config-service v3.0.0 lost connectivity to event-bus and served stale flags",
    affectedService: "config-service",
    causedByDeploy: "dep-1005",
    resolvedBy: "Daniel Kim",
  },
  {
    id: "inc-508",
    title: "Storefront showed outdated product prices",
    severity: "SEV2",
    startedAt: "2026-08-21T11:10:00Z",
    resolvedAt: "2026-08-21T12:00:00Z",
    rootCause: "product-catalog read stale config-service flags for pricing rollout",
    affectedService: "product-catalog",
    resolvedBy: "Kenji Watanabe",
  },
  {
    id: "inc-509",
    title: "Search results empty for ~15 minutes",
    severity: "SEV3",
    startedAt: "2026-08-17T15:30:00Z",
    resolvedAt: "2026-08-17T15:48:00Z",
    rootCause: "search-service reindex triggered by product-catalog v4.3.0 schema change",
    affectedService: "search-service",
    resolvedBy: "Sofia Rossi",
  },
  {
    id: "inc-510",
    title: "Recommendations panel blank on homepage",
    severity: "SEV3",
    startedAt: "2026-08-12T13:00:00Z",
    resolvedAt: "2026-08-12T13:40:00Z",
    rootCause: "analytics-pipeline backlog starved recommendation-engine of fresh features",
    affectedService: "recommendation-engine",
    resolvedBy: "Marcus Webb",
  },
  {
    id: "inc-511",
    title: "Notifications delayed by up to an hour",
    severity: "SEV3",
    startedAt: "2026-08-14T23:00:00Z",
    resolvedAt: "2026-08-15T00:05:00Z",
    rootCause: "notification-service backed up waiting on event-bus during session-cache incident",
    affectedService: "notification-service",
    resolvedBy: "Grace Okafor",
  },
  {
    id: "inc-512",
    title: "Admin console login outage",
    severity: "SEV2",
    startedAt: "2026-08-15T00:15:00Z",
    resolvedAt: "2026-08-15T00:50:00Z",
    rootCause: "identity-service session validation failing during session-cache recovery",
    affectedService: "identity-service",
    resolvedBy: "Daniel Kim",
  },
];
