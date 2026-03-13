const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/UserModel');
const Consultant = require('../models/ConsultantModel');
const authMiddleware = require('../middleware/authMiddleware');
const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_change_me';

const router = express.Router();

// Generate JWT Token
const generateToken = (id, email, userType) => {
    return jwt.sign(
        { id, email, userType },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
};

// ── USER ROUTES ──

// Register User
router.post('/register-user', async (req, res) => {
    try {
        const { fullName, email, password } = req.body;

        // Validation
        if (!fullName || !email || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ error: 'Email already registered' });
        }

        // Create new user
        const user = new User({
            fullName,
            email,
            password,
            userType: 'user'
        });

        await user.save();

        const token = generateToken(user._id, user.email, user.userType);

        res.status(201).json({
            message: 'User registered successfully',
            user: user.toJSON(),
            token
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: error.message || 'Registration failed' });
    }
});

// Login User
router.post('/login-user', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Check password
        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const token = generateToken(user._id, user.email, user.userType);

        res.json({
            message: 'Login successful',
            user: user.toJSON(),
            token
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: error.message || 'Login failed' });
    }
});

// ── CONSULTANT ROUTES ──

// Register Consultant
router.post('/register-consultant', async (req, res) => {
    try {
        const { 
            fullName, 
            email, 
            password, 
            licenseNumber, 
            barRegistration, 
            specialization, 
            professionalSummary 
        } = req.body;

        // Validation
        if (!fullName || !email || !password || !licenseNumber || !barRegistration || !specialization) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        // Check if email already exists in either collection
        const existingUser = await User.findOne({ email });
        const existingConsultant = await Consultant.findOne({ email });
        if (existingUser || existingConsultant) {
            return res.status(409).json({ error: 'Email already registered' });
        }

        // Check if license number already exists
        const existingLicense = await Consultant.findOne({ licenseNumber });
        if (existingLicense) {
            return res.status(409).json({ error: 'License number already registered' });
        }

        // Create new consultant
        const consultant = new Consultant({
            fullName,
            email,
            password,
            licenseNumber,
            barRegistration,
            specialization,
            professionalSummary
        });

        await consultant.save();

        const token = generateToken(consultant._id, consultant.email, 'consultant');

        res.status(201).json({
            message: 'Consultant registered successfully',
            consultant: consultant.toJSON(),
            token
        });
    } catch (error) {
        console.error('Consultant registration error:', error);
        res.status(500).json({ error: error.message || 'Registration failed' });
    }
});

// Login Consultant
router.post('/login-consultant', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Find consultant
        const consultant = await Consultant.findOne({ email });
        if (!consultant) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Check password
        const isMatch = await consultant.matchPassword(password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const token = generateToken(consultant._id, consultant.email, 'consultant');

        res.json({
            message: 'Login successful',
            consultant: consultant.toJSON(),
            token
        });
    } catch (error) {
        console.error('Consultant login error:', error);
        res.status(500).json({ error: error.message || 'Login failed' });
    }
});

// ── PROTECTED ROUTES ──

// Get current user/consultant
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const { id, userType } = req.user;

        let data;
        if (userType === 'consultant') {
            data = await Consultant.findById(id);
        } else {
            data = await User.findById(id);
        }

        if (!data) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(data.toJSON());
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Logout (client-side token removal)
router.post('/logout', authMiddleware, (req, res) => {
    res.json({ message: 'Logged out successfully' });
});

// Get all consultants
router.get('/consultants', async (req, res) => {
    try {
        const { specialization } = req.query;
        
        let query = { isVerified: true };
        if (specialization) {
            query.specialization = specialization;
        }

        const consultants = await Consultant.find(query)
            .select('-password')
            .sort({ rating: -1, totalClients: -1 });

        res.json(consultants);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get consultant by ID
router.get('/consultant/:id', async (req, res) => {
    try {
        const consultant = await Consultant.findById(req.params.id)
            .select('-password');

        if (!consultant) {
            return res.status(404).json({ error: 'Consultant not found' });
        }

        res.json(consultant);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;

