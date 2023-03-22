"use strict";

const { query } = require("express");
const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for jobs**/

class job {
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
  }

  /** Filter jobss
   *this function accepts query object(req.query) such as {name: 'apple', minEmployees: 10, maxEmployees 1000}
   * returns filtered companies as an arry of objects.
   * Returns [{ handle, name, description, numEmployees, logoUrl }, ...]
   * 
   * If the minEmployees parameter is greater than the maxEmployees parameter, it will throw error with message to notify user "minEmployees cannot be greater than maxEmployees"
   * */

  // static async filter(query){ 
  //   let queryStr = [];
  //   let obj = {
  //     name :`name ILIKE '%${query.name}%'`,
  //     minEmployees: `num_employees >= ${query.minEmployees}`, 
  //     maxEmployees:`num_employees <= ${query.maxEmployees}`
  //   }

  //   if(query.minEmployees > query.maxEmployees){
  //       throw new BadRequestError('minEmployees cannot be greater than maxEmployees', 400)

  //   }

  //   for (let key in query){
  //     queryStr.push(obj[key]) 
  //   }

  //   const queryComplete = queryStr.join(' AND ');

  //   const CompaniesRes = await db.query(
  //     `SELECT handle, name, description, 
  //     num_employees AS "numEmployees", 
  //     logo_url AS "logoUrl"
  //     FROM companies ` + `WHERE ${queryComplete}` + ` ORDER BY name`
  //    )

  //    return CompaniesRes.rows;
  // }


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
    console.log(JSON.stringify(job));
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


module.exports = job;
