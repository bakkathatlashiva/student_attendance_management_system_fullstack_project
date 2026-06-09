const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Student name is required'],
    trim: true
  },
  rollNumber: {
    type: String,
    required: [true, 'Roll number is required'],
    unique: true,
    uppercase: true,
    trim: true
  },
  registrationNumber: {
    type: String,
    required: [true, 'Registration number is required'],
    unique: true,
    uppercase: true,
    trim: true
  },
  branch: {
    type: String,
    required: [true, 'Branch is required'],
    enum: {
      values: ['CSE', 'IT', 'AIML', 'Data Science', 'Cyber Security'],
      message: 'Branch must be one of: CSE, IT, AIML, Data Science, Cyber Security'
    }
  },
  department: {
    type: String,
    required: [true, 'Department is required'],
    trim: true
  },
  section: {
    type: String,
    required: [true, 'Section is required'],
    trim: true
  },
  year: {
    type: String,
    required: [true, 'Year is required'],
    trim: true
  },
  semester: {
    type: String,
    required: [true, 'Semester is required'],
    trim: true
  },
  mobile: {
    type: String,
    required: [true, 'Mobile number is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email address']
  },
  gender: {
    type: String,
    required: [true, 'Gender is required'],
    enum: {
      values: ['Male', 'Female', 'Other'],
      message: 'Gender must be Male, Female, or Other'
    }
  },
  bloodGroup: {
    type: String,
    default: ''
  },
  address: {
    type: String,
    default: ''
  },
  parentName: {
    type: String,
    required: [true, 'Parent name is required'],
    trim: true
  },
  parentContact: {
    type: String,
    required: [true, 'Parent contact is required'],
    trim: true
  },
  photoUrl: {
    type: String, // Cloudinary link
    default: ''
  },
  faceDescriptor: {
    type: String, // Stringified array of landmarks
    default: ''
  },
  dateAdded: {
    type: String,
    default: () => new Date().toISOString().split('T')[0]
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Student', studentSchema);
