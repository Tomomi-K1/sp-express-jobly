"use strict";

/** Convenience middleware to handle common auth cases in routes. */

const jwt = require("jsonwebtoken");
const { SECRET_KEY } = require("../config");
const { UnauthorizedError } = require("../expressError");


/** Middleware: Authenticate user.
 *
 * If a token was provided in bearer token, verify it, and, if valid, store the token payload
 * on res.locals (this will include the username and isAdmin field.)
 *
 * It's not an error if no token was provided or if the token is not valid.
 */

function authenticateJWT(req, res, next) {
  try {
    const authHeader = req.headers && req.headers.authorization;
    // if both req.headers and req.headers.authorization is truthy, it will return the right side of &&.
    // req.headers.authorization will look like 
    // "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6InRlc3RhZG1pbiIsImlzQWRtaW4iOnRydWUsImlhdCI6MTY3OTUxMTM3OX0.AwHQniVBeKJ3od_mtPf6zofDzfQVDX8QFjcRkkrJ7VA"
    console.log(JSON.stringify(req.headers))
    if (authHeader) {
      const token = authHeader.replace(/^[Bb]earer /, "").trim();
      res.locals.user = jwt.verify(token, SECRET_KEY); 
      // payload is set to be below. it was set inside the helpers/token.js 
      // let payload = {
      //       username: user.username,
      //       isAdmin: user.isAdmin || false,
      // };
    }
    return next();
  } catch (err) {
    return next();
  }
}

/** Middleware to use when they must be logged in.
 *
 * If not, raises Unauthorized.
 */

function ensureLoggedIn(req, res, next) {
  try {
    if (!res.locals.user) throw new UnauthorizedError();
    return next();
  } catch (err) {
    return next(err);
  }
}


/** Middleware to check if loggedin User is Admin.
 *
 * If not, raises Unauthorized.
 */
function ensureAdminLoggedIn(req, res, next) {
  try {
    if (!res.locals.user || !res.locals.user.isAdmin){ 
      throw new UnauthorizedError();
    }
    return next();
  } catch (err) {
    return next(err);
  }
}

/** Middleware to check if loggedin User is Admin.
 *
 * If not, raises Unauthorized.
 */
function LoggedInUserIsSameOrAdmin(req, res, next) {
  try {
    if (!res.locals.user) throw new UnauthorizedError();

    if(!res.locals.user.isAdmin && res.locals.user.username!== req.params.username) throw new UnauthorizedError();
    // =====sp solution====//
    // const user = res.locals.user;
    // if (!(user && (user.isAdmin || user.username === req.params.username))) {
    //   throw new UnauthorizedError();
    // }
      return next();
  } catch (err) {
    return next(err);
  }
}




module.exports = {
  authenticateJWT,
  ensureLoggedIn,
  ensureAdminLoggedIn,
  LoggedInUserIsSameOrAdmin
};
