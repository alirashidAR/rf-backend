// This middleware validates the request body for creating a new task submission

const validateSubmission = (req, res, next) => {
    const { projectId, title, description, dueDate } = req.body;
    
    if (!projectId) {
      return res.status(400).json({ message: 'Project ID is required' });
    }
    
    if (!title || title.trim() === '') {
      return res.status(400).json({ message: 'Title is required' });
    }
    
    if (!description || description.trim() === '') {
      return res.status(400).json({ message: 'Description is required' });
    }
    
    if (!dueDate) {
      return res.status(400).json({ message: 'Due date is required' });
    }
    
    // Validate date format
    const dueDateObj = new Date(dueDate);
    if (dueDateObj.toString() === 'Invalid Date') {
      return res.status(400).json({ message: 'Invalid date format' });
    }
    
    next();
};
  
export default validateSubmission;
