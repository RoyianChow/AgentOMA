import {
  serializeTask04ServiceCatalogSuccess,
  type Task04ServiceCatalogSuccess,
} from "../../../booking/service-catalog-contracts";
import {
  mapTask04SafeError,
  Task04KnownFailure,
  type Task04SafeError,
} from "../../../booking/safe-errors";
import {
  createTask04SandboxSql,
  type Task04SandboxSql,
} from "../../../db/client";
import {
  executeTask04PublicServiceCatalog,
  type Task04ServiceCatalogResult,
} from "../../../db/service-catalog";
import { closeTask04SandboxSql } from "../../../db/transaction";
import {
  loadTask04SandboxEnv,
  type Task04SandboxEnv,
} from "../../../env/server";
import { responseHeaders } from "../../../security/headers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const EMPTY_CATALOG_REQUEST = new TextEncoder().encode("{}");

type Task04ServiceCatalogRouteDependencies = Readonly<{
  loadEnvironment: () => Task04SandboxEnv;
  readCatalog: (
    environment: Task04SandboxEnv,
  ) => Promise<Task04ServiceCatalogResult>;
}>;

async function closeCatalogConnection(
  sql: Task04SandboxSql | undefined,
): Promise<unknown | undefined> {
  if (sql === undefined) return undefined;
  try {
    await closeTask04SandboxSql(sql);
    return undefined;
  } catch (failure) {
    return failure;
  }
}

async function readCatalogFromPostgres(
  environment: Task04SandboxEnv,
): Promise<Task04ServiceCatalogResult> {
  let sql: Task04SandboxSql | undefined;
  let result: Task04ServiceCatalogResult | undefined;
  let failure: unknown;
  try {
    sql = createTask04SandboxSql(environment);
    result = await executeTask04PublicServiceCatalog(
      sql,
      environment,
      EMPTY_CATALOG_REQUEST,
    );
  } catch (caughtFailure) {
    failure = caughtFailure;
  }
  const closeFailure = await closeCatalogConnection(sql);
  if (
    failure !== undefined ||
    closeFailure !== undefined ||
    result === undefined
  ) {
    return mapTask04SafeError(
      "availability:query",
      failure ?? closeFailure,
    );
  }
  return result;
}

const defaultDependencies: Task04ServiceCatalogRouteDependencies =
  Object.freeze({
    loadEnvironment: () => loadTask04SandboxEnv(),
    readCatalog: readCatalogFromPostgres,
  });

function jsonHeaders(): Headers {
  return responseHeaders({
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
  });
}

function publicFailureResponse(
  failure: Task04SafeError,
): Response {
  const status =
    failure.error.code === "REQUEST_INVALID"
      ? 400
      : failure.error.code === "RATE_LIMIT_REACHED"
        ? 429
        : 503;
  return new Response(
    JSON.stringify({
      success: false,
      error: {
        message: failure.error.message,
      },
    }),
    {
      status,
      headers: jsonHeaders(),
    },
  );
}

function safeTemporaryFailureResponse(): Response {
  return publicFailureResponse(
    mapTask04SafeError(
      "availability:query",
      new Task04KnownFailure("TEMPORARILY_UNAVAILABLE"),
    ),
  );
}

function successResponse(
  result: Task04ServiceCatalogSuccess,
): Response {
  const serialized =
    serializeTask04ServiceCatalogSuccess(result).serialized;
  return new Response(serialized, {
    status: 200,
    headers: jsonHeaders(),
  });
}

export function createTask04ServiceCatalogGetHandler(
  dependencies: Task04ServiceCatalogRouteDependencies =
    defaultDependencies,
) {
  return async function GET(request: Request): Promise<Response> {
    try {
      const environment = dependencies.loadEnvironment();
      const requestUrl = new URL(request.url);
      if (
        requestUrl.origin !== environment.origin ||
        [...requestUrl.searchParams].length !== 0
      ) {
        return publicFailureResponse(
          mapTask04SafeError(
            "availability:query",
            new Task04KnownFailure("REQUEST_INVALID"),
          ),
        );
      }
      const result =
        await dependencies.readCatalog(environment);
      return result.success
        ? successResponse(result)
        : publicFailureResponse(result);
    } catch {
      return safeTemporaryFailureResponse();
    }
  };
}

export const GET = createTask04ServiceCatalogGetHandler();
