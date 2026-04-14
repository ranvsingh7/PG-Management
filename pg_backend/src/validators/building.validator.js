const requiredFields = [
  'name',
  'address',
  'city',
  'area',
  'total_floors',
  'total_rooms'
];

export const allowedInputFields = [
  'name',
  'address',
  'city',
  'area',
  'total_floors',
  'total_rooms',
  'caretaker_name',
  'caretaker_phone',
  'amenities',
  'security_deposit',
  'electricity_rate'
];

const stringFields = [
  'name',
  'address',
  'city',
  'area',
  'caretaker_name',
  'caretaker_phone'
];

const numberFields = [
  'total_floors',
  'total_rooms',
  'security_deposit',
  'electricity_rate'
];

export const validateBuildingPayload = (payload, { partial = false } = {}) => {
  const errors = [];

  Object.keys(payload).forEach((field) => {
    if (!allowedInputFields.includes(field)) {
      errors.push(`${field} is not allowed in request body`);
    }
  });

  if (!partial) {
    requiredFields.forEach((field) => {
      if (payload[field] === undefined || payload[field] === null || payload[field] === '') {
        errors.push(`${field} is required`);
      }
    });
  }

  stringFields.forEach((field) => {
    if (payload[field] !== undefined && typeof payload[field] !== 'string') {
      errors.push(`${field} must be a string`);
    }
  });

  numberFields.forEach((field) => {
    if (payload[field] !== undefined && typeof payload[field] !== 'number') {
      errors.push(`${field} must be a number`);
    }
  });

  if (payload.amenities !== undefined && !Array.isArray(payload.amenities)) {
    errors.push('amenities must be an array of strings');
  }

  if (Array.isArray(payload.amenities)) {
    const invalidAmenity = payload.amenities.some((item) => typeof item !== 'string');
    if (invalidAmenity) {
      errors.push('amenities must be an array of strings');
    }
  }

  return errors;
};
