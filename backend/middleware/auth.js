const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes - verify JWT
exports.protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ message: 'Not authorized. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'taskflow_secret_key_2024');
    req.user = await User.findById(decoded.id);

    if (!req.user) {
      return res.status(401).json({ message: 'User no longer exists.' });
    }

    next();
  } catch (err) {
    return res.status(401).json({ message: 'Not authorized. Token invalid.' });
  }
};

// Restrict to admin role (global)
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission for this action.' });
    }
    next();
  };
};

// Check project membership and role
exports.checkProjectRole = (allowedRoles = []) => {
  return async (req, res, next) => {
    try {
      const Project = require('../models/Project');
      const projectId = req.params.projectId || req.body.project;

      if (!projectId) return next();

      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({ message: 'Project not found.' });
      }

      // Owner always has access
      if (project.owner.toString() === req.user._id.toString()) {
        req.projectRole = 'admin';
        req.project = project;
        return next();
      }

      // Check membership
      const member = project.members.find(
        m => m.user.toString() === req.user._id.toString()
      );

      if (!member) {
        return res.status(403).json({ message: 'You are not a member of this project.' });
      }

      if (allowedRoles.length > 0 && !allowedRoles.includes(member.role)) {
        return res.status(403).json({ message: 'Insufficient project permissions.' });
      }

      req.projectRole = member.role;
      req.project = project;
      next();
    } catch (err) {
      next(err);
    }
  };
};
