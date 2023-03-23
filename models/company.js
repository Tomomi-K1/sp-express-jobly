"use strict";

const { query } = require("express");
const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for companies. */

class Company {
  /** Create a company (from data), update db, return new company data.
   *
   * data should be { handle, name, description, numEmployees, logoUrl }
   *
   * Returns { handle, name, description, numEmployees, logoUrl }
   *
   * Throws BadRequestError if company already in database.
   * */

  static async create({ handle, name, description, numEmployees, logoUrl }) {
    const duplicateCheck = await db.query(
          `SELECT handle
           FROM companies
           WHERE handle = $1`,
        [handle]);

    if (duplicateCheck.rows[0])
      throw new BadRequestError(`Duplicate company: ${handle}`);

    const result = await db.query(
          `INSERT INTO companies
           (handle, name, description, num_employees, logo_url)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING handle, name, description, num_employees AS "numEmployees", logo_url AS "logoUrl"`,
        [
          handle,
          name,
          description,
          numEmployees,
          logoUrl,
        ],
    );
    const company = result.rows[0];

    return company;
  }

  /** Find all companies.
   *
   * Returns [{ handle, name, description, numEmployees, logoUrl }, ...]
   * */

  static async findAll() {
    const companiesRes = await db.query(
          `SELECT handle,
                  name,
                  description,
                  num_employees AS "numEmployees",
                  logo_url AS "logoUrl"
           FROM companies
           ORDER BY name`);
    return companiesRes.rows;
  }

  /** Filter companies
   *this function accepts query object(req.query) such as {name: 'apple', minEmployees: 10, maxEmployees 1000}
   * returns filtered companies as an arry of objects.
   * Returns [{ handle, name, description, numEmployees, logoUrl }, ...]
   * 
   * If the minEmployees parameter is greater than the maxEmployees parameter, it will throw error with message to notify user "minEmployees cannot be greater than maxEmployees"
   * */

  static async filter(query){ 
    let queryStr = [];
    let obj = {
      name :`name ILIKE '%${query.name}%'`,
      minEmployees: `num_employees >= ${query.minEmployees}`, 
      maxEmployees:`num_employees <= ${query.maxEmployees}`
    }

    if(query.minEmployees > query.maxEmployees){
        throw new BadRequestError('minEmployees cannot be greater than maxEmployees', 400)

    }

    for (let key in query){
      queryStr.push(obj[key]) 
    }

    const queryComplete = queryStr.join(' AND ');

    const CompaniesRes = await db.query(
      `SELECT handle, name, description, 
      num_employees AS "numEmployees", 
      logo_url AS "logoUrl"
      FROM companies ` + `WHERE ${queryComplete}` + ` ORDER BY name`
     )

     return CompaniesRes.rows;
  }


  /** Given a company handle, return data about company.
   *
   * Returns { handle, name, description, numEmployees, logoUrl, jobs }
   *   where jobs is [{ id, title, salary, equity, companyHandle }, ...]
   *
   * Throws NotFoundError if not found.
   **/

  static async get(handle) {
    const companyRes = await db.query(
      `SELECT handle,
              name,
              description,
              num_employees AS "numEmployees",
              logo_url AS "logoUrl"
       FROM companies
       WHERE handle = $1`, [handle]);

    const company = companyRes.rows[0]
    const jobsRes = await db.query(`
          SELECT id, title, salary, equity
          FROM jobs
          WHERE company_handle =$1`, [handle])
    company.jobs = jobsRes.rows.map(r =>({
                                          id: r.id,
                                          title: r.title,
                                          salary: r.salary,
                                          equity: r.equity
                                          }))


    if (!company) throw new NotFoundError(`No company: ${handle}`);

    return company;
  }

  /** Update company data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: {name, description, numEmployees, logoUrl}
   *
   * Returns {handle, name, description, numEmployees, logoUrl}
   *
   * Throws NotFoundError if not found.
   */

  static async update(handle, data) {
    const { setCols, values } = sqlForPartialUpdate(
        data,
        {
          numEmployees: "num_employees",
          logoUrl: "logo_url",
        });
    const handleVarIdx = "$" + (values.length + 1);

    const querySql = `UPDATE companies 
                      SET ${setCols} 
                      WHERE handle = ${handleVarIdx} 
                      RETURNING handle, 
                                name, 
                                description, 
                                num_employees AS "numEmployees", 
                                logo_url AS "logoUrl"`;
    const result = await db.query(querySql, [...values, handle]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    return company;
  }

  /** Delete given company from database; returns undefined.
   *
   * Throws NotFoundError if company not found.
   **/

  static async remove(handle) {
    const result = await db.query(
          `DELETE
           FROM companies
           WHERE handle = $1
           RETURNING handle`,
        [handle]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);
  }
}


module.exports = Company;
