"use strict";

const { query } = require("express");
const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for jobs**/

class Job {
  /** Create a job (from data), update db, return new job data.
   *
   * data should be { title, salary, equity, companyHandle }
   *
   * Returns { id, title, salary, equity, companyHandle  }
   *
   * Throws BadRequestError if job title already in database.
   * */

  static async create({ title, salary, equity, companyHandle }) {
    const duplicateCheck = await db.query(
          `SELECT title
           FROM jobs
           WHERE title = $1`,
        [title]);

    if (duplicateCheck.rows[0])
      throw new BadRequestError(`Duplicate jobs: ${title}`);

    const result = await db.query(
          `INSERT INTO jobs
                  (title, salary, equity, company_handle)
           VALUES ($1, $2, $3, $4)
           RETURNING id, title, salary, equity, company_handle AS "companyHandle"`,
        [
          title,
          salary,
          equity,
          companyHandle
        ],
    );
    const job = result.rows[0];

    return job;
  }

  /** Find all jobs.
   *
   * Returns [{ id, title, salary, equity, companyHandle }, ...]
   * */

  static async findAll() {
    const jobsRes = await db.query(
          `SELECT id,
                  title,
                  salary,
                  equity,
                  company_handle AS "companyHandle"
           FROM jobs
           ORDER BY id`);
    return jobsRes.rows;
  /*===sp solution ===================================================== 
     static async findAll({ minSalary, hasEquity, title } = {}) {
    let query = `SELECT j.id,
                        j.title,
                        j.salary,
                        j.equity,
                        j.company_handle AS "companyHandle",
                        c.name AS "companyName"
                 FROM jobs j 
                   LEFT JOIN companies AS c ON c.handle = j.company_handle`;
    let whereExpressions = [];
    let queryValues = [];

    // For each possible search term, add to whereExpressions and
    // queryValues so we can generate the right SQL

    if (minSalary !== undefined) {
      queryValues.push(minSalary);
      whereExpressions.push(`salary >= $${queryValues.length}`);
    }

    if (hasEquity === true) {
      whereExpressions.push(`equity > 0`);
    }

    if (title !== undefined) {
      queryValues.push(`%${title}%`);
      whereExpressions.push(`title ILIKE $${queryValues.length}`);
    }

    if (whereExpressions.length > 0) {
      query += " WHERE " + whereExpressions.join(" AND ");
    }

    // Finalize query and return results

    query += " ORDER BY title";
    const jobsRes = await db.query(query, queryValues);
    return jobsRes.rows;
  }
  
  ============================================================*/ 
  }

  /** Filter jobs
   *this function accepts query object(req.query) 

   possible query string items are:
   *title: 
        filter by job title. this should be a case-insensitive, matches-any-part-of-string search.
  *minSalary: 
        filter to jobs with at least that salary.
  *hasEquity: 
        if true, filter to jobs that provide a non-zero amount of equity. If false or not included in the filtering, list all jobs regardless of equity.

   * returns filtered jobs as an arry of objects as below:
   * [{ id, title, salary, equity, companyHandle }, ...]
   * 
   * */

  static async filter(query){ 
    let queryStr = [];
    let obj = {
      title :`title ILIKE '%${query.title}%'`,
      minSalary: `salary >= ${query.minSalary}`, 
      hasEquity: `equity > 0`
    }

    // if query.hasEquity is false, then we will delete from query object so that it won't be filtered by equity.
    if (query.hasEquity ==='false'){
      delete query.hasEquity
    }

    // add query string according to the matching key in obj to make query string. 
    // it will be pushed to queryStr arry
    for (let key in query){
      queryStr.push(obj[key]) 
    }
    // if queryStr is empty (we are checking this since we delete query.hasEquity if it is false),
    // we will return all jobs
    if(queryStr.length ===0){
        const jobsRes =Job.findAll();
        return jobsRes;
    } else {
      // if queryStr is not empty, we will put element together by AND to make string for SQL query string
      const queryComplete = queryStr.join(' AND ');

      const jobsRes = await db.query(
        `SELECT id, title, salary, 
        equity, company_handle AS "companyHandle"
        FROM jobs ` + `WHERE ${queryComplete}` + ` ORDER BY id`
      )
      return jobsRes.rows;
    }  
  }


  /** Given a job id, return data about a job.
   *
   * Returns { id, title, salary, equity, companyHandle }
   *
   * Throws NotFoundError if not found.
   **/

  static async get(id) {
    const jobRes = await db.query(
          `SELECT id,
                  title,
                  salary,
                  equity,
                  company_handle AS "companyHandle"
          FROM jobs
          WHERE id =$1`,
        [id]);

    const job = jobRes.rows[0];

    if (!job) throw new NotFoundError(`No job id: ${id}`);

    /*===========sp solution ======================
    this will create return object to be { id, title, salary, equity, companyHandle, company }
    const companiesRes = await db.query(
          `SELECT handle,
                  name,
                  description,
                  num_employees AS "numEmployees",
                  logo_url AS "logoUrl"
           FROM companies
           WHERE handle = $1`, [job.companyHandle]);

    delete job.companyHandle;
    job.company = companiesRes.rows[0];
    */
    return job;
  }

  /** Update job data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: {title, salary, equity}
   *
   * Returns {id, title, salary, equity, companyHandle}
   *
   * Throws NotFoundError if not found.
   */

  static async update(id, data) {
    const { setCols, values } = sqlForPartialUpdate(
      data, 
      {
      companyHandle: "company_handle"
    })
    const handleVarIdx = "$" + (values.length + 1);

    const querySql = `UPDATE jobs 
                      SET ${setCols} 
                      WHERE id = ${handleVarIdx} 
                      RETURNING id, 
                                title, 
                                salary, 
                                equity, 
                                company_handle AS "companyHandle"`;
    const result = await db.query(querySql, [...values, id]);
    const job = result.rows[0];
    // console.log(JSON.stringify(job));
    if (!job) throw new NotFoundError(`No job id: ${id}`);

    return job;
  }

  /** Delete given job from database; returns undefined.
   *
   * Throws NotFoundError if job not found.
   **/

  static async remove(id) {
    const result = await db.query(
          `DELETE
           FROM jobs
           WHERE id = $1
           RETURNING id`,
        [id]);
    const job = result.rows[0];

    if (!job) throw new NotFoundError(`No job id: ${id}`);
  }
}


module.exports = Job;
