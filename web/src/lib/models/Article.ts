import mongoose, { Schema, type Model } from "mongoose"

export type ArticleDocument = {
  title: string
  content: string
  project: string
  status:
    | "Draft"
    | "In Review"
    | "Revision Needed"
    | "Ready to Publish"
    | "Published"
  createdAt: Date
  updatedAt: Date
}

const ArticleSchema = new Schema<ArticleDocument>(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },
    project: { type: String, required: true },
    status: {
      type: String,
      enum: [
        "Draft",
        "In Review",
        "Revision Needed",
        "Ready to Publish",
        "Published",
      ],
      default: "Draft",
    },
  },
  { timestamps: true }
)

export const Article: Model<ArticleDocument> =
  mongoose.models.Article || mongoose.model("Article", ArticleSchema)
