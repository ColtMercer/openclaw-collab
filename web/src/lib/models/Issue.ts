import mongoose, { Schema, type Model } from "mongoose"

export type IssueDocument = {
  title: string
  description?: string
  project: string
  priority: "Low" | "Medium" | "High" | "Critical" | "Urgent"
  status: "Backlog" | "In Progress" | "Review" | "Done"
  order: number
  createdAt: Date
}

const IssueSchema = new Schema<IssueDocument>(
  {
    title: { type: String, required: true },
    description: { type: String },
    project: { type: String, required: true },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical", "Urgent"],
      default: "Medium",
    },
    status: {
      type: String,
      enum: ["Backlog", "In Progress", "Review", "Done"],
      default: "Backlog",
    },
    order: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

export const Issue: Model<IssueDocument> =
  mongoose.models.Issue || mongoose.model("Issue", IssueSchema)
