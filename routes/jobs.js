"use strict";

/** Routes for jobs. */

const jsonschema = require("jsonschema");
const express = require("express");

const { BadRequestError } = require("../expressError");
const { ensureLoggedIn, ensureAdminLoggedIn } = require("../middleware/auth");
const Job = require("../models/job");

const jobNewSchema = require("../schemas/jobNew.json");
const jobUpdateSchema = require("../schemas/jobUpdate.json");

const router = new express.Router();


/** POST / { job } =>  { job }
 *
 * receiving data should be { title, salary, equity, company_handle }
 *
 * Returns { hid, title, salary, equity, company_handle }
 *
 * Authorization required: login && admin only
 */
router.post("/", ensureAdminLoggedIn, async function (req, res, next) {
  try {
    const validator = jsonschema.validate(req.body, jobNewSchema);
    if (!validator.valid) {
      const errs = validator.errors.map(e => e.stack);
      throw new BadRequestError(errs);
    }

    const job = await Job.create(req.body);
    return res.status(201).json({ job });
  } catch (err) {
    return next(err);
  }
});

/** GET /  =>
 *   { jobs: [ { id, title, salary, equity, companyHandle }, ...] }
 *
 * Can filter on provided search filters:
 * - title (will find case-insensitive, partial matches)
 * - minSalary
 * - hasEquity 
 * 
   * returns filtered jobs as an arry of objects as below:
   * [{ id, title, salary, equity, companyHandle }, ...]
 *
 * Authorization required: none
 */

router.get("/", async function (req, res, next) {
  try {
    
    if(Object.keys(req.query).length ===0){
      console.log('no query');
      const jobs = await Job.findAll();
      return res.json({ jobs });
    }
    const filteredjob = await Job.filter(req.query);
    return res.json({jobs: filteredjob})
    
  } catch (err) {
    return next(err);
  }
});

/** GET /[id]  =>  { job }
 *
 *  Returns { Job:{ id, title, salary, equity, companyHandle}}
 *
 * Authorization required: none
 */

router.get("/:id", async function (req, res, next) {
  try {
    const job = await Job.get(req.params.id);
    return res.json({ job });
  } catch (err) {
    return next(err);
  }
});

/** PATCH /[id] { fld1, fld2, ... } => { job }
 *
 * Patches job data.
 *
 * fields can be: {title, salary, equity}
 *
 * Returns {id, title, salary, equity, companyHandle}
 *
 * Authorization required: login && admin
 */

router.patch("/:id", ensureAdminLoggedIn, async function (req, res, next) {
  try {
    const validator = jsonschema.validate(req.body, jobUpdateSchema);
    if (!validator.valid) {
      const errs = validator.errors.map(e => e.stack);
      console.log(errs);
      throw new BadRequestError(errs);
      
    }

    const job = await Job.update(req.params.id, req.body);
    return res.json({ job });
  } catch (err) {
    return next(err);
  }
});

/** DELETE /[id]  =>  { deleted: id }
 *
 * Authorization: login && admin
 */

router.delete("/:id", ensureAdminLoggedIn, async function (req, res, next) {
  try {
    await Job.remove(req.params.id);
    return res.json({ deleted: req.params.id });
  } catch (err) {
    return next(err);
  }
});


module.exports = router;
