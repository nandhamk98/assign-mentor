import express from "express";
import { MongoClient } from "mongodb";

const PORT = 4000;
const app = express();

app.use(express.json());

const MONGO_URL = "mongodb://localhost";

const createConnection = async () => {
  const client = new MongoClient(MONGO_URL);
  await client.connect();
  console.log("The db is connected");
  return client;
};

const client = await createConnection();

const insertData = async (collectionName, data) => {
  return await client
    .db("mentorAssignment")
    .collection(collectionName)
    .insertOne(data);
};

const updateData = async (collectionName, filter, val) => {
  return await client
    .db("mentorAssignment")
    .collection(collectionName)
    .updateOne(filter, val);
};

app.post("/create-student", async (req, res) => {
  let data = req.body;
  data["mentor"] = null;
  let response = await insertData("student", data);
  res.send(response);
});

app.post("/create-mentor", async (req, res) => {
  let data = req.body;
  console.log(data);
  data["students"] = [];
  let response = await insertData("mentor", data);
  res.send(response);
});

app.post("/assign-mentor", async (req, res) => {
  let data = req.body;
  let studentId = data["studentId"];
  let mentorId = data["mentorId"];

  let studentData = await client
    .db("mentorAssignment")
    .collection("student")
    .findOne({ id: studentId });
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
    console.log(studentsPresent);
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

app.get("/list-studennts/:id", async (req, res) => {
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
