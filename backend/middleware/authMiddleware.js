const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_change_me';

const authMiddleware = (req, res, next) => {
    try {
        // Support ?token= query param for browser download links (no custom headers allowed)
        const bearerToken = req.headers.authorization?.split(' ')[1];
        const token = bearerToken || req.query.token;
        
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
};

module.exports = authMiddleware;
