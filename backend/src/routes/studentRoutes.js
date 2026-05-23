import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Student from '../models/Student.js';
import University from '../models/University.js';

const router = express.Router();

// POST /api/students/register
router.post('/register', async (req, res) => {
  try {
    const { rollNumber, universityId, name, branch, semester, passcode } = req.body;

    if (!rollNumber || !universityId || !name || !branch || !semester || !passcode) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    // Validate university exists
    const university = await University.findOne({ universityId: universityId.toLowerCase().trim() });
    if (!university) {
      return res.status(404).json({ error: 'University not found. Please check your University ID.' });
    }

    // Check for duplicate roll number within same university
    const existing = await Student.findOne({ rollNumber: rollNumber.trim(), universityId: universityId.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ error: 'A student with this Roll Number is already registered at this university.' });
    }

    const passcodeHash = await bcrypt.hash(passcode, 10);

    const student = new Student({
      rollNumber: rollNumber.trim(),
      universityId: universityId.toLowerCase().trim(),
      name: name.trim(),
      branch: branch.toLowerCase().trim(),
      semester,
      passcodeHash,
    });

    await student.save();

    res.status(201).json({
      success: true,
      message: 'Student registered successfully.',
      student: { rollNumber: student.rollNumber, name: student.name, branch: student.branch, semester: student.semester },
    });
  } catch (error) {
    console.error('❌ POST /api/students/register error:', error);
    if (error.code === 11000) {
      return res.status(409).json({ error: 'This Roll Number is already registered at this university.' });
    }
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/students/login
router.post('/login', async (req, res) => {
  try {
    const { rollNumber, universityId, passcode } = req.body;

    if (!rollNumber || !universityId || !passcode) {
      return res.status(400).json({ error: 'rollNumber, universityId and passcode are required.' });
    }

    const student = await Student.findOne({
      rollNumber: rollNumber.trim(),
      universityId: universityId.toLowerCase().trim(),
    });

    if (!student) {
      return res.status(401).json({ error: 'Invalid credentials. Check your Roll Number and University ID.' });
    }

    const isValid = await bcrypt.compare(passcode, student.passcodeHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid passcode.' });
    }

    const token = jwt.sign(
      {
        role: 'student',
        studentId: student._id,
        rollNumber: student.rollNumber,
        universityId: student.universityId,
        branch: student.branch,
        semester: student.semester,
        name: student.name,
      },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(200).json({
      success: true,
      token,
      student: {
        rollNumber: student.rollNumber,
        name: student.name,
        branch: student.branch,
        semester: student.semester,
        universityId: student.universityId,
      },
    });
  } catch (error) {
    console.error('❌ POST /api/students/login error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/students/me — verify student token
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== 'student') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    res.status(200).json({
      success: true,
      student: {
        rollNumber: decoded.rollNumber,
        name: decoded.name,
        branch: decoded.branch,
        semester: decoded.semester,
        universityId: decoded.universityId,
      },
    });
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
});

export default router;
