import api from "../api/axiosInstance";

/**
 * Announcement Service
 * Handles all API calls related to announcements
 */

/**
 * Create a new announcement
 * @param {FormData} formData - Form data containing announcement details and image
 * @returns {Promise<Object>} Created announcement data
 */
export const createNewAnnouncement = async (formData) => {
  try {
    const response = await api.post("/announcement/create-announcement", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  } catch (error) {
    console.error("API Error - Create Announcement:", error);
    throw error;
  }
};

/**
 * Get all announcements
 * @returns {Promise<Object>} List of all announcements
 */
export const getAllAnnouncement = async () => {
  try {
    const response = await api.get("/announcement/get-all-announcements");
    return response.data;
  } catch (error) {
    console.error("API Error - Get All Announcements:", error);
    throw error;
  }
};

/**
 * Get a single announcement by ID
 * @param {string} id - Announcement ID
 * @returns {Promise<Object>} Announcement data
 */
export const getAnnouncementById = async (id) => {
  try {
    const response = await api.get(`/announcement/get-announcement/${id}`);
    return response.data;
  } catch (error) {
    console.error("API Error - Get Announcement By ID:", error);
    throw error;
  }
};

/**
 * Update an existing announcement
 * @param {string} id - Announcement ID
 * @param {FormData} formData - Updated announcement data
 * @returns {Promise<Object>} Updated announcement data
 */
export const updateAnnouncement = async (id, formData) => {
  try {
    const response = await api.put(
      `/announcement/update-announcement/${id}`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("API Error - Update Announcement:", error);
    throw error;
  }
};

/**
 * Delete an announcement
 * @param {string} id - Announcement ID
 * @returns {Promise<Object>} Deletion confirmation
 */
export const deleteAnnouncement = async (id) => {
  try {
    const response = await api.delete(`/announcement/delete-announcement/${id}`);
    return response.data;
  } catch (error) {
    console.error("API Error - Delete Announcement:", error);
    throw error;
  }
};

/**
 * Toggle announcement active status
 * @param {string} id - Announcement ID
 * @param {boolean} isActive - New active status
 * @returns {Promise<Object>} Updated announcement data
 */
export const toggleAnnouncementStatus = async (id, isActive) => {
  try {
    const response = await api.patch(`/announcement/toggle-status/${id}`, {
      isActive,
    });
    return response.data;
  } catch (error) {
    console.error("API Error - Toggle Announcement Status:", error);
    throw error;
  }
};