import Event from '../models/eventModel.js';
import User from '../models/userModel.js';
import { HTTP_STATUS } from '../config/constants.js';

// Create event
export const createEvent = async (req, res) => {
  try {
    const eventData = {
      ...req.body,
      organizer: req.user._id
    };

    const event = await Event.create(eventData);

    // Add event to user's createdEvents
    await User.findByIdAndUpdate(req.user._id, {
      $push: { createdEvents: event._id }
    });

    res.status(HTTP_STATUS.CREATED).json({
      message: 'Event created successfully',
      event
    });
  } catch (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: error.message
    });
  }
};

// Get all events
export const getAllEvents = async (req, res) => {
  try {
    const { category, status, search, page = 1, limit = 10 } = req.query;
    
    const query = {};

    if (category) query.category = category;
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const events = await Event.find(query)
      .populate('organizer', 'name email')
      .populate('attendees', 'name email')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ date: 1 });

    const count = await Event.countDocuments(query);

    res.status(HTTP_STATUS.OK).json({
      events,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      totalEvents: count
    });
  } catch (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: error.message
    });
  }
};

// Get single event
export const getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('organizer', 'name email')
      .populate('attendees', 'name email');

    if (!event) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        error: 'Event not found'
      });
    }

    res.status(HTTP_STATUS.OK).json({ event });
  } catch (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: error.message
    });
  }
};

// Update event
export const updateEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        error: 'Event not found'
      });
    }

    // Check if user is organizer
    if (event.organizer.toString() !== req.user._id.toString()) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        error: 'Not authorized to update this event'
      });
    }

    const updatedEvent = await Event.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('organizer', 'name email');

    res.status(HTTP_STATUS.OK).json({
      message: 'Event updated successfully',
      event: updatedEvent
    });
  } catch (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: error.message
    });
  }
};

// Delete event
export const deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        error: 'Event not found'
      });
    }

    // Check if user is organizer
    if (event.organizer.toString() !== req.user._id.toString()) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        error: 'Not authorized to delete this event'
      });
    }

    await Event.findByIdAndDelete(req.params.id);

    // Remove event from user's createdEvents
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { createdEvents: req.params.id }
    });

    res.status(HTTP_STATUS.OK).json({
      message: 'Event deleted successfully'
    });
  } catch (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: error.message
    });
  }
};

// Register for event
export const registerForEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        error: 'Event not found'
      });
    }

    // Check if event is full
    if (event.attendees.length >= event.capacity) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: 'Event is full'
      });
    }

    // Check if user already registered
    if (event.attendees.includes(req.user._id)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: 'Already registered for this event'
      });
    }

    // Add user to attendees
    event.attendees.push(req.user._id);
    await event.save();

    // Add event to user's registeredEvents
    await User.findByIdAndUpdate(req.user._id, {
      $push: { registeredEvents: event._id }
    });

    res.status(HTTP_STATUS.OK).json({
      message: 'Successfully registered for event',
      event
    });
  } catch (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: error.message
    });
  }
};

// Unregister from event
export const unregisterFromEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        error: 'Event not found'
      });
    }

    // Check if user is registered
    if (!event.attendees.includes(req.user._id)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: 'Not registered for this event'
      });
    }

    // Remove user from attendees
    event.attendees = event.attendees.filter(
      attendee => attendee.toString() !== req.user._id.toString()
    );
    await event.save();

    // Remove event from user's registeredEvents
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { registeredEvents: event._id }
    });

    res.status(HTTP_STATUS.OK).json({
      message: 'Successfully unregistered from event'
    });
  } catch (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: error.message
    });
  }
};