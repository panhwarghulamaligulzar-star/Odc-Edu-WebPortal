

import Announcement from '../modules/announcementModule.js';

// CREATE - Create new announcement
export const createNewAnnouncementRoute = async (req, res) => {
  try {
    const { title, text, isActive } = req.body;
    
    // Validation
    if (!title || !text) {
      return res.status(400).json({ error: 'Title and text are required' });
    }
    
    let bannerImage = '';
    if (req.file) {
      // Convert file buffer to base64
      bannerImage = req.file.buffer.toString('base64');
    }

    // Create new announcement
    const newAnnouncement = new Announcement({
      title: title.trim(),
      text: text.trim(),
      bannerImage,
      isActive: isActive !== undefined ? isActive : true,
    });

    // Save to database
    await newAnnouncement.save();

    res.status(201).json({
      message: 'Announcement created successfully',
      announcement: newAnnouncement,
    });
  } catch (error) {
    console.error('Error creating announcement:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// READ - Get all announcements
export const getAllAnnouncementsRoute = async (req, res) => {
  try {
  
    const announcements = await Announcement.find();
    res.status(200).json({
      message: 'Announcements retrieved successfully',
      announcements,
    });
  } catch (error) {
    console.error('Error fetching announcements:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// READ - Get single announcement by ID
export const getAnnouncementByIdRoute = async (req, res) => {
  try {
    const { id } = req.params;

    const announcement = await Announcement.findById(id);

    if (!announcement) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    res.status(200).json({
      message: 'Announcement retrieved successfully',
      announcement,
    });
  } catch (error) {
    console.error('Error fetching announcement:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// UPDATE - Update announcement by ID
export const updateAnnouncementRoute = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, text, isActive } = req.body;

    // Find announcement
    const announcement = await Announcement.findById(id);

    if (!announcement) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    // Update fields
    if (title) announcement.title = title.trim();
    if (text) announcement.text = text.trim();
    if (isActive !== undefined) announcement.isActive = isActive;
    // Update banner image if new file uploaded
    if (req.file) {
      announcement.bannerImage = req.file.buffer.toString('base64');
    }

    // Save updated announcement
    await announcement.save();

    res.status(200).json({
      message: 'Announcement updated successfully',
      announcement,
    });
  } catch (error) {
    console.error('Error updating announcement:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// DELETE - Delete announcement by ID
export const deleteAnnouncementRoute = async (req, res) => {
  try {
    const { id } = req.params;

    const announcement = await Announcement.findByIdAndDelete(id);

    if (!announcement) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    res.status(200).json({
      message: 'Announcement deleted successfully',
      announcement,
    });
  } catch (error) {
    console.error('Error deleting announcement:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// UTILITY - Toggle announcement active status
export const toggleAnnouncementStatusRoute = async (req, res) => {
  try {
    const { id } = req.params;

    const announcement = await Announcement.findById(id);

    if (!announcement) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    // Toggle isActive status
    announcement.isActive = !announcement.isActive;
    await announcement.save();

    res.status(200).json({
      message: 'Announcement status toggled successfully',
      announcement,
    });
  } catch (error) {
    console.error('Error toggling announcement status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

