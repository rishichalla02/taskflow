const express = require('express');
const router = express.Router();
const { body, query, validationResult } = require('express-validator');
const Task = require('../models/Task');
const Project = require('../models/Project');
const { protect, checkProjectRole } = require('../middleware/auth');

router.use(protect);

// Helper: check if user is project member
const isMember = async (userId, projectId) => {
  const project = await Project.findById(projectId);
  if (!project) return null;
  if (project.owner.toString() === userId.toString()) return { role: 'admin', project };
  const member = project.members.find(m => m.user.toString() === userId.toString());
  if (!member) return null;
  return { role: member.role, project };
};

// @route   GET /api/tasks
// @desc    Get tasks (with filters)
// @access  Private
router.get('/', async (req, res) => {
  try {
    const { project, status, priority, assignee, overdue, search } = req.query;

    // Get user's projects
    const userProjects = await Project.find({
      $or: [{ owner: req.user._id }, { 'members.user': req.user._id }]
    }).select('_id');

    const projectIds = userProjects.map(p => p._id);

    let filter = { project: { $in: projectIds } };

    if (project) filter.project = project;
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (assignee) filter.assignee = assignee === 'me' ? req.user._id : assignee;
    if (search) filter.title = { $regex: search, $options: 'i' };
    if (overdue === 'true') {
      filter.dueDate = { $lt: new Date() };
      filter.status = { $ne: 'done' };
    }

    const tasks = await Task.find(filter)
      .populate('assignee', 'name email avatar')
      .populate('reporter', 'name email avatar')
      .populate('project', 'name color')
      .sort({ createdAt: -1 });

    res.json({ tasks });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route   GET /api/tasks/dashboard
// @desc    Get dashboard stats
// @access  Private
router.get('/dashboard', async (req, res) => {
  try {
    const userProjects = await Project.find({
      $or: [{ owner: req.user._id }, { 'members.user': req.user._id }]
    }).select('_id name color status');

    const projectIds = userProjects.map(p => p._id);

    const allTasks = await Task.find({ project: { $in: projectIds } })
      .populate('assignee', 'name email avatar')
      .populate('project', 'name color');

    const myTasks = await Task.find({
      project: { $in: projectIds },
      assignee: req.user._id
    }).populate('project', 'name color').sort({ dueDate: 1 });

    const now = new Date();
    const overdueTasks = allTasks.filter(t => t.dueDate && t.status !== 'done' && now > t.dueDate);

    const stats = {
      projects: {
        total: userProjects.length,
        active: userProjects.filter(p => p.status === 'active').length,
        completed: userProjects.filter(p => p.status === 'completed').length
      },
      tasks: {
        total: allTasks.length,
        todo: allTasks.filter(t => t.status === 'todo').length,
        inProgress: allTasks.filter(t => t.status === 'in-progress').length,
        review: allTasks.filter(t => t.status === 'review').length,
        done: allTasks.filter(t => t.status === 'done').length,
        overdue: overdueTasks.length
      },
      myTasks: myTasks.slice(0, 10),
      overdueTasks: overdueTasks.slice(0, 5),
      recentProjects: userProjects.slice(0, 5)
    };

    res.json(stats);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route   GET /api/tasks/project/:projectId
// @desc    Get tasks for a project
// @access  Private (project members)
router.get('/project/:projectId', async (req, res) => {
  try {
    const access = await isMember(req.user._id, req.params.projectId);
    if (!access) return res.status(403).json({ message: 'Access denied.' });

    const tasks = await Task.find({ project: req.params.projectId })
      .populate('assignee', 'name email avatar')
      .populate('reporter', 'name email avatar')
      .sort({ createdAt: -1 });

    res.json({ tasks });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route   POST /api/tasks
// @desc    Create task
// @access  Private (project members)
router.post('/', [
  body('title').trim().notEmpty().withMessage('Task title is required').isLength({ max: 150 }),
  body('project').notEmpty().withMessage('Project ID is required').isMongoId(),
  body('status').optional().isIn(['todo', 'in-progress', 'review', 'done']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'critical'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const access = await isMember(req.user._id, req.body.project);
    if (!access) return res.status(403).json({ message: 'Access denied.' });

    const task = await Task.create({
      ...req.body,
      reporter: req.user._id
    });

    await task.populate('assignee', 'name email avatar');
    await task.populate('reporter', 'name email avatar');
    await task.populate('project', 'name color');

    res.status(201).json({ message: 'Task created', task });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route   GET /api/tasks/:id
// @desc    Get single task
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignee', 'name email avatar')
      .populate('reporter', 'name email avatar')
      .populate('project', 'name color members owner')
      .populate('comments.user', 'name email avatar');

    if (!task) return res.status(404).json({ message: 'Task not found.' });

    const access = await isMember(req.user._id, task.project._id);
    if (!access) return res.status(403).json({ message: 'Access denied.' });

    res.json({ task });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route   PUT /api/tasks/:id
// @desc    Update task
// @access  Private
router.put('/:id', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found.' });

    const access = await isMember(req.user._id, task.project);
    if (!access) return res.status(403).json({ message: 'Access denied.' });

    const allowed = ['title', 'description', 'status', 'priority', 'assignee', 'dueDate', 'tags', 'order'];
    allowed.forEach(field => {
      if (req.body[field] !== undefined) task[field] = req.body[field];
    });

    await task.save();
    await task.populate('assignee', 'name email avatar');
    await task.populate('reporter', 'name email avatar');
    await task.populate('project', 'name color');

    res.json({ message: 'Task updated', task });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route   DELETE /api/tasks/:id
// @desc    Delete task
// @access  Private (admin or reporter)
router.delete('/:id', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found.' });

    const access = await isMember(req.user._id, task.project);
    if (!access) return res.status(403).json({ message: 'Access denied.' });

    const isReporter = task.reporter.toString() === req.user._id.toString();
    if (access.role !== 'admin' && !isReporter) {
      return res.status(403).json({ message: 'Only admins or task reporter can delete tasks.' });
    }

    await task.deleteOne();
    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route   POST /api/tasks/:id/comments
// @desc    Add comment
// @access  Private
router.post('/:id/comments', [
  body('text').trim().notEmpty().withMessage('Comment text is required').isLength({ max: 500 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found.' });

    const access = await isMember(req.user._id, task.project);
    if (!access) return res.status(403).json({ message: 'Access denied.' });

    task.comments.push({ user: req.user._id, text: req.body.text });
    await task.save();
    await task.populate('comments.user', 'name email avatar');

    res.json({ message: 'Comment added', comments: task.comments });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
