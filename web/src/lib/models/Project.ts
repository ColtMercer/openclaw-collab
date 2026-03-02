import mongoose, { Schema, type Model } from "mongoose"

export type ProjectDocument = {
  name: string
  slug: string
  createdAt: Date
}

const ProjectSchema = new Schema<ProjectDocument>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

export const Project: Model<ProjectDocument> =
  mongoose.models.Project || mongoose.model("Project", ProjectSchema)
