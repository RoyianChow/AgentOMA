"use strict";
/* eslint-disable @typescript-eslint/no-require-imports */

const denied = () => {
  throw new Error("SBX_EGRESS_DENIED:EXTERNAL_TRANSPORT");
};

const http = require("node:http");
const https = require("node:https");
const net = require("node:net");
const tls = require("node:tls");
const dns = require("node:dns");
const dgram = require("node:dgram");

const isLoopbackHost = (value) => {
  if (!value) return false;
  const host = String(value).replace(/^\[|\]$/g, "").toLowerCase();
  return host === "localhost" || host === "::1" || host.startsWith("127.") || host.startsWith("::ffff:127.");
};

const hostFromStringArgs = (first, args) => {
  if (first.startsWith("\\\\.\\pipe\\")) return "localhost";
  if (/^[a-z][a-z\d+.-]*:\/\//i.test(first)) return new URL(first).hostname;
  if (typeof args[1] === "string") return args[1];
  return isLoopbackHost(first) ? first : undefined;
};

const hostFromObjectArg = (first) => first.socketPath ? "localhost" : first.hostname ?? first.host;

const hostFromArgs = (args) => {
  const first = args[0];
  if (typeof first === "string") return hostFromStringArgs(first, args);
  if (typeof first === "number") return typeof args[1] === "string" ? args[1] : "127.0.0.1";
  if (first && typeof first === "object") return hostFromObjectArg(first);
  return undefined;
};

const allowLocal = (args) => isLoopbackHost(hostFromArgs(args));
const denyExternal = (original) => function guardedTransport(...args) {
  return allowLocal(args) ? original.apply(this, args) : denied();
};

http.request = denyExternal(http.request);
http.get = denyExternal(http.get);
https.request = denyExternal(https.request);
https.get = denyExternal(https.get);
net.connect = denyExternal(net.connect);
net.createConnection = denyExternal(net.createConnection);
tls.connect = denyExternal(tls.connect);
dns.lookup = denyExternal(dns.lookup);
dns.resolve = denyExternal(dns.resolve);
dns.resolve4 = denyExternal(dns.resolve4);
dns.resolve6 = denyExternal(dns.resolve6);
dns.resolveAny = denyExternal(dns.resolveAny);
dns.resolveCaa = denyExternal(dns.resolveCaa);
dns.resolveCname = denyExternal(dns.resolveCname);
dns.resolveMx = denyExternal(dns.resolveMx);
dns.resolveNaptr = denyExternal(dns.resolveNaptr);
dns.resolveNs = denyExternal(dns.resolveNs);
dns.resolvePtr = denyExternal(dns.resolvePtr);
dns.resolveSoa = denyExternal(dns.resolveSoa);
dns.resolveSrv = denyExternal(dns.resolveSrv);
dns.resolveTxt = denyExternal(dns.resolveTxt);
dns.reverse = denyExternal(dns.reverse);
dgram.createSocket = denied;

if (typeof globalThis.fetch === "function") {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (...args) => allowLocal(args) ? originalFetch(...args) : denied();
}
if (typeof globalThis.WebSocket === "function") globalThis.WebSocket = denied;
if (typeof globalThis.EventSource === "function") globalThis.EventSource = denied;
