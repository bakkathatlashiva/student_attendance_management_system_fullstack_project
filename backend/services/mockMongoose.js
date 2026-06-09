const mongoose = require("mongoose");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");

const collections = {};
const realModels = {};
const loadedModels = {};

const DB_PATH = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.resolve(__dirname, "..", "attendance.db");
let sqliteDb = null;

function openSqlite() {
  if (sqliteDb) return sqliteDb;
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (e) {
      /* ignore */
    }
  }
  sqliteDb = new sqlite3.Database(DB_PATH, (err) => {
    if (err) console.error("Failed to open SQLite DB:", err.message);
    else console.log("SQLite mock DB open at", DB_PATH);
  });
  sqliteDb.serialize(() => {
    sqliteDb.run(`CREATE TABLE IF NOT EXISTS mock_documents (
      id TEXT PRIMARY KEY,
      model TEXT,
      doc TEXT
    )`);
  });
  return sqliteDb;
}

async function loadCollectionFromSqlite(modelName, RealModel) {
  if (loadedModels[modelName]) return;
  loadedModels[modelName] = true;
  const db = openSqlite();
  return new Promise((resolve) => {
    db.all(
      "SELECT id, doc FROM mock_documents WHERE model = ?",
      [modelName],
      (err, rows) => {
        if (err) {
          console.error(
            "Failed to load mock documents for",
            modelName,
            err && err.message,
          );
          return resolve();
        }
        if (!rows || rows.length === 0) return resolve();
        for (const r of rows) {
          try {
            const plain = JSON.parse(r.doc);
            // Ensure _id exists
            if (!plain._id) plain._id = r.id;
            const inst = new RealModel(plain);
            collections[modelName].push(inst);
          } catch (e) {
            console.error("Failed to parse stored doc for", modelName, r.id);
          }
        }
        resolve();
      },
    );
  });
}

function persistDocToSqlite(modelName, doc) {
  try {
    const db = openSqlite();
    const id =
      doc && doc._id && doc._id.toString
        ? doc._id.toString()
        : doc && doc.id
          ? doc.id.toString()
          : new mongoose.Types.ObjectId().toString();
    let plain =
      typeof doc.toObject === "function"
        ? doc.toObject({ getters: false, virtuals: false })
        : JSON.parse(JSON.stringify(doc || {}));
    // Normalize ObjectId-like fields to strings for storage
    if (
      plain &&
      plain._id &&
      typeof plain._id === "object" &&
      plain._id.toString
    ) {
      try {
        plain._id = plain._id.toString();
      } catch (e) {
        /* ignore */
      }
    }
    const docStr = JSON.stringify(plain);
    db.run(
      "INSERT OR REPLACE INTO mock_documents (id, model, doc) VALUES (?, ?, ?)",
      [id, modelName, docStr],
      (err) => {
        if (err)
          console.error(
            "Failed to persist mock doc",
            modelName,
            id,
            err.message,
          );
      },
    );
  } catch (e) {
    console.error("persistDocToSqlite error", e && e.message);
  }
}

function deleteDocFromSqlite(modelName, id) {
  try {
    const db = openSqlite();
    db.run(
      "DELETE FROM mock_documents WHERE id = ? AND model = ?",
      [id && id.toString ? id.toString() : id, modelName],
      (err) => {
        if (err)
          console.error(
            "Failed to delete mock doc",
            modelName,
            id,
            err.message,
          );
      },
    );
  } catch (e) {
    console.error("deleteDocFromSqlite error", e && e.message);
  }
}

