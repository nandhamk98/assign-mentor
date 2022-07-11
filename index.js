import express from "express";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";

//Initializing pre-req
dotenv.config();

const PORT = process.env.PORT;
const MONGO_URL = process.env.MONGO_URL;
const app = express();

app.use(express.json());

// Creating DB connection
const createConnection = async () => {
  const client = new MongoClient(MONGO_URL);
  await client.connect();
  console.log("The db is connected");
  return client;
};

const client = await createConnection();

// For inserting data
const insertData = async (collectionName, data) => {
  return await client
    .db("mentorAssignment")
    .collection(collectionName)
    .insertOne(data);
};

// For updating data
const updateData = async (collectionName, filter, val) => {
  return await client
    .db("mentorAssignment")
    .collection(collectionName)
    .updateOne(filter, val);
};

// Api to create student
app.post("/create-student", async (req, res) => {
  let data = req.body;
  data["mentor"] = null;
  let response = await insertData("student", data);
  res.send(response);
});

// Api to create mentor
app.post("/create-mentor", async (req, res) => {
  let data = req.body;
  data["students"] = [];
  let response = await insertData("mentor", data);
  res.send(response);
});

// Api to assign a mentor to student
app.post("/assign-mentor", async (req, res) => {
  let data = req.body;
  let studentId = data["studentId"];
  let mentorId = data["mentorId"];

  // DB call to get student data
  let studentData = await client
    .db("mentorAssignment")
    .collection("student")
    .findOne({ id: studentId });

  // DB call to get mentor data
  let mentorData = await client
    .db("mentorAssignment")
    .collection("mentor")
    .findOne({ id: mentorId });

  let mentorStudentData = mentorData.students.filter(
    (data) => data === studentId
  );
  let response = "saved";
  if (!studentData.mentor && !mentorStudentData.length) {
    await updateData(
      "student",
      { id: studentId },
      { $set: { mentor: mentorId } }
    );
    let studentsPresent = mentorData.students;
    await updateData(
      "mentor",
      { id: mentorId },
      { $set: { students: [...studentsPresent, studentId] } }
    );
  } else {
    if (studentData.mentor) response = "mentor already present";
    else response = "student already present";
  }
  res.send(response);
});

// Api to change mentor for a student
app.post("/change-mentor", async (req, res) => {
  let data = req.body;
  let studentId = data["studentId"];
  let mentorId = data["mentorId"];

  let studentData = await client
    .db("mentorAssignment")
    .collection("student")
    .findOne({ id: studentId });

  let mentorStudentData = (
    await client
      .db("mentorAssignment")
      .collection("mentor")
      .findOne({ id: mentorId })
  ).students;

  let existingMentorData = (
    await client
      .db("mentorAssignment")
      .collection("mentor")
      .findOne({ id: studentData.mentor })
  ).students.filter((data) => data !== studentId);
  let response = "saved";

  if (studentData.mentor) {
    await updateData(
      "mentor",
      { id: studentData.mentor },
      { $set: { students: existingMentorData } }
    );

    await updateData(
      "student",
      { id: studentId },
      { $set: { mentor: mentorId } }
    );

    await updateData(
      "mentor",
      { id: mentorId },
      { $set: { students: [...mentorStudentData, studentId] } }
    );
  } else {
    response = "Student's mentor value is Null";
  }
  res.send(response);
});

// Api to list student with id
app.get("/list-students/:id", async (req, res) => {
  let { id } = req.params;

  let studentData = {};
  (
    await client.db("mentorAssignment").collection("student").find({}).toArray()
  ).map((data) => {
    studentData[data.id] = data.name;
    return true;
  });

  let mentorData = await client
    .db("mentorAssignment")
    .collection("mentor")
    .findOne({ id: id });

  let response = {
    id: mentorData.id,
    name: mentorData.name,
    students: mentorData.students.map((student) => {
      return {
        id: student,
        name: studentData[student],
      };
    }),
  };

  res.send(response);
});

app.listen(PORT, () => {
  console.log(`Connected to port: ${PORT}`);
});
