"use strict";

const request = require("supertest");
const {BadRequestError, UnauthorizedError} = require('../expressError');

const db = require("../db");
const app = require("../app");

const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  u1Token,
  u4Token
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** POST /jobs */

describe("POST /jobs", function () {
  const newJob = {
    title: "new",
    salary: 100,
    equity: 0,
    companyHandle: "c1"
  };

  test("ok with admin", async function () {
    const resp = await request(app)
        .post("/jobs")
        .send(newJob)
        .set("authorization", `Bearer ${u4Token}`);
    expect(resp.statusCode).toEqual(201);
    expect(resp.body.job).toEqual(expect.objectContaining(
      {
        id: expect.any(Number),
        title: "new",
        salary: 100,
        equity: "0",
        companyHandle: "c1"
      }
      ))

  });

  test("not ok with non-admin", async function () {
    const resp = await request(app)
        .post("/jobs")
        .send(newJob)
        .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);

  });

  test("bad request with missing data", async function () {
    const resp = await request(app)
        .post("/jobs")
        .send({
          title: "new"
          })
        .set("authorization", `Bearer ${u4Token}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("bad request with invalid data", async function () {
    const resp = await request(app)
        .post("/jobs")
        .send({
          title: "new",
          salary: "not int, should be error",
          equity: 0,
          companyHandle: "c1"
        })
        .set("authorization", `Bearer ${u4Token}`);
    expect(resp.statusCode).toEqual(400);
  });
});

/************************************** GET /jobs */

describe("GET /jobs", function () {
  test("ok for anon", async function () {
    const resp = await request(app).get("/jobs");
    expect(resp.body.jobs[0]).toEqual(expect.objectContaining(
      {
        id: expect.any(Number),
        title: "j1",
        salary: 10,
        equity: expect.any(String),
        companyHandle: 'c1'
      }));
  });

  test("fails: test next() handler", async function () {
    // there's no normal failure event which will cause this route to fail ---
    // thus making it hard to test that the error-handler works with it. This
    // should cause an error, all right :)
    await db.query("DROP TABLE jobs CASCADE");
    const resp = await request(app)
        .get("/jobs")
        .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(500);
  });

  test("filter with title", async () => {
    const res = await request(app).get('/jobs').query({ title: 'j1' });
    expect(res.body.jobs[0]).toEqual(expect.objectContaining({companyHandle: "c1"})) 
    expect(res.body.jobs).toHaveLength(1);
  });

  test("filter with salary", async () => {
      const res = await request(app).get('/jobs').query({minSalary: 20})
      expect(res.body.jobs).toEqual([
        {
          id: 2,
          title: "j2",
          salary: 20,
          equity: expect.any(String),
          companyHandle: 'c2'
        },
        {
          id: 3,
          title: "j3",
          salary: 30,
          equity: expect.any(String),
          companyHandle: 'c3'
        },
      ]);

  });

    test("filter with minSalary & hasEquity =true", async () => {
   
      const res = await request(app).get('/jobs').query({ minSalary: 20, hasEquity: true });
      expect(res.body.jobs[0]).toEqual(expect.objectContaining({id: 3}))
    });

    test("filter with minSalary & hasEquity =false", async () => {
   
      const res = await request(app).get('/jobs').query({ minSalary: 20, hasEquity: false });
      expect(res.body.jobs).toHaveLength(2);
      expect(res.body.jobs).toEqual([
        {
          id: 2,
          title: "j2",
          salary: 20,
          equity: "0",
          companyHandle: 'c2'
        },
        {
          id: 3,
          title: "j3",
          salary: 30,
          equity: "0.1",
          companyHandle: 'c3'
        },
      ]);
    });
});

// /************************************** GET /jobs/:id */

describe("GET /jobs/:id", function () {
  test("works for anon", async function () {
    const resp = await request(app).get(`/jobs/1`);
    expect(resp.body.job).toEqual(expect.objectContaining(
      {
        id: 1,
        title: "j1",
        salary: 10,
        equity: "0",
        companyHandle: 'c1'
      }
      ));
  });

  test("not found for no such job", async function () {
    const resp = await request(app).get(`/jobs/7`);
    expect(resp.statusCode).toEqual(404);
  });
});

// /************************************** PATCH /jobs/:id */

describe("PATCH /jobs/:id", function () {
  test("works for adnim", async function () {
    const resp = await request(app)
        .patch(`/jobs/1`)
        .send({
          title: "j1 updated",
        })
        .set("authorization", `Bearer ${u4Token}`);
    expect(resp.body.job).toEqual({
        id: 1,
        title: "j1 updated",
        salary: 10,
        equity: "0",
        companyHandle: 'c1'
      },
    );
  });

  test("unauth for anon", async function () {
    const resp = await request(app)
        .patch(`/jobs/1`)
        .send({
          title: "j1 newlyupdated",
        });
    expect(resp.statusCode).toEqual(401);
  });

  test("unauth for non-admin", async function () {
    const resp = await request(app)
        .patch(`/jobs/1`)
        .send({
          name: "non-admin",
        })
        .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);
  });

  test("not found on no such job", async function () {
    const resp = await request(app)
        .patch(`/jobs/100`)
        .send({
          title: "new nope",
        })
        .set("authorization", `Bearer ${u4Token}`);
    expect(resp.statusCode).toEqual(404);
  });

  test("bad request on id change attempt", async function () {
    const resp = await request(app)
        .patch(`/jobs/1`)
        .send({
          id: 7,
        })
        .set("authorization", `Bearer ${u4Token}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("bad request on invalid data", async function () {
    const resp = await request(app)
        .patch(`/jobs/1`)
        .send({
          salary: "salary should be int",
        })
        .set("authorization", `Bearer ${u4Token}`);
    expect(resp.statusCode).toEqual(400);
  });
});

// /************************************** DELETE /jobs/:id */

describe("DELETE /jobs/:id", function () {
  test("works for admin", async function () {
    const resp = await request(app)
        .delete(`/jobs/1`)
        .set("authorization", `Bearer ${u4Token}`);
    expect(resp.body).toEqual({ deleted: "1" });
  });

  test("unauth for non-admin", async function () {
    const resp = await request(app)
        .delete(`/jobs/1`)
        .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);
  });

  test("unauth for anon", async function () {
    const resp = await request(app)
        .delete(`/jobs/1`);
    expect(resp.statusCode).toEqual(401);
  });

  test("not found for no such job", async function () {
    const resp = await request(app)
        .delete(`/jobs/7`)
        .set("authorization", `Bearer ${u4Token}`);
    expect(resp.statusCode).toEqual(404);
  });
});
