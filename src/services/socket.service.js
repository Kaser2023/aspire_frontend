import { io } from 'socket.io-client';

const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');

let socket = null;

/**
 * Initialize socket connection
 * @param {object} userData - User data for room joining
 */
export const initSocket = (userData) => {
  if (socket?.connected) {
    return socket;
  }

  socket = io(SOCKET_URL, {
    withCredentials: true,
    transports: ['websocket', 'polling']
  });

  socket.on('connect', () => {
    console.log('🔌 Socket connected:', socket.id);

    // Join attendance room with user info
    if (userData) {
      socket.emit('join-attendance-room', {
        user_id: userData.id,
        role: userData.role,
        branch_id: userData.branch_id
      });

      // Join schedule room
      socket.emit('join-schedule-room', {
        user_id: userData.id,
        branch_id: userData.branch_id
      });
    }
  });

  socket.on('disconnect', () => {
    console.log('🔌 Socket disconnected');
  });

  socket.on('connect_error', (error) => {
    console.error('🔌 Socket connection error:', error);
  });

  return socket;
};

/**
 * Get the socket instance
 */
export const getSocket = () => socket;

/**
 * Disconnect socket
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

/**
 * Subscribe to player attendance updates
 * @param {function} callback - Callback function when update received
 */
export const onPlayerAttendanceUpdate = (callback) => {
  if (!socket) return;
  socket.on('attendance-player-updated', callback);
};

/**
 * Subscribe to coach attendance updates
 * @param {function} callback - Callback function when update received
 */
export const onCoachAttendanceUpdate = (callback) => {
  if (!socket) return;
  socket.on('attendance-coach-updated', callback);
};

/**
 * Unsubscribe from player attendance updates
 */
export const offPlayerAttendanceUpdate = () => {
  if (!socket) return;
  socket.off('attendance-player-updated');
};

/**
 * Unsubscribe from coach attendance updates
 */
export const offCoachAttendanceUpdate = () => {
  if (!socket) return;
  socket.off('attendance-coach-updated');
};

// ==================== Schedule Events ====================

/**
 * Subscribe to schedule created events
 * @param {function} callback - Callback function when schedule is created
 */
export const onScheduleCreated = (callback) => {
  if (!socket) return;
  socket.on('schedule-created', callback);
};

/**
 * Subscribe to schedule updated events
 * @param {function} callback - Callback function when schedule is updated
 */
export const onScheduleUpdated = (callback) => {
  if (!socket) return;
  socket.on('schedule-updated', callback);
};

/**
 * Subscribe to schedule cancelled events
 * @param {function} callback - Callback function when schedule is cancelled
 */
export const onScheduleCancelled = (callback) => {
  if (!socket) return;
  socket.on('schedule-cancelled', callback);
};

/**
 * Subscribe to schedule deleted events
 * @param {function} callback - Callback function when schedule is deleted
 */
export const onScheduleDeleted = (callback) => {
  if (!socket) return;
  socket.on('schedule-deleted', callback);
};

/**
 * Unsubscribe from all schedule events
 */
export const offScheduleEvents = () => {
  if (!socket) return;
  socket.off('schedule-created');
  socket.off('schedule-updated');
  socket.off('schedule-cancelled');
  socket.off('schedule-deleted');
};

// ==================== Waitlist Events ====================

/**
 * Subscribe to waitlist added events
 * @param {function} callback - Callback function when player is added to waitlist
 */
export const onWaitlistAdded = (callback) => {
  if (!socket) return;
  socket.on('waitlist-added', callback);
};

/**
 * Subscribe to waitlist removed events
 * @param {function} callback - Callback function when player is removed from waitlist
 */
export const onWaitlistRemoved = (callback) => {
  if (!socket) return;
  socket.on('waitlist-removed', callback);
};

/**
 * Subscribe to waitlist status updated events
 * @param {function} callback - Callback function when waitlist status is updated
 */
export const onWaitlistStatusUpdated = (callback) => {
  if (!socket) return;
  socket.on('waitlist-status-updated', callback);
};

/**
 * Unsubscribe from all waitlist events
 */
export const offWaitlistEvents = () => {
  if (!socket) return;
  socket.off('waitlist-added');
  socket.off('waitlist-removed');
  socket.off('waitlist-status-updated');
};

// ==================== Notification Events ====================

/**
 * Subscribe to notification created events (real-time notifications)
 * @param {function} callback - Callback function when a notification is received
 */
export const onNotificationCreated = (callback) => {
  if (!socket) return;
  socket.on('notification-created', callback);
};

/**
 * Unsubscribe from notification created events
 */
export const offNotificationCreated = () => {
  if (!socket) return;
  socket.off('notification-created');
};

// ==================== Announcement Events ====================

/**
 * Subscribe to announcement created events
 * @param {function} callback - Callback function when announcement is created
 */
export const onAnnouncementCreated = (callback) => {
  if (!socket) return;
  socket.on('announcement-created', callback);
};

/**
 * Unsubscribe from announcement created events
 */
export const offAnnouncementCreated = () => {
  if (!socket) return;
  socket.off('announcement-created');
};

// ==================== Socket Connection Events ====================

export const onSocketConnect = (callback) => {
  if (!socket) return;
  socket.on('connect', callback);
};

export const offSocketConnect = () => {
  if (!socket) return;
  socket.off('connect');
};

export const onSocketDisconnect = (callback) => {
  if (!socket) return;
  socket.on('disconnect', callback);
};

export const offSocketDisconnect = () => {
  if (!socket) return;
  socket.off('disconnect');
};

export const onSocketConnectError = (callback) => {
  if (!socket) return;
  socket.on('connect_error', callback);
};

export const offSocketConnectError = () => {
  if (!socket) return;
  socket.off('connect_error');
};

export default {
  initSocket,
  getSocket,
  disconnectSocket,
  onPlayerAttendanceUpdate,
  onCoachAttendanceUpdate,
  offPlayerAttendanceUpdate,
  offCoachAttendanceUpdate,
  onScheduleCreated,
  onScheduleUpdated,
  onScheduleCancelled,
  onScheduleDeleted,
  offScheduleEvents,
  onWaitlistAdded,
  onWaitlistRemoved,
  onWaitlistStatusUpdated,
  offWaitlistEvents,
  onNotificationCreated,
  offNotificationCreated,
  onAnnouncementCreated,
  offAnnouncementCreated,
  onSocketConnect,
  onSocketDisconnect,
  onSocketConnectError,
  offSocketConnect,
  offSocketDisconnect,
  offSocketConnectError
};
