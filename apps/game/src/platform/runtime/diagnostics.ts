export type DiagnosticLevel = "debug" | "info" | "warning" | "error";
export type DiagnosticCategory =
  | "startup"
  | "runtime"
  | "network"
  | "asset"
  | "input"
  | "performance"
  | "security";

export interface DiagnosticEvent {
  readonly id: number;
  readonly at: number;
  readonly level: DiagnosticLevel;
  readonly category: DiagnosticCategory;
  readonly name: string;
  readonly message: string;
  readonly phase?: string;
  readonly durationMs?: number;
  readonly details?: Readonly<Record<string, string | number | boolean | null>>;
}

export interface DiagnosticInput {
  level: DiagnosticLevel;
  category: DiagnosticCategory;
  name: string;
  message: string;
  phase?: string;
  durationMs?: number;
  details?: Readonly<Record<string, string | number | boolean | null>>;
}

const SECRET_PATTERNS: readonly RegExp[] = [
  /bearer\s+[a-z0-9._~+\/-]+=*/gi,
  /(access_token|refresh_token|password|service_role|apikey)\s*[:=]\s*[^\s,;]+/gi
];

function redact(value: string): string {
  return SECRET_PATTERNS.reduce(
    (safe, pattern) => safe.replace(pattern, "[REDACTED]"),
    value
  ).slice(0, 500);
}

export class RuntimeDiagnostics {
  readonly #capacity: number;
  #events: DiagnosticEvent[] = [];
  #nextId = 1;

  constructor(capacity = 200) {
    if (!Number.isInteger(capacity) || capacity < 1) {
      throw new RangeError("Diagnostic capacity must be a positive integer");
    }
    this.#capacity = capacity;
  }

  record(input: DiagnosticInput): DiagnosticEvent {
    const event: DiagnosticEvent = Object.freeze({
      id: this.#nextId++,
      at: Date.now(),
      level: input.level,
      category: input.category,
      name: redact(input.name),
      message: redact(input.message),
      ...(input.phase ? { phase: redact(input.phase) } : {}),
      ...(typeof input.durationMs === "number" ? { durationMs: input.durationMs } : {}),
      ...(input.details ? { details: Object.freeze({ ...input.details }) } : {})
    });

    this.#events.push(event);
    if (this.#events.length > this.#capacity) {
      this.#events.splice(0, this.#events.length - this.#capacity);
    }
    return event;
  }

  snapshot(): readonly DiagnosticEvent[] {
    return this.#events.slice();
  }

  clear(): void {
    this.#events = [];
  }

  exportText(): string {
    return this.#events.map((event) => {
      const details = event.details ? ` ${JSON.stringify(event.details)}` : "";
      return `${new Date(event.at).toISOString()} [${event.level}] ${event.category}/${event.name}: ${event.message}${details}`;
    }).join("\n");
  }
}

export function toSafeErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return redact(message);
}