function matchesQuery(doc, query) {
  if (!query) return true;
  for (const key of Object.keys(query)) {
    let qVal = query[key];
    let dVal = doc[key];

    if (key === "$or") {
      if (!Array.isArray(qVal)) return false;
      return qVal.some((q) => matchesQuery(doc, q));
    }

    if (qVal && typeof qVal === "object" && !Array.isArray(qVal)) {
      if ("$regex" in qVal) {
        const regex = new RegExp(qVal.$regex, qVal.$options || "");
        if (!regex.test(dVal || "")) return false;
        continue;
      }
      if ("$in" in qVal) {
        if (!Array.isArray(qVal.$in)) return false;
        const stringifiedDVal = dVal ? dVal.toString() : "";
        if (
          !qVal.$in.some(
            (item) => (item ? item.toString() : "") === stringifiedDVal,
          )
        )
          return false;
        continue;
      }
    }

    if (dVal && qVal && (dVal._id || qVal._id)) {
      if (dVal.toString() !== qVal.toString()) return false;
    } else if (dVal !== qVal) {
      if (dVal && qVal && dVal.toString() === qVal.toString()) {
        continue;
      }
      return false;
    }
  }
  return true;
}

class MockQuery {
  constructor(results, isSingle = false) {
    this.results = results;
    this.isSingle = isSingle;
    this._skip = 0;
    this._limit = null;
  }

  sort(sortOpt) {
    const apply = (res) => {
      if (!res || res.length === 0 || !sortOpt) return res;
      const field = Object.keys(sortOpt)[0];
      const order = sortOpt[field];
      const docs = this.isSingle ? [res] : res.slice();
      docs.sort((a, b) => {
        const aVal = a[field] || "";
        const bVal = b[field] || "";
        if (aVal < bVal) return -1 * order;
        if (aVal > bVal) return 1 * order;
        return 0;
      });
      return this.isSingle ? docs[0] : docs;
    };

    if (this.results instanceof Promise) {
      this.results = this.results.then(apply);
    } else {
      this.results = apply(this.results);
    }
    return this;
  }

  skip(n) {
    this._skip = n;
    const apply = (res) => {
      if (!Array.isArray(res)) return res;
      return res.slice(n);
    };
    if (this.results instanceof Promise)
      this.results = this.results.then(apply);
    else this.results = apply(this.results);
    return this;
  }

  limit(n) {
    this._limit = n;
    const apply = (res) => {
      if (!Array.isArray(res)) return res;
      return res.slice(0, n);
    };
    if (this.results instanceof Promise)
      this.results = this.results.then(apply);
    else this.results = apply(this.results);
    return this;
  }

  populate(field) {
    const applyPopulate = (docs) => {
      const arr = this.isSingle ? [docs] : docs;
      if (!arr) return docs;
      for (const doc of arr) {
        if (!doc) continue;
        if (typeof field === "string" && field.startsWith("slots.")) {
          const subField = field.split(".")[1];
          if (Array.isArray(doc.slots)) {
            for (const slot of doc.slots) {
              if (subField === "subjectId" && slot.subjectId) {
                const subjectModel = collections["Subject"] || [];
                slot.subjectId =
                  subjectModel.find(
                    (s) => s._id.toString() === slot.subjectId.toString(),
                  ) || slot.subjectId;
              }
              if (subField === "teacherId" && slot.teacherId) {
                const userModel = collections["User"] || [];
                slot.teacherId =
                  userModel.find(
                    (u) => u._id.toString() === slot.teacherId.toString(),
                  ) || slot.teacherId;
              }
            }
          }
        } else {
          if (field === "studentId" && doc.studentId) {
            const studentModel = collections["Student"] || [];
            doc.studentId =
              studentModel.find(
                (s) => s._id.toString() === doc.studentId.toString(),
              ) || doc.studentId;
          }
          if (field === "subjectId" && doc.subjectId) {
            const subjectModel = collections["Subject"] || [];
            doc.subjectId =
              subjectModel.find(
                (s) => s._id.toString() === doc.subjectId.toString(),
              ) || doc.subjectId;
          }
          if (field === "teacherId" && doc.teacherId) {
            const userModel = collections["User"] || [];
            const facultyModel = collections["Faculty"] || [];
            doc.teacherId =
              userModel.find(
                (u) => u._id.toString() === doc.teacherId.toString(),
              ) ||
              facultyModel.find(
                (f) => f._id.toString() === doc.teacherId.toString(),
              ) ||
              doc.teacherId;
          }
          if (field === "facultyIds" && Array.isArray(doc.facultyIds)) {
            const facultyModel = collections["Faculty"] || [];
            doc.facultyIds = doc.facultyIds.map(
              (fid) =>
                facultyModel.find((f) => f._id.toString() === fid.toString()) ||
                fid,
            );
          }
          if (field === "user" && doc.user) {
            const userModel = collections["User"] || [];
            doc.user =
              userModel.find((u) => u._id.toString() === doc.user.toString()) ||
              doc.user;
          }
        }
      }
      return this.isSingle ? arr[0] : arr;
    };

    if (this.results instanceof Promise)
      this.results = this.results.then(applyPopulate);
    else this.results = applyPopulate(this.results);
    return this;
  }

