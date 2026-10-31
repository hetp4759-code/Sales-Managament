import mongoose from "mongoose";
import Product from "../model/product.model.js";
import StockMovement from "../model/stockMovement.model.js";

let transactionSupportPromise;

const supportsTransactions = async () => {
  if (!transactionSupportPromise) {
    transactionSupportPromise = mongoose.connection.db
      .admin()
      .command({ hello: 1 })
      .then((hello) => Boolean(hello.setName || hello.msg === "isdbgrid"))
      .catch((error) => {
        transactionSupportPromise = null;
        throw error;
      });
  }

  return transactionSupportPromise;
};

export const runInventoryOperation = async (operation) => {
  if (!(await supportsTransactions())) {
    return operation(null);
  }

  const session = await mongoose.startSession();
  let result;

  try {
    await session.withTransaction(async () => {
      result = await operation(session);
    });

    return result;
  } finally {
    await session.endSession();
  }
};

export const mutateStock = async ({
  productId,
  delta,
  type,
  referenceId = null,
  idempotencyKey,
  note = "",
  session = null,
}) => {
  if (!Number.isFinite(delta) || delta === 0) {
    throw Object.assign(new Error("Stock change must be a non-zero number."), {
      status: 400,
    });
  }

  const filter = { _id: productId };
  if (delta < 0) {
    filter.stock = { $gte: Math.abs(delta) };
  }

  const updateOptions = {
    new: true,
    runValidators: true,
    ...(session && { session }),
  };
  const product = await Product.findOneAndUpdate(
    filter,
    { $inc: { stock: delta } },
    updateOptions
  );

  if (!product) {
    const exists = await Product.exists({ _id: productId }).session(session);
    if (!exists) {
      throw Object.assign(new Error("Product not found."), { status: 404 });
    }

    throw Object.assign(new Error("Insufficient stock available."), {
      status: 409,
    });
  }

  try {
    const [movement] = await StockMovement.create(
      [
        {
          productId,
          type,
          quantity: Math.abs(delta),
          delta,
          referenceId,
          ...(idempotencyKey && { idempotencyKey }),
          note,
          balanceAfter: product.stock,
        },
      ],
      session ? { session } : undefined
    );

    return { product, movement };
  } catch (error) {
    if (!session) {
      try {
        await Product.updateOne({ _id: productId }, { $inc: { stock: -delta } });
      } catch (rollbackError) {
        console.error("Stock update rollback failed:", rollbackError);
        throw Object.assign(
          new Error("Stock could not be recorded safely. Contact support before retrying."),
          { status: 500, cause: error }
        );
      }
    }

    throw error;
  }
};

export const rollbackStockMutation = async ({
  productId,
  delta,
  type,
  referenceId = null,
  note = "Compensating stock update after a failed transaction.",
}) => {
  const product = await Product.findOneAndUpdate(
    { _id: productId, ...(delta > 0 && { stock: { $gte: delta } }) },
    { $inc: { stock: -delta } },
    { new: true, runValidators: true }
  );

  if (!product) {
    throw new Error("Unable to safely restore stock after a failed operation.");
  }

  await StockMovement.create({
    productId,
    type,
    quantity: Math.abs(delta),
    delta: -delta,
    referenceId,
    note,
    balanceAfter: product.stock,
  });
};

export const isValidObjectId = (value) =>
  mongoose.isValidObjectId(value) && String(new mongoose.Types.ObjectId(value)) === String(value);
