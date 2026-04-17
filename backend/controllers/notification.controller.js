import Notification from "../models/Notification.js";

export const getMyNotifications = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Not authorized" });
    }
    const notifications = await Notification.find({ recipient: req.user.id })
      .sort({ createdAt: -1 })
      .populate("actor", "name email studentId")
      .limit(100);
    return res.status(200).json({ data: notifications });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const markNotificationRead = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Not authorized" });
    }
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user.id },
      { $set: { read: true } },
      { new: true },
    );
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }
    return res.status(200).json(notification);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const markAllRead = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Not authorized" });
    }
    await Notification.updateMany(
      { recipient: req.user.id, read: false },
      { $set: { read: true } },
    );
    return res.status(200).json({ message: "All notifications marked as read" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