  select(fields) {
    return this;
  }

  async exec() {
    let res = this.results;
    if (res instanceof Promise) res = await res;
    if (!this.isSingle && Array.isArray(res)) {
      if (this._skip) res = res.slice(this._skip);
      if (this._limit !== null) res = res.slice(0, this._limit);
    }
    return res;
  }

  then(onResolve, onReject) {
    return this.exec().then(onResolve, onReject);
  }
}

const originalModel = mongoose.model.bind(mongoose);

function wrappedModel(modelName, schema) {
  // 1. Create the real Mongoose Model
  const RealModel = originalModel(modelName, schema);
  realModels[modelName] = RealModel;
  collections[modelName] = collections[modelName] || [];
  // Begin background load of persisted documents for this model
  loadCollectionFromSqlite(modelName, RealModel).catch(() => {});

  // 2. Monkey-patch static methods to use mock collections if Mongoose is not connected
  const originalFind = RealModel.find;
  RealModel.find = function (query) {
    if (mongoose.connection.readyState === 1) {
      return originalFind.apply(this, arguments);
    }
    const resultsPromise = loadedModels[modelName]
      ? Promise.resolve(collections[modelName])
      : loadCollectionFromSqlite(modelName, RealModel).then(
          () => collections[modelName],
        );
    const matchedPromise = resultsPromise.then((arr) =>
      arr.filter((doc) => matchesQuery(doc, query)),
    );
    return new MockQuery(matchedPromise, false);
  };

  const originalFindOne = RealModel.findOne;
  RealModel.findOne = function (query) {
    if (mongoose.connection.readyState === 1) {
      return originalFindOne.apply(this, arguments);
    }
    const resultsPromise = loadedModels[modelName]
      ? Promise.resolve(collections[modelName])
      : loadCollectionFromSqlite(modelName, RealModel).then(
          () => collections[modelName],
        );
    const matchedPromise = resultsPromise.then(
      (arr) => arr.find((doc) => matchesQuery(doc, query)) || null,
    );
    return new MockQuery(matchedPromise, true);
  };

  const originalFindById = RealModel.findById;
  RealModel.findById = function (id) {
    if (mongoose.connection.readyState === 1) {
      return originalFindById.apply(this, arguments);
    }
    if (!id) return new MockQuery(null, true);
    const resultsPromise = loadedModels[modelName]
      ? Promise.resolve(collections[modelName])
      : loadCollectionFromSqlite(modelName, RealModel).then(
          () => collections[modelName],
        );
    const matchedPromise = resultsPromise.then(
      (arr) => arr.find((doc) => doc._id.toString() === id.toString()) || null,
    );
    return new MockQuery(matchedPromise, true);
  };

  const originalFindByIdAndUpdate = RealModel.findByIdAndUpdate;
  RealModel.findByIdAndUpdate = async function (id, update, options) {
    if (mongoose.connection.readyState === 1) {
      return originalFindByIdAndUpdate.apply(this, arguments);
    }
    const resultsPromise = loadedModels[modelName]
      ? Promise.resolve(collections[modelName])
      : loadCollectionFromSqlite(modelName, RealModel).then(
          () => collections[modelName],
        );
    const arr = await resultsPromise;
    const doc = arr.find((d) => d._id.toString() === id.toString());
    if (!doc) return null;
    const setUpdate = update.$set || update;
    Object.assign(doc, setUpdate);
    // persist change
    persistDocToSqlite(modelName, doc);
    return doc;
  };

  const originalFindByIdAndDelete =
    RealModel.findByIdAndDelete || RealModel.findByIdAndRemove;
  RealModel.findByIdAndDelete = async function (id) {
    if (mongoose.connection.readyState === 1) {
      return originalFindByIdAndDelete.apply(this, arguments);
    }
    const resultsPromise = loadedModels[modelName]
      ? Promise.resolve(collections[modelName])
      : loadCollectionFromSqlite(modelName, RealModel).then(
          () => collections[modelName],
        );
    const arr = await resultsPromise;
    const idx = arr.findIndex((d) => d._id.toString() === id.toString());
    if (idx >= 0) {
      const deleted = arr[idx];
      arr.splice(idx, 1);
      deleteDocFromSqlite(modelName, deleted._id);
      return deleted;
    }
    return null;
  };

  const originalDeleteMany = RealModel.deleteMany;
  RealModel.deleteMany = async function (query) {
    if (mongoose.connection.readyState === 1) {
      return originalDeleteMany.apply(this, arguments);
    }
    const arr = loadedModels[modelName]
      ? collections[modelName]
      : (await loadCollectionFromSqlite(modelName, RealModel)) &&
        collections[modelName];
    const originalLength = arr.length;
    const remaining = arr.filter((doc) => !matchesQuery(doc, query));
    const deleted = arr.filter((doc) => matchesQuery(doc, query));
    // update in-memory
    collections[modelName] = remaining;
    // delete from sqlite
    for (const d of deleted) {
      try {
        deleteDocFromSqlite(modelName, d._id);
      } catch (e) {}
    }
    return { deletedCount: originalLength - remaining.length };
  };

  const originalCountDocuments = RealModel.countDocuments;
  RealModel.countDocuments = async function (query) {
    if (mongoose.connection.readyState === 1) {
      return originalCountDocuments.apply(this, arguments);
    }
    const resultsPromise = loadedModels[modelName]
      ? Promise.resolve(collections[modelName])
      : loadCollectionFromSqlite(modelName, RealModel).then(
          () => collections[modelName],
        );
    const arr = await resultsPromise;
    const matched = arr.filter((doc) => matchesQuery(doc, query));
    return matched.length;
  };

  const originalInsertMany = RealModel.insertMany;
  RealModel.insertMany = async function (arr) {
    if (mongoose.connection.readyState === 1) {
      return originalInsertMany.apply(this, arguments);
    }
    const inserted = [];
    for (const item of arr) {
      const doc = new RealModel(item);
      await doc.save();
      inserted.push(doc);
    }
    return inserted;
  };

  const originalBulkWrite = RealModel.bulkWrite;
  RealModel.bulkWrite = async function (operations, options) {
    if (mongoose.connection.readyState === 1) {
      return originalBulkWrite.apply(this, arguments);
    }
    let matchedCount = 0;
    let modifiedCount = 0;
    let upsertedCount = 0;
    let upsertedIds = {};

    for (let i = 0; i < operations.length; i++) {
      const op = operations[i];
      if (op.updateOne) {
        const { filter, update, upsert } = op.updateOne;
        let docIdx = collections[modelName].findIndex((d) =>
          matchesQuery(d, filter),
        );
        const setUpdate = update.$set || update;
        if (docIdx >= 0) {
          matchedCount++;
          Object.assign(collections[modelName][docIdx], setUpdate);
          // persist update
          persistDocToSqlite(modelName, collections[modelName][docIdx]);
          modifiedCount++;
        } else if (upsert) {
          upsertedCount++;
          const newDoc = new RealModel(Object.assign({}, filter, setUpdate));
          newDoc._id = newDoc._id || new mongoose.Types.ObjectId();
          newDoc.id = newDoc._id.toString();
          collections[modelName].push(newDoc);
          persistDocToSqlite(modelName, newDoc);
          upsertedIds[i] = newDoc._id;
        }
      }
    }
    return {
      ok: 1,
      writeErrors: [],
      writeConcernErrors: [],
      insertedDefaults: [],
      insertedIds: {},
      upsertedIds,
      upsertedCount,
      insertedCount: 0,
      matchedCount,
      modifiedCount,
      removedCount: 0,
      deletedCount: 0,
      upserted: Object.keys(upsertedIds).map((index) => ({
        index: parseInt(index),
        _id: upsertedIds[index],
      })),
    };
  };

  const originalAggregate = RealModel.aggregate;
  RealModel.aggregate = async function (pipeline) {
    if (mongoose.connection.readyState === 1) {
      return originalAggregate.apply(this, arguments);
    }

    if (modelName === "Attendance") {
      const groupStage = pipeline.find((stage) => stage.$group);
      if (groupStage) {
        const idField = groupStage.$group._id;

        if (idField === "$studentId") {
          const studentGroups = {};
          for (const doc of collections["Attendance"] || []) {
            const sid = doc.studentId ? doc.studentId.toString() : "unknown";
            if (!studentGroups[sid]) {
              studentGroups[sid] = { _id: doc.studentId, total: 0, present: 0 };
            }
            studentGroups[sid].total++;
            if (doc.status === "Present") {
              studentGroups[sid].present++;
            }
          }

          const studentList = collections["Student"] || [];
          const results = [];
          for (const sid of Object.keys(studentGroups)) {
            const group = studentGroups[sid];
            const student = studentList.find((s) => s._id.toString() === sid);
            if (student) {
              const total = group.total;
              const present = group.present;
              const percentage = total > 0 ? (present / total) * 100 : 100;
              results.push({
                _id: group._id,
                total,
                present,
                percentage,
                student: student,
              });
            }
          }
          return results;
        }

        if (
          idField === "$month" ||
          (typeof idField === "object" && idField !== null)
        ) {
          const monthGroups = {};
          for (const doc of collections["Attendance"] || []) {
            const dateStr = doc.date || "";
            const month = dateStr.slice(0, 7);
            if (month) {
              if (!monthGroups[month]) {
                monthGroups[month] = { _id: month, total: 0, present: 0 };
              }
              monthGroups[month].total++;
              if (doc.status === "Present") {
                monthGroups[month].present++;
              }
            }
          }
          const results = Object.values(monthGroups);
          results.sort((a, b) => a._id.localeCompare(b._id));
          return results;
        }

        if (idField === "$date") {
          const dateGroups = {};
          for (const doc of collections["Attendance"] || []) {
            const date = doc.date;
            if (date) {
              if (!dateGroups[date]) {
                dateGroups[date] = { _id: date, count: 0 };
              }
              if (doc.status === "Present") {
                dateGroups[date].count++;
              }
            }
          }
          const results = Object.values(dateGroups);
          results.sort((a, b) => a._id.localeCompare(b._id));
          return results;
        }
      }
    }
    return [];
  };

  // 3. Monkey-patch prototype save method
  const originalSave = RealModel.prototype.save;
  RealModel.prototype.save = async function () {
    if (mongoose.connection.readyState === 1) {
      return originalSave.apply(this, arguments);
    }

    this._id = this._id || new mongoose.Types.ObjectId();
    this.id = this._id.toString();

    // Run custom pre-save hooks
    if (schema && schema._pres && schema._pres.save) {
      for (const hook of schema._pres.save) {
        await new Promise((resolve, reject) => {
          hook.fn.call(this, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      }
    }

    // Pre-save hook user password hashing fallback
    if (
      modelName === "User" &&
      this.password &&
      !this.password.startsWith("$2a$")
    ) {
      const bcrypt = require("bcryptjs");
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    }

    const collection = collections[modelName];
    const idx = collection.findIndex(
      (item) => item._id.toString() === this._id.toString(),
    );
    if (idx >= 0) {
      collection[idx] = this;
      // persist updated document
      try {
        persistDocToSqlite(modelName, this);
      } catch (e) {}
    } else {
      collection.push(this);
      // persist new document
      try {
        persistDocToSqlite(modelName, this);
      } catch (e) {}
    }
    return this;
  };

  return RealModel;
}

module.exports = {
  enableMockMode: () => {
    console.log("--- MONGOOSE HYBRID MOCK LAYER INITIALIZED ---");
    mongoose.model = wrappedModel;
  },
  collections,
};
