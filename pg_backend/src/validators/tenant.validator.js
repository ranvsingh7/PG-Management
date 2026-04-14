const requiredFields = [
  'name',
  'phone',
  'email',
  'building_id',
  'room_number',
  'check_in_date',
  'rent',
  'status'
];

export const allowedInputFields = [
  'name',
  'phone',
  'email',
  'building_id',
  'room_number',
  'check_in_date',
  'current_reading',
  'check_out_date',
  'rent',
  'status',
  'agreement',
  'approval_status',
  'pg_id',
  'password_hash',
  'moving_history',
  'security_deposit_amount'
];

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const validStatuses = ['active', 'inactive'];

export const validateTenantPayload = (payload, options = {}) => {
  const errors = [];

  if (!options.partial) {
    requiredFields.forEach((field) => {
      if (payload[field] === undefined || payload[field] === null || payload[field] === '') {
        errors.push(`${field} is required`);
      }
    });
  }

  if (payload.name !== undefined && (typeof payload.name !== 'string' || payload.name.trim() === '')) {
    errors.push('name must be a non-empty string');
  }

  if (payload.email !== undefined) {
    if (typeof payload.email !== 'string' || !emailRegex.test(payload.email.trim())) {
      errors.push('email must be a valid email address');
    }
  }

  if (payload.phone !== undefined) {
    if (typeof payload.phone !== 'string' || !/^\d{10}$/.test(payload.phone)) {
      errors.push('phone must be exactly 10 digits');
    }
  }

  if (payload.building_id !== undefined && (typeof payload.building_id !== 'string' || payload.building_id.trim() === '')) {
    errors.push('building_id must be a non-empty string');
  }

  if (payload.room_number !== undefined && (typeof payload.room_number !== 'string' || payload.room_number.trim() === '')) {
    errors.push('room_number must be a non-empty string');
  }

  if (payload.check_in_date !== undefined) {
    if (typeof payload.check_in_date !== 'string' || Number.isNaN(Date.parse(payload.check_in_date))) {
      errors.push('check_in_date must be a valid date string');
    }
  }

  if (payload.check_out_date !== undefined && payload.check_out_date !== null && payload.check_out_date !== '') {
    if (typeof payload.check_out_date !== 'string' || Number.isNaN(Date.parse(payload.check_out_date))) {
      errors.push('check_out_date must be a valid date string');
    }
  }

  if (payload.rent !== undefined) {
    if (typeof payload.rent !== 'number' || Number.isNaN(payload.rent)) {
      errors.push('rent must be a number');
    } else if (payload.rent < 0) {
      errors.push('rent cannot be negative');
    }
  }

  if (payload.current_reading !== undefined) {
    if (typeof payload.current_reading !== 'number' || Number.isNaN(payload.current_reading)) {
      errors.push('current_reading must be a number');
    } else if (payload.current_reading < 0) {
      errors.push('current_reading cannot be negative');
    }
  }

  if (payload.security_deposit_amount !== undefined && payload.security_deposit_amount !== null) {
    if (typeof payload.security_deposit_amount !== 'number' || Number.isNaN(payload.security_deposit_amount)) {
      errors.push('security_deposit_amount must be a number or null');
    } else if (payload.security_deposit_amount < 0) {
      errors.push('security_deposit_amount cannot be negative');
    }
  }

  if (payload.status !== undefined && !validStatuses.includes(payload.status)) {
    errors.push(`status must be one of: ${validStatuses.join(', ')}`);
  }

  return errors;
};
