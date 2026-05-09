const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/UserModel');
const Consultant = require('../models/ConsultantModel');
const authMiddleware = require('../middleware/authMiddleware');
const { t } = require('../i18n/i18n');
const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_change_me';

const router = express.Router();

const getLocale = (req) => req.query.locale || req.body?.locale || 'en';

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
    const locale = getLocale(req);

    try {
        const { fullName, email, password } = req.body;

        // Validation
        if (!fullName || !email || !password) {
            return res.status(400).json({ error: t('errors.required', locale) });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: t('errors.passwordTooShort', locale) });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ error: t('auth.emailAlreadyExists', locale) });
        }

        // Create new user
        const user = new User({
            fullName,
            email,
            password,
            userType: 'user',
            preferredLanguage: locale
        });

        await user.save();

        const token = generateToken(user._id, user.email, user.userType);

        res.status(201).json({
            message: t('auth.registerSuccess', locale),
            user: user.toJSON(),
            token
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: error.message || t('errors.serverError', locale) });
    }
});

// Login User
router.post('/login-user', async (req, res) => {
    const locale = getLocale(req);

    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({ error: t('errors.required', locale) });
        }

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: t('auth.invalidCredentials', locale) });
        }

        // Check password
        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.status(401).json({ error: t('auth.invalidCredentials', locale) });
        }

        const token = generateToken(user._id, user.email, user.userType);

        res.json({
            message: t('auth.loginSuccess', locale),
            user: user.toJSON(),
            token
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: error.message || t('errors.serverError', locale) });
    }
});

// ── CONSULTANT ROUTES ──

// Register Consultant
router.post('/register-consultant', async (req, res) => {
    const locale = getLocale(req);

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
            return res.status(400).json({ error: t('errors.required', locale) });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: t('errors.passwordTooShort', locale) });
        }

        // Check if email already exists in either collection
        const existingUser = await User.findOne({ email });
        const existingConsultant = await Consultant.findOne({ email });
        if (existingUser || existingConsultant) {
            return res.status(409).json({ error: t('auth.emailAlreadyExists', locale) });
        }

        // Check if license number already exists
        const existingLicense = await Consultant.findOne({ licenseNumber });
        if (existingLicense) {
            return res.status(409).json({ error: t('auth.licenseNumberAlreadyExists', locale) });
        }

        // Create new consultant
        const consultant = new Consultant({
            fullName,
            email,
            password,
            licenseNumber,
            barRegistration,
            specialization,
            professionalSummary,
            preferredLanguage: locale
        });

        await consultant.save();

        const token = generateToken(consultant._id, consultant.email, 'consultant');

        res.status(201).json({
            message: t('auth.registerSuccess', locale),
            consultant: consultant.toJSON(),
            token
        });
    } catch (error) {
        console.error('Consultant registration error:', error);
        res.status(500).json({ error: error.message || t('errors.serverError', locale) });
    }
});

// Login Consultant
router.post('/login-consultant', async (req, res) => {
    const locale = getLocale(req);

    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({ error: t('errors.required', locale) });
        }

        // Find consultant
        const consultant = await Consultant.findOne({ email });
        if (!consultant) {
            return res.status(401).json({ error: t('auth.invalidCredentials', locale) });
        }

        // Check password
        const isMatch = await consultant.matchPassword(password);
        if (!isMatch) {
            return res.status(401).json({ error: t('auth.invalidCredentials', locale) });
        }

        const token = generateToken(consultant._id, consultant.email, 'consultant');

        res.json({
            message: t('auth.loginSuccess', locale),
            consultant: consultant.toJSON(),
            token
        });
    } catch (error) {
        console.error('Consultant login error:', error);
        res.status(500).json({ error: error.message || t('errors.serverError', locale) });
    }
});

// ── PROTECTED ROUTES ──

// Get current user/consultant
router.get('/me', authMiddleware, async (req, res) => {
    const locale = getLocale(req);

    try {
        const { id, userType } = req.user;

        let data;
        if (userType === 'consultant') {
            data = await Consultant.findById(id);
        } else {
            data = await User.findById(id);
        }

        if (!data) {
            return res.status(404).json({ error: userType === 'consultant' ? t('auth.consultantNotFound', locale) : t('auth.userNotFound', locale) });
        }

        res.json(data.toJSON());
    } catch (error) {
        res.status(500).json({ error: error.message || t('errors.serverError', locale) });
    }
});

// Logout (client-side token removal)
router.post('/logout', authMiddleware, (req, res) => {
    const locale = getLocale(req);
    res.json({ message: t('auth.logoutSuccess', locale) });
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
    const locale = getLocale(req);

    try {
        const consultant = await Consultant.findById(req.params.id)
            .select('-password');

        if (!consultant) {
            return res.status(404).json({ error: t('auth.consultantNotFound', locale) });
        }

        res.json(consultant);
    } catch (error) {
        res.status(500).json({ error: error.message || t('errors.serverError', locale) });
    }
});

module.exports = router;

