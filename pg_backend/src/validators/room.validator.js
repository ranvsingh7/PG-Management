const requiredFields = ['building_id', 'room_number', 'floor', 'type', 'capacity', 'status'];

export const allowedInputFields = [
  'building_id',
  'room_number',
  'floor',
  'type',
  'capacity',
  'status',
  'electricity_reading',
  'occupied',
  'pre_booked',
  'pre_bookings'
];

const stringFields = ['building_id', 'room_number', 'type', 'status'];
const numberFields = ['floor', 'capacity', 'electricity_reading', 'occupied', 'pre_booked'];
const validRoomTypes = ['single', 'double', 'triple'];
const validStatuses = ['vacant', 'occupied', 'partially_occupied', 'pre_booked'];

export const validateRoomPayload = (payload, options = {}) => {
  const errors = [];

  // Check required fields (only if not partial)
  if (!options.partial) {
    requiredFields.forEach((field) => {
      if (payload[field] === undefined || payload[field] === null || payload[field] === '') {
        errors.push(`${field} is required`);
      }
    });
  }

  // Validate string fields
  if (payload.building_id !== undefined && typeof payload.building_id !== 'string') {
    errors.push('building_id must be a string');
  }

  if (payload.room_number !== undefined) {
    if (typeof payload.room_number !== 'string') {
      errors.push('room_number must be a string');
    }
    if (payload.room_number.trim() === '') {
      errors.push('room_number cannot be empty');
    }
  }

  if (payload.type !== undefined) {
    if (!validRoomTypes.includes(payload.type)) {
      errors.push(`type must be one of: ${validRoomTypes.join(', ')}`);
    }
  }

  if (payload.status !== undefined) {
    if (!validStatuses.includes(payload.status)) {
      errors.push(`status must be one of: ${validStatuses.join(', ')}`);
    }
  }

  // Validate number fields
  numberFields.forEach((field) => {
    if (payload[field] !== undefined) {
      if (typeof payload[field] !== 'number' || isNaN(payload[field])) {
        errors.push(`${field} must be a number`);
      } else if (payload[field] < 0) {
        errors.push(`${field} cannot be negative`);
      }
    }
  });

  // Validate floor
  if (payload.floor !== undefined && payload.floor < 1) {
    errors.push('floor must be at least 1');
  }

  // Validate capacity
  if (payload.capacity !== undefined && payload.capacity < 1) {
    errors.push('capacity must be at least 1');
  }

  return errors;
};
