const { sqlForPartialUpdate}  = require("./sql");
const {BadRequestError} = require('../expressError')
const data = {
  "password":"test123",
  "firstName": "Test",
  "lastName" : "Tesko",
  "email": "test@gmail.com",
  "isAdmin" : false
}

const jsToSql={
    firstName: "first_name",
    lastName: "last_name",
    isAdmin: "is_admin"
}



describe("Checking partial UPdate function works", function () {

  test("Returns array of objectkeys = $ inx+1", function () {
    const {setCols, values} = sqlForPartialUpdate(data, jsToSql);
    expect(values).toHaveLength(5);
    expect(values).toContain('test@gmail.com');
    expect(setCols).toEqual('"password"=$1, "first_name"=$2, "last_name"=$3, "email"=$4, "is_admin"=$5');
    });


  test("Received data for update is empty: admin", function () {
    try{
    const {setCols, values} = sqlForPartialUpdate({}, jsToSql);
    } catch(err){
      expect(err instanceof BadRequestError).toBeTruthy();
    } 
  });


});;
