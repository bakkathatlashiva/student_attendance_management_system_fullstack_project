const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

app.use("/auth", require("./routes/auth"));
app.use("/attendance", require("./routes/attendance"));
app.use("/students", require("./routes/students"));

app.listen(5000, () => console.log("Server running on port 5000"));
