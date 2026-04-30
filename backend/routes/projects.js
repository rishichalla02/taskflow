const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Project = require('../models/Project');
const Task = require('../models/Task');
const User = require('../models/User');
const { protect, checkProjectRole } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// @route   GET /api/projects
// @desc    Get all projects for current user
// @access  Private
router.get('/', async (req, res) => {
  try {
    const projects = await Project.find({
      $or: [
        { owner: req.user._id },
        { 'members.user': req.user._id }
      ]
    })
    .populate('owner', 'name email avatar')
    .populate('members.user', 'name email avatar')
    .sort({ updatedAt: -1 });

    // Add task stats
    const projectsWithStats = await Promise.all(projects.map(async (p) => {
      const tasks = await Task.find({ project: p._id });
      const stats = {
        total: tasks.length,
        todo: tasks.filter(t => t.status === 'todo').length,
        inProgress: tasks.filter(t => t.status === 'in-progress').length,
        review: tasks.filter(t => t.status === 'review').length,
        done: tasks.filter(t => t.status === 'done').length,
        overdue: tasks.filter(t => t.dueDate && t.status !== 'done' && new Date() > t.dueDate).length
      };
      return { ...p.toJSON(), taskStats: stats };
    }));

    res.json({ projects: projectsWithStats });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route   POST /api/projects
// @desc    Create a project
// @access  Private
router.post('/', [
  body('name').trim().notEmpty().withMessage('Project name is required').isLength({ max: 100 }),
  body('description').optional().isLength({ max: 500 }),
  body('status').optional().isIn(['planning', 'active', 'on-hold', 'completed']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'critical'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const project = await Project.create({
      ...req.body,
      owner: req.user._id
    });

    await project.populate('owner', 'name email avatar');
    await project.populate('members.user', 'name email avatar');

    res.status(201).json({ message: 'Project created', project });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route   GET /api/projects/:id
// @desc    Get single project
// @access  Private (members only)
router.get('/:projectId', checkProjectRole(), async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId)
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar');

    res.json({ project });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route   PUT /api/projects/:projectId
// @desc    Update project
// @access  Private (admin only)
router.put('/:projectId', checkProjectRole(['admin']), [
  body('name').optional().trim().notEmpty().isLength({ max: 100 }),
  body('status').optional().isIn(['planning', 'active', 'on-hold', 'completed']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'critical'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const allowed = ['name', 'description', 'status', 'priority', 'dueDate', 'tags', 'color'];
    const updates = {};
    allowed.forEach(field => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const project = await Project.findByIdAndUpdate(
      req.params.projectId,
      updates,
      { new: true, runValidators: true }
    )
    .populate('owner', 'name email avatar')
    .populate('members.user', 'name email avatar');

    res.json({ message: 'Project updated', project });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route   DELETE /api/projects/:projectId
// @desc    Delete project
// @access  Private (owner/admin only)
router.delete('/:projectId', checkProjectRole(['admin']), async (req, res) => {
  try {
    await Task.deleteMany({ project: req.params.projectId });
    await Project.findByIdAndDelete(req.params.projectId);
    res.json({ message: 'Project deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route   POST /api/projects/:projectId/members
// @desc    Add member to project
// @access  Private (admin only)
router.post('/:projectId/members', checkProjectRole(['admin']), [
  body('email').isEmail().withMessage('Valid email required'),
  body('role').optional().isIn(['admin', 'member'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const { email, role = 'member' } = req.body;

    const userToAdd = await User.findOne({ email });
    if (!userToAdd) {
      return res.status(404).json({ message: 'No user found with that email.' });
    }

    const project = req.project;
    const isAlreadyMember = project.members.some(
      m => m.user.toString() === userToAdd._id.toString()
    );

    if (isAlreadyMember) {
      return res.status(400).json({ message: 'User is already a member.' });
    }

    project.members.push({ user: userToAdd._id, role });
    await project.save();
    await project.populate('members.user', 'name email avatar');

    res.json({ message: `${userToAdd.name} added to project`, project });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route   DELETE /api/projects/:projectId/members/:userId
// @desc    Remove member from project
// @access  Private (admin only)
router.delete('/:projectId/members/:userId', checkProjectRole(['admin']), async (req, res) => {
  try {
    const project = req.project;

    if (project.owner.toString() === req.params.userId) {
      return res.status(400).json({ message: 'Cannot remove the project owner.' });
    }

    project.members = project.members.filter(
      m => m.user.toString() !== req.params.userId
    );
    await project.save();

    res.json({ message: 'Member removed from project' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route   PUT /api/projects/:projectId/members/:userId/role
// @desc    Update member role
// @access  Private (admin only)
router.put('/:projectId/members/:userId/role', checkProjectRole(['admin']), [
  body('role').isIn(['admin', 'member']).withMessage('Role must be admin or member')
], async (req, res) => {
  try {
    const project = req.project;
    const member = project.members.find(m => m.user.toString() === req.params.userId);

    if (!member) {
      return res.status(404).json({ message: 'Member not found.' });
    }

    member.role = req.body.role;
    await project.save();

    res.json({ message: 'Member role updated' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
