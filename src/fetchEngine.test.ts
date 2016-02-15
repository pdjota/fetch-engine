/// <reference path="./.d.test.ts" />
"use strict";
import test = require("ava");
import fetchEngine from "./fetchEngine";
import FetchGroup from "./FetchGroup";
import { Mock } from "./utils/mocks";
import Request from "./Request";
import Response from "./Response";

test("fetchEngine is requireable", (t: TestAssertions) => {
  t.ok(fetchEngine);
});

test("fetchEngine with no args returns a response", (t: TestAssertions) => {
  const fetch = fetchEngine();
  return fetch(new Request("/mock"))
    .then((res: FetchResponse) => {
      t.ok(res);
    });
});

test("fetchEngine with shouldFetch false throws", (t: TestAssertions) => {
  const fetch = fetchEngine(new FetchGroup({
    plugins: [
      new Mock({
        shouldFetch: (): boolean => false
      })
    ]
  }));
  return t.throws(
    fetch(new Request("/mock")),
    Error
  );
});

test(
  "fetchEngine with getRequest passes transformed request to willFetch",
  (t: TestAssertions) => {
    t.plan(2);
    const firstMockReq = new Request("/mock");
    const secondMockReq = new Request("/mock/other");
    const fetch = fetchEngine(new FetchGroup({
      plugins: [
        new Mock({
          getRequest: (req: FetchRequest): Promise<FetchRequest> => {
            t.same(req, firstMockReq);
            return Promise.resolve(secondMockReq);
          },
          willFetch: (req: FetchRequest): void => {
            t.same(req, secondMockReq);
          }
        })
      ]
    }));
    return fetch(firstMockReq);
  }
);

test(
  "fetchEngine with fetch passes request and next function",
  (t: TestAssertions) => {
    t.plan(2);
    const mockReq = new Request("/mock");
    const fetch = fetchEngine(new FetchGroup({
      plugins: [
        new Mock({
          fetch: (
            req: FetchRequest,
            next: () => Promise<FetchResponse>
          ): Promise<FetchResponse> => {
            t.same(req, mockReq);
            t.same(typeof next, "function");
            return next();
          }
        })
      ]
    }));
    return fetch(mockReq);
  }
);

test(
  "fetchEngine with fetching passes promise and original request",
  (t: TestAssertions) => {
    t.plan(3);
    const mockReq = new Request("/mock");
    const fetch = fetchEngine(new FetchGroup({
      plugins: [
        new Mock({
          fetching: (args: FetchFetchingArgs): void => {
            t.same(args.request, mockReq);
            t.ok(args.promise);
            t.same(typeof args.promise.then, "function");
          }
        })
      ]
    }));
    return fetch(mockReq);
  }
);

test(
  "fetchEngine with getResponse passes transformed response to didFetch",
  (t: TestAssertions) => {
    t.plan(1);
    const mockReq = new Request("/mock");
    const mockRes = new Response();
    const fetch = fetchEngine(new FetchGroup({
      plugins: [
        new Mock({
          getResponse: (res: FetchResponse): Promise<FetchResponse> => {
            return Promise.resolve(mockRes);
          },
          didFetch: (res: FetchResponse): void => {
            t.same(res, mockRes);
          }
        })
      ]
    }));
    return fetch(mockReq);
  }
);

test(
  "fetchEngine flows through full stack in order",
  (t: TestAssertions) => {
    t.plan(6);
    const firstMockReq = new Request("/mock");
    const secondMockReq = new Request("/mock");
    const firstMockRes = new Response();
    const fetch = fetchEngine(new FetchGroup({
      plugins: [
        new Mock({
          shouldFetch: (req: FetchRequest): boolean => {
            t.same(req, firstMockReq);
            return true;
          },
          getRequest: (req: FetchRequest): Promise<FetchRequest> => {
            t.same(req, firstMockReq);
            return Promise.resolve(secondMockReq);
          },
          willFetch: (req: FetchRequest): void => {
            t.same(req, secondMockReq);
          },
          fetch: (
            req: FetchRequest,
            next: () => Promise<FetchResponse>
          ): Promise<FetchResponse> => {
            t.same(req, secondMockReq);
            return next();
          },
          fetching: (args: FetchFetchingArgs): void => {
            t.same(args.request, secondMockReq);
          },
          getResponse: (res: FetchResponse): Promise<FetchResponse> => {
            // TODO find a way to fake the retured response
            return Promise.resolve(firstMockRes);
          },
          didFetch: (res: FetchResponse): void => {
            t.same(res, firstMockRes);
          }
        })
      ]
    }));
    return fetch(firstMockReq);
  }
);
