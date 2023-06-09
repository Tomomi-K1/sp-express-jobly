"use strict";

const db = require("../db.js");
const { BadRequestError, NotFoundError } = require("../expressError");
const Job = require("./job");
const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** create */

describe("create", function () {
  const newJob = {
    title: "new",
    salary: 100,
    equity: "0",
    companyHandle: "c1"
  };

  test("works", async function () {
    let job = await Job.create(newJob);
    expect(job).toEqual(expect.objectContaining({title:'new'}));

    const result = await db.query(
          `SELECT id, title, salary, equity, company_handle
           FROM jobs
           WHERE title = 'new'`);
           console.log(result.rows);
    expect(result.rows[0]).toEqual(expect.objectContaining({title:'new'}));
    // also I could write like this
    // expect(job).toEqual({
    //   ...newJob,
    //   id: expect.any(Number),
    // });
  });

  test("bad request with dupe", async function () {
    try {
      await Job.create(newJob);
      await Job.create(newJob);
      fail();
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
});

/************************************** findAll */

describe("findAll", function () {
  test("works: no filter", async function () {
    let jobs = await Job.findAll();
    expect(jobs[0]).toEqual(expect.objectContaining(
      {
        id: expect.any(Number),
        title: "j1",
        salary: 10,
        equity: expect.any(String),
        companyHandle: 'c1'
      }));
    expect(jobs).toHaveLength(3);
      
  });
});

// /************************************** filter */
describe("filter", function () {
  test("filtering companies without hasEquity query", async function () {
    let jobs = await Job.filter({
      title: 'j',
      minSalary: 20
    });
    expect(jobs).toEqual([
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

  test("filtering companies with hasEquity query", async function () {
    let jobs = await Job.filter({
      title: 'j',
      minSalary: 20,
      hasEquity: true
    });
    expect(jobs).toEqual( [{
        id: 3,
        title: "j3",
        salary: 30,
        equity: "0.1",
        companyHandle: 'c3'
      }]);
  });



});



// /************************************** get */

describe("get", function () {
  test("works", async function () {
    let job = await Job.get(1);
    expect(job).toEqual(
      {
        id: 1,
        title: "j1",
        salary: 10,
        equity: expect.any(String),
        companyHandle: 'c1'
      }
    );
  });

  test("not found if no such company", async function () {
    try {
      await Job.get(7);
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});

// /************************************** update */

describe("update", function () {
  const updateData = {
    title: "newly updated",
    salary: 100,
    equity: 0,
    companyHandle: "c1"
  };

  test("works", async function () {
    let job = await Job.update(1, updateData);
    expect(job).toEqual({
      id: 1,
      title: "newly updated",
      salary: 100,
      equity: "0",
      companyHandle: "c1"
    });

    const result = await db.query(
      `SELECT id, title, salary, equity, company_handle
      FROM jobs
      WHERE id = 1`);
    expect(result.rows[0]).toEqual({
      id: 1,
      title: "newly updated",
      salary: 100,
      equity: "0",
      company_handle: "c1"
    });
  });

  test("works: null fields", async function () {
    const updateDataSetNulls = {
      title: "newly updated",
      salary: null,
      equity: null,
      companyHandle: "c1"
    };

    let job = await Job.update(1, updateDataSetNulls);
    expect(job).toEqual({
      id:1,
      title: "newly updated",
      salary: null,
      equity: null,
      companyHandle: "c1"
    });
  
    const result = await db.query(
          `SELECT id, title, salary, equity, company_handle
          FROM jobs
          WHERE id = 1`);
    expect(result.rows[0]).toEqual({
      id:1,
      title: "newly updated",
      salary: null,
      equity: null,
      company_handle: "c1"
    });
  });

  test("not found if no such job", async function () {
    try {
      await Job.update(7, updateData);
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });

  test("bad request with no data", async function () {
    try {
      await Job.update(1, {});
      fail();
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });

// /************************************** remove */

describe("remove", function () {
  test("works", async function () {
    await Job.remove(1);
    const res = await db.query(
        "SELECT id FROM jobs WHERE id=1");
    expect(res.rows.length).toEqual(0);
  });

  test("not found if no such job", async function () {
    try {
      await Job.remove(7);
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
    });
  });
});
