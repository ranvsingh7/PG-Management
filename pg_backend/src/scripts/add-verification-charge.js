import "dotenv/config";
import { connectDb } from "../config/db.js";
import Invoice from "../models/invoice.model.js";

const VERIFICATION_CHARGE = 500;

const toNumber = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);

const computePaidBreakup = ({
  rentAmount,
  electricityAmount,
  verificationAmount,
  securityDepositAmount,
  paidAmount,
}) => {
  const paidTowardsVerification = Math.max(paidAmount - (rentAmount + electricityAmount), 0);
  const verificationPaid = Math.min(paidTowardsVerification, verificationAmount);
  const paidTowardsDeposit = Math.max(paidAmount - (rentAmount + electricityAmount + verificationPaid), 0);
  const securityDepositPaid = Math.min(paidTowardsDeposit, securityDepositAmount);

  return {
    verificationPaid,
    securityDepositPaid,
  };
};

const run = async () => {
  await connectDb();

  const invoices = await Invoice.find({
    is_first_invoice: true,
    $or: [
      { verification_amount: { $exists: false } },
      { verification_amount: { $lte: 0 } },
    ],
  }).lean();

  if (!invoices.length) {
    console.log("No first invoices found without verification charge.");
    return;
  }

  const ops = invoices.map((invoice) => {
    const rentAmount = toNumber(invoice.rent_amount);
    const electricityAmount = toNumber(invoice.electricity_amount);
    const securityDepositAmount = toNumber(invoice.security_deposit_amount);
    const verificationAmount = VERIFICATION_CHARGE;
    const paidAmount = toNumber(invoice.paid_amount);
    const totalAmount = Number((rentAmount + electricityAmount + verificationAmount + securityDepositAmount).toFixed(2));
    const outstandingAmount = Number(Math.max(totalAmount - paidAmount, 0).toFixed(2));

    const { verificationPaid, securityDepositPaid } = computePaidBreakup({
      rentAmount,
      electricityAmount,
      verificationAmount,
      securityDepositAmount,
      paidAmount,
    });

    const computedStatus = paidAmount <= 0
      ? "pending"
      : paidAmount >= totalAmount
        ? "paid"
        : "partial";

    const nextStatus = invoice.status === "overdue" && paidAmount < totalAmount
      ? "overdue"
      : computedStatus;

    return {
      updateOne: {
        filter: { id: invoice.id },
        update: {
          $set: {
            verification_amount: verificationAmount,
            verification_paid_amount: Number(verificationPaid.toFixed(2)),
            security_deposit_paid_amount: Number(securityDepositPaid.toFixed(2)),
            amount: totalAmount,
            outstanding_amount: outstandingAmount,
            status: nextStatus,
            updated_at: new Date(),
          },
        },
      },
    };
  });

  const result = await Invoice.bulkWrite(ops, { ordered: false });
  console.log(`Updated ${result.modifiedCount} invoice(s) with verification charge.`);
};

run()
  .then(() => {
    console.log("Done.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Failed to update invoices:", error);
    process.exit(1);
  });
