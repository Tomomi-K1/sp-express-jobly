"use strict";

/** Routes for jobs. */

const jsonschema = require("jsonschema");
const express = require("express");

const { BadRequestError } = require("../expressError");
const { ensureLoggedIn, ensureAdminLoggedIn } = require("../middleware/auth");
const Job = require("../models/job");

const jobNewSchema = require("../schemas/jobNew.json");
// const companyUpdateSchema = require("../schemas/companyUpdate.json");

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
 * - minEmployees
 * - maxEmployees
 * - name (will find case-insensitive, partial matches)
 *
 * Authorization required: none
 */

router.get("/", async function (req, res, next) {
  try {
    
    // if(Object.keys(req.query).length ===0){
      // console.log('no query');
      const jobs = await Job.findAll();
      return res.json({ jobs });
    
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

/** PATCH /[handle] { fld1, fld2, ... } => { company }
 *
 * Patches company data.
 *
 * fields can be: { name, description, numEmployees, logo_url }
 *
 * Returns { handle, name, description, numEmployees, logo_url }
 *
 * Authorization required: login
 */

// router.patch("/:handle", ensureAdminLoggedIn, async function (req, res, next) {
//   try {
//     const validator = jsonschema.validate(req.body, companyUpdateSchema);
//     if (!validator.valid) {
//       const errs = validator.errors.map(e => e.stack);
//       throw new BadRequestError(errs);
//     }

//     const company = await Company.update(req.params.handle, req.body);
//     return res.json({ company });
//   } catch (err) {
//     return next(err);
//   }
// });

/** DELETE /[handle]  =>  { deleted: handle }
 *
 * Authorization: login
 */

// router.delete("/:handle", ensureAdminLoggedIn, async function (req, res, next) {
//   try {
//     await Company.remove(req.params.handle);
//     return res.json({ deleted: req.params.handle });
//   } catch (err) {
//     return next(err);
//   }
// });


module.exports = router;
