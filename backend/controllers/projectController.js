const Project = require('../models/Project');

// @desc    Get all projects
// @route   GET /api/projects
// @access  Private
const getProjects = async (req, res, next) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const query = { isActive: true };

    if (status) query.status = status;
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    const total = await Project.countDocuments(query);
    const projects = await Project.find(query)
      .populate('manager', 'name email')
      .populate('contractors', 'name email')
      .sort('-createdAt')
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: projects.length,
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      data: projects,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single project
// @route   GET /api/projects/:id
// @access  Private
const getProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('manager', 'name email')
      .populate('contractors', 'name email');

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    res.status(200).json({ success: true, data: project });
  } catch (error) {
    next(error);
  }
};

// @desc    Create project
// @route   POST /api/projects
// @access  Private (admin, manager)
const createProject = async (req, res, next) => {
  try {
    const project = await Project.create(req.body);
    res.status(201).json({ success: true, message: 'Project created', data: project });
  } catch (error) {
    next(error);
  }
};

// @desc    Update project
// @route   PUT /api/projects/:id
// @access  Private (admin, manager)
const updateProject = async (req, res, next) => {
  try {
    const project = await Project.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    res.status(200).json({ success: true, message: 'Project updated', data: project });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete project (soft-delete)
// @route   DELETE /api/projects/:id
// @access  Private (admin)
const deleteProject = async (req, res, next) => {
  try {
    const project = await Project.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    res.status(200).json({ success: true, message: 'Project deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getProjects, getProject, createProject, updateProject, deleteProject };
