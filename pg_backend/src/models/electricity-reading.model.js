import mongoose from "mongoose";

const electricityReadingSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    building_id: { type: String, required: true, index: true },
    room_number: { type: String, required: true, index: true },
    reading: { type: Number, required: true, min: 0 },
    reading_at: { type: Date, required: true, index: true },
    reading_type: {
      type: String,
      required: true,
      enum: ["base", "checkin", "month_end", "manual"]
    },
    owner_account_id: { type: String, required: true, index: true },
    created_by: { type: String, default: "admin" },
    created_at: { type: Date, default: Date.now },
    note: { type: String, default: "" }
  },
  {
    versionKey: false
  }
);

electricityReadingSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret._id;
    return ret;
  }
});

const ElectricityReading = mongoose.model("ElectricityReading", electricityReadingSchema);

export default ElectricityReading;
