import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import { AnalysisService } from "../services/analysis-service";

const run = (filename: string, source: string) =>
	Effect.runPromise(
		Effect.gen(function* () {
			const analysisService = yield* AnalysisService;
			return yield* analysisService.analyzeFile(filename, source);
		}).pipe(
			Effect.provide(AnalysisService.Default)
		)
	);

describe("Domain Modeling Rule Tests", () => {
	describe("primitives-for-domain-concepts", () => {
		it("flags violation", async () => {
			const report = await run(
				"example.ts",
				`
type User = {
  id: string;
  name: string;
  email: string;
};

function processUser(user: User) {
  return user.name.toUpperCase();
}
`
			);
			expect(report.findings.some((f) => f.ruleId === "primitives-for-domain-concepts")).toBe(true);
		});

		it("does not flag safe variant", async () => {
			const report = await run(
				"example.ts",
				`
class UserId {
  constructor(public readonly value: string) {}
}

class UserName {
  constructor(public readonly value: string) {}
}

type User = {
  id: UserId;
  name: UserName;
};

function processUser(user: User) {
  return user.name.value.toUpperCase();
}
`
			);
			expect(report.findings.some((f) => f.ruleId === "primitives-for-domain-concepts")).toBe(false);
		});

		it("does not flag alternative safe variant", async () => {
			const report = await run(
				"example.ts",
				`
interface User {
  id: string;
  name: string;
}

function processUser(user: User) {
  return user.name.toUpperCase();
}
`
			);
			expect(report.findings.some((f) => f.ruleId === "primitives-for-domain-concepts")).toBe(false);
		});
	});

	describe("boolean-flags-controlling-behavior", () => {
		it("flags violation", async () => {
			const report = await run(
				"example.ts",
				`
function processData(data: any, isAdmin: boolean) {
  if (isAdmin) {
    return data.adminFields;
  }
  return data.userFields;
}
`
			);
			expect(report.findings.some((f) => f.ruleId === "boolean-flags-controlling-behavior")).toBe(true);
		});

		it("does not flag safe variant", async () => {
			const report = await run(
				"example.ts",
				`
type UserRole = "admin" | "user";

function processData(data: any, role: UserRole) {
  if (role === "admin") {
    return data.adminFields;
  }
  return data.userFields;
}
`
			);
			expect(report.findings.some((f) => f.ruleId === "boolean-flags-controlling-behavior")).toBe(false);
		});

		it("does not flag alternative safe variant", async () => {
			const report = await run(
				"example.ts",
				`
interface UserConfig {
  isAdmin: boolean;
}

function processData(data: any, config: UserConfig) {
  if (config.isAdmin) {
    return data.adminFields;
  }
  return data.userFields;
}
`
			);
			expect(report.findings.some((f) => f.ruleId === "boolean-flags-controlling-behavior")).toBe(false);
		});
	});

	describe("magic-string-domains", () => {
		it("flags violation", async () => {
			const report = await run(
				"example.ts",
				`
function getStatusMessage(status: string) {
  if (status === "active") {
    return "User is active";
  }
  if (status === "inactive") {
    return "User is inactive";
  }
  return "Unknown status";
}
`
			);
			expect(report.findings.some((f) => f.ruleId === "magic-string-domains")).toBe(true);
		});

		it("does not flag safe variant", async () => {
			const report = await run(
				"example.ts",
				`
type UserStatus = "active" | "inactive" | "pending";

function getStatusMessage(status: UserStatus) {
  switch (status) {
    case "active":
      return "User is active";
    case "inactive":
      return "User is inactive";
    case "pending":
      return "User is pending";
  }
}
`
			);
			expect(report.findings.some((f) => f.ruleId === "magic-string-domains")).toBe(false);
		});

		it("does not flag alternative safe variant", async () => {
			const report = await run(
				"example.ts",
				`
const STATUS_MESSAGES = {
  active: "User is active",
  inactive: "User is inactive",
  pending: "User is pending"
} as const;

function getStatusMessage(status: keyof typeof STATUS_MESSAGES) {
  return STATUS_MESSAGES[status];
}
`
			);
			expect(report.findings.some((f) => f.ruleId === "magic-string-domains")).toBe(false);
		});
	});

	describe("objects-as-implicit-state-machines", () => {
		it("flags violation", async () => {
			const report = await run(
				"example.ts",
				`
class Order {
  status: "pending" | "processing" | "completed" | "cancelled";
  
  process() {
    if (this.status === "pending") {
      this.status = "processing";
    }
    if (this.status === "processing") {
      this.status = "completed";
    }
  }
  
  cancel() {
    if (this.status === "pending" || this.status === "processing") {
      this.status = "cancelled";
    }
  }
}
`
			);
			expect(report.findings.some((f) => f.ruleId === "objects-as-implicit-state-machines")).toBe(true);
		});

		it("does not flag safe variant", async () => {
			const report = await run(
				"example.ts",
				`
type OrderState = "pending" | "processing" | "completed" | "cancelled";

class Order {
  private state: OrderState = "pending";
  
  process(): OrderState {
    this.state = this.getNextState(this.state);
    return this.state;
  }
  
  cancel(): OrderState {
    if (this.state === "pending" || this.state === "processing") {
      this.state = "cancelled";
    }
    return this.state;
  }
  
  private getNextState(current: OrderState): OrderState {
    switch (current) {
      case "pending": return "processing";
      case "processing": return "completed";
      default: return current;
    }
  }
}
`
			);
			expect(report.findings.some((f) => f.ruleId === "objects-as-implicit-state-machines")).toBe(false);
		});

		it("does not flag alternative safe variant", async () => {
			const report = await run(
				"example.ts",
				`
class Order {
  status: "pending" | "processing" | "completed" | "cancelled";
  
  constructor() {
    this.status = "pending";
  }
  
  getStatus() {
    return this.status;
  }
}
`
			);
			expect(report.findings.some((f) => f.ruleId === "objects-as-implicit-state-machines")).toBe(false);
		});
	});

	describe("domain-logic-in-conditionals", () => {
		it("flags violation", async () => {
			const report = await run(
				"example.ts",
				`
function calculateDiscount(price: number, customerType: string) {
  if (customerType === "premium") {
    return price * 0.8;
  }
  if (customerType === "vip") {
    return price * 0.7;
  }
  return price;
}
`
			);
			expect(report.findings.some((f) => f.ruleId === "domain-logic-in-conditionals")).toBe(true);
		});

		it("does not flag safe variant", async () => {
			const report = await run(
				"example.ts",
				`
class DiscountCalculator {
  static calculate(price: number, customerType: string) {
    const discount = this.getDiscountRate(customerType);
    return price * (1 - discount);
  }
  
  private static getDiscountRate(customerType: string): number {
    switch (customerType) {
      case "premium": return 0.2;
      case "vip": return 0.3;
      default: return 0;
    }
  }
}
`
			);
			expect(report.findings.some((f) => f.ruleId === "domain-logic-in-conditionals")).toBe(false);
		});

		it("does not flag alternative safe variant", async () => {
			const report = await run(
				"example.ts",
				`
function calculatePrice(price: number, discount: number) {
  return price * (1 - discount);
}
`
			);
			expect(report.findings.some((f) => f.ruleId === "domain-logic-in-conditionals")).toBe(false);
		});
	});

	describe("adhoc-error-semantics-in-domain", () => {
		it("flags violation", async () => {
			const report = await run(
				"example.ts",
				`
function validateEmail(email: string) {
  if (!email.includes("@")) {
    throw new Error("Invalid email format");
  }
  if (email.length > 100) {
    throw new Error("Email too long");
  }
  return email;
}
`
			);
			expect(report.findings.some((f) => f.ruleId === "adhoc-error-semantics-in-domain")).toBe(true);
		});

		it("does not flag safe variant", async () => {
			const report = await run(
				"example.ts",
				`
class InvalidEmailError extends Error {
  constructor(public readonly reason: string) {
    super(\`Invalid email: \${reason}\`);
  }
}

function validateEmail(email: string) {
  if (!email.includes("@")) {
    throw new InvalidEmailError("missing @ symbol");
  }
  if (email.length > 100) {
    throw new InvalidEmailError("too long");
  }
  return email;
}
`
			);
			expect(report.findings.some((f) => f.ruleId === "adhoc-error-semantics-in-domain")).toBe(false);
		});

		it("does not flag alternative safe variant", async () => {
			const report = await run(
				"example.ts",
				`
function checkEmail(email: string): boolean {
  return email.includes("@") && email.length <= 100;
}
`
			);
			expect(report.findings.some((f) => f.ruleId === "adhoc-error-semantics-in-domain")).toBe(false);
		});
	});

	describe("overloaded-config-objects", () => {
		it("flags violation", async () => {
			const report = await run(
				"example.ts",
				`
interface AppConfig {
  database: {
    host: string;
    port: number;
    ssl?: boolean;
  };
  api: {
    key: string;
    timeout: number;
    retries?: number;
  };
  logging?: {
    level: string;
    file?: string;
  };
}

function createConfig(overrides: Partial<AppConfig>): AppConfig {
  const defaults: AppConfig = {
    database: { host: "localhost", port: 5432 },
    api: { key: "default", timeout: 5000 }
  };
  return { ...defaults, ...overrides };
}
`
			);
			expect(report.findings.some((f) => f.ruleId === "overloaded-config-objects")).toBe(true);
		});

		it("does not flag safe variant", async () => {
			const report = await run(
				"example.ts",
				`
interface DatabaseConfig {
  host: string;
  port: number;
  ssl?: boolean;
}

interface ApiConfig {
  key: string;
  timeout: number;
  retries?: number;
}

interface LoggingConfig {
  level: string;
  file?: string;
}

interface AppConfig {
  database: DatabaseConfig;
  api: ApiConfig;
  logging?: LoggingConfig;
}

function createConfig(overrides: Partial<AppConfig>): AppConfig {
  const defaults: AppConfig = {
    database: { host: "localhost", port: 5432 },
    api: { key: "default", timeout: 5000 }
  };
  return { ...defaults, ...overrides };
}
`
			);
			expect(report.findings.some((f) => f.ruleId === "overloaded-config-objects")).toBe(false);
		});

		it("does not flag alternative safe variant", async () => {
			const report = await run(
				"example.ts",
				`
type Config = {
  database: { host: string; port: number };
  api: { key: string; timeout: number };
};

function getConfig(): Config {
  return {
    database: { host: "localhost", port: 5432 },
    api: { key: "default", timeout: 5000 }
  };
}
`
			);
			expect(report.findings.some((f) => f.ruleId === "overloaded-config-objects")).toBe(false);
		});
	});

	describe("domain-ids-as-raw-strings", () => {
		it("flags violation", async () => {
			const report = await run(
				"example.ts",
				`
interface User {
  id: string;
  name: string;
}

class UserRepository {
  findById(id: string): User | null {
    // Database lookup logic
    return null;
  }
  
  save(user: User): void {
    // Save logic
  }
}
`
			);
			expect(report.findings.some((f) => f.ruleId === "domain-ids-as-raw-strings")).toBe(true);
		});

		it("does not flag safe variant", async () => {
			const report = await run(
				"example.ts",
				`
class UserId {
  constructor(public readonly value: string) {}
  
  static generate(): UserId {
    return new UserId(crypto.randomUUID());
  }
}

interface User {
  id: UserId;
  name: string;
}

class UserRepository {
  findById(id: UserId): User | null {
    // Database lookup logic
    return null;
  }
  
  save(user: User): void {
    // Save logic
  }
}
`
			);
			expect(report.findings.some((f) => f.ruleId === "domain-ids-as-raw-strings")).toBe(false);
		});

		it("does not flag alternative safe variant", async () => {
			const report = await run(
				"example.ts",
				`
type User = {
  uuid: string;
  name: string;
};

function findUser(uuid: string): User | null {
  // Simple lookup
  return null;
}
`
			);
			expect(report.findings.some((f) => f.ruleId === "domain-ids-as-raw-strings")).toBe(false);
		});
	});

	describe("time-as-number-or-date", () => {
		it("flags violation", async () => {
			const report = await run(
				"example.ts",
				`
interface Event {
  id: string;
  timestamp: number;
  name: string;
}

function isRecent(event: Event): boolean {
  const now = Date.now();
  return (now - event.timestamp) < 86400000; // 24 hours
}

function formatEventTime(event: Event): string {
  return new Date(event.timestamp).toISOString();
}
`
			);
			expect(report.findings.some((f) => f.ruleId === "time-as-number-or-date")).toBe(true);
		});

		it("does not flag safe variant", async () => {
			const report = await run(
				"example.ts",
				`
class Timestamp {
  constructor(public readonly value: Date) {}
  
  static now(): Timestamp {
    return new Timestamp(new Date());
  }
  
  isWithinHours(hours: number): boolean {
    const now = new Date();
    const diffMs = now.getTime() - this.value.getTime();
    return diffMs < hours * 3600000;
  }
  
  toISOString(): string {
    return this.value.toISOString();
  }
}

interface Event {
  id: string;
  timestamp: Timestamp;
  name: string;
}

function isRecent(event: Event): boolean {
  return event.timestamp.isWithinHours(24);
}

function formatEventTime(event: Event): string {
  return event.timestamp.toISOString();
}
`
			);
			expect(report.findings.some((f) => f.ruleId === "time-as-number-or-date")).toBe(false);
		});

		it("does not flag alternative safe variant", async () => {
			const report = await run(
				"example.ts",
				`
function getCurrentTime(): number {
  return Date.now();
}

function formatDate(date: Date): string {
  return date.toISOString();
}
`
			);
			expect(report.findings.some((f) => f.ruleId === "time-as-number-or-date")).toBe(false);
		});
	});

	describe("domain-meaning-from-file-structure", () => {
		it("flags violation", async () => {
			const report = await run(
				"example.ts",
				`
// File: services/user.service.ts
export class UserService {
  getUser(id: string) {
    return fetch(\`/api/users/\${id}\`);
  }
}

// File: services/order.service.ts  
export class OrderService {
  getOrder(id: string) {
    return fetch(\`/api/orders/\${id}\`);
  }
}

// Usage based on file structure
function loadUser(id: string) {
  return UserService.getUser(id);
}

function loadOrder(id: string) {
  return OrderService.getOrder(id);
}
`
			);
			expect(report.findings.some((f) => f.ruleId === "domain-meaning-from-file-structure")).toBe(true);
		});

		it("does not flag safe variant", async () => {
			const report = await run(
				"example.ts",
				`
// File: domain/user.ts
export class User {
  constructor(public readonly id: string) {}
}

// File: domain/order.ts
export class Order {
  constructor(public readonly id: string) {}
}

// File: services/user.service.ts
export class UserService {
  getUser(id: string): Promise<User> {
    return fetch(\`/api/users/\${id}\`).then(res => res.json());
  }
}

// File: services/order.service.ts
export class OrderService {
  getOrder(id: string): Promise<Order> {
    return fetch(\`/api/orders/\${id}\`).then(res => res.json());
  }
}

function loadUser(id: string) {
  return UserService.getUser(id);
}

function loadOrder(id: string) {
  return OrderService.getOrder(id);
}
`
			);
			expect(report.findings.some((f) => f.ruleId === "domain-meaning-from-file-structure")).toBe(false);
		});

		it("does not flag alternative safe variant", async () => {
			const report = await run(
				"example.ts",
				`
// Simple utility functions
function getUser(id: string) {
  return fetch(\`/api/users/\${id}\`);
}

function getOrder(id: string) {
  return fetch(\`/api/orders/\${id}\`);
}
`
			);
			expect(report.findings.some((f) => f.ruleId === "domain-meaning-from-file-structure")).toBe(false);
		});
	});
});
