const jwt = require("jsonwebtoken");

const SECRET = "secretkey";

module.exports = (req, res, next) => {
  const token = req.headers["authorization"];

  if (!token) return res.sendStatus(403);

  jwt.verify(token, SECRET, (err, decoded) => {
    if (err) return res.sendStatus(403);
    req.user = decoded;
    next();
  });
};
