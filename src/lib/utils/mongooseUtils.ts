import { Model, Document, SortOrder } from 'mongoose';
import mongoose from 'mongoose';

type SortOptions = string | { [key: string]: SortOrder | { $meta: any; }; } | [string, SortOrder][];

/**
 * Helper functions to wrap Mongoose operations with proper typing
 */

export async function findAll<T extends Document>(
  model: Model<T>,
  options: { sort?: SortOptions; limit?: number; skip?: number } = {}
): Promise<T[]> {
  let query = model.find();
  
  if (options.sort) {
    query = query.sort(options.sort);
  }
  
  if (options.skip !== undefined) {
    query = query.skip(options.skip);
  }
  
  if (options.limit !== undefined) {
    query = query.limit(options.limit);
  }
  
  return query.exec();
}

export async function findById<T extends Document>(
  model: Model<T>,
  id: string
): Promise<T | null> {
  return model.findById(id).exec();
}

export async function findOne<T extends Document>(
  model: Model<T>,
  filter: Record<string, any>
): Promise<T | null> {
  return model.findOne(filter).exec();
}

export async function deleteById<T extends Document>(
  model: Model<T>,
  id: string
): Promise<T | null> {
  return model.findByIdAndDelete(id).exec();
}

export async function countDocuments<T extends Document>(
  model: Model<T>
): Promise<number> {
  return model.countDocuments().exec();
}